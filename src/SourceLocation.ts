/**
 * The parts of a Lexer that a SourceLocation needs. Declared here to break the
 * circular dependency between Token, Lexer, and ParseError.
 */
export interface LexerInterface {
  input: string;
  tokenRegex: RegExp;
}

/** Anything that may carry position information, e.g. a Token or ParseNode. */
export interface LocSource {
  loc?: SourceLocation | null;
}

/**
 * Lexing or parsing positional information for error reporting.
 * This object is immutable.
 */
export default class SourceLocation {
  readonly lexer: LexerInterface; // Lexer holding the input string.
  readonly start: number; // Start offset, zero-based inclusive.
  readonly end: number; // End offset, zero-based exclusive.

  constructor(lexer: LexerInterface, start: number, end: number) {
    this.lexer = lexer;
    this.start = start;
    this.end = end;
  }

  /**
   * Merges two `SourceLocation`s from location providers, given they are
   * provided in order of appearance.
   * - Returns the first one's location if only the first is provided.
   * - Returns a merged range of the first and the last if both are provided
   *   and their lexers match.
   * - Otherwise, returns null.
   */
  static range(
    first?: LocSource | null,
    second?: LocSource | null,
  ): SourceLocation | null | undefined {
    if (!second) {
      return first && first.loc;
    } else if (!first || !first.loc || !second.loc || first.loc.lexer !== second.loc.lexer) {
      return null;
    } else {
      return new SourceLocation(first.loc.lexer, first.loc.start, second.loc.end);
    }
  }
}
