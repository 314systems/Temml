import type MacroExpander from "./MacroExpander";
import type { Token } from "./Token";

/** The result of expanding a macro. See MacroExpander#_getExpansion. */
export interface MacroExpansion {
  tokens: Token[];        // In reverse order, to fit with a stack.
  numArgs: number;
  delimiters?: string[][]; // Delimiters of the arguments, see \def.
  unexpandable?: boolean;  // Used in \let.
}

/**
 * A macro is either a string (its expansion, possibly with #1, #2, ...
 * arguments), a pre-lexed expansion, or a function that computes either of
 * those from the current MacroExpander state.
 */
export type MacroDefinition =
  | string
  | MacroExpansion
  | ((context: MacroExpander) => string | MacroExpansion);

export type MacroMap = Record<string, MacroDefinition>;

/**
 * All registered global/built-in macros.
 * `macros.js` exports this same dictionary again and makes it public.
 * `Parser.js` requires this dictionary via `macros.js`.
 */
export const _macros: MacroMap = Object.create(null);

// This function might one day accept an additional argument and do more things.
const defineMacro = (name: string, body: MacroDefinition): void => {
  _macros[name] = body;
}

export default defineMacro
