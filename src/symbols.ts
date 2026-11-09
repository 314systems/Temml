/**
 * This file holds a list of all no-argument functions and single-character
 * symbols (like 'a' or ';').
 *
 * For each of the symbols, there are two properties they can have:
 * - group (required): the ParseNode group type the symbol should have (i.e.
     "textord", "mathord", etc).
 * - replace: the character that this symbol or function should be
 *   replaced with (i.e. "\phi" has a replace value of "\u03d5", the phi
 *   character in the main font).
 *
 * The outermost map in the table indicates what mode the symbols should be
 * accepted in (e.g. "math" or "text").
 */

import type { AtomFamily } from './parseNode';
import type { Mode } from './types';

// Some of these have a "-token" suffix since these are also used as `ParseNode`
// types for raw text tokens, and we want to avoid conflicts with higher-level
// `ParseNode` types. These `ParseNode`s are constructed within `Parser` by
// looking up the `symbols` map.
export const ATOMS = {
  bin: 1,
  close: 1,
  inner: 1,
  open: 1,
  punct: 1,
  rel: 1,
};
export const NON_ATOMS = {
  'accent-token': 1,
  mathord: 1,
  'op-token': 1,
  spacing: 1,
  textord: 1,
};

/** The group of a symbol, i.e. the type of the parse node it becomes. */
export type Group = AtomFamily | 'accent-token' | 'mathord' | 'op-token' | 'spacing' | 'textord';

export interface SymbolEntry {
  group: Group;
  replace: string | null;
}

const symbols: Record<Mode, Record<string, SymbolEntry>> = Object.create(null);
symbols.math = Object.create(null);
symbols.text = Object.create(null);
export default symbols;

export const defineSymbol = (
  mode: Mode,
  group: Group,
  replace: string | null,
  name: string,
  acceptUnicodeChar?: boolean,
): void => {
  if (mode !== 'math' && mode !== 'text') {
    throw new TypeError(`Invalid mode: ${mode} called in defineSymbol`);
  }

  const entry = { group, replace };
  symbols[mode][name] = entry;

  /** `acceptUnicodeChar = true` is only applicable if `replace` is set. */
  if (acceptUnicodeChar && replace) {
    symbols[mode][replace] = entry;
  }
};

// Some abbreviations for commonly used strings.
// This helps minify the code, and also spotting typos via linter.

// modes:
const math = 'math';
const text = 'text';

// groups:
const accent = 'accent-token';
const bin = 'bin';
const close = 'close';
const inner = 'inner';
const mathord = 'mathord';
const op = 'op-token';
const open = 'open';
const punct = 'punct';
const rel = 'rel';
const spacing = 'spacing';
const textord = 'textord';

// Now comes the symbol table

// Relation Symbols
defineSymbol(math, rel, '\u{2261}', '\\equiv', true);
defineSymbol(math, rel, '\u{227A}', '\\prec', true);
defineSymbol(math, rel, '\u{227B}', '\\succ', true);
defineSymbol(math, rel, '\u{223C}', '\\sim', true);
defineSymbol(math, rel, '\u{27C2}', '\\perp', true);
defineSymbol(math, rel, '\u{2AAF}', '\\preceq', true);
defineSymbol(math, rel, '\u{2AB0}', '\\succeq', true);
defineSymbol(math, rel, '\u{2243}', '\\simeq', true);
defineSymbol(math, rel, '\u{224C}', '\\backcong', true);
defineSymbol(math, rel, '|', '\\mid', true);
defineSymbol(math, rel, '\u{226A}', '\\ll', true);
defineSymbol(math, rel, '\u{226B}', '\\gg', true);
defineSymbol(math, rel, '\u{224D}', '\\asymp', true);
defineSymbol(math, rel, '\u{2225}', '\\parallel');
defineSymbol(math, rel, '\u{2323}', '\\smile', true);
defineSymbol(math, rel, '\u{2291}', '\\sqsubseteq', true);
defineSymbol(math, rel, '\u{2292}', '\\sqsupseteq', true);
defineSymbol(math, rel, '\u{2250}', '\\doteq', true);
defineSymbol(math, rel, '\u{2322}', '\\frown', true);
defineSymbol(math, rel, '\u{220B}', '\\ni', true);
defineSymbol(math, rel, '\u{220C}', '\\notni', true);
defineSymbol(math, rel, '\u{221D}', '\\propto', true);
defineSymbol(math, rel, '\u{22A2}', '\\vdash', true);
defineSymbol(math, rel, '\u{22A3}', '\\dashv', true);
defineSymbol(math, rel, '\u{220B}', '\\owns');
defineSymbol(math, rel, '\u{2258}', '\\arceq', true);
defineSymbol(math, rel, '\u{2259}', '\\wedgeq', true);
defineSymbol(math, rel, '\u{225A}', '\\veeeq', true);
defineSymbol(math, rel, '\u{225B}', '\\stareq', true);
defineSymbol(math, rel, '\u{225D}', '\\eqdef', true);
defineSymbol(math, rel, '\u{225E}', '\\measeq', true);
defineSymbol(math, rel, '\u{225F}', '\\questeq', true);
defineSymbol(math, rel, '\u{2260}', '\\ne', true);
defineSymbol(math, rel, '\u{2260}', '\\neq');
// unicodemath
defineSymbol(math, rel, '\u{2A75}', '\\eqeq', true);
defineSymbol(math, rel, '\u{2A76}', '\\eqeqeq', true);
// mathtools.sty
defineSymbol(math, rel, '\u{2237}', '\\dblcolon', true);
defineSymbol(math, rel, '\u{2254}', '\\coloneqq', true);
defineSymbol(math, rel, '\u{2255}', '\\eqqcolon', true);
defineSymbol(math, rel, '\u{2239}', '\\eqcolon', true);
defineSymbol(math, rel, '\u{2A74}', '\\Coloneqq', true);

// Punctuation
defineSymbol(math, punct, '.', '\\ldotp');
defineSymbol(math, punct, '\u{B7}', '\\cdotp');

// Misc Symbols
defineSymbol(math, textord, '#', '\\#');
defineSymbol(text, textord, '#', '\\#');
defineSymbol(math, textord, '&', '\\&');
defineSymbol(text, textord, '&', '\\&');
defineSymbol(math, textord, '\u{2135}', '\\aleph', true);
defineSymbol(math, textord, '\u{2200}', '\\forall', true);
defineSymbol(math, textord, '\u{210F}', '\\hbar', true);
defineSymbol(math, textord, '\u{2203}', '\\exists', true);
defineSymbol(math, open, '\u{2207}', '\\nabla', true);
defineSymbol(math, textord, '\u{266D}', '\\flat', true);
defineSymbol(math, textord, '\u{2113}', '\\ell', true);
defineSymbol(math, textord, '\u{266E}', '\\natural', true);
defineSymbol(math, textord, 'Å', '\\Angstrom', true);
defineSymbol(text, textord, 'Å', '\\Angstrom', true);
defineSymbol(math, textord, '\u{2663}', '\\clubsuit', true);
defineSymbol(math, textord, '\u{2667}', '\\varclubsuit', true);
defineSymbol(math, textord, '\u{2118}', '\\wp', true);
defineSymbol(math, textord, '\u{266F}', '\\sharp', true);
defineSymbol(math, textord, '\u{2662}', '\\diamondsuit', true);
defineSymbol(math, textord, '\u{2666}', '\\vardiamondsuit', true);
defineSymbol(math, textord, '\u{211C}', '\\Re', true);
defineSymbol(math, textord, '\u{2661}', '\\heartsuit', true);
defineSymbol(math, textord, '\u{2665}', '\\varheartsuit', true);
defineSymbol(math, textord, '\u{2111}', '\\Im', true);
defineSymbol(math, textord, '\u{2660}', '\\spadesuit', true);
defineSymbol(math, textord, '\u{2664}', '\\varspadesuit', true);
defineSymbol(math, textord, '\u{2640}', '\\female', true);
defineSymbol(math, textord, '\u{2642}', '\\male', true);
defineSymbol(math, textord, '\u{A7}', '\\S', true);
defineSymbol(text, textord, '\u{A7}', '\\S');
defineSymbol(math, textord, '\u{B6}', '\\P', true);
defineSymbol(text, textord, '\u{B6}', '\\P');
defineSymbol(text, textord, '\u{263A}', '\\smiley', true);
defineSymbol(math, textord, '\u{263A}', '\\smiley', true);

// Math and Text
defineSymbol(math, textord, '\u{2020}', '\\dag');
defineSymbol(text, textord, '\u{2020}', '\\dag');
defineSymbol(text, textord, '\u{2020}', '\\textdagger');
defineSymbol(math, textord, '\u{2021}', '\\ddag');
defineSymbol(text, textord, '\u{2021}', '\\ddag');
defineSymbol(text, textord, '\u{2021}', '\\textdaggerdbl');

// Large Delimiters
defineSymbol(math, close, '\u{23B1}', '\\rmoustache', true);
defineSymbol(math, open, '\u{23B0}', '\\lmoustache', true);
defineSymbol(math, close, '\u{27EF}', '\\rgroup', true);
defineSymbol(math, open, '\u{27EE}', '\\lgroup', true);

