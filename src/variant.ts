import type Style from './Style';
import type { SymbolParseNode } from './parseNode';

/**
 * Maps TeX font commands to "mathvariant" attribute in buildMathML.js
 */
const fontMap: Record<string, string> = {
  // styles
  mathbf: 'bold',
  textit: 'italic',
  mathit: 'italic',
  greekItalic: 'italic',
  'up@greek': 'normal',
  boldsymbol: 'bold-italic',
  mathboldsymbol: 'bold-italic',

  // families
  mathbb: 'double-struck',
  mathcal: 'script',
  mathfrak: 'fraktur',
  mathscr: 'script',
  mathsf: 'sans-serif',
  mathsfit: 'sans-serif-italic',
  mathtt: 'monospace',
};

/**
 * Returns the math variant as a string or null if none is required.
 */
export const getVariant = (group: SymbolParseNode, style: Style): string | null => {
  // Handle font specifiers as best we can.
  // Chromium does not support the MathML mathvariant attribute.
  // So we'll use Unicode replacement characters instead.
  // But first, determine the math variant.

  // Deal with the \textit, \textbf, etc., functions.
  switch (style.fontFamily) {
    case 'texttt': {
      return 'monospace';
    }
    case 'textsc': {
      return 'normal'; // handled via character substitution in symbolsOrd.js.
    }
    case 'textsf': {
      if (style.fontShape === 'textit' && style.fontWeight === 'textbf') {
        return 'sans-serif-bold-italic';
      } else if (style.fontShape === 'textit') {
        return 'sans-serif-italic';
      } else if (style.fontWeight === 'textbf') {
        return 'sans-serif-bold';
      } else {
        return 'sans-serif';
      }
    }
    default:
      if (style.fontShape === 'textit' && style.fontWeight === 'textbf') {
        return 'bold-italic';
      } else if (style.fontShape === 'textit') {
        return 'italic';
      } else if (style.fontWeight === 'textbf') {
        return 'bold';
      }
  }

  // Deal with the \mathit, mathbf, etc, functions.
  const font = style.font;
  if (!font || font === 'mathnormal') {
    return null;
  }

  if (font === 'mathrm') {
    const codePoint = group.text.codePointAt(0) ?? 0;
    // LaTeX \mathrm returns italic for Greek characters.
    return 0x03_ab < codePoint && codePoint < 0x03_cf ? 'italic' : 'normal';
  }

  return Object.hasOwn(fontMap, font) ? fontMap[font] : null;
};
