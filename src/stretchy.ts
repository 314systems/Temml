/**
 * This file provides support for building horizontal stretchy elements.
 */

import * as mathMLTree from './mathMLTree';
import type { MathNode } from './mathMLTree';
import type { AnyParseNode, ParseNode } from './parseNode';

// TODO: Remove when Chromium stretches \widetilde & \widehat
const estimatedWidth = (node: AnyParseNode): number => {
  let width = 0;
  const body = (node as { body?: unknown }).body;
  if (body && Array.isArray(body)) {
    for (const item of body as AnyParseNode[]) {
      width += estimatedWidth(item);
    }
  } else if (body) {
    width += estimatedWidth(body as AnyParseNode);
  } else if (node.type === 'supsub') {
    width += estimatedWidth(node.base!);
    if (node.sub) {
      width += 0.7 * estimatedWidth(node.sub);
    }
    if (node.sup) {
      width += 0.7 * estimatedWidth(node.sup);
    }
  } else if (node.type === 'mathord' || node.type === 'textord') {
    for (const ch of node.text.split('')) {
      const codePoint = ch.codePointAt(0)!;
      if ((0x60 < codePoint && codePoint < 0x7b) || (0x03_b0 < codePoint && codePoint < 0x3_ca)) {
        width += 0.56; // lower case latin or greek. Use advance width of letter n
      } else if (0x2f < codePoint && codePoint < 0x3a) {
        width += 0.5; // numerals.
      } else {
        width += 0.92; // advance width of letter M
      }
    }
  } else {
    width += 1;
  }
  return width;
};

const stretchyCodePoint: Record<string, string> = {
  widehat: '\u{2C6}', // Shorter than \u005e, which is appropriate for an accent.
  widecheck: 'ˇ',
  widetilde: '~',
  wideparen: '⏜', // \u23dc
  utilde: '~',
  overleftarrow: '\u{2190}',
  underleftarrow: '\u{2190}',
  xleftarrow: '\u{2190}',
  overrightarrow: '\u{2192}',
  underrightarrow: '\u{2192}',
  xrightarrow: '\u{2192}',
  underbrace: '\u{23DF}',
  overbrace: '\u{23DE}',
  overbracket: '\u{23B4}',
  underbracket: '\u{23B5}',
  overgroup: '\u{23E0}',
  overparen: '⏜',
  undergroup: '\u{23E1}',
  underparen: '\u{23DD}',
  overleftrightarrow: '\u{2194}',
  underleftrightarrow: '\u{2194}',
  xleftrightarrow: '\u{2194}',
  Overrightarrow: '\u{21D2}',
  xRightarrow: '\u{21D2}',
  overleftharpoon: '\u{21BC}',
  xleftharpoonup: '\u{21BC}',
  overrightharpoon: '\u{21C0}',
  xrightharpoonup: '\u{21C0}',
  xLeftarrow: '\u{21D0}',
  xLeftrightarrow: '\u{21D4}',
  xhookleftarrow: '\u{21A9}',
  xhookrightarrow: '\u{21AA}',
  xmapsto: '\u{21A6}',
  xrightharpoondown: '\u{21C1}',
  xleftharpoondown: '\u{21BD}',
  xtwoheadleftarrow: '\u{219E}',
  xtwoheadrightarrow: '\u{21A0}',
  xlongequal: '=',
  xrightleftarrows: '\u{21C4}',
  xtofrom: '\u{21C4}',
  xleftrightharpoons: '\u{21CB}',
  xrightleftharpoons: '\u{21CC}',
  yields: '\u{2192}',
  yieldsLeft: '\u{2190}',
  mesomerism: '\u{2194}',
  longrightharpoonup: '\u{21C0}',
  longleftharpoondown: '\u{21BD}',
  eqrightharpoonup: '\u{21C0}',
  eqleftharpoondown: '\u{21BD}',
  '\\cdrightarrow': '\u{2192}',
  '\\cdleftarrow': '\u{2190}',
  '\\cdlongequal': '=',
  yieldsLeftRight: '\u{21C4}',
  chemequilibrium: '\u{21CC}',
};

export const mathMLnode = (label: string): MathNode => {
  const child = new mathMLTree.TextNode(stretchyCodePoint[label.slice(1)]);
  const node = new mathMLTree.MathNode('mo', [child]);
  node.setAttribute('stretchy', 'true');
  return node;
};

const wideHats = new Set(['\\widehat', '\\widecheck']);

// TODO: Remove if/when Chromium stretches \widetilde & \widehat
export const accentNode = (group: ParseNode<'accent'> | ParseNode<'accentUnder'>): MathNode => {
  const mo = mathMLnode(group.label);
  if (group.label.includes('tilde')) {
    const width = estimatedWidth(group.base);
    if (1 < width && width < 1.6) {
      mo.classes.push('tml-tilde-2');
    } else if (1.6 <= width && width < 2.5) {
      mo.classes.push('tml-tilde-3');
    } else if (2.5 <= width) {
      mo.classes.push('tml-tilde-4');
    }
  } else if (wideHats.has(group.label)) {
    const width = estimatedWidth(group.base);
    if (0 < width && width <= 1) {
      mo.classes.push('tml-hat-1');
    } else if (1 < width && width < 1.6) {
      mo.classes.push('tml-hat-2');
    } else if (1.6 <= width && width < 2.5) {
      mo.classes.push('tml-hat-3');
    } else if (2.5 <= width) {
      mo.classes.push('tml-hat-4');
    }
  }
  return mo;
};
