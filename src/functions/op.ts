// Limits, symbols
import defineFunction, { ordargument } from '../defineFunction';
import * as mathMLTree from '../mathMLTree';
import * as mml from '../buildMathML';
import { isDelimiter } from './delimiter';
import type { MathMLBuilder } from '../defineFunction';
import type { MathNode } from '../mathMLTree';
import type { AnyParseNode } from '../parseNode';

// Some helpers

const ordAtomTypes = new Set(['textord', 'mathord', 'atom']);

// Most operators have a large successor symbol, but these don't.
const noSuccessor = new Set(['\\smallint']);

// Math operators (e.g. \sin) need a space between these types and themselves:
export const ordTypes = ['textord', 'mathord', 'ordgroup', 'close', 'leftright', 'font'];

// NOTE: Unlike most `builders`s, this one handles not only "op", but also
// "supsub" since some of them (like \int) can affect super/subscripting.

const setSpacing = (node: MathNode): void => {
  // The user wrote a \mathop{…} function. Change spacing from default to OP spacing.
  // The most likely spacing for an OP is a thin space per TeXbook p170.
  node.attributes.lspace = '0.1667em';
  node.attributes.rspace = '0.1667em';
};

const mathmlBuilder: MathMLBuilder<'op'> = (group, style) => {
  let node: MathNode;

  if (group.symbol) {
    // This is a symbol. Just add the symbol.
    node = new mathMLTree.MathNode('mo', [mml.makeText(group.name!, group.mode)]);
    if (noSuccessor.has(group.name!)) {
      node.setAttribute('largeop', 'false');
    } else {
      node.setAttribute('movablelimits', 'false');
    }
    if (group.fromMathOp) {
      setSpacing(node);
    }
  } else if (group.body) {
    // This is an operator with children. Add them.
    node = new mathMLTree.MathNode('mo', mml.buildExpression(group.body, style));
    if (group.fromMathOp) {
      setSpacing(node);
    }
  } else {
    // This is a text operator. Add all of the characters from the operator's name.
    node = new mathMLTree.MathNode('mi', [new mathMLTree.TextNode(group.name!.slice(1))]);

    if (!group.parentIsSupSub) {
      // Append an invisible <mo>&ApplyFunction;</mo>.
      // ref: https://www.w3.org/TR/REC-MathML/chap3_2.html#sec3.2.4
      const operator = new mathMLTree.MathNode('mo', [mml.makeText('\u{2061}', 'text')]);
      const row = [node, operator];
      // Set spacing
      if (group.needsLeadingSpace) {
        const lead = new mathMLTree.MathNode('mspace');
        lead.setAttribute('width', '0.1667em'); // thin space.
        row.unshift(lead);
      }
      if (!group.isFollowedByDelimiter) {
        const trail = new mathMLTree.MathNode('mspace');
        trail.setAttribute('width', '0.1667em'); // thin space.
        row.push(trail);
      }
      node = new mathMLTree.MathNode('mrow', row);
    }
  }

  return node;
};

const singleCharBigOps: Record<string, string> = {
  '\u{220F}': '\\prod',
  '\u{2210}': '\\coprod',
  '\u{2211}': '\\sum',
  '\u{22C0}': '\\bigwedge',
  '\u{22C1}': '\\bigvee',
  '\u{22C2}': '\\bigcap',
  '\u{22C3}': '\\bigcup',
  '\u{2A00}': '\\bigodot',
  '\u{2A01}': '\\bigoplus',
  '\u{2A02}': '\\bigotimes',
  '\u{2A04}': '\\biguplus',
  '\u{2A05}': '\\bigsqcap',
  '\u{2A06}': '\\bigsqcup',
  '\u{2A03}': '\\bigcupdot',
  '\u{2A07}': '\\bigdoublevee',
  '\u{2A08}': '\\bigdoublewedge',
  '\u{2A09}': '\\bigtimes',
};

defineFunction({
  type: 'op',
  names: [
    '\\coprod',
    '\\bigvee',
    '\\bigwedge',
    '\\biguplus',
    '\\bigcupplus',
    '\\bigcupdot',
    '\\bigcap',
    '\\bigcup',
    '\\bigdoublevee',
    '\\bigdoublewedge',
    '\\intop',
    '\\prod',
    '\\sum',
    '\\bigotimes',
    '\\bigoplus',
    '\\bigodot',
    '\\bigsqcap',
    '\\bigsqcup',
    '\\bigtimes',
    '\\smallint',
    '\u{220F}',
    '\u{2210}',
    '\u{2211}',
    '\u{22C0}',
    '\u{22C1}',
    '\u{22C2}',
    '\u{22C3}',
    '\u{2A00}',
    '\u{2A01}',
    '\u{2A02}',
    '\u{2A03}',
    '\u{2A04}',
    '\u{2A05}',
    '\u{2A06}',
    '\u{2A07}',
    '\u{2A08}',
    '\u{2A09}',
  ],
  props: {
    numArgs: 0,
  },
  handler: ({ parser, funcName }, args) => {
    let fName = funcName;
    if (fName.length === 1) {
      fName = singleCharBigOps[fName];
    }
    return {
      type: 'op',
      mode: parser.mode,
      limits: true,
      parentIsSupSub: false,
      symbol: true,
      stack: false, // This is true for \stackrel{}, not here.
      name: fName,
    };
  },
  mathmlBuilder,
});

