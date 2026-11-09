// Chromium does not support the MathML `mathvariant` attribute.
// Instead, we replace ASCII characters with Unicode characters that
// are defined in the font as bold, italic, double-struck, etc.
// This module identifies those Unicode code points.

// First, a few helpers.
const script: Readonly<Record<string, number>> = Object.freeze({
  B: 0x20ea, // Offset from ASCII B to Unicode script B
  E: 0x20eb,
  F: 0x20eb,
  H: 0x20c3,
  I: 0x20c7,
  L: 0x20c6,
  M: 0x20e6,
  R: 0x20c9,
  e: 0x20ca,
  g: 0x20a3,
  o: 0x20c5,
});

const frak: Readonly<Record<string, number>> = Object.freeze({
  C: 0x20ea,
  H: 0x20c4,
  I: 0x20c8,
  R: 0x20ca,
  Z: 0x20ce,
});

const bbb: Readonly<Record<string, number>> = Object.freeze({
  C: 0x20bf, // blackboard bold
  H: 0x20c5,
  N: 0x20c7,
  P: 0x20c9,
  Q: 0x20c9,
  R: 0x20cb,
  Z: 0x20ca,
});

const bold: Readonly<Record<string, number>> = Object.freeze({
  '\u03f5': 0x1d2e7, // lunate epsilon
  '\u03d1': 0x1d30c, // vartheta
  '\u03f0': 0x1d2ee, // varkappa
  '\u03c6': 0x1d319, // varphi
  '\u03f1': 0x1d2ef, // varrho
  '\u03d6': 0x1d30b, // varpi
});

const boldItalic: Readonly<Record<string, number>> = Object.freeze({
  '\u03f5': 0x1d35b, // lunate epsilon
  '\u03d1': 0x1d380, // vartheta
  '\u03f0': 0x1d362, // varkappa
  '\u03c6': 0x1d38d, // varphi
  '\u03f1': 0x1d363, // varrho
  '\u03d6': 0x1d37f, // varpi
});

const boldsf: Readonly<Record<string, number>> = Object.freeze({
  '\u03f5': 0x1d395, // lunate epsilon
  '\u03d1': 0x1d3ba, // vartheta
  '\u03f0': 0x1d39c, // varkappa
  '\u03c6': 0x1d3c7, // varphi
  '\u03f1': 0x1d39d, // varrho
  '\u03d6': 0x1d3b9, // varpi
});

const bisf: Readonly<Record<string, number>> = Object.freeze({
  '\u03f5': 0x1d3cf, // lunate epsilon
  '\u03d1': 0x1d3f4, // vartheta
  '\u03f0': 0x1d3d6, // varkappa
  '\u03c6': 0x1d401, // varphi
  '\u03f1': 0x1d3d7, // varrho
  '\u03d6': 0x1d3f3, // varpi
});

// Code point offsets below are derived from https://www.unicode.org/charts/PDF/U1D400.pdf
// For each block of characters and each variant, the offset to add to the code point.
type Offsets = Record<string, Record<string, (ch: string) => number>>;

