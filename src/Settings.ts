/**
 * This is a module for storing settings passed into Temml. It correctly handles
 * default settings.
 */

import type { MacroMap } from './defineMacro';
import * as utils from './utils';

/**
 * The argument passed to a `trust` function. See html.js and
 * includegraphics.js for the commands that build one.
 */
export interface TrustContext {
  command: string;
  url?: string;
  protocol?: string;
  [key: string]: unknown;
}

type TrustSetting = boolean | ((context: TrustContext) => boolean);

/** Options of the rendering functions. See README.md for their meaning. */
export interface Options {
  displayMode?: boolean;
  annotate?: boolean;
  leqno?: boolean;
  throwOnError?: boolean;
  errorColor?: string;
  macros?: MacroMap;
  wrap?: 'none' | 'tex' | '=';
  xml?: boolean;
  colorIsTextColor?: boolean;
  strict?: boolean;
  trust?: TrustSetting;
  maxSize?: [number, number];
  maxExpand?: number;
}

const FORBIDDEN_MACRO_KEYS = ['__proto__', 'prototype', 'constructor'];

// Sanitize a user-supplied macros object: strip its prototype (so later
// bracket-notation writes, e.g. from \gdef, can never reach Object.prototype)
// and delete any own key that could be used to pollute it. This mutates
// `macros` in place and returns the same reference, rather than a copy,
// because callers such as auto-render.js rely on that identity to share
// \gdef'd macros across multiple render calls that pass the same options
// object.
const sanitizeMacros = (macros: unknown): MacroMap => {
  if (macros == null || typeof macros !== 'object') {
    return Object.create(null) as MacroMap;
  }
  for (const key of FORBIDDEN_MACRO_KEYS) {
    if (Object.hasOwn(macros, key)) {
      delete (macros as Record<string, unknown>)[key];
    }
  }
  Object.setPrototypeOf(macros, null);
  return macros as MacroMap;
};

/**
 * The main Settings object
 */
export default class Settings {
  displayMode: boolean;
  annotate: boolean;
  leqno: boolean;
  throwOnError: boolean;
  errorColor: string;
  macros: MacroMap;
  wrap: 'none' | 'tex' | '=';
  xml: boolean;
  colorIsTextColor: boolean;
  strict: boolean;
  trust: TrustSetting;
  maxSize: [number, number];
  maxExpand: number;
  wrapDelimiterPairs: boolean;

  constructor(options?: Options | null) {
    // allow null options
    const opts: Options = options ?? {};
    this.displayMode = utils.deflt(opts, 'displayMode', false);
    this.annotate = utils.deflt(opts, 'annotate', false);
    this.leqno = utils.deflt(opts, 'leqno', false);
    this.throwOnError = utils.deflt(opts, 'throwOnError', false);
    this.errorColor = utils.deflt(opts, 'errorColor', '#b22222');
    this.macros = sanitizeMacros(Object.hasOwn(opts, 'macros') ? opts.macros : undefined);
    this.wrap = utils.deflt(opts, 'wrap', 'none');
    this.xml = utils.deflt(opts, 'xml', false);
    this.colorIsTextColor = utils.deflt(opts, 'colorIsTextColor', false);
    this.strict = utils.deflt(opts, 'strict', false);
    this.trust = utils.deflt(opts, 'trust', false); // trust context. See html.js.
    const maxSize = Object.hasOwn(opts, 'maxSize') ? opts.maxSize : undefined;
    this.maxSize = Array.isArray(maxSize) ? maxSize : [Infinity, Infinity];
    this.maxExpand = Math.max(0, utils.deflt(opts, 'maxExpand', 1000));
    this.wrapDelimiterPairs = true;
  }

  /**
   * Check whether to test potentially dangerous input, and return
   * `true` (trusted) or `false` (untrusted).  The sole argument `context`
   * should be an object with `command` field specifying the relevant LaTeX
   * command (as a string starting with `\`), and any other arguments, etc.
   * If `context` has a `url` field, a `protocol` field will automatically
   * get added by this function (changing the specified object).
   */
  isTrusted(context: TrustContext): boolean {
    if (context.url && !context.protocol) {
      const protocol = utils.protocolFromUrl(context.url);
      if (protocol == null) {
        return false;
      }
      context.protocol = protocol;
    }
    const trust = typeof this.trust === 'function' ? this.trust(context) : this.trust;
    return trust;
  }
}
