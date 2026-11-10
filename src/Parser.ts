/* eslint no-constant-condition:0 */
import functions from './functions';
import MacroExpander, { implicitCommands } from './MacroExpander';
import symbols, { ATOMS } from './symbols';
import { validUnit } from './units';
import ParseError from './ParseError';
import { combiningDiacriticalMarksEndRegex } from './Lexer';
import { uSubsAndSups, unicodeSubRegEx } from './unicodeSupOrSub';
import { asciiFromScript } from './asciiFromScript';
import SourceLocation from './SourceLocation';
import { Token } from './Token';
import { isDelimiter } from './functions/delimiter';
import type { MacroMap } from './defineMacro';
import type { AnyParseNode, AtomFamily, NodeType, ParseNode, SymbolParseNode } from './parseNode';
import type Settings from './Settings';
import type { ArgType, Mode } from './types';

// Pre-evaluate both modules as unicodeSymbols require String.normalize()
import unicodeAccents from /*preval*/ './unicodeAccents';
import unicodeSymbols from /*preval*/ './unicodeSymbols';

const binLeftCancellers = new Set(['bin', 'op', 'open', 'punct', 'rel']);
const endOfExpression = new Set(['}', '\\endgroup', '\\end', '\\right', '\\endtoggle', '&']);
const sizeRegEx = /([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/;
const textRegEx = /^ *\\text/;

/** The parts of a function or environment spec that `parseArguments` needs. */
interface ArgumentSpec {
  type: NodeType;
  numArgs: number;
  numOptionalArgs: number;
  argTypes?: ArgType[];
  primitive?: boolean;
}

// The `text` of a node, if it has one. Used when forming ligatures.
const textOf = (node: AnyParseNode): unknown => (node as { text?: unknown }).text;

/**
 * This file contains the parser used to parse out a TeX expression from the
 * input. Since TeX isn't context-free, standard parsers don't work particularly
 * well.
 *
 * The strategy of this parser is as such:
 *
 * The main functions (the `.parse...` ones) take a position in the current
 * parse string to parse tokens from. The lexer (found in Lexer.js, stored at
 * this.gullet.lexer) also supports pulling out tokens at arbitrary places. When
 * individual tokens are needed at a position, the lexer is called to pull out a
 * token, which is then used.
 *
 * The parser has a property called "mode" indicating the mode that
 * the parser is currently in. Currently it has to be one of "math" or
 * "text", which denotes whether the current environment is a math-y
 * one or a text-y one (e.g. inside \text). Currently, this serves to
 * limit the functions which can be used in text mode.
 *
 * The main functions then return an object which contains the useful data that
 * was parsed at its given point, and a new position at the end of the parsed
 * data. The main functions can call each other and continue the parsing by
 * using the returned position as a new starting point.
 *
 * There are also extra `.handle...` functions, which pull out some reused
 * functionality into self-contained functions.
 *
 * The functions return ParseNodes.
 */

export default class Parser {
  mode: Mode = 'math';
  gullet: MacroExpander;
  settings: Settings;
  leftrightDepth: number;
  prevAtomType: string;
  nextToken: Token | null | undefined;

  constructor(input: string, settings: Settings) {
    // Start in math mode
    // Create a new macro expander (gullet) and (indirectly via that) also a
    // new lexer (mouth) for this parser (stomach, in the language of TeX)
    this.gullet = new MacroExpander(input, settings, this.mode);
    // Store the settings for use in parsing
    this.settings = settings;
    // Count leftright depth (for \middle errors)
    this.leftrightDepth = 0;
    this.prevAtomType = '';
  }

  /**
   * Checks a result to make sure it has the right type, and throws an
   * appropriate error otherwise.
   */
  expect(text: string, consume = true): void {
    if (this.fetch().text !== text) {
      throw new ParseError(`Expected '${text}', got '${this.fetch().text}'`, this.fetch());
    }
    if (consume) {
      this.consume();
    }
  }

  /**
   * Discards the current lookahead token, considering it consumed.
   */
  consume(): void {
    this.nextToken = null;
  }

  /**
   * Return the current lookahead token, or if there isn't one (at the
   * beginning, or if the previous lookahead token was consume()d),
   * fetch the next token as the new lookahead token and return it.
   */
  fetch(): Token {
    this.nextToken ??= this.gullet.expandNextToken();
    return this.nextToken;
  }

  /**
   * Switches between "text" and "math" modes.
   */
  switchMode(newMode: Mode): void {
    this.mode = newMode;
    this.gullet.switchMode(newMode);
  }

  /**
   * Parses the entire input within a new group namespace. The caller must end
   * the group.
   */
  private parseInGroup(): AnyParseNode[] {
    // Create a group namespace for every $...$, $$...$$, \[...\].)
    // A \def is then valid only within that pair of delimiters.
    this.gullet.beginGroup();

    if (this.settings.colorIsTextColor) {
      // Use old \color behavior (same as LaTeX's \textcolor) if requested.
      // We do this within the group for the math expression, so it doesn't
      // pollute settings.macros.
      this.gullet.macros.set('\\color', '\\textcolor');
    }

    // Try to parse the input
    const parse = this.parseExpression(false);

    // If we succeeded, make sure there's an EOF at the end
    this.expect('EOF');

    return parse;
  }

  /**
   * Parses a preamble and returns the macros defined in it.
   */
  parsePreamble(): MacroMap {
    this.parseInGroup();
    const macros = Object.create(null) as MacroMap;
    for (const [key, value] of Object.entries(this.gullet.macros.current)) {
      macros[key] = value;
    }
    this.gullet.endGroup();
    return macros;
  }

  /**
   * Main parsing function, which parses an entire input.
   */
  parse(): AnyParseNode[] {
    const parse = this.parseInGroup();

    // The only local macro that we want to save is from \tag.
    const tag = this.gullet.macros.get('\\df@tag');

    // End the group namespace for the expression
    this.gullet.endGroup();

    if (tag) {
      this.gullet.macros.current['\\df@tag'] = tag;
    }

    return parse;
  }

  /**
   * Fully parse a separate sequence of tokens as a separate job.
   * Tokens should be specified in reverse order, as in a MacroDefinition.
   */
  subparse(tokens: Token[]): AnyParseNode[] {
    // Save the next token from the current job.
    const oldToken = this.nextToken;
    this.consume();

    // Run the new job, terminating it with an excess '}'
    this.gullet.pushToken(new Token('}'));
    this.gullet.pushTokens(tokens);
    const parse = this.parseExpression(false);
    this.expect('}');

    // Restore the next token from the current job.
    this.nextToken = oldToken;

    return parse;
  }

  /**
   * Parses an "expression", which is a list of atoms.
   *
   * `breakOnInfix`: Should the parsing stop when we hit infix nodes? This
   *                 happens when functions have higher precedence than infix
   *                 nodes in implicit parses.
   *
   * `breakOnTokenText`: The text of the token that the expression should end
   *                     with, or `null` if something else should end the
   *                     expression.
   *
   * `breakOnMiddle`: \color, \over, and old styling functions work on an implicit group.
   *                  These groups end just before the usual tokens, but they also
   *                  end just before `\middle`.
   */
  parseExpression(
    breakOnInfix: boolean,
    breakOnTokenText?: string | null,
    breakOnMiddle?: boolean,
  ): AnyParseNode[] {
    const body: AnyParseNode[] = [];
    this.prevAtomType = '';
    // Keep adding atoms to the body until we can't parse any more atoms (either
    // we reached the end, a }, or a \right)
    while (true) {
      // Ignore spaces in math mode
      if (this.mode === 'math') {
        this.consumeSpaces();
      }
      const lex = this.fetch();
      if (endOfExpression.has(lex.text)) {
        break;
      }
      if (breakOnTokenText && lex.text === breakOnTokenText) {
        break;
      }
      if (breakOnMiddle && lex.text === '\\middle') {
        break;
      }
      if (breakOnInfix && functions[lex.text]?.infix) {
        break;
      }
      const atom = this.parseAtom(breakOnTokenText);
      if (!atom) {
        break;
      } else if (atom.type === 'internal') {
        // Internal nodes do not appear in parse tree
        continue;
      }
      body.push(atom);
      // Keep a record of the atom type, so that op.js can set correct spacing.
      this.prevAtomType = atom.type === 'atom' ? atom.family : atom.type;
    }
    if (this.mode === 'text') {
      this.formLigatures(body);
    }
    return this.handleInfixNodes(body);
  }

  /**
   * Rewrites infix operators such as \over with corresponding commands such
   * as \frac.
   *
   * There can only be one infix operator per group.  If there's more than one
   * then the expression is ambiguous.  This can be resolved by adding {}.
   */
  handleInfixNodes(body: AnyParseNode[]): AnyParseNode[] {
    let overIndex = -1;
    let funcName;

    for (let i = 0; i < body.length; i++) {
      const node = body[i];
      if (node.type === 'infix') {
        if (overIndex !== -1) {
          throw new ParseError('only one infix operator per group', node.token);
        }
        overIndex = i;
        funcName = node.replaceWith;
      }
    }

    if (overIndex !== -1 && funcName) {
      let numerNode: AnyParseNode;
      let denomNode: AnyParseNode;

      const numerBody = body.slice(0, overIndex);
      const denomBody = body.slice(overIndex + 1);

      if (numerBody.length === 1 && numerBody[0].type === 'ordgroup') {
        numerNode = numerBody[0];
      } else {
        numerNode = { type: 'ordgroup', mode: this.mode, body: numerBody };
      }

      if (denomBody.length === 1 && denomBody[0].type === 'ordgroup') {
        denomNode = denomBody[0];
      } else {
        denomNode = { type: 'ordgroup', mode: this.mode, body: denomBody };
      }

      let node;
      if (funcName === '\\\\abovefrac') {
        node = this.callFunction(funcName, [numerNode, body[overIndex], denomNode], []);
      } else {
        node = this.callFunction(funcName, [numerNode, denomNode], []);
      }
      return [node];
    } else {
      return body;
    }
  }

  /**
   * Handle a subscript or superscript with nice errors.
   */
  handleSupSubscript(
    name: string, // For error reporting.
  ): AnyParseNode {
    const symbolToken = this.fetch();
    const symbol = symbolToken.text;
    this.consume();
    this.consumeSpaces(); // ignore spaces before sup/subscript argument
    // Skip over allowed internal nodes such as \relax
    let group: AnyParseNode | null;
    do {
      group = this.parseGroup(name);
    } while (group?.type === 'internal');

    if (!group) {
      throw new ParseError("Expected group after '" + symbol + "'", symbolToken);
    }

    return group;
  }

  /**
   * Converts the textual input of an unsupported command into a text node
   * contained within a color node whose color is determined by errorColor
   */
  formatUnsupportedCmd(text: string): ParseNode<'color'> {
    const textordArray: ParseNode<'textord'>[] = Array.from(text.split(''), (character) => ({
      type: 'textord',
      mode: 'text',
      text: character,
    }));

    const textNode: ParseNode<'text'> = {
      type: 'text',
      mode: this.mode,
      body: textordArray,
    };

    const colorNode: ParseNode<'color'> = {
      type: 'color',
      mode: this.mode,
      color: this.settings.errorColor,
      body: [textNode],
    };

    return colorNode;
  }

  /**
   * Parses a group with optional super/subscripts.
   */
  parseAtom(breakOnTokenText?: string | null): AnyParseNode | null {
    // The body of an atom is an implicit group, so that things like
    // \left(x\right)^2 work correctly.
    const base = this.parseGroup('atom', breakOnTokenText);

    // Internal nodes (e.g. \relax) cannot support super/subscripts.
    // Instead we will pick up super/subscripts with blank base next round.
    if (base?.type === 'internal') {
      return base;
    }

    // In text mode, we don't have superscripts or subscripts
    if (this.mode === 'text') {
      return base;
    }

    // Note that base may be empty (i.e. null) at this point.

    let superscript: AnyParseNode | undefined;
    let subscript: AnyParseNode | undefined;
    while (true) {
      // Guaranteed in math mode, so eat any spaces first.
      this.consumeSpaces();

      // Lex the first token
      const lex = this.fetch();

      switch (lex.text) {
        case '\\limits':
        case '\\nolimits': {
          // We got a limit control
          if (base?.type === 'op') {
            const limits = lex.text === '\\limits';
            base.limits = limits;
            base.alwaysHandleSupSub = true;
          } else if (base?.type === 'operatorname') {
            if (base.alwaysHandleSupSub) {
              base.limits = lex.text === '\\limits';
            }
          } else {
            throw new ParseError('Limit controls must follow a math operator', lex);
          }
          this.consume();
          continue;
        }
        case '^': {
          // We got a superscript start
          if (superscript) {
            throw new ParseError('Double superscript', lex);
          }
          superscript = this.handleSupSubscript('superscript');
          continue;
        }
        case '_': {
          // We got a subscript start
          if (subscript) {
            throw new ParseError('Double subscript', lex);
          }
          subscript = this.handleSupSubscript('subscript');
          continue;
        }
        case "'": {
          // We got a prime
          if (superscript) {
            throw new ParseError('Double superscript', lex);
          }
          const prime: ParseNode<'textord'> = { type: 'textord', mode: this.mode, text: '\\prime' };

          // Many primes can be grouped together, so we handle this here
          const primes: AnyParseNode[] = [prime];
          this.consume();
          // Keep lexing tokens until we get something that's not a prime
          while (this.fetch().text === "'") {
            // For each one, add another prime to the list
            primes.push(prime);
            this.consume();
          }
          // If there's a superscript following the primes, combine that
          // superscript in with the primes.
          if (this.fetch().text === '^') {
            primes.push(this.handleSupSubscript('superscript'));
          }
          // Put everything into an ordgroup as the superscript
          superscript = { type: 'ordgroup', mode: this.mode, body: primes };
          continue;
        }
      }
      if (uSubsAndSups[lex.text]) {
        // A Unicode subscript or superscript character.
        // We treat these similarly to the unicode-math package.
        // So we render a string of Unicode (sub|super)scripts the
        // same as a (sub|super)script of regular characters.
        const isSub = unicodeSubRegEx.test(lex.text);
        const subsupTokens: Token[] = [];
        subsupTokens.push(new Token(uSubsAndSups[lex.text]));
        this.consume();
        // Continue fetching tokens to fill out the group.
        while (true) {
          const token = this.fetch().text;
          if (!uSubsAndSups[token]) {
            break;
          }
          if (unicodeSubRegEx.test(token) !== isSub) {
            break;
          }
          subsupTokens.unshift(new Token(uSubsAndSups[token]));
          this.consume();
        }
        // Now create a (sub|super)script.
        const body = this.subparse(subsupTokens);
        if (isSub) {
          subscript = { type: 'ordgroup', mode: 'math', body };
        } else {
          superscript = { type: 'ordgroup', mode: 'math', body };
        }
      } else {
        // If it wasn't ^, _, a Unicode (sub|super)script, or ', stop parsing super/subscripts
        break;
      }
    }

    if (superscript || subscript) {
      if (base?.type === 'multiscript' && !base.postscripts) {
        // base is the result of a \prescript function.
        // Write the sub- & superscripts into the multiscript element.
        base.postscripts = { sup: superscript, sub: subscript };
        return base;
      } else {
        // We got either a superscript or subscript, create a supsub
        const isFollowedByDelimiter =
          !base || (base.type !== 'op' && base.type !== 'operatorname')
            ? undefined
            : isDelimiter(this.fetch().text);
        return {
          type: 'supsub',
          mode: this.mode,
          base: base,
          sup: superscript,
          sub: subscript,
          isFollowedByDelimiter,
        };
      }
    } else {
      // Otherwise return the original body
      return base;
    }
  }

  /**
   * Parses an entire function, including its base and all of its arguments.
   */
  parseFunction(
    breakOnTokenText?: string | null,
    name?: string, // For determining its context
  ): AnyParseNode | null {
    const token = this.fetch();
    const func = token.text;
    const funcData = functions[func];
    if (!funcData) {
      return null;
    }
    this.consume(); // consume command token

    if (name && name !== 'atom' && !funcData.allowedInArgument) {
      throw new ParseError(
        "Got function '" + func + "' with no arguments" + (name ? ' as ' + name : ''),
        token,
      );
    } else if (this.mode === 'text' && !funcData.allowedInText) {
      throw new ParseError("Can't use function '" + func + "' in text mode", token);
    } else if (this.mode === 'math' && !funcData.allowedInMath) {
      throw new ParseError("Can't use function '" + func + "' in math mode", token);
    }

    const prevAtomType = this.prevAtomType;
    const { args, optArgs } = this.parseArguments(func, funcData);
    this.prevAtomType = prevAtomType;
    return this.callFunction(func, args, optArgs, token, breakOnTokenText);
  }

  /**
   * Call a function handler with a suitable context and arguments.
   */
  callFunction(
    name: string,
    args: AnyParseNode[],
    optArgs: (AnyParseNode | null | undefined)[],
    token?: Token,
    breakOnTokenText?: string | null,
  ): AnyParseNode {
    const context = {
      funcName: name,
      parser: this,
      token,
      breakOnTokenText,
    };
    const func = functions[name];
    if (func?.handler) {
      return func.handler(context, args, optArgs);
    } else {
      throw new ParseError(`No function handler for ${name}`);
    }
  }

  /**
   * Parses the arguments of a function or environment
   */
  parseArguments(
    func: string, // Should look like "\name" or "\begin{name}".
    funcData: ArgumentSpec,
  ): { args: AnyParseNode[]; optArgs: (AnyParseNode | null)[] } {
    const totalArgs = funcData.numArgs + funcData.numOptionalArgs;
    if (totalArgs === 0) {
      return { args: [], optArgs: [] };
    }

    const args: AnyParseNode[] = [];
    const optArgs: (AnyParseNode | null)[] = [];

    for (let i = 0; i < totalArgs; i++) {
      let argType = funcData.argTypes?.[i];
      const isOptional = i < funcData.numOptionalArgs;

      if (
        (funcData.primitive && argType == null) ||
        // \sqrt expands into primitive if optional argument doesn't exist
        (funcData.type === 'sqrt' && i === 1 && optArgs[0] == null)
      ) {
        argType = 'primitive';
      }

      const arg = this.parseGroupOfType(`argument to '${func}'`, argType, isOptional);
      if (isOptional) {
        optArgs.push(arg);
      } else if (arg == null) {
        // should be unreachable
        throw new ParseError('Null argument, please report this as a bug');
      } else {
        args.push(arg);
      }
    }

    return { args, optArgs };
  }

  /**
   * Parses a group when the mode is changing.
   */
  parseGroupOfType(
    name: string,
    type: ArgType | null | undefined,
    optional: boolean,
  ): AnyParseNode | null {
    switch (type) {
      case 'size':
        return this.parseSizeGroup(optional);
      case 'url':
        return this.parseUrlGroup(optional);
      case 'math':
      case 'text':
        return this.parseArgumentGroup(optional, type);
      case 'hbox': {
        // hbox argument type wraps the argument in the equivalent of
        // \hbox, which is like \text but switching to \textstyle size.
        const group = this.parseArgumentGroup(optional, 'text');
        return group == null
          ? null
          : {
              type: 'styling',
              mode: group.mode,
              body: [group],
              scriptLevel: 'text', // simulate \textstyle
            };
      }
      case 'raw': {
        const token = this.parseStringGroup('raw', optional);
        return token == null
          ? null
          : {
              type: 'raw',
              mode: 'text',
              string: token.text,
            };
      }
      case 'primitive': {
        if (optional) {
          throw new ParseError('A primitive argument cannot be optional');
        }
        const group = this.parseGroup(name);
        if (group == null) {
          throw new ParseError('Expected group as ' + name, this.fetch());
        }
        return group;
      }
      case 'original':
      case null:
      case undefined:
        return this.parseArgumentGroup(optional);
      default:
        throw new ParseError('Unknown group type as ' + name, this.fetch());
    }
  }

  /**
   * Discard any space tokens, fetching the next non-space token.
   */
  consumeSpaces(): void {
    while (true) {
      const ch = this.fetch().text;
      // \ufe0e is the Unicode variation selector to supress emoji. Ignore it.
      if (ch === ' ' || ch === '\u{A0}' || ch === '\u{FE0E}') {
        this.consume();
      } else {
        break;
      }
    }
  }

  /**
   * Parses a group, essentially returning the string formed by the
   * brace-enclosed tokens plus some position information.
   */
  parseStringGroup(
    modeName: string, // Used to describe the mode in error messages.
    optional: boolean,
  ): Token | null {
    const argToken = this.gullet.scanArgument(optional);
    if (argToken == null) {
      return null;
    }
    let str = '';
    let nextToken;
    while ((nextToken = this.fetch()).text !== 'EOF') {
      str += nextToken.text;
      this.consume();
    }
    this.consume(); // consume the end of the argument
    argToken.text = str;
    return argToken;
  }

  /**
   * Parses a regex-delimited group: the largest sequence of tokens
   * whose concatenated strings match `regex`. Returns the string
   * formed by the tokens plus some position information.
   */
  parseRegexGroup(
    regex: RegExp,
    modeName: string, // Used to describe the mode in error messages.
  ): Token {
    const firstToken = this.fetch();
    let lastToken = firstToken;
    let str = '';
    let nextToken;
    while ((nextToken = this.fetch()).text !== 'EOF' && regex.test(str + nextToken.text)) {
      lastToken = nextToken;
      str += lastToken.text;
      this.consume();
    }
    if (str === '') {
      throw new ParseError('Invalid ' + modeName + ": '" + firstToken.text + "'", firstToken);
    }
    return firstToken.range(lastToken, str);
  }

  /**
   * Parses a size specification, consisting of magnitude and unit.
   */
  parseSizeGroup(optional: boolean): ParseNode<'size'> | null {
    let res;
    // don't expand before parseStringGroup
    this.gullet.consumeSpaces();
    if (optional || this.gullet.future().text === '{') {
      res = this.parseStringGroup('size', optional);
    } else {
      res = this.parseRegexGroup(/^[-+]? *(?:$|\d+|\d+\.\d*|\.\d*) *[a-z]{0,2} *$/, 'size');
    }
    if (!res) {
      return null;
    }
    let isBlank = false;
    if (!optional && res.text.length === 0) {
      // Because we've tested for what is !optional, this block won't
      // affect \kern, \hspace, etc. It will capture the mandatory arguments
      // to \genfrac and \above.
      res.text = '0pt'; // Enable \above{}
      isBlank = true; // This is here specifically for \genfrac
    }
    const match = sizeRegEx.exec(res.text);
    if (!match) {
      throw new ParseError("Invalid size: '" + res.text + "'", res);
    }
    const data = {
      number: +(match[1] + match[2]), // sign + magnitude, cast to number
      unit: match[3],
    };
    if (!validUnit(data)) {
      throw new ParseError("Invalid unit: '" + data.unit + "'", res);
    }
    return {
      type: 'size',
      mode: this.mode,
      value: data,
      isBlank,
    };
  }

  /**
   * Parses an URL, checking escaped letters and allowed protocols,
   * and setting the catcode of % as an active character (as in \hyperref).
   */
  parseUrlGroup(optional: boolean): ParseNode<'url'> | null {
    this.gullet.lexer.setCatcode('%', 13); // active character
    this.gullet.lexer.setCatcode('~', 12); // other character
    const res = this.parseStringGroup('url', optional);
    this.gullet.lexer.setCatcode('%', 14); // comment character
    this.gullet.lexer.setCatcode('~', 13); // active character
    if (res == null) {
      return null;
    }
    // hyperref package allows backslashes alone in href, but doesn't
    // generate valid links in such cases; we interpret this as
    // "undefined" behaviour, and keep them as-is. Some browser will
    // replace backslashes with forward slashes.
    const url = res.text.replaceAll('{\u{2044}}', '/');
    return {
      type: 'url',
      mode: this.mode,
      url,
    };
  }

  /**
   * Parses an argument with the mode specified.
   */
  parseArgumentGroup(optional: boolean, mode?: Mode): ParseNode<'ordgroup'> | null {
    const argToken = this.gullet.scanArgument(optional);
    if (argToken == null) {
      return null;
    }
    const outerMode = this.mode;
    if (mode) {
      // Switch to specified mode
      this.switchMode(mode);
    }

    this.gullet.beginGroup();
    const expression = this.parseExpression(false, 'EOF');
    // TODO: find an alternative way to denote the end
    this.expect('EOF'); // expect the end of the argument
    this.gullet.endGroup();
    const result: ParseNode<'ordgroup'> = {
      type: 'ordgroup',
      mode: this.mode,
      loc: argToken.loc,
      body: expression,
    };

    if (mode) {
      // Switch mode back
      this.switchMode(outerMode);
    }
    return result;
  }

  /**
   * Parses an ordinary group, which is either a single nucleus (like "x")
   * or an expression in braces (like "{x+y}") or an implicit group, a group
   * that starts at the current position, and ends right before a higher explicit
   * group ends, or at EOF.
   */
  parseGroup(
    name: string, // For error reporting.
    breakOnTokenText?: string | null,
  ): AnyParseNode | null {
    if (name === "argument to '\\left'") {
      return this.parseSymbol();
    }
    const firstToken = this.fetch();
    const text = firstToken.text;
    let result: AnyParseNode | null;
    // Try to parse an open brace or \begingroup
    if (text === '{' || text === '\\begingroup' || text === '\\toggle') {
      this.consume();
      const groupEnd = text === '{' ? '}' : text === '\\begingroup' ? '\\endgroup' : '\\endtoggle';

      this.gullet.beginGroup();
      // If we get a brace, parse an expression
      const expression = this.parseExpression(false, groupEnd);
      const lastToken = this.fetch();
      this.expect(groupEnd); // Check that we got a matching closing brace
      this.gullet.endGroup();
      result = {
        type: lastToken.text === '\\endtoggle' ? 'toggle' : 'ordgroup',
        mode: this.mode,
        loc: SourceLocation.range(firstToken, lastToken),
        body: expression,
        // A group formed by \begingroup...\endgroup is a semi-simple group
        // which doesn't affect spacing in math mode, i.e., is transparent.
        // https://tex.stackexchange.com/questions/1930/
        semisimple: text === '\\begingroup' || undefined,
      };
    } else {
      // If there exists a function with this name, parse the function.
      // Otherwise, just return a nucleus
      result = this.parseFunction(breakOnTokenText, name) ?? this.parseSymbol();
      if (result == null && text.startsWith('\\') && !Object.hasOwn(implicitCommands, text)) {
        if (this.settings.throwOnError) {
          throw new ParseError('Unsupported function name: ' + text, firstToken);
        }
        // For people getting dyanamically rendered math, it's better to
        // show the unsupported command in red rather than panicking for every
        // partially written expression.
        result = this.formatUnsupportedCmd(text);
        this.consume();
      }
    }
    return result;
  }

  /**
   * Form ligature-like combinations of characters for text mode.
   * This includes inputs like "--", "---", "``" and "''".
   * The result will simply replace multiple textord nodes with a single
   * character in each value by a single textord node having multiple
   * characters in its value.  The representation is still ASCII source.
   * The group will be modified in place.
   */
  formLigatures(group: AnyParseNode[]): void {
    let n = group.length - 1;
    for (let i = 0; i < n; ++i) {
      const a = group[i];
      const v = textOf(a);
      if (v === '-' && textOf(group[i + 1]) === '-') {
        if (i + 1 < n && textOf(group[i + 2]) === '-') {
          group.splice(i, 3, {
            type: 'textord',
            mode: 'text',
            loc: SourceLocation.range(a, group[i + 2]),
            text: '---',
          });
          n -= 2;
        } else {
          group.splice(i, 2, {
            type: 'textord',
            mode: 'text',
            loc: SourceLocation.range(a, group[i + 1]),
            text: '--',
          });
          n -= 1;
        }
      }
      if ((v === "'" || v === '`') && textOf(group[i + 1]) === v) {
        group.splice(i, 2, {
          type: 'textord',
          mode: 'text',
          loc: SourceLocation.range(a, group[i + 1]),
          text: v + v,
        });
        n -= 1;
      }
    }
  }

  /**
   * Parse a single symbol out of the string. Here, we handle single character
   * symbols and special functions like \verb.
   */
  parseSymbol(): AnyParseNode | null {
    const nucleus = this.fetch();
    let text = nucleus.text;

    if (/^\\verb[^a-zA-Z]/.test(text)) {
      this.consume();
      let arg = text.slice(5);
      const star = arg.startsWith('*');
      if (star) {
        arg = arg.slice(1);
      }
      // Lexer's tokenRegex is constructed to always have matching
      // first/last characters.
      if (arg.length < 2 || !arg.startsWith(arg.slice(-1))) {
        throw new ParseError(`\\verb assertion failed --
                    please report what input caused this bug`);
      }
      arg = arg.slice(1, -1); // remove first and last char
      return {
        type: 'verb',
        mode: 'text',
        body: arg,
        star,
      };
    }
    // At this point, we should have a symbol, possibly with accents.
    // First expand any accented base symbol according to unicodeSymbols.
    if (
      Object.hasOwn(unicodeSymbols, text[0]) &&
      this.mode === 'math' &&
      !symbols[this.mode][text[0]]
    ) {
      // This behavior is not strict (XeTeX-compatible) in math mode.
      if (this.settings.strict) {
        throw new ParseError(
          `Accented Unicode text character "${text[0]}" used in math mode`,
          nucleus,
        );
      }
      text = unicodeSymbols[text[0]] + text.slice(1);
    }
    // Strip off any combining characters
    const match = this.mode === 'math' ? combiningDiacriticalMarksEndRegex.exec(text) : null;
    if (match) {
      text = text.slice(0, match.index);
      if (text === 'i') {
        text = '\u{131}'; // dotless i, in math and text mode
      } else if (text === 'j') {
        text = '\u{237}'; // dotless j, in math and text mode
      }
    }
    // Recognize base symbol
    let symbol: AnyParseNode;
    const symbolEntry = symbols[this.mode][text];
    if (symbolEntry) {
      let group = symbolEntry.group;
      if (
        group === 'bin' &&
        (binLeftCancellers.has(this.prevAtomType) || this.prevAtomType === '')
      ) {
        // Change from a binary operator to a unary (prefix) operator
        group = 'open';
      }
      const loc = SourceLocation.range(nucleus);
      let s: AnyParseNode;
      if (Object.hasOwn(ATOMS, group)) {
        const family = group as AtomFamily;
        const atom: ParseNode<'atom'> = {
          type: 'atom',
          mode: this.mode,
          family,
          loc,
          text,
        };
        if (
          (family === 'rel' || family === 'bin') &&
          this.prevAtomType === 'text' &&
          loc &&
          textRegEx.test(loc.lexer.input.slice(loc.end))
        ) {
          atom.needsSpacing = true; // Fix a MathML bug.
        }
        s = atom;
      } else {
        if (asciiFromScript[text]) {
          // Unicode 14 disambiguates chancery from roundhand.
          // See https://www.unicode.org/charts/PDF/U1D400.pdf
          this.consume();
          const nextCode = this.fetch().text.codePointAt(0);
          // mathcal is Temml default. Use mathscript if called for.
          const font = nextCode === 0xfe_01 ? 'mathscr' : 'mathcal';
          if (nextCode === 0xfe_00 || nextCode === 0xfe_01) {
            this.consume();
          }
          return {
            type: 'font',
            mode: 'math',
            font,
            body: { type: 'mathord', mode: 'math', loc, text: asciiFromScript[text] },
          };
        }
        // Default ord character. No disambiguation necessary.
        s = {
          type: group,
          mode: this.mode,
          loc,
          text,
        } as SymbolParseNode;
      }
      symbol = s;
    } else if ((text.codePointAt(0) ?? 0) >= 0x80 || combiningDiacriticalMarksEndRegex.test(text)) {
      // no symbol for e.g. ^
      if (this.settings.strict && this.mode === 'math') {
        throw new ParseError(`Unicode text character "${text[0]}" used in math mode`, nucleus);
      }
      // All nonmathematical Unicode characters are rendered as if they
      // are in text mode (wrapped in \text) because that's what it
      // takes to render them in LaTeX.
      symbol = {
        type: 'textord',
        mode: 'text',
        loc: SourceLocation.range(nucleus),
        text,
      };
    } else {
      return null; // EOF, ^, _, {, }, etc.
    }
    this.consume();
    // Transform combining characters into accents
    if (match) {
      for (const accent of match[0]) {
        if (!unicodeAccents[accent]) {
          throw new ParseError(`Unknown accent ' ${accent}'`, nucleus);
        }
        const command = unicodeAccents[accent][this.mode] ?? unicodeAccents[accent].text;
        if (!command) {
          throw new ParseError(`Accent ${accent} unsupported in ${this.mode} mode`, nucleus);
        }
        symbol = {
          type: 'accent',
          mode: this.mode,
          loc: SourceLocation.range(nucleus),
          label: command,
          isStretchy: false,
          base: symbol,
        };
      }
    }
    return symbol;
  }
}