// Binary Operators
defineSymbol(math, bin, '\u{2213}', '\\mp', true);
defineSymbol(math, bin, '\u{2296}', '\\ominus', true);
defineSymbol(math, bin, '\u{228E}', '\\uplus', true);
defineSymbol(math, bin, '\u{2293}', '\\sqcap', true);
defineSymbol(math, bin, '\u{2217}', '\\ast');
defineSymbol(math, bin, '\u{2294}', '\\sqcup', true);
defineSymbol(math, bin, '\u{25EF}', '\\bigcirc', true);
defineSymbol(math, bin, '\u{2219}', '\\bullet', true);
defineSymbol(math, bin, '\u{2021}', '\\ddagger');
defineSymbol(math, bin, '\u{2240}', '\\wr', true);
defineSymbol(math, bin, '\u{2A3F}', '\\amalg');
defineSymbol(math, bin, '&', '\\And'); // from amsmath
defineSymbol(math, bin, '\u{2AFD}', '\\sslash', true); // from stmaryrd

// Arrow Symbols
defineSymbol(math, rel, '\u{27F5}', '\\longleftarrow', true);
defineSymbol(math, rel, '\u{21D0}', '\\Leftarrow', true);
defineSymbol(math, rel, '\u{27F8}', '\\Longleftarrow', true);
defineSymbol(math, rel, '\u{27F6}', '\\longrightarrow', true);
defineSymbol(math, rel, '\u{21D2}', '\\Rightarrow', true);
defineSymbol(math, rel, '\u{27F9}', '\\Longrightarrow', true);
defineSymbol(math, rel, '\u{2194}', '\\leftrightarrow', true);
defineSymbol(math, rel, '\u{27F7}', '\\longleftrightarrow', true);
defineSymbol(math, rel, '\u{21D4}', '\\Leftrightarrow', true);
defineSymbol(math, rel, '\u{27FA}', '\\Longleftrightarrow', true);
defineSymbol(math, rel, '\u{21A4}', '\\mapsfrom', true);
defineSymbol(math, rel, '\u{21A6}', '\\mapsto', true);
defineSymbol(math, rel, '\u{27FC}', '\\longmapsto', true);
defineSymbol(math, rel, '\u{2197}', '\\nearrow', true);
defineSymbol(math, rel, '\u{21A9}', '\\hookleftarrow', true);
defineSymbol(math, rel, '\u{21AA}', '\\hookrightarrow', true);
defineSymbol(math, rel, '\u{2198}', '\\searrow', true);
defineSymbol(math, rel, '\u{21BC}', '\\leftharpoonup', true);
defineSymbol(math, rel, '\u{21C0}', '\\rightharpoonup', true);
defineSymbol(math, rel, '\u{2199}', '\\swarrow', true);
defineSymbol(math, rel, '\u{21BD}', '\\leftharpoondown', true);
defineSymbol(math, rel, '\u{21C1}', '\\rightharpoondown', true);
defineSymbol(math, rel, '\u{2196}', '\\nwarrow', true);
defineSymbol(math, rel, '\u{21CC}', '\\rightleftharpoons', true);
defineSymbol(math, mathord, '\u{21AF}', '\\lightning', true);
defineSymbol(math, mathord, '\u{220E}', '\\QED', true);
defineSymbol(math, mathord, '\u{2030}', '\\permil', true);
defineSymbol(text, textord, '\u{2030}', '\\permil');
defineSymbol(math, mathord, '\u{2609}', '\\astrosun', true);
defineSymbol(math, mathord, '\u{263C}', '\\sun', true);
defineSymbol(math, mathord, '\u{263E}', '\\leftmoon', true);
defineSymbol(math, mathord, '\u{263D}', '\\rightmoon', true);
defineSymbol(math, mathord, '\u{2295}', '\\Earth');

// AMS Negated Binary Relations
defineSymbol(math, rel, '\u{226E}', '\\nless', true);
// Symbol names preceded by "@" each have a corresponding macro.
defineSymbol(math, rel, '\u{2A87}', '\\lneq', true);
defineSymbol(math, rel, '\u{2268}', '\\lneqq', true);
defineSymbol(math, rel, '\u{2268}\u{FE00}', '\\lvertneqq');
defineSymbol(math, rel, '\u{22E6}', '\\lnsim', true);
defineSymbol(math, rel, '\u{2A89}', '\\lnapprox', true);
defineSymbol(math, rel, '\u{2280}', '\\nprec', true);
// unicode-math maps \u22e0 to \npreccurlyeq. We'll use the AMS synonym.
defineSymbol(math, rel, '\u{22E0}', '\\npreceq', true);
defineSymbol(math, rel, '\u{22E8}', '\\precnsim', true);
defineSymbol(math, rel, '\u{2AB9}', '\\precnapprox', true);
defineSymbol(math, rel, '\u{2241}', '\\nsim', true);
defineSymbol(math, rel, '\u{2224}', '\\nmid', true);
defineSymbol(math, rel, '\u{2224}', '\\nshortmid');
defineSymbol(math, rel, '\u{22AC}', '\\nvdash', true);
defineSymbol(math, rel, '\u{22AD}', '\\nvDash', true);
defineSymbol(math, rel, '\u{22EA}', '\\ntriangleleft');
defineSymbol(math, rel, '\u{22EC}', '\\ntrianglelefteq', true);
defineSymbol(math, rel, '\u{2284}', '\\nsubset', true);
defineSymbol(math, rel, '\u{2285}', '\\nsupset', true);
defineSymbol(math, rel, '\u{228A}', '\\subsetneq', true);
defineSymbol(math, rel, '\u{228A}\u{FE00}', '\\varsubsetneq');
defineSymbol(math, rel, '\u{2ACB}', '\\subsetneqq', true);
defineSymbol(math, rel, '\u{2ACB}\u{FE00}', '\\varsubsetneqq');
defineSymbol(math, rel, '\u{226F}', '\\ngtr', true);
defineSymbol(math, rel, '\u{2A88}', '\\gneq', true);
defineSymbol(math, rel, '\u{2269}', '\\gneqq', true);
defineSymbol(math, rel, '\u{2269}\u{FE00}', '\\gvertneqq');
defineSymbol(math, rel, '\u{22E7}', '\\gnsim', true);
defineSymbol(math, rel, '\u{2A8A}', '\\gnapprox', true);
defineSymbol(math, rel, '\u{2281}', '\\nsucc', true);
// unicode-math maps \u22e1 to \nsucccurlyeq. We'll use the AMS synonym.
defineSymbol(math, rel, '\u{22E1}', '\\nsucceq', true);
defineSymbol(math, rel, '\u{22E9}', '\\succnsim', true);
defineSymbol(math, rel, '\u{2ABA}', '\\succnapprox', true);
// unicode-math maps \u2246 to \simneqq. We'll use the AMS synonym.
defineSymbol(math, rel, '\u{2246}', '\\ncong', true);
defineSymbol(math, rel, '\u{2226}', '\\nparallel', true);
defineSymbol(math, rel, '\u{2226}', '\\nshortparallel');
defineSymbol(math, rel, '\u{22AF}', '\\nVDash', true);
defineSymbol(math, rel, '\u{22EB}', '\\ntriangleright');
defineSymbol(math, rel, '\u{22ED}', '\\ntrianglerighteq', true);
defineSymbol(math, rel, '\u{228B}', '\\supsetneq', true);
defineSymbol(math, rel, '\u{228B}', '\\varsupsetneq');
defineSymbol(math, rel, '\u{2ACC}', '\\supsetneqq', true);
defineSymbol(math, rel, '\u{2ACC}\u{FE00}', '\\varsupsetneqq');
defineSymbol(math, rel, '\u{22AE}', '\\nVdash', true);
defineSymbol(math, rel, '\u{2AB5}', '\\precneqq', true);
defineSymbol(math, rel, '\u{2AB6}', '\\succneqq', true);
defineSymbol(math, bin, '\u{22B4}', '\\unlhd');
defineSymbol(math, bin, '\u{22B5}', '\\unrhd');

// AMS Negated Arrows
defineSymbol(math, rel, '\u{219A}', '\\nleftarrow', true);
defineSymbol(math, rel, '\u{219B}', '\\nrightarrow', true);
defineSymbol(math, rel, '\u{21CD}', '\\nLeftarrow', true);
defineSymbol(math, rel, '\u{21CF}', '\\nRightarrow', true);
defineSymbol(math, rel, '\u{21AE}', '\\nleftrightarrow', true);
defineSymbol(math, rel, '\u{21CE}', '\\nLeftrightarrow', true);

