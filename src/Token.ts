import SourceLocation from "./SourceLocation";

/**
 * The resulting token returned from `lex`.
 *
 * It consists of the token text plus some position information.
 * The position information is essentially a range in an input string,
 * but instead of referencing the bare input string, we refer to the lexer.
 * That way it is possible to attach extra metadata to the input string,
 * like for example a file name or similar.
 *
 * The position information is optional, so it is OK to construct synthetic
 * tokens if appropriate. Not providing available position information may
 * lead to degraded error reporting, though.
 */
export class Token {
  text: string; // the text of this token
  loc: SourceLocation | null | undefined;
  // Set by MacroExpander to mark tokens that must not be expanded.
  noexpand?: boolean;
  // Set by MacroExpander to mark \relax tokens produced by \noexpand.
  treatAsRelax?: boolean;

  constructor(text: string, loc?: SourceLocation | null) {
    this.text = text;
    this.loc = loc;
  }

  /**
   * Given a pair of tokens (this and endToken), compute a `Token` encompassing
   * the whole input range enclosed by these two.
   */
  range(
    endToken: Token, // last token of the range, inclusive
    text: string     // the text of the newly constructed token
  ): Token {
    return new Token(text, SourceLocation.range(this, endToken));
  }
}
