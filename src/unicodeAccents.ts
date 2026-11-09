// Mapping of Unicode accent characters to their LaTeX equivalent in text and
// math mode (when they exist).
const unicodeAccents: Record<string, { text: string; math?: string }> = {
  '\u{301}': { text: "\\'", math: '\\acute' },
  '\u{300}': { text: '\\`', math: '\\grave' },
  '\u{308}': { text: '\\"', math: '\\ddot' },
  '\u{303}': { text: '\\~', math: '\\tilde' },
  '\u{304}': { text: '\\=', math: '\\bar' },
  '\u{306}': { text: '\\u', math: '\\breve' },
  '\u{30C}': { text: '\\v', math: '\\check' },
  '\u{302}': { text: '\\^', math: '\\hat' },
  '\u{307}': { text: '\\.', math: '\\dot' },
  '\u{30A}': { text: '\\r', math: '\\mathring' },
  '\u{30B}': { text: '\\H' },
  '\u{327}': { text: '\\c' },
};

export default unicodeAccents;