// AMS Misc
defineSymbol(math, rel, '\u{25B3}', '\\vartriangle');
defineSymbol(math, textord, '\u{210F}', '\\hslash');
defineSymbol(math, textord, '\u{25BD}', '\\triangledown');
defineSymbol(math, textord, '\u{25CA}', '\\lozenge');
defineSymbol(math, textord, '\u{24C8}', '\\circledS');
defineSymbol(math, textord, '\u{AE}', '\\circledR', true);
defineSymbol(text, textord, '\u{AE}', '\\circledR');
defineSymbol(text, textord, '\u{AE}', '\\textregistered');
defineSymbol(math, textord, '\u{2221}', '\\measuredangle', true);
defineSymbol(math, textord, '\u{2204}', '\\nexists');
defineSymbol(math, textord, '\u{2127}', '\\mho');
defineSymbol(math, textord, '\u{2132}', '\\Finv', true);
defineSymbol(math, textord, '\u{2141}', '\\Game', true);
defineSymbol(math, textord, '\u{2035}', '\\backprime');
defineSymbol(math, textord, '\u{2036}', '\\backdprime');
defineSymbol(math, textord, '\u{2037}', '\\backtrprime');
defineSymbol(math, textord, '\u{25B2}', '\\blacktriangle');
defineSymbol(math, textord, '\u{25BC}', '\\blacktriangledown');
defineSymbol(math, textord, '\u{25A0}', '\\blacksquare');
defineSymbol(math, textord, '\u{29EB}', '\\blacklozenge');
defineSymbol(math, textord, '\u{2605}', '\\bigstar');
defineSymbol(math, textord, '\u{2222}', '\\sphericalangle', true);
defineSymbol(math, textord, '\u{2201}', '\\complement', true);
defineSymbol(math, textord, '\u{2571}', '\\diagup');
defineSymbol(math, textord, '\u{2572}', '\\diagdown');
defineSymbol(math, textord, '\u{25A1}', '\\square');
defineSymbol(math, textord, '\u{25A1}', '\\Box');
defineSymbol(math, textord, '\u{25CA}', '\\Diamond');
// unicode-math maps U+A5 to \mathyen. We map to AMS function \yen
defineSymbol(math, textord, '\u{A5}', '\\yen', true);
defineSymbol(text, textord, '\u{A5}', '\\yen', true);
defineSymbol(math, textord, '\u{2713}', '\\checkmark', true);
defineSymbol(text, textord, '\u{2713}', '\\checkmark');
defineSymbol(math, textord, '\u{2717}', '\\ballotx', true);
defineSymbol(text, textord, '\u{2717}', '\\ballotx');
defineSymbol(text, textord, '\u{2022}', '\\textbullet');

// AMS Hebrew
defineSymbol(math, textord, '\u{2136}', '\\beth', true);
defineSymbol(math, textord, '\u{2138}', '\\daleth', true);
defineSymbol(math, textord, '\u{2137}', '\\gimel', true);

// AMS Greek
defineSymbol(math, textord, '\u{3DD}', '\\digamma', true);
defineSymbol(math, textord, '\u{3F0}', '\\varkappa');

// AMS Delimiters
defineSymbol(math, open, '\u{231C}', '\\ulcorner', true);
defineSymbol(math, close, '\u{231D}', '\\urcorner', true);
defineSymbol(math, open, '\u{231E}', '\\llcorner', true);
defineSymbol(math, close, '\u{231F}', '\\lrcorner', true);

// AMS Binary Relations
defineSymbol(math, rel, '\u{2266}', '\\leqq', true);
defineSymbol(math, rel, '\u{2A7D}', '\\leqslant', true);
defineSymbol(math, rel, '\u{2A95}', '\\eqslantless', true);
defineSymbol(math, rel, '\u{2272}', '\\lesssim', true);
defineSymbol(math, rel, '\u{2A85}', '\\lessapprox', true);
defineSymbol(math, rel, '\u{224A}', '\\approxeq', true);
defineSymbol(math, bin, '\u{22D6}', '\\lessdot');
defineSymbol(math, rel, '\u{22D8}', '\\lll', true);
defineSymbol(math, rel, '\u{2276}', '\\lessgtr', true);
defineSymbol(math, rel, '\u{22DA}', '\\lesseqgtr', true);
defineSymbol(math, rel, '\u{2A8B}', '\\lesseqqgtr', true);
defineSymbol(math, rel, '\u{2251}', '\\doteqdot');
defineSymbol(math, rel, '\u{2253}', '\\risingdotseq', true);
defineSymbol(math, rel, '\u{2252}', '\\fallingdotseq', true);
defineSymbol(math, rel, '\u{223D}', '\\backsim', true);
defineSymbol(math, rel, '\u{22CD}', '\\backsimeq', true);
defineSymbol(math, rel, '\u{2AC5}', '\\subseteqq', true);
defineSymbol(math, rel, '\u{22D0}', '\\Subset', true);
defineSymbol(math, rel, '\u{228F}', '\\sqsubset', true);
defineSymbol(math, rel, '\u{227C}', '\\preccurlyeq', true);
defineSymbol(math, rel, '\u{22DE}', '\\curlyeqprec', true);
defineSymbol(math, rel, '\u{227E}', '\\precsim', true);
defineSymbol(math, rel, '\u{2AB7}', '\\precapprox', true);
defineSymbol(math, rel, '\u{22B2}', '\\vartriangleleft');
defineSymbol(math, rel, '\u{22B4}', '\\trianglelefteq');
defineSymbol(math, rel, '\u{22A8}', '\\vDash', true);
defineSymbol(math, rel, '\u{22AB}', '\\VDash', true);
defineSymbol(math, rel, '\u{22AA}', '\\Vvdash', true);
defineSymbol(math, rel, '\u{2323}', '\\smallsmile');
defineSymbol(math, rel, '\u{2322}', '\\smallfrown');
defineSymbol(math, rel, '\u{224F}', '\\bumpeq', true);
defineSymbol(math, rel, '\u{224E}', '\\Bumpeq', true);
defineSymbol(math, rel, '\u{2267}', '\\geqq', true);
defineSymbol(math, rel, '\u{2A7E}', '\\geqslant', true);
defineSymbol(math, rel, '\u{2A96}', '\\eqslantgtr', true);
defineSymbol(math, rel, '\u{2273}', '\\gtrsim', true);
defineSymbol(math, rel, '\u{2A86}', '\\gtrapprox', true);
defineSymbol(math, bin, '\u{22D7}', '\\gtrdot');
defineSymbol(math, rel, '\u{22D9}', '\\ggg', true);
defineSymbol(math, rel, '\u{2277}', '\\gtrless', true);
defineSymbol(math, rel, '\u{22DB}', '\\gtreqless', true);
defineSymbol(math, rel, '\u{2A8C}', '\\gtreqqless', true);
defineSymbol(math, rel, '\u{2256}', '\\eqcirc', true);
defineSymbol(math, rel, '\u{2257}', '\\circeq', true);
defineSymbol(math, rel, '\u{225C}', '\\triangleq', true);
defineSymbol(math, rel, '\u{223C}', '\\thicksim');
defineSymbol(math, rel, '\u{2248}', '\\thickapprox');
defineSymbol(math, rel, '\u{2AC6}', '\\supseteqq', true);
defineSymbol(math, rel, '\u{22D1}', '\\Supset', true);
defineSymbol(math, rel, '\u{2290}', '\\sqsupset', true);
defineSymbol(math, rel, '\u{227D}', '\\succcurlyeq', true);
defineSymbol(math, rel, '\u{22DF}', '\\curlyeqsucc', true);
defineSymbol(math, rel, '\u{227F}', '\\succsim', true);
defineSymbol(math, rel, '\u{2AB8}', '\\succapprox', true);
defineSymbol(math, rel, '\u{22B3}', '\\vartriangleright');
defineSymbol(math, rel, '\u{22B5}', '\\trianglerighteq');
defineSymbol(math, rel, '\u{22A9}', '\\Vdash', true);
defineSymbol(math, rel, '\u{2223}', '\\shortmid');
defineSymbol(math, rel, '\u{2225}', '\\shortparallel');
defineSymbol(math, rel, '\u{226C}', '\\between', true);
defineSymbol(math, rel, '\u{22D4}', '\\pitchfork', true);
defineSymbol(math, rel, '\u{221D}', '\\varpropto');
defineSymbol(math, rel, '\u{25C0}', '\\blacktriangleleft');
// unicode-math says that \therefore is a mathord atom.
// We kept the amssymb atom type, which is rel.
defineSymbol(math, rel, '\u{2234}', '\\therefore', true);
defineSymbol(math, rel, '\u{220D}', '\\backepsilon');
defineSymbol(math, rel, '\u{25B6}', '\\blacktriangleright');
// unicode-math says that \because is a mathord atom.
// We kept the amssymb atom type, which is rel.
defineSymbol(math, rel, '\u{2235}', '\\because', true);
defineSymbol(math, rel, '\u{22D8}', '\\llless');
defineSymbol(math, rel, '\u{22D9}', '\\gggtr');
defineSymbol(math, bin, '\u{22B2}', '\\lhd');
defineSymbol(math, bin, '\u{22B3}', '\\rhd');
defineSymbol(math, rel, '\u{2242}', '\\eqsim', true);
defineSymbol(math, rel, '\u{2251}', '\\Doteq', true);
defineSymbol(math, rel, '\u{297D}', '\\strictif', true);
defineSymbol(math, rel, '\u{297C}', '\\strictfi', true);