// Note: calling defineFunction with a type that's already been defined only
// works because the same mathmlBuilder is being used.
defineFunction({
  type: 'op',
  names: ['\\mathop'],
  props: {
    numArgs: 1,
    primitive: true,
  },
  handler: ({ parser }, args) => {
    const body = args[0];
    // It would be convienient to just wrap a <mo> around the argument.
    // But if the argument is a <mi> or <mord>, that would be invalid MathML.
    // In that case, we instead promote the text contents of the body to the parent.
    const bodyArray = (body as { body?: AnyParseNode[] }).body;
    const arr = bodyArray ?? [body];
    const isSymbol = arr.length === 1 && ordAtomTypes.has(arr[0].type);
    return {
      type: 'op',
      mode: parser.mode,
      limits: true,
      parentIsSupSub: false,
      symbol: isSymbol,
      fromMathOp: true,
      stack: false,
      name: isSymbol ? (arr[0] as { text?: string }).text : null,
      body: isSymbol ? null : ordargument(body),
    };
  },
  mathmlBuilder,
});

// There are 2 flags for operators; whether they produce limits in
// displaystyle, and whether they are symbols and should grow in
// displaystyle. These four groups cover the four possible choices.

const singleCharIntegrals: Record<string, string> = {
  '\u{222B}': '\\int',
  '\u{222C}': '\\iint',
  '\u{222D}': '\\iiint',
  '\u{222E}': '\\oint',
  '\u{222F}': '\\oiint',
  '\u{2230}': '\\oiiint',
  '\u{2231}': '\\intclockwise',
  '\u{2232}': '\\varointclockwise',
  '\u{2A0C}': '\\iiiint',
  '\u{2A0D}': '\\intbar',
  '\u{2A0E}': '\\intBar',
  '\u{2A0F}': '\\fint',
  '\u{2A12}': '\\rppolint',
  '\u{2A13}': '\\scpolint',
  '\u{2A15}': '\\pointint',
  '\u{2A16}': '\\sqint',
  '\u{2A17}': '\\intlarhk',
  '\u{2A18}': '\\intx',
  '\u{2A19}': '\\intcap',
  '\u{2A1A}': '\\intcup',
};

// No limits, not symbols
defineFunction({
  type: 'op',
  names: [
    '\\arcsin',
    '\\arccos',
    '\\arctan',
    '\\arctg',
    '\\arcctg',
    '\\arg',
    '\\ch',
    '\\cos',
    '\\cosec',
    '\\cosh',
    '\\cot',
    '\\cotg',
    '\\coth',
    '\\csc',
    '\\ctg',
    '\\cth',
    '\\deg',
    '\\dim',
    '\\exp',
    '\\hom',
    '\\ker',
    '\\lg',
    '\\ln',
    '\\log',
    '\\sec',
    '\\sin',
    '\\sinh',
    '\\sh',
    '\\sgn',
    '\\tan',
    '\\tanh',
    '\\tg',
    '\\th',
  ],
  props: {
    numArgs: 0,
  },
  handler({ parser, funcName }) {
    const prevAtomType = parser.prevAtomType;
    const next = parser.gullet.future().text;
    return {
      type: 'op',
      mode: parser.mode,
      limits: false,
      parentIsSupSub: false,
      symbol: false,
      stack: false,
      isFollowedByDelimiter: isDelimiter(next),
      needsLeadingSpace: prevAtomType.length > 0 && ordTypes.includes(prevAtomType),
      name: funcName,
    };
  },
  mathmlBuilder,
});

// Limits, not symbols
defineFunction({
  type: 'op',
  names: ['\\det', '\\gcd', '\\inf', '\\lim', '\\max', '\\min', '\\Pr', '\\sup'],
  props: {
    numArgs: 0,
  },
  handler({ parser, funcName }) {
    const prevAtomType = parser.prevAtomType;
    const next = parser.gullet.future().text;
    return {
      type: 'op',
      mode: parser.mode,
      limits: true,
      parentIsSupSub: false,
      symbol: false,
      stack: false,
      isFollowedByDelimiter: isDelimiter(next),
      needsLeadingSpace: prevAtomType.length > 0 && ordTypes.includes(prevAtomType),
      name: funcName,
    };
  },
  mathmlBuilder,
});

// No limits, symbols
defineFunction({
  type: 'op',
  names: [
    '\\int',
    '\\iint',
    '\\iiint',
    '\\iiiint',
    '\\oint',
    '\\oiint',
    '\\oiiint',
    '\\intclockwise',
    '\\varointclockwise',
    '\\intbar',
    '\\intBar',
    '\\fint',
    '\\rppolint',
    '\\scpolint',
    '\\pointint',
    '\\sqint',
    '\\intlarhk',
    '\\intx',
    '\\intcap',
    '\\intcup',
    '\u{222B}',
    '\u{222C}',
    '\u{222D}',
    '\u{222E}',
    '\u{222F}',
    '\u{2230}',
    '\u{2231}',
    '\u{2232}',
    '\u{2A0C}',
    '\u{2A0D}',
    '\u{2A0E}',
    '\u{2A0F}',
    '\u{2A12}',
    '\u{2A13}',
    '\u{2A15}',
    '\u{2A16}',
    '\u{2A17}',
    '\u{2A18}',
    '\u{2A19}',
    '\u{2A1A}',
  ],
  props: {
    numArgs: 0,
    allowedInArgument: true,
  },
  handler({ parser, funcName }) {
    let fName = funcName;
    if (fName.length === 1) {
      fName = singleCharIntegrals[fName];
    }
    return {
      type: 'op',
      mode: parser.mode,
      limits: false,
      parentIsSupSub: false,
      symbol: true,
      stack: false,
      name: fName,
    };
  },
  mathmlBuilder,
});
