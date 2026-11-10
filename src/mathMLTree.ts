/**
 * These objects store data about MathML nodes.
 * The `toNode` and `toMarkup` functions  create namespaced DOM nodes and
 * HTML text markup respectively.
 */

import * as utils from './utils';
import { DocumentFragment } from './tree';
import type { CssStyle, MathDomNode } from './tree';
import { createClass } from './domTree';

export { TextNode } from './tree';

/** MathML elements that Temml creates. */
export type MathNodeType =
  | 'math'
  | 'semantics'
  | 'annotation'
  | 'mrow'
  | 'mstyle'
  | 'mpadded'
  | 'mphantom'
  | 'maction'
  | 'menclose'
  | 'mi'
  | 'mn'
  | 'mo'
  | 'mtext'
  | 'mspace'
  | 'mfrac'
  | 'msqrt'
  | 'mroot'
  | 'msub'
  | 'msup'
  | 'msubsup'
  | 'munder'
  | 'mover'
  | 'munderover'
  | 'mmultiscripts'
  | 'mprescripts'
  | 'none'
  | 'mtable'
  | 'mtr'
  | 'mtd'
  | 'mlabeledtr';

export const newDocumentFragment = (children: MathDomNode[]): DocumentFragment => {
  return new DocumentFragment(children);
};

/**
 * This node represents a general purpose MathML node of any type,
 * for example, `"mo"` or `"mspace"`, corresponding to `<mo>` and
 * `<mspace>` tags).
 */
export class MathNode implements MathDomNode {
  type: MathNodeType;
  attributes: Record<string, string>;
  children: MathDomNode[];
  classes: string[];
  style: CssStyle; // Used for <mstyle> elements
  label: string;

  constructor(
    type: MathNodeType,
    children?: MathDomNode[] | null,
    classes?: string[] | null,
    style?: CssStyle | null,
  ) {
    this.type = type;
    this.attributes = {};
    this.children = children ?? [];
    this.classes = classes ?? [];
    this.style = style ?? {};
    this.label = '';
  }

  /**
   * Sets an attribute on a MathML node. MathML depends on attributes to convey a
   * semantic content, so this is used heavily.
   */
  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  /**
   * Gets an attribute on a MathML node.
   */
  getAttribute(name: string): string | undefined {
    return this.attributes[name];
  }

  setLabel(value: string): void {
    this.label = value;
  }

  /**
   * Converts the math node into a MathML-namespaced DOM element.
   */
  toNode(): MathMLElement {
    const node = document.createElementNS('http://www.w3.org/1998/Math/MathML', this.type);

    for (const [attr, value] of Object.entries(this.attributes)) {
      node.setAttribute(attr, value);
    }

    if (this.classes.length > 0) {
      node.className = createClass(this.classes);
    }

    // Apply inline styles
    Object.assign(node.style, this.style);

    for (const child of this.children) {
      node.append(child.toNode());
    }

    return node;
  }

  /**
   * Converts the math node into an HTML markup string.
   */
  toMarkup(): string {
    let markup = '<' + this.type;

    // Add the attributes
    for (const [attr, value] of Object.entries(this.attributes)) {
      markup += ' ' + attr + '="';
      markup += utils.escape(value);
      markup += '"';
    }

    if (this.classes.length > 0) {
      markup += ` class="${utils.escape(createClass(this.classes))}"`;
    }

    let styles = '';

    // Add the styles, after hyphenation
    for (const [style, value] of Object.entries(this.style)) {
      styles += `${utils.hyphenate(style)}:${value};`;
    }

    if (styles) {
      markup += ` style="${styles}"`;
    }

    markup += '>';

    for (const child of this.children) {
      markup += child.toMarkup();
    }

    markup += '</' + this.type + '>';

    return markup;
  }

  /**
   * Converts the math node into a string, similar to innerText, but escaped.
   */
  toText(): string {
    return this.children.map((child) => child.toText()).join('');
  }
}

/**
 * Whether `node` is a MathNode of the given type. Only MathNode has a `type`,
 * so this is the typed equivalent of a duck-typed `node.type === type`.
 */
export const isMathNodeOfType = (
  node: MathDomNode | null | undefined,
  type: MathNodeType,
): node is MathNode => node instanceof MathNode && node.type === type;

// Do not make an <mrow> the only child of a <mstyle>.
// An <mstyle> acts as its own implicit <mrow>.
export const wrapWithMstyle = (expression: MathDomNode[]): MathNode => {
  let node;
  const only = expression.length === 1 ? expression[0] : undefined;
  if (isMathNodeOfType(only, 'mrow')) {
    node = only;
    expression.pop();
    node.type = 'mstyle';
  } else {
    node = new MathNode('mstyle', expression);
  }
  return node;
};
