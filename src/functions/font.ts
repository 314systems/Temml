import defineFunction, { normalizeArgument } from '../defineFunction';
import * as mml from '../buildMathML';
import * as mathMLTree from '../mathMLTree';
import { variantChar } from '../replace';
import type { MathNode, TextNode } from '../mathMLTree';
import type { MathMLBuilder } from '../defineFunction';
import type { ParseNode } from '../parseNode';
import type { MathDomNode } from '../tree';

const varNameFonts = new Set(['mathrm', 'mathit']);

const isLongVariableName = (group: ParseNode<'font'>, font: string): boolean => {
  if (
    !varNameFonts.has(font) ||
    !group.body ||
    group.body.type !== 'ordgroup' ||
    group.body.body.length === 1
  ) {
    return false;
  }
  if (group.body.body[0].type !== 'mathord') {
    return false;
  }
  for (let i = 1; i < group.body.body.length; i++) {
    const parseNodeType = group.body.body[i].type;
    if (
      !(
        parseNodeType === 'mathord' ||
        (parseNodeType === 'textord' &&
          !Number.isNaN(Number((group.body.body[i] as ParseNode<'textord'>).text)))
      )
    ) {
      return false;
    }
  }
  return true;
};

// Whether a node has children, i.e., is not a TextNode.
const hasChildren = (node: MathDomNode): node is MathNode =>
  Boolean((node as { children?: unknown }).children);

const mathmlBuilder: MathMLBuilder<'font'> = (group, style) => {
  const font = group.font;
  const newStyle = style.withFont(font);
  // The checks below read the children as MathNodes, as the original duck-typed code did.
  const mathGroup = mml.buildGroup(group.body, newStyle) as MathNode;

  if (mathGroup.children.length === 0) {
    return mathGroup;
  } // empty group, e.g., \mathrm{}
  if (font === 'boldsymbol' && ['mo', 'mpadded', 'mrow'].includes(mathGroup.type)) {
    mathGroup.style.fontWeight = 'bold';
    return mathGroup;
  }
  // Check if it is possible to consolidate elements into a single <mi> element.
  const children = mathGroup.children as MathNode[];
  if (isLongVariableName(group, font)) {
    // This is a \mathrm{…} or \mathit{…} group. It gets special treatment.
    const grandChild = children[0].children[0];
    const mi = hasChildren(grandChild) ? grandChild : children[0];
    delete mi.attributes.mathvariant;
    const miText = mi.children[0] as TextNode;
    for (let i = 1; i < children.length; i++) {
      const child = children[i].children[0];
      miText.text += hasChildren(child)
        ? (child.children[0] as TextNode).text
        : (child as TextNode).text;
    }
    if (font === 'mathit') {
      // Long <mi> elements are normally rendered in upright font.
      // To get italic, we need to convert each character to the corresponding italic character.
      miText.text = miText.text
        .split('')
        .map((c) => variantChar(c, 'italic'))
        .join('');
      return mi;
    }
    // Otherwise, font is "mathrm". Wrap in a <mpadded> to prevent a Firefox spacing bug.
    const mpadded = new mathMLTree.MathNode('mpadded', [mi]);
    mpadded.setAttribute('lspace', '0');
    return mpadded;
  }
  let canConsolidate = children[0].type === 'mo';
  for (let i = 1; i < children.length; i++) {
    if (children[i].type === 'mo' && font === 'boldsymbol') {
      children[i].style.fontWeight = 'bold';
    }
    if (children[i].type !== 'mi') {
      canConsolidate = false;
    }
    const localVariant = (children[i].attributes && children[i].attributes.mathvariant) || '';
    if (localVariant !== 'normal') {
      canConsolidate = false;
    }
  }
  if (!canConsolidate) {
    return mathGroup;
  }
  // Consolidate the <mi> elements.
  const mi = children[0];
  for (let i = 1; i < children.length; i++) {
    mi.children.push(children[i].children[0]);
  }
  if (mi.attributes.mathvariant && mi.attributes.mathvariant === 'normal') {
    // Workaround for a Firefox bug that renders spurious space around
    // a <mi mathvariant="normal">
    // Ref: https://bugs.webkit.org/show_bug.cgi?id=129097
    // We insert a text node that contains a zero-width space and wrap in an mrow.
    // TODO: Get rid of this <mi> workaround when the Firefox bug is fixed.
    const bogus = new mathMLTree.MathNode('mtext', [new mathMLTree.TextNode('\u{200B}')]);
    return new mathMLTree.MathNode('mrow', [bogus, mi]);
  }
  return mi;
};

const fontAliases: Record<string, string> = {
  '\\Bbb': '\\mathbb',
  '\\bold': '\\mathbf',
  '\\frak': '\\mathfrak',
  '\\bm': '\\boldsymbol',
};

defineFunction({
  type: 'font',
  names: [
    // styles
    '\\mathrm',
    '\\mathit',
    '\\mathbf',
    '\\mathnormal',
    '\\up@greek',
    '\\boldsymbol',

    // families
    '\\mathbb',
    '\\mathcal',
    '\\mathfrak',
    '\\mathscr',
    '\\mathsf',
    '\\mathsfit',
    '\\mathtt',

    // aliases
    '\\Bbb',
    '\\bm',
    '\\bold',
    '\\frak',
  ],
  props: {
    numArgs: 1,
    allowedInArgument: true,
  },
  handler: ({ parser, funcName }, args) => {
    const body = normalizeArgument(args[0]);
    let func = funcName;
    if (func in fontAliases) {
      func = fontAliases[func];
    }
    return {
      type: 'font',
      mode: parser.mode,
      font: func.slice(1),
      body,
    };
  },
  mathmlBuilder,
});

// Old font changing functions
defineFunction({
  type: 'font',
  names: ['\\rm', '\\sf', '\\tt', '\\bf', '\\it', '\\cal'],
  props: {
    numArgs: 0,
    allowedInText: true,
  },
  handler: ({ parser, funcName, breakOnTokenText }, args) => {
    const { mode } = parser;
    const body = parser.parseExpression(true, breakOnTokenText, true);
    const fontStyle = `math${funcName.slice(1)}`;

    return {
      type: 'font',
      mode: mode,
      font: fontStyle,
      body: {
        type: 'ordgroup',
        mode: parser.mode,
        body,
      },
    };
  },
  mathmlBuilder,
});