// AMS Binary Operators
defineSymbol(math, bin, '\u{2214}', '\\dotplus', true);
defineSymbol(math, bin, '\u{2216}', '\\smallsetminus');
defineSymbol(math, bin, '\u{22D2}', '\\Cap', true);
defineSymbol(math, bin, '\u{22D3}', '\\Cup', true);
defineSymbol(math, bin, '\u{2A5E}', '\\doublebarwedge', true);
defineSymbol(math, bin, '\u{229F}', '\\boxminus', true);
defineSymbol(math, bin, '\u{229E}', '\\boxplus', true);
defineSymbol(math, bin, '\u{29C4}', '\\boxslash', true);
defineSymbol(math, bin, '\u{22C7}', '\\divideontimes', true);
defineSymbol(math, bin, '\u{22C9}', '\\ltimes', true);
defineSymbol(math, bin, '\u{22CA}', '\\rtimes', true);
defineSymbol(math, bin, '\u{22CB}', '\\leftthreetimes', true);
defineSymbol(math, bin, '\u{22CC}', '\\rightthreetimes', true);
defineSymbol(math, bin, '\u{22CF}', '\\curlywedge', true);
defineSymbol(math, bin, '\u{22CE}', '\\curlyvee', true);
defineSymbol(math, bin, '\u{229D}', '\\circleddash', true);
defineSymbol(math, bin, '\u{229B}', '\\circledast', true);
defineSymbol(math, bin, '\u{22BA}', '\\intercal', true);
defineSymbol(math, bin, '\u{22D2}', '\\doublecap');
defineSymbol(math, bin, '\u{22D3}', '\\doublecup');
defineSymbol(math, bin, '\u{22A0}', '\\boxtimes', true);
defineSymbol(math, bin, '\u{22C8}', '\\bowtie', true);
defineSymbol(math, bin, '\u{22C8}', '\\Join');
defineSymbol(math, bin, '\u{27D5}', '\\leftouterjoin', true);
defineSymbol(math, bin, '\u{27D6}', '\\rightouterjoin', true);
defineSymbol(math, bin, '\u{27D7}', '\\fullouterjoin', true);

// stix Binary Operators
defineSymbol(math, bin, '\u{2238}', '\\dotminus', true);
defineSymbol(math, bin, '\u{27D1}', '\\wedgedot', true);
defineSymbol(math, bin, '\u{27C7}', '\\veedot', true);
defineSymbol(math, bin, '\u{2A62}', '\\doublebarvee', true);
defineSymbol(math, bin, '\u{2A63}', '\\veedoublebar', true);
defineSymbol(math, bin, '\u{2A5F}', '\\wedgebar', true);
defineSymbol(math, bin, '\u{2A60}', '\\wedgedoublebar', true);
defineSymbol(math, bin, '\u{2A54}', '\\Vee', true);
defineSymbol(math, bin, '\u{2A53}', '\\Wedge', true);
defineSymbol(math, bin, '\u{2A43}', '\\barcap', true);
defineSymbol(math, bin, '\u{2A42}', '\\barcup', true);
defineSymbol(math, bin, '\u{2A48}', '\\capbarcup', true);
defineSymbol(math, bin, '\u{2A40}', '\\capdot', true);
defineSymbol(math, bin, '\u{2A47}', '\\capovercup', true);
defineSymbol(math, bin, '\u{2A46}', '\\cupovercap', true);
defineSymbol(math, bin, '\u{2A4D}', '\\closedvarcap', true);
defineSymbol(math, bin, '\u{2A4C}', '\\closedvarcup', true);
defineSymbol(math, bin, '\u{2A2A}', '\\minusdot', true);
defineSymbol(math, bin, '\u{2A2B}', '\\minusfdots', true);
defineSymbol(math, bin, '\u{2A2C}', '\\minusrdots', true);
defineSymbol(math, bin, '\u{22BB}', '\\Xor', true);
defineSymbol(math, bin, '\u{22BC}', '\\Nand', true);
defineSymbol(math, bin, '\u{22BD}', '\\Nor', true);
defineSymbol(math, bin, '\u{22BD}', '\\barvee');
defineSymbol(math, bin, '\u{2AF4}', '\\interleave', true);
defineSymbol(math, bin, '\u{29E2}', '\\shuffle', true);
defineSymbol(math, bin, '\u{2AF6}', '\\threedotcolon', true);
defineSymbol(math, bin, '\u{2982}', '\\typecolon', true);
defineSymbol(math, bin, '\u{223E}', '\\invlazys', true);
defineSymbol(math, bin, '\u{2A4B}', '\\twocaps', true);
defineSymbol(math, bin, '\u{2A4A}', '\\twocups', true);
defineSymbol(math, bin, '\u{2A4E}', '\\Sqcap', true);
defineSymbol(math, bin, '\u{2A4F}', '\\Sqcup', true);
defineSymbol(math, bin, '\u{2A56}', '\\veeonvee', true);
defineSymbol(math, bin, '\u{2A55}', '\\wedgeonwedge', true);
defineSymbol(math, bin, '\u{29D7}', '\\blackhourglass', true);
defineSymbol(math, bin, '\u{29C6}', '\\boxast', true);
defineSymbol(math, bin, '\u{29C8}', '\\boxbox', true);
defineSymbol(math, bin, '\u{29C7}', '\\boxcircle', true);
defineSymbol(math, bin, '\u{229C}', '\\circledequal', true);
defineSymbol(math, bin, '\u{29B7}', '\\circledparallel', true);
defineSymbol(math, bin, '\u{29B6}', '\\circledvert', true);
defineSymbol(math, bin, '\u{29B5}', '\\circlehbar', true);
defineSymbol(math, bin, '\u{27E1}', '\\concavediamond', true);
defineSymbol(math, bin, '\u{27E2}', '\\concavediamondtickleft', true);
defineSymbol(math, bin, '\u{27E3}', '\\concavediamondtickright', true);
defineSymbol(math, bin, '\u{22C4}', '\\diamond', true);
defineSymbol(math, bin, '\u{29D6}', '\\hourglass', true);
defineSymbol(math, bin, '\u{27E0}', '\\lozengeminus', true);
defineSymbol(math, bin, '\u{233D}', '\\obar', true);
defineSymbol(math, bin, '\u{29B8}', '\\obslash', true);
defineSymbol(math, bin, '\u{2A38}', '\\odiv', true);
defineSymbol(math, bin, '\u{29C1}', '\\ogreaterthan', true);
defineSymbol(math, bin, '\u{29C0}', '\\olessthan', true);
defineSymbol(math, bin, '\u{29B9}', '\\operp', true);
defineSymbol(math, bin, '\u{2A37}', '\\Otimes', true);
defineSymbol(math, bin, '\u{2A36}', '\\otimeshat', true);
defineSymbol(math, bin, '\u{22C6}', '\\star', true);
defineSymbol(math, bin, '\u{25B3}', '\\triangle', true);
defineSymbol(math, bin, '\u{2A3A}', '\\triangleminus', true);
defineSymbol(math, bin, '\u{2A39}', '\\triangleplus', true);
defineSymbol(math, bin, '\u{2A3B}', '\\triangletimes', true);
defineSymbol(math, bin, '\u{27E4}', '\\whitesquaretickleft', true);
defineSymbol(math, bin, '\u{27E5}', '\\whitesquaretickright', true);
defineSymbol(math, bin, '\u{2A33}', '\\smashtimes', true);

// AMS Arrows
// Note: unicode-math maps \u21e2 to their own function \rightdasharrow.
// We'll map it to AMS function \dashrightarrow. It produces the same atom.
defineSymbol(math, rel, '\u{21E2}', '\\dashrightarrow', true);
// unicode-math maps \u21e0 to \leftdasharrow. We'll use the AMS synonym.
defineSymbol(math, rel, '\u{21E0}', '\\dashleftarrow', true);
defineSymbol(math, rel, '\u{21C7}', '\\leftleftarrows', true);
defineSymbol(math, rel, '\u{21C6}', '\\leftrightarrows', true);
defineSymbol(math, rel, '\u{21DA}', '\\Lleftarrow', true);
defineSymbol(math, rel, '\u{219E}', '\\twoheadleftarrow', true);
defineSymbol(math, rel, '\u{21A2}', '\\leftarrowtail', true);
defineSymbol(math, rel, '\u{21AB}', '\\looparrowleft', true);
defineSymbol(math, rel, '\u{21CB}', '\\leftrightharpoons', true);
defineSymbol(math, rel, '\u{21B6}', '\\curvearrowleft', true);
// unicode-math maps \u21ba to \acwopencirclearrow. We'll use the AMS synonym.
defineSymbol(math, rel, '\u{21BA}', '\\circlearrowleft', true);
defineSymbol(math, rel, '\u{21B0}', '\\Lsh', true);
defineSymbol(math, rel, '\u{21C8}', '\\upuparrows', true);
defineSymbol(math, rel, '\u{21BF}', '\\upharpoonleft', true);
defineSymbol(math, rel, '\u{21C3}', '\\downharpoonleft', true);
defineSymbol(math, rel, '\u{22B6}', '\\origof', true);
defineSymbol(math, rel, '\u{22B7}', '\\imageof', true);
defineSymbol(math, rel, '\u{22B8}', '\\multimap', true);
defineSymbol(math, rel, '\u{21AD}', '\\leftrightsquigarrow', true);
defineSymbol(math, rel, '\u{21C9}', '\\rightrightarrows', true);
defineSymbol(math, rel, '\u{21C4}', '\\rightleftarrows', true);
defineSymbol(math, rel, '\u{21A0}', '\\twoheadrightarrow', true);
defineSymbol(math, rel, '\u{21A3}', '\\rightarrowtail', true);
defineSymbol(math, rel, '\u{21AC}', '\\looparrowright', true);
defineSymbol(math, rel, '\u{21B7}', '\\curvearrowright', true);
// unicode-math maps \u21bb to \cwopencirclearrow. We'll use the AMS synonym.
defineSymbol(math, rel, '\u{21BB}', '\\circlearrowright', true);
defineSymbol(math, rel, '\u{21B1}', '\\Rsh', true);
defineSymbol(math, rel, '\u{21CA}', '\\downdownarrows', true);
defineSymbol(math, rel, '\u{21BE}', '\\upharpoonright', true);
defineSymbol(math, rel, '\u{21C2}', '\\downharpoonright', true);
defineSymbol(math, rel, '\u{21DD}', '\\rightsquigarrow', true);
defineSymbol(math, rel, '\u{21DD}', '\\leadsto');
defineSymbol(math, rel, '\u{21DB}', '\\Rrightarrow', true);
defineSymbol(math, rel, '\u{21BE}', '\\restriction');

