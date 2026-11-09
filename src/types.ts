/**
 * Shared types that don't belong to a single module.
 */

export type Mode = "math" | "text";

/** Math style, as used by \displaystyle, \textstyle, etc. */
export type StyleStr = "display" | "text" | "script" | "scriptscript";

/**
 * The type of a function argument, which determines how Parser parses it.
 * "primitive" means a single group parsed without expansion of braces, and
 * "original" means the argument is parsed with the same mode as the function.
 */
export type ArgType =
  | "size" | "url" | "raw" | "original" | "hbox" | "primitive" | Mode;
