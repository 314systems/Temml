// Chromium does not support the MathML `mathvariant` attribute.
// Instead, we replace ASCII characters with Unicode characters that
// are defined in the font as bold, italic, double-struck, etc.
// This module identifies those Unicode code points.

// First, a few helpers.
const script: Readonly<Record<string, number>> = Object.freeze({
  B: 0x20_ea, // Offset from ASCII B to Unicode script B
  E: 0x20_eb,
  F: 0x20_eb,
  H: 0x20_c3,
  I: 0x20_c7,
  L: 0x20_c6,
  M: 0x20_e6,
  R: 0x20_c9,
  e: 0x20_ca,
  g: 0x20_a3,
  o: 0x20_c5,
});

const frak: Readonly<Record<string, number>> = Object.freeze({
  C: 0x20_ea,
  H: 0x20_c4,
  I: 0x20_c8,
  R: 0x20_ca,
  Z: 0x20_ce,
});

const bbb: Readonly<Record<string, number>> = Object.freeze({
  C: 0x20_bf, // blackboard bold
  H: 0x20_c5,
  N: 0x20_c7,
  P: 0x20_c9,
  Q: 0x20_c9,
  R: 0x20_cb,
  Z: 0x20_ca,
});

const bold: Readonly<Record<string, number>> = Object.freeze({
  '\u{3F5}': 0x1_d2_e7, // lunate epsilon
  '\u{3D1}': 0x1_d3_0c, // vartheta
  '\u{3F0}': 0x1_d2_ee, // varkappa
  '\u{3C6}': 0x1_d3_19, // varphi
  '\u{3F1}': 0x1_d2_ef, // varrho
  '\u{3D6}': 0x1_d3_0b, // varpi
});

const boldItalic: Readonly<Record<string, number>> = Object.freeze({
  '\u{3F5}': 0x1_d3_5b, // lunate epsilon
  '\u{3D1}': 0x1_d3_80, // vartheta
  '\u{3F0}': 0x1_d3_62, // varkappa
  '\u{3C6}': 0x1_d3_8d, // varphi
  '\u{3F1}': 0x1_d3_63, // varrho
  '\u{3D6}': 0x1_d3_7f, // varpi
});

const boldsf: Readonly<Record<string, number>> = Object.freeze({
  '\u{3F5}': 0x1_d3_95, // lunate epsilon
  '\u{3D1}': 0x1_d3_ba, // vartheta
  '\u{3F0}': 0x1_d3_9c, // varkappa
  '\u{3C6}': 0x1_d3_c7, // varphi
  '\u{3F1}': 0x1_d3_9d, // varrho
  '\u{3D6}': 0x1_d3_b9, // varpi
});

const bisf: Readonly<Record<string, number>> = Object.freeze({
  '\u{3F5}': 0x1_d3_cf, // lunate epsilon
  '\u{3D1}': 0x1_d3_f4, // vartheta
  '\u{3F0}': 0x1_d3_d6, // varkappa
  '\u{3C6}': 0x1_d4_01, // varphi
  '\u{3F1}': 0x1_d3_d7, // varrho
  '\u{3D6}': 0x1_d3_f3, // varpi
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
      return 0x1_d3_bf;
    },
    italic: (ch) => {
      return 0x1_d3_f3;
    },
    'bold-italic': (ch) => {
      return 0x1_d4_27;
    },
    script: (ch) => {
      return script[ch] || 0x1_d4_5b;
    },
    'script-bold': (ch) => {
      return 0x1_d4_8f;
    },
    fraktur: (ch) => {
      return frak[ch] || 0x1_d4_c3;
    },
    'fraktur-bold': (ch) => {
      return 0x1_d5_2b;
    },
    'double-struck': (ch) => {
      return bbb[ch] || 0x1_d4_f7;
    },
    'sans-serif': (ch) => {
      return 0x1_d5_5f;
    },
    'sans-serif-bold': (ch) => {
      return 0x1_d5_93;
    },
    'sans-serif-italic': (ch) => {
      return 0x1_d5_c7;
    },
    'sans-serif-bold-italic': (ch) => {
      return 0x1_d6_3c;
    },
    monospace: (ch) => {
      return 0x1_d6_2f;
    },
  },
  lowerCaseLatin: {
    // a-z
    normal: (ch) => {
      return 0;
    },
    bold: (ch) => {
      return 0x1_d3_b9;
    },
    italic: (ch) => {
      return ch === 'h' ? 0x20_a6 : 0x1_d3_ed;
    },
    'bold-italic': (ch) => {
      return 0x1_d4_21;
    },
    script: (ch) => {
      return script[ch] || 0x1_d4_55;
    },
    'script-bold': (ch) => {
      return 0x1_d4_89;
    },
    fraktur: (ch) => {
      return 0x1_d4_bd;
    },
    'fraktur-bold': (ch) => {
      return 0x1_d5_25;
    },
    'double-struck': (ch) => {
      return 0x1_d4_f1;
    },
    'sans-serif': (ch) => {
      return 0x1_d5_59;
    },
    'sans-serif-bold': (ch) => {
      return 0x1_d5_8d;
    },
    'sans-serif-italic': (ch) => {
      return 0x1_d5_c1;
    },
    'sans-serif-bold-italic': (ch) => {
      return 0x1_d5_f5;
    },
    monospace: (ch) => {
      return 0x1_d6_29;
    },
  },
  upperCaseGreek: {
    // A-Ω
    normal: (ch) => {
      return 0;
    },
    bold: (ch) => {
      return 0x1_d3_17;
    },
    italic: (ch) => {
      return 0x1_d3_51;
    },
    // \boldsymbol actually returns upright bold for upperCaseGreek
    'bold-italic': (ch) => {
      return 0x1_d3_17;
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
      return 0x1_d3_c5;
    },
    'sans-serif-bold': (ch) => {
      return 0x1_d3_c5;
    },
    'sans-serif-italic': (ch) => {
      return 0;
    },
    'sans-serif-bold-italic': (ch) => {
      return 0x1_d3_ff;
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
      return 0x1_d3_11;
    },
    italic: (ch) => {
      return 0x1_d3_4b;
    },
    'bold-italic': (ch) => {
      return ch === '\u{3D5}' ? 0x1_d3_7e : 0x1_d3_85;
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
      return 0x1_d3_bf;
    },
    'sans-serif-bold': (ch) => {
      return 0x1_d3_bf;
    },
    'sans-serif-italic': (ch) => {
      return 0;
    },
    'sans-serif-bold-italic': (ch) => {
      return 0x1_d3_f9;
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
      return 0x1_d7_9e;
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
      return 0x1_d7_a8;
    },
    'sans-serif': (ch) => {
      return 0x1_d7_b2;
    },
    'sans-serif-bold': (ch) => {
      return 0x1_d7_bc;
    },
    'sans-serif-italic': (ch) => {
      return 0;
    },
    'sans-serif-bold-italic': (ch) => {
      return 0;
    },
    monospace: (ch) => {
      return 0x1_d7_c6;
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
        : 0x3_90 < codePoint && codePoint < 0x3_aa
          ? 'upperCaseGreek'
          : (0x3_b0 < codePoint && codePoint < 0x3_ca) || ch === '\u{3D5}'
            ? 'lowerCaseGreek'
            : (0x1_d6_e1 < codePoint && codePoint < 0x1_d6_fc) || bold[ch]
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