defineSymbol(math, textord, '\u{2018}', '`');
defineSymbol(math, textord, '$', '\\$');
defineSymbol(text, textord, '$', '\\$');
defineSymbol(text, textord, '$', '\\textdollar');
defineSymbol(math, textord, '¢', '\\cent');
defineSymbol(text, textord, '¢', '\\cent');
defineSymbol(math, textord, '%', '\\%');
defineSymbol(text, textord, '%', '\\%');
defineSymbol(math, textord, '_', '\\_');
defineSymbol(text, textord, '_', '\\_');
defineSymbol(text, textord, '_', '\\textunderscore');
defineSymbol(text, textord, '\u{2423}', '\\textvisiblespace', true);
defineSymbol(math, textord, '\u{2220}', '\\angle', true);
defineSymbol(math, textord, '\u{221E}', '\\infty', true);
defineSymbol(math, textord, '\u{2032}', '\\prime');
defineSymbol(math, textord, '\u{2033}', '\\dprime');
defineSymbol(math, textord, '\u{2034}', '\\trprime');
defineSymbol(math, textord, '\u{2057}', '\\qprime');
defineSymbol(math, textord, '\u{25B3}', '\\triangle');
defineSymbol(text, textord, '\u{391}', '\\Alpha', true);
defineSymbol(text, textord, '\u{392}', '\\Beta', true);
defineSymbol(text, textord, '\u{393}', '\\Gamma', true);
defineSymbol(text, textord, '\u{394}', '\\Delta', true);
defineSymbol(text, textord, '\u{395}', '\\Epsilon', true);
defineSymbol(text, textord, '\u{396}', '\\Zeta', true);
defineSymbol(text, textord, '\u{397}', '\\Eta', true);
defineSymbol(text, textord, '\u{398}', '\\Theta', true);
defineSymbol(text, textord, '\u{399}', '\\Iota', true);
defineSymbol(text, textord, '\u{39A}', '\\Kappa', true);
defineSymbol(text, textord, '\u{39B}', '\\Lambda', true);
defineSymbol(text, textord, '\u{39C}', '\\Mu', true);
defineSymbol(text, textord, '\u{39D}', '\\Nu', true);
defineSymbol(text, textord, '\u{39E}', '\\Xi', true);
defineSymbol(text, textord, '\u{39F}', '\\Omicron', true);
defineSymbol(text, textord, '\u{3A0}', '\\Pi', true);
defineSymbol(text, textord, '\u{3A1}', '\\Rho', true);
defineSymbol(text, textord, '\u{3A3}', '\\Sigma', true);
defineSymbol(text, textord, '\u{3A4}', '\\Tau', true);
defineSymbol(text, textord, '\u{3A5}', '\\Upsilon', true);
defineSymbol(text, textord, '\u{3A6}', '\\Phi', true);
defineSymbol(text, textord, '\u{3A7}', '\\Chi', true);
defineSymbol(text, textord, '\u{3A8}', '\\Psi', true);
defineSymbol(text, textord, '\u{3A9}', '\\Omega', true);
defineSymbol(math, mathord, '\u{391}', '\\Alpha', true);
defineSymbol(math, mathord, '\u{392}', '\\Beta', true);
defineSymbol(math, mathord, '\u{393}', '\\Gamma', true);
defineSymbol(math, mathord, '\u{394}', '\\Delta', true);
defineSymbol(math, mathord, '\u{395}', '\\Epsilon', true);
defineSymbol(math, mathord, '\u{396}', '\\Zeta', true);
defineSymbol(math, mathord, '\u{397}', '\\Eta', true);
defineSymbol(math, mathord, '\u{398}', '\\Theta', true);
defineSymbol(math, mathord, '\u{399}', '\\Iota', true);
defineSymbol(math, mathord, '\u{39A}', '\\Kappa', true);
defineSymbol(math, mathord, '\u{39B}', '\\Lambda', true);
defineSymbol(math, mathord, '\u{39C}', '\\Mu', true);
defineSymbol(math, mathord, '\u{39D}', '\\Nu', true);
defineSymbol(math, mathord, '\u{39E}', '\\Xi', true);
defineSymbol(math, mathord, '\u{39F}', '\\Omicron', true);
defineSymbol(math, mathord, '\u{3A0}', '\\Pi', true);
defineSymbol(math, mathord, '\u{3A1}', '\\Rho', true);
defineSymbol(math, mathord, '\u{3A3}', '\\Sigma', true);
defineSymbol(math, mathord, '\u{3A4}', '\\Tau', true);
defineSymbol(math, mathord, '\u{3A5}', '\\Upsilon', true);
defineSymbol(math, mathord, '\u{3A6}', '\\Phi', true);
defineSymbol(math, mathord, '\u{3A7}', '\\Chi', true);
defineSymbol(math, mathord, '\u{3A8}', '\\Psi', true);
defineSymbol(math, mathord, '\u{3A9}', '\\Omega', true);
defineSymbol(math, open, '\u{AC}', '\\neg', true);
defineSymbol(math, open, '\u{AC}', '\\lnot');
defineSymbol(math, textord, '\u{22A4}', '\\top');
defineSymbol(math, textord, '\u{22A5}', '\\bot');
defineSymbol(math, textord, '\u{2205}', '\\emptyset');
defineSymbol(math, textord, '\u{2300}', '\\varnothing');
defineSymbol(math, mathord, '\u{3B1}', '\\alpha', true);
defineSymbol(math, mathord, '\u{3B2}', '\\beta', true);
defineSymbol(math, mathord, '\u{3B3}', '\\gamma', true);
defineSymbol(math, mathord, '\u{3B4}', '\\delta', true);
defineSymbol(math, mathord, '\u{3F5}', '\\epsilon', true);
defineSymbol(math, mathord, '\u{3B6}', '\\zeta', true);
defineSymbol(math, mathord, '\u{3B7}', '\\eta', true);
defineSymbol(math, mathord, '\u{3B8}', '\\theta', true);
defineSymbol(math, mathord, '\u{3B9}', '\\iota', true);
defineSymbol(math, mathord, '\u{3BA}', '\\kappa', true);
defineSymbol(math, mathord, '\u{3BB}', '\\lambda', true);
defineSymbol(math, mathord, '\u{3BC}', '\\mu', true);
defineSymbol(math, mathord, '\u{3BD}', '\\nu', true);
defineSymbol(math, mathord, '\u{3BE}', '\\xi', true);
defineSymbol(math, mathord, '\u{3BF}', '\\omicron', true);
defineSymbol(math, mathord, '\u{3C0}', '\\pi', true);
defineSymbol(math, mathord, '\u{3C1}', '\\rho', true);
defineSymbol(math, mathord, '\u{3C3}', '\\sigma', true);
defineSymbol(math, mathord, '\u{3C4}', '\\tau', true);
defineSymbol(math, mathord, '\u{3C5}', '\\upsilon', true);
defineSymbol(math, mathord, '\u{3D5}', '\\phi', true);
defineSymbol(math, mathord, '\u{3C7}', '\\chi', true);
defineSymbol(math, mathord, '\u{3C8}', '\\psi', true);
defineSymbol(math, mathord, '\u{3C9}', '\\omega', true);
defineSymbol(math, mathord, '\u{3B5}', '\\varepsilon', true);
defineSymbol(math, mathord, '\u{3D1}', '\\vartheta', true);
defineSymbol(math, mathord, '\u{3D6}', '\\varpi', true);
defineSymbol(math, mathord, '\u{3F1}', '\\varrho', true);
defineSymbol(math, mathord, '\u{3C2}', '\\varsigma', true);
defineSymbol(math, mathord, '\u{3C6}', '\\varphi', true);
defineSymbol(math, mathord, '\u{3D8}', '\\Coppa', true);
defineSymbol(math, mathord, '\u{3D9}', '\\coppa', true);
defineSymbol(math, mathord, '\u{3D9}', '\\varcoppa', true);
defineSymbol(math, mathord, '\u{3DE}', '\\Koppa', true);
defineSymbol(math, mathord, '\u{3DF}', '\\koppa', true);
defineSymbol(math, mathord, '\u{3E0}', '\\Sampi', true);
defineSymbol(math, mathord, '\u{3E1}', '\\sampi', true);
defineSymbol(math, mathord, '\u{3DA}', '\\Stigma', true);
defineSymbol(math, mathord, '\u{3DB}', '\\stigma', true);
defineSymbol(math, mathord, '\u{2AEB}', '\\Bot');

