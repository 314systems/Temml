import defineFunction, { normalizeArgument } from '../defineFunction';
import * as mathMLTree from '../mathMLTree';
import * as stretchy from '../stretchy';
import * as mml from '../buildMathML';
import { smalls } from '../utils';
import type { MathMLBuilder } from '../defineFunction';

// From the KaTeX font metrics, identify letters whose accents need a italic correction.
const smallNudge = 'DHKLUcegorsuvxyzΠΥΨαδηιμνοτυχϵ';
const mediumNudge = 'BCEGIMNOPQRSTXZlpqtwΓΘΞΣΦΩβεζθξρςφψϑϕϱ';
const largeNudge = 'AFJdfΔΛ';

const mathmlBuilder: MathMLBuilder<'accent'> = (group, style) => {
  const accentNode = group.isStretchy
    ? stretchy.accentNode(group)
    : new mathMLTree.MathNode('mo', [mml.makeText(group.label, group.mode)]);
  if (!group.isStretchy) {
    accentNode.setAttribute('stretchy', 'false'); // Keep Firefox from stretching \check
  }
  if (group.label !== '\\vec') {
    accentNode.style.mathDepth = '0'; // not scriptstyle
    // Don't use attribute accent="true" because MathML Core eliminates a needed space.
  }
  const tag = group.label === '\\c' ? 'munder' : 'mover';
  const needsWbkVertShift = needsWebkitVerticalShift.has(group.label);
  const baseText = (group.base as { text?: string }).text;
  if (
    tag === 'mover' &&
    group.mode === 'math' &&
    !group.isStretchy &&
    baseText &&
    baseText.length === 1
  ) {
    const text = baseText;
    const isVec = group.label === '\\vec';
    const vecPostfix = isVec ? '-vec' : '';
    if (isVec) {
      accentNode.classes.push('tml-vec'); // Firefox sizing of \vec arrow
    }
    const wbkPostfix = isVec ? '-vec' : needsWbkVertShift ? '-acc' : '';
    if (smallNudge.includes(text)) {
      accentNode.classes.push(`chr-sml${vecPostfix}`, `wbk-sml${wbkPostfix}`);
    } else if (mediumNudge.includes(text)) {
      accentNode.classes.push(`chr-med${vecPostfix}`, `wbk-med${wbkPostfix}`);
    } else if (largeNudge.includes(text)) {
      accentNode.classes.push(`chr-lrg${vecPostfix}`, `wbk-lrg${wbkPostfix}`);
    } else if (isVec) {
      accentNode.classes.push(`wbk-vec`);
    } else if (needsWbkVertShift) {
      accentNode.classes.push(`wbk-acc`);
    }
  } else if (needsWbkVertShift) {
    // text-mode accents
    accentNode.classes.push('wbk-acc');
  }
  const node = new mathMLTree.MathNode(tag, [mml.buildGroup(group.base, style), accentNode]);
  return node;
};

const nonStretchyAccents = new Set([
  '\\acute',
  '\\check',
  '\\grave',
  '\\ddot',
  '\\dddot',
  '\\ddddot',
  '\\tilde',
  '\\bar',
  '\\breve',
  '\\check',
  '\\hat',
  '\\vec',
  '\\dot',
  '\\mathring',
]);

const needsWebkitVerticalShift = new Set([
  '\\acute',
  '\\bar',
  '\\breve',
  '\\check',
  '\\dot',
  '\\ddot',
  '\\grave',
  '\\hat',
  '\\mathring',
  '\\`',
  "\\'",
  '\\^',
  '\\=',
  '\\u',
  '\\.',
  '\\"',
  '\\r',
  '\\H',
  '\\v',
]);

const combiningChar: Record<string, string> = {
  '\\`': '\u{300}',
  "\\'": '\u{301}',
  '\\^': '\u{302}',
  '\\~': '\u{303}',
  '\\=': '\u{304}',
  '\\u': '\u{306}',
  '\\.': '\u{307}',
  '\\"': '\u{308}',
  '\\r': '\u{30A}',
  '\\H': '\u{30B}',
  '\\v': '\u{30C}',
  '\\c': '\u{327}',
};

// Accents
defineFunction({
  type: 'accent',
  names: [
    '\\acute',
    '\\grave',
    '\\ddot',
    '\\dddot',
    '\\ddddot',
    '\\tilde',
    '\\bar',
    '\\breve',
    '\\check',
    '\\hat',
    '\\vec',
    '\\dot',
    '\\mathring',
    '\\overparen',
    '\\widecheck',
    '\\widehat',
    '\\wideparen',
    '\\widetilde',
    '\\overrightarrow',
    '\\overleftarrow',
    '\\Overrightarrow',
    '\\overleftrightarrow',
    '\\overgroup',
    '\\overleftharpoon',
    '\\overrightharpoon',
  ],
  props: {
    numArgs: 1,
  },
  handler: (context, args) => {
    const base = normalizeArgument(args[0]);

    const isStretchy = !nonStretchyAccents.has(context.funcName);

    return {
      type: 'accent',
      mode: context.parser.mode,
      label: context.funcName,
      isStretchy,
      base,
    };
  },
  mathmlBuilder,
});

// Text-mode accents
defineFunction({
  type: 'accent',
  names: ["\\'", '\\`', '\\^', '\\~', '\\=', '\\c', '\\u', '\\.', '\\"', '\\r', '\\H', '\\v'],
  props: {
    numArgs: 1,
    allowedInText: true,
    allowedInMath: true,
    argTypes: ['primitive'],
  },
  handler: (context, args) => {
    const base = normalizeArgument(args[0]);
    const mode = context.parser.mode;

    if (mode === 'math' && context.parser.settings.strict) {
      // LaTeX only writes a warning. It doesn't stop. We'll issue the same warning.
      console.log(`Temml parse error: Command ${context.funcName} is invalid in math mode.`);
    }

    const baseText = (base as { text?: string }).text;
    if (
      mode === 'text' &&
      baseText &&
      baseText.length === 1 &&
      context.funcName in combiningChar &&
      smalls.includes(baseText)
    ) {
      // Return a combining accent character
      return {
        type: 'textord',
        mode: 'text',
        text: baseText + combiningChar[context.funcName],
      };
    } else if (context.funcName === '\\c' && mode === 'text' && baseText && baseText.length === 1) {
      // combining cedilla
      return { type: 'textord', mode: 'text', text: baseText + '\u{327}' };
    } else {
      // Build up the accent
      return {
        type: 'accent',
        mode,
        label: context.funcName,
        isStretchy: false,
        base,
      };
    }
  },
  mathmlBuilder,
});
