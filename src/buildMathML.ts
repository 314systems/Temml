/**
 * This file converts a parse tree into a corresponding MathML tree. The main
 * entry point is the `buildMathML` function, which takes a parse tree from the
 * parser.
 */

import * as mathMLTree from './mathMLTree';
import ParseError from './ParseError';
import symbols, { ligatures } from './symbols';
import { _mathmlGroupBuilders as groupBuilders } from './defineFunction';
import { MathNode, TextNode, isMathNodeOfType } from './mathMLTree';
import type { MathNodeType } from './mathMLTree';
import { DocumentFragment } from './tree';
import setLineBreaks from './linebreaking';
import { AnchorNode } from './domTree';
import type { AnyParseNode, ParseNode } from './parseNode';
import type Settings from './Settings';
import type Style from './Style';
import type { MathDomNode } from './tree';
import type { Mode } from './types';

/**
 * Takes a symbol and converts it into a MathML text node after performing
 * optional replacement from symbols.js.
 */
export const makeText = (text: string, mode: Mode, style?: Style): TextNode => {
  if (
    symbols[mode][text] &&
    symbols[mode][text].replace &&
    // Check the UTF-16 high surrogate used by mathematical alphanumeric symbols.
    // eslint-disable-next-line unicorn/prefer-code-point
    text.charCodeAt(0) !== 0xd8_35 &&
    !(
      Object.hasOwn(ligatures, text) &&
      style &&
      ((style.fontFamily && style.fontFamily.slice(4, 6) === 'tt') ||
        (style.font && style.font.slice(4, 6) === 'tt'))
    )
  ) {
    text = symbols[mode][text].replace!;
  }

  return new mathMLTree.TextNode(text);
};

const copyChar = (newRow: MathNode, child: MathNode): void => {
  const last = newRow.children[newRow.children.length - 1];
  if (newRow.children.length === 0 || !isMathNodeOfType(last, 'mtext')) {
    const mtext = new mathMLTree.MathNode('mtext', [
      new mathMLTree.TextNode((child.children[0] as TextNode).text),
    ]);
    newRow.children.push(mtext);
  } else {
    (last.children[0] as TextNode).text += (child.children[0] as TextNode).text;
  }
};

export const consolidateText = (mrow: MathDomNode): MathDomNode => {
  // If possible, consolidate adjacent <mtext> elements into a single element.
  if (!isMathNodeOfType(mrow, 'mrow') && !isMathNodeOfType(mrow, 'mstyle')) {
    return mrow;
  }
  if (mrow.children.length === 0) {
    return mrow;
  } // empty group, e.g., \text{}
  const newRow = new mathMLTree.MathNode('mrow');
  for (let i = 0; i < mrow.children.length; i++) {
    const child = mrow.children[i];
    if (isMathNodeOfType(child, 'mtext') && Object.keys(child.attributes).length === 0) {
      copyChar(newRow, child);
    } else if (isMathNodeOfType(child, 'mrow')) {
      // We'll also check the children of an mrow. One level only. No recursion.
      let canConsolidate = true;
      for (let j = 0; j < child.children.length; j++) {
        const grandChild = child.children[j];
        if (!isMathNodeOfType(grandChild, 'mtext') || Object.keys(child.attributes).length !== 0) {
          canConsolidate = false;
          break;
        }
      }
      if (canConsolidate) {
        for (let j = 0; j < child.children.length; j++) {
          const grandChild = child.children[j] as MathNode;
          copyChar(newRow, grandChild);
        }
      } else {
        newRow.children.push(child);
      }
    } else {
      newRow.children.push(child);
    }
  }
  for (let i = 0; i < newRow.children.length; i++) {
    const mtext = newRow.children[i];
    if (isMathNodeOfType(mtext, 'mtext')) {
      const text = mtext.children[0] as TextNode;
      // Firefox does not render a space at either end of an <mtext> string.
      // To get proper rendering, we replace leading or trailing spaces with no-break spaces.
      if (text.text.charAt(0) === ' ') {
        text.text = '\u{A0}' + text.text.slice(1);
      }
      const L = text.text.length;
      if (L > 0 && text.text.charAt(L - 1) === ' ') {
        text.text = text.text.slice(0, -1) + '\u{A0}';
      }
      for (const [key, value] of Object.entries(mrow.attributes)) {
        mtext.attributes[key] = value;
      }
    }
  }
  if (newRow.children.length === 1 && isMathNodeOfType(newRow.children[0], 'mtext')) {
    return newRow.children[0]; // A consolidated <mtext>
  } else {
    return newRow;
  }
};

/**
 * Wrap the given array of nodes in an <mrow> node if needed, i.e.,
 * unless the array has length 1.  Always returns a single node.
 */