// unicode-math maps U+F0 to \matheth. We map to AMS function \eth
defineSymbol(math, textord, '\u{F0}', '\\eth', true); // ð
defineSymbol(text, textord, '\u{F0}', '\u{F0}');
// Extended ASCII and non-ASCII Letters
defineSymbol(math, textord, '\u{C5}', '\\AA'); // Å
defineSymbol(text, textord, '\u{C5}', '\\AA', true);
defineSymbol(math, textord, '\u{C6}', '\\AE', true); // Æ
defineSymbol(text, textord, '\u{C6}', '\\AE', true);
defineSymbol(math, textord, '\u{D0}', '\\DH', true); // Ð
defineSymbol(text, textord, '\u{D0}', '\\DH', true);
defineSymbol(math, textord, '\u{DE}', '\\TH', true); // Þ
defineSymbol(text, textord, '\u{DE}', '\\TH', true);
defineSymbol(math, textord, '\u{DF}', '\\ss', true); // ß
defineSymbol(text, textord, '\u{DF}', '\\ss', true);
defineSymbol(math, textord, '\u{E5}', '\\aa'); // å
defineSymbol(text, textord, '\u{E5}', '\\aa', true);
defineSymbol(math, textord, '\u{E6}', '\\ae', true); // æ
defineSymbol(text, textord, '\u{E6}', '\\ae', true);
defineSymbol(math, textord, '\u{F0}', '\\dh'); // ð
defineSymbol(text, textord, '\u{F0}', '\\dh', true);
defineSymbol(math, textord, '\u{FE}', '\\th', true); // þ
defineSymbol(text, textord, '\u{FE}', '\\th', true);
defineSymbol(math, textord, '\u{110}', '\\DJ', true); // Đ
defineSymbol(text, textord, '\u{110}', '\\DJ', true);
defineSymbol(math, textord, '\u{111}', '\\dj', true); // đ
defineSymbol(text, textord, '\u{111}', '\\dj', true);
defineSymbol(math, textord, '\u{141}', '\\L', true); // Ł
defineSymbol(text, textord, '\u{141}', '\\L', true);
defineSymbol(math, textord, '\u{141}', '\\l', true); // ł
defineSymbol(text, textord, '\u{141}', '\\l', true);
defineSymbol(math, textord, '\u{14A}', '\\NG', true); // Ŋ
defineSymbol(text, textord, '\u{14A}', '\\NG', true);
defineSymbol(math, textord, '\u{14B}', '\\ng', true); // ŋ
defineSymbol(text, textord, '\u{14B}', '\\ng', true);
defineSymbol(math, textord, '\u{152}', '\\OE', true); // Œ
defineSymbol(text, textord, '\u{152}', '\\OE', true);
defineSymbol(math, textord, '\u{153}', '\\oe', true); // œ
defineSymbol(text, textord, '\u{153}', '\\oe', true);

