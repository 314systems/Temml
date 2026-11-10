/**
 * These objects store the data about the DOM nodes we create, as well as some
 * extra data. They can then be transformed into real DOM nodes with the
 * `toNode` function or HTML markup using `toMarkup`. They are useful for both
 * storing extra properties on the nodes, as well as providing a way to easily
 * work with the DOM.
 *
 * Similar functions for working with MathML nodes exist in mathMLTree.js.
 *
 */
import type { CssStyle, MathDomNode, VirtualNode } from './tree';
import * as utils from './utils';

export { TextNode } from './tree';

/**
 * Create an HTML className based on a list of classes. In addition to joining
 * with spaces, we also remove empty classes.
 */
export const createClass = (classes: string[]): string => {
  return classes.filter(Boolean).join(' ');
};

interface HtmlElementData {
  classes: string[];
  attributes: Record<string, string>;
  style: CssStyle;
  children: VirtualNode[];
}

/**
 * Convert into an HTML node
 */
const toNode = function (this: HtmlElementData, tagName: string): HTMLElement {
  const node = document.createElement(tagName);

  // Apply the class
  node.className = createClass(this.classes);

  // Apply inline styles
  Object.assign(node.style, this.style);

  // Apply attributes
  for (const [attr, value] of Object.entries(this.attributes)) {
    node.setAttribute(attr, value);
  }

  // Append the children, also as HTML nodes
  for (const child of this.children) {
    node.append(child.toNode());
  }

  return node;
};

/**
 * Convert into an HTML markup string
 */
const toMarkup = function (this: HtmlElementData, tagName: string): string {
  let markup = `<${tagName}`;

  // Add the class
  if (this.classes.length) {
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

  // Add the attributes
  for (const [attr, value] of Object.entries(this.attributes)) {
    markup += ` ${attr}="${utils.escape(value)}"`;
  }

  markup += '>';

  // Add the markup of the children, also as markup
  for (const child of this.children) {
    markup += child.toMarkup();
  }

  markup += `</${tagName}>`;

  return markup;
};

/**
 * This node represents a span node, with a className, a list of children, and
 * an inline style.
 *
 */
export class Span implements HtmlElementData, MathDomNode {
  classes: string[];
  attributes: Record<string, string>;
  style: CssStyle;
  children: VirtualNode[];

  constructor(classes?: string[] | null, children?: VirtualNode[] | null, style?: CssStyle | null) {
    this.classes = classes ?? [];
    this.attributes = {};
    this.style = style ?? {};
    this.children = children ?? [];
  }

  setAttribute(attribute: string, value: string): void {
    this.attributes[attribute] = value;
  }

  toNode(): HTMLElement {
    return toNode.call(this, 'span');
  }

  toMarkup(): string {
    return toMarkup.call(this, 'span');
  }

  // A <span> placed in the MathML tree, e.g. for an equation number, holds no
  // text until postProcess fills it in.
  toText(): string {
    return '';
  }
}

// Create an <a href="…"> node.
export class AnchorNode implements MathDomNode {
  href: string;
  classes: string[];
  children: VirtualNode[];

  constructor(href: string, classes: string[], children?: VirtualNode[] | null) {
    this.href = href;
    this.classes = classes;
    this.children = children ?? [];
  }

  toNode(): HTMLAnchorElement {
    const node = document.createElement('a');
    node.setAttribute('href', this.href);
    if (this.classes.length > 0) {
      node.className = createClass(this.classes);
    }
    for (const child of this.children) {
      node.append(child.toNode());
    }
    return node;
  }

  toMarkup(): string {
    let markup = `<a href='${utils.escape(this.href)}'`;
    if (this.classes.length > 0) {
      markup += ` class="${utils.escape(createClass(this.classes))}"`;
    }
    markup += '>';
    for (const child of this.children) {
      markup += child.toMarkup();
    }
    markup += '</a>';
    return markup;
  }

  // An anchor for \ref holds no text until postProcess fills it in.
  toText(): string {
    return '';
  }
}

/*
 * This node represents an image embed (<img>) element.
 */
export class Img implements MathDomNode {
  src: string;
  alt: string;
  classes: string[];
  style: CssStyle;

  constructor(src: string, alt: string, style: CssStyle) {
    this.alt = alt;
    this.src = src;
    this.classes = ['mord'];
    this.style = style;
  }

  hasClass(className: string): boolean {
    return this.classes.includes(className);
  }

  toNode(): HTMLImageElement {
    const node = document.createElement('img');
    node.src = this.src;
    node.alt = this.alt;
    node.className = 'mord';

    // Apply inline styles
    Object.assign(node.style, this.style);

    return node;
  }

  toMarkup(): string {
    let markup = `<img src='${this.src}' alt='${this.alt}'`;

    // Add the styles, after hyphenation
    let styles = '';
    for (const [style, value] of Object.entries(this.style)) {
      styles += `${utils.hyphenate(style)}:${value};`;
    }
    if (styles) {
      markup += ` style="${utils.escape(styles)}"`;
    }

    markup += '>';
    return markup;
  }

  toText(): string {
    return '';
  }
}