const offset: Readonly<Offsets> = Object.freeze({
  upperCaseLatin: {
    // A-Z
    normal: (ch) => {
      return 0;
    },
    bold: (ch) => {
      return 0x1d3bf;
    },
    italic: (ch) => {
      return 0x1d3f3;
    },
    'bold-italic': (ch) => {
      return 0x1d427;
    },
    script: (ch) => {
      return script[ch] || 0x1d45b;
    },
    'script-bold': (ch) => {
      return 0x1d48f;
    },
    fraktur: (ch) => {
      return frak[ch] || 0x1d4c3;
    },
    'fraktur-bold': (ch) => {
      return 0x1d52b;
    },
    'double-struck': (ch) => {
      return bbb[ch] || 0x1d4f7;
    },
    'sans-serif': (ch) => {
      return 0x1d55f;
    },
    'sans-serif-bold': (ch) => {
      return 0x1d593;
    },
    'sans-serif-italic': (ch) => {
      return 0x1d5c7;
    },
    'sans-serif-bold-italic': (ch) => {
      return 0x1d63c;
    },
    monospace: (ch) => {
      return 0x1d62f;
    },
  },
  lowerCaseLatin: {
    // a-z
    normal: (ch) => {
      return 0;
    },
    bold: (ch) => {
      return 0x1d3b9;
    },
    italic: (ch) => {
      return ch === 'h' ? 0x20a6 : 0x1d3ed;
    },
    'bold-italic': (ch) => {
      return 0x1d421;
    },
    script: (ch) => {
      return script[ch] || 0x1d455;
    },
    'script-bold': (ch) => {
      return 0x1d489;
    },
    fraktur: (ch) => {
      return 0x1d4bd;
    },
    'fraktur-bold': (ch) => {
      return 0x1d525;
    },
    'double-struck': (ch) => {
      return 0x1d4f1;
    },
    'sans-serif': (ch) => {
      return 0x1d559;
    },
    'sans-serif-bold': (ch) => {
      return 0x1d58d;
    },
    'sans-serif-italic': (ch) => {
      return 0x1d5c1;
    },
    'sans-serif-bold-italic': (ch) => {
      return 0x1d5f5;
    },
    monospace: (ch) => {
      return 0x1d629;
    },
  },
  upperCaseGreek: {
    // A-Ω
    normal: (ch) => {
      return 0;
    },
    bold: (ch) => {
      return 0x1d317;
    },
    italic: (ch) => {
      return 0x1d351;
    },
    // \boldsymbol actually returns upright bold for upperCaseGreek
    'bold-italic': (ch) => {
      return 0x1d317;
    },
    script: (ch) => {
      return 0;
    },
    'script-bold': (ch) => {
      return 0;
    },
    fraktur: (ch) => {
      return 0;
    },
    'fraktur-bold': (ch) => {
      return 0;
    },
    'double-struck': (ch) => {
      return 0;
    },
    // Unicode has no code points for regular-weight san-serif Greek. Use bold.
    'sans-serif': (ch) => {
      return 0x1d3c5;
    },
    'sans-serif-bold': (ch) => {
      return 0x1d3c5;
    },
    'sans-serif-italic': (ch) => {
      return 0;
    },
    'sans-serif-bold-italic': (ch) => {
      return 0x1d3ff;
    },
    monospace: (ch) => {
      return 0;
    },
  },
  lowerCaseGreek: {
    // α-ω
    normal: (ch) => {
      return 0;
    },
    bold: (ch) => {
      return 0x1d311;
    },
    italic: (ch) => {
      return 0x1d34b;
    },
    'bold-italic': (ch) => {
      return ch === '\u03d5' ? 0x1d37e : 0x1d385;
    },
    script: (ch) => {
      return 0;
    },
    'script-bold': (ch) => {
      return 0;
    },
    fraktur: (ch) => {
      return 0;
    },
    'fraktur-bold': (ch) => {
      return 0;
    },
    'double-struck': (ch) => {
      return 0;
    },
    // Unicode has no code points for regular-weight san-serif Greek. Use bold.
    'sans-serif': (ch) => {
      return 0x1d3bf;
    },
    'sans-serif-bold': (ch) => {
      return 0x1d3bf;
    },
    'sans-serif-italic': (ch) => {
      return 0;
    },
    'sans-serif-bold-italic': (ch) => {
      return 0x1d3f9;
    },
    monospace: (ch) => {
      return 0;
    },
  },
  varGreek: {
    // \varGamma, etc
    normal: (ch) => {
      return 0;
    },
    bold: (ch) => {
      return bold[ch] || -51;
    },
    italic: (ch) => {
      return 0;
    },
    'bold-italic': (ch) => {
      return boldItalic[ch] || 0x3a;
    },
    script: (ch) => {
      return 0;
    },
    'script-bold': (ch) => {
      return 0;
    },
    fraktur: (ch) => {
      return 0;
    },
    'fraktur-bold': (ch) => {
      return 0;
    },
    'double-struck': (ch) => {
      return 0;
    },
    'sans-serif': (ch) => {
      return boldsf[ch] || 0x74;
    },
    'sans-serif-bold': (ch) => {
      return boldsf[ch] || 0x74;
    },
    'sans-serif-italic': (ch) => {
      return 0;
    },
    'sans-serif-bold-italic': (ch) => {
      return bisf[ch] || 0xae;
    },
    monospace: (ch) => {
      return 0;
    },
  },
  numeral: {
    // 0-9
    normal: (ch) => {
      return 0;
    },
    bold: (ch) => {
      return 0x1d79e;
    },
    italic: (ch) => {
      return 0;
    },
    'bold-italic': (ch) => {
      return 0;
    },
    script: (ch) => {
      return 0;
    },
    'script-bold': (ch) => {
      return 0;
    },
    fraktur: (ch) => {
      return 0;
    },
    'fraktur-bold': (ch) => {
      return 0;
    },
    'double-struck': (ch) => {
      return 0x1d7a8;
    },
    'sans-serif': (ch) => {
      return 0x1d7b2;
    },
    'sans-serif-bold': (ch) => {
      return 0x1d7bc;
    },
    'sans-serif-italic': (ch) => {
      return 0;
    },
    'sans-serif-bold-italic': (ch) => {
      return 0;
    },
    monospace: (ch) => {
      return 0x1d7c6;
    },
  },
});

export const variantChar = (ch: string, variant: string): string => {
  const codePoint = ch.codePointAt(0)!;
  const block =
    0x40 < codePoint && codePoint < 0x5b
      ? 'upperCaseLatin'
      : 0x60 < codePoint && codePoint < 0x7b
        ? 'lowerCaseLatin'
        : 0x390 < codePoint && codePoint < 0x3aa
          ? 'upperCaseGreek'
          : (0x3b0 < codePoint && codePoint < 0x3ca) || ch === '\u03d5'
            ? 'lowerCaseGreek'
            : (0x1d6e1 < codePoint && codePoint < 0x1d6fc) || bold[ch]
              ? 'varGreek'
              : 0x2f < codePoint && codePoint < 0x3a
                ? 'numeral'
                : 'other';
  return block === 'other' ? ch : String.fromCodePoint(codePoint + offset[block][variant](ch));
};

export const smallCaps: Readonly<Record<string, string>> = Object.freeze({
  a: 'ᴀ',
  b: 'ʙ',
  c: 'ᴄ',
  d: 'ᴅ',
  e: 'ᴇ',
  f: 'ꜰ',
  g: 'ɢ',
  h: 'ʜ',
  i: 'ɪ',
  j: 'ᴊ',
  k: 'ᴋ',
  l: 'ʟ',
  m: 'ᴍ',
  n: 'ɴ',
  o: 'ᴏ',
  p: 'ᴘ',
  q: 'ǫ',
  r: 'ʀ',
  s: 's',
  t: 'ᴛ',
  u: 'ᴜ',
  v: 'ᴠ',
  w: 'ᴡ',
  x: 'x',
  y: 'ʏ',
  z: 'ᴢ',
});