defineSymbol(math, bin, '\u{2217}', '\u{2217}', true);
defineSymbol(math, bin, '+', '+');
defineSymbol(math, bin, '\u{2217}', '*');
defineSymbol(math, bin, '\u{2044}', '/', true);
defineSymbol(math, bin, '\u{2044}', '\u{2044}');
defineSymbol(math, bin, '\u{2212}', '-', true);
defineSymbol(math, bin, '\u{22C5}', '\\cdot', true);
defineSymbol(math, bin, '\u{2218}', '\\circ', true);
defineSymbol(math, bin, '\u{F7}', '\\div', true);
defineSymbol(math, bin, '\u{B1}', '\\pm', true);
defineSymbol(math, bin, '\u{D7}', '\\times', true);
defineSymbol(math, bin, '\u{2229}', '\\cap', true);
defineSymbol(math, bin, '\u{222A}', '\\cup', true);
defineSymbol(math, bin, '\u{2216}', '\\setminus', true);
defineSymbol(math, bin, '\u{2227}', '\\land');
defineSymbol(math, bin, '\u{2228}', '\\lor');
defineSymbol(math, bin, '\u{2227}', '\\wedge', true);
defineSymbol(math, bin, '\u{2228}', '\\vee', true);
defineSymbol(math, open, '\u{27E6}', '\\llbracket', true); // stmaryrd/semantic packages
defineSymbol(math, close, '\u{27E7}', '\\rrbracket', true);
defineSymbol(math, open, '\u{27E8}', '\\langle', true);
defineSymbol(math, open, '\u{27EA}', '\\lAngle', true);
defineSymbol(math, open, '\u{2989}', '\\llangle', true);
defineSymbol(math, open, '|', '\\lvert');
defineSymbol(math, open, '\u{2016}', '\\lVert', true);
defineSymbol(math, textord, '!', '\\oc'); // cmll package
defineSymbol(math, textord, '?', '\\wn');
defineSymbol(math, textord, '\u{2193}', '\\shpos');
defineSymbol(math, textord, '\u{2195}', '\\shift');
defineSymbol(math, textord, '\u{2191}', '\\shneg');
defineSymbol(math, close, '?', '?');
defineSymbol(math, close, '!', '!');
defineSymbol(math, close, '‼', '‼');
defineSymbol(math, close, '\u{27E9}', '\\rangle', true);
defineSymbol(math, close, '\u{27EB}', '\\rAngle', true);
defineSymbol(math, close, '\u{298A}', '\\rrangle', true);
defineSymbol(math, close, '|', '\\rvert');
defineSymbol(math, close, '\u{2016}', '\\rVert');
defineSymbol(math, open, '\u{2983}', '\\lBrace', true); // stmaryrd/semantic packages
defineSymbol(math, close, '\u{2984}', '\\rBrace', true);
defineSymbol(math, rel, '=', '\\equal', true);
defineSymbol(math, rel, ':', ':');
defineSymbol(math, rel, '\u{2248}', '\\approx', true);
defineSymbol(math, rel, '\u{2245}', '\\cong', true);
defineSymbol(math, rel, '\u{2265}', '\\ge');
defineSymbol(math, rel, '\u{2265}', '\\geq', true);
defineSymbol(math, rel, '\u{2190}', '\\gets');
defineSymbol(math, rel, '>', '\\gt', true);
defineSymbol(math, rel, '\u{2208}', '\\in', true);
defineSymbol(math, rel, '\u{2209}', '\\notin', true);
defineSymbol(math, rel, '\u{E020}', '\\@not');
defineSymbol(math, rel, '\u{2282}', '\\subset', true);
defineSymbol(math, rel, '\u{2283}', '\\supset', true);
defineSymbol(math, rel, '\u{2286}', '\\subseteq', true);
defineSymbol(math, rel, '\u{2287}', '\\supseteq', true);
defineSymbol(math, rel, '\u{2288}', '\\nsubseteq', true);
defineSymbol(math, rel, '\u{2288}', '\\nsubseteqq');
defineSymbol(math, rel, '\u{2289}', '\\nsupseteq', true);
defineSymbol(math, rel, '\u{2289}', '\\nsupseteqq');
defineSymbol(math, rel, '\u{22A8}', '\\models');
defineSymbol(math, rel, '\u{2190}', '\\leftarrow', true);
defineSymbol(math, rel, '\u{2264}', '\\le');
defineSymbol(math, rel, '\u{2264}', '\\leq', true);
defineSymbol(math, rel, '<', '\\lt', true);
defineSymbol(math, rel, '\u{2192}', '\\rightarrow', true);
defineSymbol(math, rel, '\u{2192}', '\\to');
defineSymbol(math, rel, '\u{2271}', '\\ngeq', true);
defineSymbol(math, rel, '\u{2271}', '\\ngeqq');
defineSymbol(math, rel, '\u{2271}', '\\ngeqslant');
defineSymbol(math, rel, '\u{2270}', '\\nleq', true);
defineSymbol(math, rel, '\u{2270}', '\\nleqq');
defineSymbol(math, rel, '\u{2270}', '\\nleqslant');
defineSymbol(math, rel, '\u{2AEB}', '\\Perp', true); //cmll package
defineSymbol(math, spacing, '\u{A0}', '\\ ');
defineSymbol(math, spacing, '\u{A0}', '\\space');
// Ref: LaTeX Source 2e: \DeclareRobustCommand{\nobreakspace}{%
defineSymbol(math, spacing, '\u{A0}', '\\nobreakspace');
defineSymbol(text, spacing, '\u{A0}', '\\ ');
defineSymbol(text, spacing, '\u{A0}', ' ');
defineSymbol(text, spacing, '\u{A0}', '\\space');
defineSymbol(text, spacing, '\u{A0}', '\\nobreakspace');
defineSymbol(math, spacing, null, '\\nobreak');
defineSymbol(math, spacing, null, '\\allowbreak');
defineSymbol(math, punct, ',', ',');
defineSymbol(text, punct, ':', ':');
defineSymbol(math, punct, ';', ';');
defineSymbol(math, bin, '\u{22BC}', '\\barwedge');
defineSymbol(math, bin, '\u{22BB}', '\\veebar');
defineSymbol(math, bin, '\u{2299}', '\\odot', true);
// Firefox turns ⊕ into an emoji. So append \uFE0E. Define Unicode character in macros, not here.
defineSymbol(math, bin, '\u{2295}\u{FE0E}', '\\oplus');
defineSymbol(math, bin, '\u{2297}', '\\otimes', true);
defineSymbol(math, textord, '\u{2202}', '\\partial', true);
defineSymbol(math, bin, '\u{2298}', '\\oslash', true);
defineSymbol(math, bin, '\u{229A}', '\\circledcirc', true);
defineSymbol(math, bin, '\u{22A1}', '\\boxdot', true);
defineSymbol(math, bin, '\u{25B3}', '\\bigtriangleup');
defineSymbol(math, bin, '\u{25BD}', '\\bigtriangledown');
defineSymbol(math, bin, '\u{2020}', '\\dagger');
defineSymbol(math, bin, '\u{22C4}', '\\diamond');
defineSymbol(math, bin, '\u{25C3}', '\\triangleleft');
defineSymbol(math, bin, '\u{25B9}', '\\triangleright');
defineSymbol(math, open, '{', '\\{');
defineSymbol(text, textord, '{', '\\{');
defineSymbol(text, textord, '{', '\\textbraceleft');
defineSymbol(math, close, '}', '\\}');
defineSymbol(text, textord, '}', '\\}');
defineSymbol(text, textord, '}', '\\textbraceright');
defineSymbol(math, open, '{', '\\lbrace');
defineSymbol(math, close, '}', '\\rbrace');
defineSymbol(math, open, '[', '\\lbrack', true);
defineSymbol(text, textord, '[', '\\lbrack', true);
defineSymbol(math, close, ']', '\\rbrack', true);
defineSymbol(text, textord, ']', '\\rbrack', true);
defineSymbol(math, open, '(', '\\lparen', true);
defineSymbol(math, close, ')', '\\rparen', true);
defineSymbol(math, open, '⦇', '\\llparenthesis', true);
defineSymbol(math, close, '⦈', '\\rrparenthesis', true);
defineSymbol(text, textord, '<', '\\textless', true); // in T1 fontenc
defineSymbol(text, textord, '>', '\\textgreater', true); // in T1 fontenc
defineSymbol(math, open, '\u{230A}', '\\lfloor', true);
defineSymbol(math, close, '\u{230B}', '\\rfloor', true);
defineSymbol(math, open, '\u{2308}', '\\lceil', true);
defineSymbol(math, close, '\u{2309}', '\\rceil', true);
defineSymbol(math, textord, '\\', '\\backslash');
defineSymbol(math, textord, '|', '|');
defineSymbol(math, textord, '|', '\\vert');
defineSymbol(text, textord, '|', '\\textbar', true); // in T1 fontenc
defineSymbol(math, textord, '\u{2016}', '\\|');
defineSymbol(math, textord, '\u{2016}', '\\Vert');
defineSymbol(text, textord, '\u{2016}', '\\textbardbl');
defineSymbol(text, textord, '~', '\\textasciitilde');
defineSymbol(text, textord, '\\', '\\textbackslash');
defineSymbol(text, textord, '^', '\\textasciicircum');
defineSymbol(math, rel, '\u{2191}', '\\uparrow', true);
defineSymbol(math, rel, '\u{21D1}', '\\Uparrow', true);
defineSymbol(math, rel, '\u{2193}', '\\downarrow', true);
defineSymbol(math, rel, '\u{21D3}', '\\Downarrow', true);
defineSymbol(math, rel, '\u{2195}', '\\updownarrow', true);
defineSymbol(math, rel, '\u{21D5}', '\\Updownarrow', true);
defineSymbol(math, op, '\u{2210}', '\\coprod');
defineSymbol(math, op, '\u{22C1}', '\\bigvee');
defineSymbol(math, op, '\u{22C0}', '\\bigwedge');
defineSymbol(math, op, '\u{2A04}', '\\biguplus');
defineSymbol(math, op, '\u{2A04}', '\\bigcupplus');
defineSymbol(math, op, '\u{2A03}', '\\bigcupdot');
defineSymbol(math, op, '\u{2A07}', '\\bigdoublevee');
defineSymbol(math, op, '\u{2A08}', '\\bigdoublewedge');
defineSymbol(math, op, '\u{22C2}', '\\bigcap');
defineSymbol(math, op, '\u{22C3}', '\\bigcup');
defineSymbol(math, op, '\u{222B}', '\\int');
defineSymbol(math, op, '\u{222B}', '\\intop');
defineSymbol(math, op, '\u{222C}', '\\iint');
defineSymbol(math, op, '\u{222D}', '\\iiint');
defineSymbol(math, op, '\u{220F}', '\\prod');
defineSymbol(math, op, '\u{2211}', '\\sum');
defineSymbol(math, op, '\u{2A02}', '\\bigotimes');
defineSymbol(math, op, '\u{2A01}', '\\bigoplus');
defineSymbol(math, op, '\u{2A00}', '\\bigodot');
defineSymbol(math, op, '\u{2A09}', '\\bigtimes');
defineSymbol(math, op, '\u{222E}', '\\oint');
defineSymbol(math, op, '\u{222F}', '\\oiint');
defineSymbol(math, op, '\u{2230}', '\\oiiint');
defineSymbol(math, op, '\u{2231}', '\\intclockwise');
defineSymbol(math, op, '\u{2232}', '\\varointclockwise');
defineSymbol(math, op, '\u{2A0C}', '\\iiiint');
defineSymbol(math, op, '\u{2A0D}', '\\intbar');
defineSymbol(math, op, '\u{2A0E}', '\\intBar');
defineSymbol(math, op, '\u{2A0F}', '\\fint');
defineSymbol(math, op, '\u{2A12}', '\\rppolint');
defineSymbol(math, op, '\u{2A13}', '\\scpolint');
defineSymbol(math, op, '\u{2A15}', '\\pointint');
defineSymbol(math, op, '\u{2A16}', '\\sqint');
defineSymbol(math, op, '\u{2A17}', '\\intlarhk');
defineSymbol(math, op, '\u{2A18}', '\\intx');
defineSymbol(math, op, '\u{2A19}', '\\intcap');
defineSymbol(math, op, '\u{2A1A}', '\\intcup');
defineSymbol(math, op, '\u{2A05}', '\\bigsqcap');
defineSymbol(math, op, '\u{2A06}', '\\bigsqcup');
defineSymbol(math, op, '\u{222B}', '\\smallint');
defineSymbol(text, inner, '\u{2026}', '\\textellipsis');
defineSymbol(math, inner, '\u{2026}', '\\mathellipsis');
defineSymbol(text, inner, '\u{2026}', '\\ldots', true);
defineSymbol(math, inner, '\u{2026}', '\\dotso');
defineSymbol(math, inner, '\u{2026}', '\\dotsc');
defineSymbol(math, inner, '\u{2026}', '\\ldots', true);
defineSymbol(math, inner, '\u{22F0}', '\\iddots', true);
defineSymbol(math, inner, '\u{22EF}', '\\cdots', true);
defineSymbol(math, inner, '\u{22F1}', '\\ddots', true);
defineSymbol(math, textord, '\u{22EE}', '\\varvdots'); // \vdots is a macro
defineSymbol(text, textord, '\u{22EE}', '\\varvdots');
defineSymbol(math, accent, '\u{B4}', '\\acute');
defineSymbol(math, accent, '`', '\\grave');
defineSymbol(math, accent, '\u{A8}', '\\ddot');
defineSymbol(math, accent, '\u{2026}', '\\dddot');
defineSymbol(math, accent, '\u{2026}.', '\\ddddot');
defineSymbol(math, accent, '~', '\\tilde');
defineSymbol(math, accent, '\u{203E}', '\\bar');
defineSymbol(math, accent, '\u{2D8}', '\\breve');
defineSymbol(math, accent, '\u{2C7}', '\\check');
defineSymbol(math, accent, '\u{2C6}', '\\hat');
defineSymbol(math, accent, '\u{2192}', '\\vec');
defineSymbol(math, accent, '\u{2D9}', '\\dot');
defineSymbol(math, accent, '\u{2DA}', '\\mathring');
defineSymbol(math, mathord, '\u{131}', '\\imath', true);
defineSymbol(math, mathord, '\u{237}', '\\jmath', true);
defineSymbol(math, textord, '\u{131}', '\u{131}');
defineSymbol(math, textord, '\u{237}', '\u{237}');
defineSymbol(text, textord, '\u{131}', '\\i', true);
defineSymbol(text, textord, '\u{237}', '\\j', true);
defineSymbol(text, textord, '\u{F8}', '\\o', true);
defineSymbol(math, mathord, '\u{F8}', '\\o', true);
defineSymbol(text, textord, '\u{D8}', '\\O', true);
defineSymbol(math, mathord, '\u{D8}', '\\O', true);
defineSymbol(text, accent, '\u{2CA}', "\\'"); // acute
defineSymbol(text, accent, '\u{2CB}', '\\`'); // grave
defineSymbol(text, accent, '\u{2C6}', '\\^'); // circumflex
defineSymbol(text, accent, '~', '\\~'); // tilde
defineSymbol(text, accent, '\u{2C9}', '\\='); // macron
defineSymbol(text, accent, '\u{2D8}', '\\u'); // breve
defineSymbol(text, accent, '\u{2D9}', '\\.'); // dot above
defineSymbol(text, accent, '\u{B8}', '\\c'); // cedilla
defineSymbol(text, accent, '\u{2DA}', '\\r'); // ring above
defineSymbol(text, accent, '\u{2C7}', '\\v'); // caron
defineSymbol(text, accent, '\u{A8}', '\\"'); // diaeresis
defineSymbol(text, accent, '\u{2DD}', '\\H'); // double acute
defineSymbol(math, accent, '\u{2CA}', "\\'"); // acute
defineSymbol(math, accent, '\u{2CB}', '\\`'); // grave
defineSymbol(math, accent, '\u{2C6}', '\\^'); // circumflex
defineSymbol(math, accent, '~', '\\~'); // tilde
defineSymbol(math, accent, '\u{2C9}', '\\='); // macron
defineSymbol(math, accent, '\u{2D8}', '\\u'); // breve
defineSymbol(math, accent, '\u{2D9}', '\\.'); // dot above
defineSymbol(math, accent, '\u{B8}', '\\c'); // cedilla
defineSymbol(math, accent, '\u{2DA}', '\\r'); // ring above
defineSymbol(math, accent, '\u{2C7}', '\\v'); // caron
defineSymbol(math, accent, '\u{A8}', '\\"'); // diaeresis
defineSymbol(math, accent, '\u{2DD}', '\\H'); // double acute