export const makeRow = (body: MathDomNode[], semisimple = false): MathDomNode => {
  if (body.length === 1 && !(body[0] instanceof DocumentFragment)) {
    return body[0];
  } else if (!semisimple) {
    // Suppress spacing on <mo> nodes at both ends of the row.
    const first = body[0];
    if (isMathNodeOfType(first, 'mo') && !first.attributes.fence) {
      first.attributes.lspace = '0em';
      first.attributes.rspace = '0em';
    }
    const last = body.at(-1);
    if (isMathNodeOfType(last, 'mo') && !last.attributes.fence) {
      last.attributes.lspace = '0em';
      last.attributes.rspace = '0em';
    }
  }
  return new mathMLTree.MathNode('mrow', body);
};

/**
 * Check for <mi>.</mi> which is how a dot renders in MathML,
 * or <mo separator="true" lspace="0em" rspace="0em">,</mo>
 * which is how a braced comma {,} renders in MathML
 */
const isNumberPunctuation = (group: MathDomNode | undefined): group is MathNode => {
  if (!(group instanceof MathNode)) {
    return false;
  }
  if (group.type === 'mi' && group.children.length === 1) {
    const child = group.children[0];
    return child instanceof TextNode && child.text === '.';
  } else if (group.type === 'mtext' && group.children.length === 1) {
    const child = group.children[0];
    return child instanceof TextNode && child.text === '\u{2008}'; // punctuation space
  } else if (
    group.type === 'mo' &&
    group.children.length === 1 &&
    group.getAttribute('separator') === 'true' &&
    group.getAttribute('lspace') === '0em' &&
    group.getAttribute('rspace') === '0em'
  ) {
    const child = group.children[0];
    return child instanceof TextNode && child.text === ',';
  } else {
    return false;
  }
};
const isComma = (expression: AnyParseNode[], i: number) => {
  const node = expression[i];
  const followingNode = expression[i + 1];
  return (
    node.type === 'atom' &&
    node.text === ',' &&
    // Don't consolidate if there is a space after the comma.
    node.loc &&
    followingNode.loc &&
    node.loc.end === followingNode.loc.start
  );
};

const isRel = (item: AnyParseNode): boolean => {
  return (
    (item.type === 'atom' && item.family === 'rel') ||
    (item.type === 'mclass' && item.mclass === 'mrel')
  );
};

/**
 * Takes a list of nodes, builds them, and returns a list of the generated
 * MathML nodes.  Also do a couple chores along the way:
 * (1) Suppress spacing when an author wraps an operator w/braces, as in {=}.
 * (2) Suppress spacing between two adjacent relations.
 */
export const buildExpression = (
  expression: AnyParseNode[],
  style: Style,
  semisimple = false,
): MathDomNode[] => {
  if (!semisimple && expression.length === 1) {
    const group = buildGroup(expression[0], style);
    if (isMathNodeOfType(group, 'mo')) {
      // When TeX writers want to suppress spacing on an operator,
      // they often put the operator by itself inside braces.
      group.setAttribute('lspace', '0em');
      group.setAttribute('rspace', '0em');
    }
    return [group];
  }

  const groups: MathDomNode[] = [];
  const groupArray: MathDomNode[] = [];
  let lastGroup: MathDomNode | undefined;
  for (let i = 0; i < expression.length; i++) {
    groupArray.push(buildGroup(expression[i], style));
  }

  for (let i = 0; i < groupArray.length; i++) {
    const group = groupArray[i];

    // Suppress spacing between adjacent relations
    if (i < expression.length - 1 && isRel(expression[i]) && isRel(expression[i + 1])) {
      (group as MathNode).setAttribute('rspace', '0em');
    }
    if (i > 0 && isRel(expression[i]) && isRel(expression[i - 1])) {
      (group as MathNode).setAttribute('lspace', '0em');
    }

    // Concatenate numbers
    if (isMathNodeOfType(group, 'mn') && isMathNodeOfType(lastGroup, 'mn')) {
      // Concatenate <mn>...</mn> followed by <mi>.</mi>
      lastGroup.children.push(...group.children);
      continue;
    } else if (isNumberPunctuation(group) && isMathNodeOfType(lastGroup, 'mn')) {
      // Concatenate <mn>...</mn> followed by <mi>.</mi>
      lastGroup.children.push(...group.children);
      continue;
    } else if (
      isMathNodeOfType(lastGroup, 'mn') &&
      i < groupArray.length - 1 &&
      isMathNodeOfType(groupArray[i + 1], 'mn') &&
      isComma(expression, i)
    ) {
      lastGroup.children.push(...(group as MathNode).children);
      continue;
    } else if (isMathNodeOfType(group, 'mn') && isNumberPunctuation(lastGroup)) {
      // Concatenate <mi>.</mi> followed by <mn>...</mn>
      group.children = [...lastGroup.children, ...group.children];
      groups.pop();
    } else if (
      (isMathNodeOfType(group, 'msup') || isMathNodeOfType(group, 'msub')) &&
      group.children.length >= 1 &&
      (isMathNodeOfType(lastGroup, 'mn') || isNumberPunctuation(lastGroup))
    ) {
      // Put preceding <mn>...</mn> or <mi>.</mi> inside base of
      // <msup><mn>...base...</mn>...exponent...</msup> (or <msub>)
      const base = group.children[0];
      if (isMathNodeOfType(base, 'mn')) {
        base.children = [...lastGroup.children, ...base.children];
        groups.pop();
      }
    }
    groups.push(group);
    lastGroup = group;
  }
  return groups;
};