// These ligatures are detected and created in Parser.js's `formLigatures`.
export const ligatures = {
  '--': true,
  '---': true,
  '``': true,
  "''": true,
};

defineSymbol(text, textord, '\u{2013}', '--', true);
defineSymbol(text, textord, '\u{2013}', '\\textendash');
defineSymbol(text, textord, '\u{2014}', '---', true);
defineSymbol(text, textord, '\u{2014}', '\\textemdash');
defineSymbol(text, textord, '\u{2018}', '`', true);
defineSymbol(text, textord, '\u{2018}', '\\textquoteleft');
defineSymbol(text, textord, '\u{2019}', "'", true);
defineSymbol(text, textord, '\u{2019}', '\\textquoteright');
defineSymbol(text, textord, '\u{201C}', '``', true);
defineSymbol(text, textord, '\u{201C}', '\\textquotedblleft');
defineSymbol(text, textord, '\u{201D}', "''", true);
defineSymbol(text, textord, '\u{201D}', '\\textquotedblright');
//  \degree from gensymb package
defineSymbol(math, textord, '\u{B0}', '\\degree', true);
defineSymbol(text, textord, '\u{B0}', '\\degree');
// \textdegree from inputenc package
defineSymbol(text, textord, '\u{B0}', '\\textdegree', true);
// TODO: In LaTeX, \pounds can generate a different character in text and math
// mode, but among our fonts, only Main-Regular defines this character "163".
defineSymbol(math, textord, '\u{A3}', '\\pounds');
defineSymbol(math, textord, '\u{A3}', '\\mathsterling', true);
defineSymbol(text, textord, '\u{A3}', '\\pounds');
defineSymbol(text, textord, '\u{A3}', '\\textsterling', true);
defineSymbol(math, textord, '\u{2720}', '\\maltese');
defineSymbol(text, textord, '\u{2720}', '\\maltese');
defineSymbol(math, textord, '\u{20AC}', '\\euro', true);
defineSymbol(text, textord, '\u{20AC}', '\\euro', true);
defineSymbol(text, textord, '\u{20AC}', '\\texteuro');
defineSymbol(math, textord, '\u{A9}', '\\copyright', true);
defineSymbol(text, textord, '\u{A9}', '\\textcopyright');
defineSymbol(math, textord, '\u{2300}', '\\diameter', true);
defineSymbol(text, textord, '\u{2300}', '\\diameter');

// Italic Greek
defineSymbol(math, textord, '𝛤', '\\varGamma');
defineSymbol(math, textord, '𝛥', '\\varDelta');
defineSymbol(math, textord, '𝛩', '\\varTheta');
defineSymbol(math, textord, '𝛬', '\\varLambda');
defineSymbol(math, textord, '𝛯', '\\varXi');
defineSymbol(math, textord, '𝛱', '\\varPi');
defineSymbol(math, textord, '𝛴', '\\varSigma');
defineSymbol(math, textord, '𝛶', '\\varUpsilon');
defineSymbol(math, textord, '𝛷', '\\varPhi');
defineSymbol(math, textord, '𝛹', '\\varPsi');
defineSymbol(math, textord, '𝛺', '\\varOmega');
defineSymbol(text, textord, '𝛤', '\\varGamma');
defineSymbol(text, textord, '𝛥', '\\varDelta');
defineSymbol(text, textord, '𝛩', '\\varTheta');
defineSymbol(text, textord, '𝛬', '\\varLambda');
defineSymbol(text, textord, '𝛯', '\\varXi');
defineSymbol(text, textord, '𝛱', '\\varPi');
defineSymbol(text, textord, '𝛴', '\\varSigma');
defineSymbol(text, textord, '𝛶', '\\varUpsilon');
defineSymbol(text, textord, '𝛷', '\\varPhi');
defineSymbol(text, textord, '𝛹', '\\varPsi');
defineSymbol(text, textord, '𝛺', '\\varOmega');

// There are lots of symbols which are the same, so we add them in afterwards.
// All of these are textords in math mode
const mathTextSymbols = '0123456789/@."';
for (let i = 0; i < mathTextSymbols.length; i++) {
  const ch = mathTextSymbols.charAt(i);
  defineSymbol(math, textord, ch, ch);
}

// All of these are textords in text mode
const textSymbols = '0123456789!@*()-=+";:?/.,';
for (let i = 0; i < textSymbols.length; i++) {
  const ch = textSymbols.charAt(i);
  defineSymbol(text, textord, ch, ch);
}

// All of these are textords in text mode, and mathords in math mode
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
for (let i = 0; i < letters.length; i++) {
  const ch = letters.charAt(i);
  defineSymbol(math, mathord, ch, ch);
  defineSymbol(text, textord, ch, ch);
}

// Some more letters in Unicode Basic Multilingual Plane.
const narrow = 'ÇÐÞçþℂℍℕℙℚℝℤℎℏℊℋℌℐℑℒℓ℘ℛℜℬℰℱℳℭℨ';
for (let i = 0; i < narrow.length; i++) {
  const ch = narrow.charAt(i);
  defineSymbol(math, mathord, ch, ch);
  defineSymbol(text, textord, ch, ch);
}

// The next loop loads wide (surrogate pair) characters.
// We support some letters in the Unicode range U+1D400 to U+1D7FF,
// Mathematical Alphanumeric Symbols.
let wideChar: string;
for (let i = 0; i < letters.length; i++) {
  // The hex numbers in the next line are a surrogate pair.
  // 0xD835 is the high surrogate for all letters in the range we support.
  // 0xDC00 is the low surrogate for bold A.
  wideChar = String.fromCodePoint(0xd8_35, 0xdc_00 + i); // A-Z a-z bold
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCodePoint(0xd8_35, 0xdc_34 + i); // A-Z a-z italic
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCodePoint(0xd8_35, 0xdc_68 + i); // A-Z a-z bold italic
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCodePoint(0xd8_35, 0xdd_04 + i); // A-Z a-z Fractur
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCodePoint(0xd8_35, 0xdd_a0 + i); // A-Z a-z sans-serif
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCodePoint(0xd8_35, 0xdd_d4 + i); // A-Z a-z sans bold
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCodePoint(0xd8_35, 0xde_08 + i); // A-Z a-z sans italic
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCodePoint(0xd8_35, 0xde_70 + i); // A-Z a-z monospace
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCodePoint(0xd8_35, 0xdd_38 + i); // A-Z a-z double struck
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  const ch = letters.charAt(i);
  wideChar = String.fromCodePoint(0xd8_35, 0xdc_9c + i); // A-Z a-z calligraphic
  defineSymbol(math, mathord, ch, wideChar);
  defineSymbol(text, textord, ch, wideChar);
}

// Next, some wide character numerals
for (let i = 0; i < 10; i++) {
  wideChar = String.fromCodePoint(0xd8_35, 0xdf_ce + i); // 0-9 bold
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCodePoint(0xd8_35, 0xdf_e2 + i); // 0-9 sans serif
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCodePoint(0xd8_35, 0xdf_ec + i); // 0-9 bold sans
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCodePoint(0xd8_35, 0xdf_f6 + i); // 0-9 monospace
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);
}