/**
 * Equivalent to buildExpression, but wraps the elements in an <mrow>
 * if there's more than one.  Returns a single node instead of an array.
 */
export const buildExpressionRow = (
  expression: AnyParseNode[],
  style: Style,
  semisimple = false,
): MathDomNode => {
  return makeRow(buildExpression(expression, style, semisimple), semisimple);
};

/**
 * Takes a group from the parser and calls the appropriate groupBuilders function
 * on it to produce a MathML node.
 */
export const buildGroup = (group: AnyParseNode | null | undefined, style: Style): MathDomNode => {
  if (!group) {
    return new mathMLTree.MathNode('mrow');
  }

  const groupBuilder = groupBuilders[group.type];
  if (groupBuilder) {
    // Call the groupBuilders function
    const result = groupBuilder(group, style);
    return result;
  } else {
    throw new ParseError("Got group of unknown type: '" + group.type + "'");
  }
};

const glue = (): MathNode => {
  return new mathMLTree.MathNode('mtd', [], [], { padding: '0', width: '50%' });
};

const labelContainers: Set<MathNodeType> = new Set(['mrow', 'mtd', 'mtable', 'mtr']);
const getLabel = (parent: { children: MathDomNode[] }): string | undefined => {
  for (const node of parent.children) {
    if (node instanceof MathNode) {
      if (labelContainers.has(node.type)) {
        if (node.classes[0] === 'tml-label') {
          const label = node.label;
          return label;
        } else {
          const label = getLabel(node);
          if (label) {
            return label;
          }
        }
      }
    } else {
      // A node without a `type`, e.g. a DocumentFragment.
      const label = getLabel(node as DocumentFragment);
      if (label) {
        return label;
      }
    }
  }
};

const taggedExpression = (
  expression: MathDomNode,
  tag: AnyParseNode[],
  style: Style,
  leqno: boolean,
): MathNode => {
  const tagNode = consolidateText(
    buildExpressionRow((tag[0] as ParseNode<'text'>).body, style),
  ) as MathNode; // tag is now an <mtext> element
  tagNode.classes.push('tml-tag'); // to be available for \ref

  const label = getLabel(expression as DocumentFragment); // from a \label{} function.
  const mtd = new mathMLTree.MathNode('mtd', [expression]);
  const rowArray = [glue(), mtd, glue()];
  rowArray[leqno ? 0 : 2].children.push(tagNode);
  const mtr = new mathMLTree.MathNode('mtr', rowArray, ['tml-tageqn']);
  if (label) {
    mtr.setAttribute('id', label);
  }
  const table = new mathMLTree.MathNode('mtable', [mtr]);
  table.style.width = '100%';
  table.setAttribute('displaystyle', 'true');
  return table;
};

/**
 * Takes a full parse tree and settings and builds a MathML representation of
 * it.
 */
const buildMathML = (
  tree: AnyParseNode[],
  texExpression: string,
  style: Style,
  settings: Settings,
): MathNode | AnchorNode => {
  // Strip off outer tag wrapper for processing below.
  let tag: AnyParseNode[] | null = null;
  const first = tree[0];
  if (tree.length === 1 && first.type === 'tag') {
    tag = first.tag;
    tree = first.body;
  }

  const expression = buildExpression(tree, style);

  const n1 = expression.length === 0 ? null : expression[0];
  if (expression.length === 1 && n1 instanceof AnchorNode) {
    return n1;
  }

  const wrap = settings.displayMode || settings.annotate ? 'none' : settings.wrap;

  let wrapper: MathDomNode =
    expression.length === 1 && tag === null && n1 instanceof MathNode
      ? expression[0]
      : setLineBreaks(expression, wrap, settings.displayMode);

  if (tag) {
    wrapper = taggedExpression(wrapper, tag, style, settings.leqno);
  }

  if (settings.annotate) {
    // Build a TeX annotation of the source
    const annotation = new mathMLTree.MathNode('annotation', [
      new mathMLTree.TextNode(texExpression),
    ]);
    annotation.setAttribute('encoding', 'application/x-tex');
    wrapper = new mathMLTree.MathNode('semantics', [wrapper, annotation]);
  }

  const math = new mathMLTree.MathNode('math', [wrapper]);

  if (settings.xml) {
    math.setAttribute('xmlns', 'http://www.w3.org/1998/Math/MathML');
  }
  if (settings.displayMode) {
    math.setAttribute('display', 'block');
    math.style.display = 'block math'; // necessary in Chromium.
    // Firefox and Safari do not recognize display: "block math".
    // Set a class so that the CSS file can set display: block.
    math.classes = ['tml-display'];
  }
  return math;
};

export default buildMathML;
