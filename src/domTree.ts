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
import type { CssStyle, MathDomNode, VirtualNode } from "./tree";
import * as utils from "./utils";

/**
 * Create an HTML className based on a list of classes. In addition to joining
 * with spaces, we also remove empty classes.
 */
export const createClass = function(classes: string[]): string {
  return classes.filter((cls) => cls).join(" ");
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
const toNode = function(this: HtmlElementData, tagName: string): HTMLElement {
  const node = document.createElement(tagName);

  // Apply the class
  node.className = createClass(this.classes);

  // Apply inline styles
  Object.assign(node.style, this.style);

  // Apply attributes
  for (const attr in this.attributes) {
    if (Object.hasOwn(this.attributes, attr)) {
      node.setAttribute(attr, this.attributes[attr]);
    }
  }

  // Append the children, also as HTML nodes
  for (let i = 0; i < this.children.length; i++) {
    node.appendChild(this.children[i].toNode());
  }

  return node;
};

/**
 * Convert into an HTML markup string
 */
const toMarkup = function(this: HtmlElementData, tagName: string): string {
  let markup = `<${tagName}`;

  // Add the class
  if (this.classes.length) {
    markup += ` class="${utils.escape(createClass(this.classes))}"`;
  }

  let styles = "";

  // Add the styles, after hyphenation
  for (const style in this.style) {
    if (Object.hasOwn(this.style, style)) {
      styles += `${utils.hyphenate(style)}:${this.style[style]};`;
    }
  }

  if (styles) {
    markup += ` style="${styles}"`;
  }

  // Add the attributes
  for (const attr in this.attributes) {
    if (Object.hasOwn(this.attributes, attr)) {
      markup += ` ${attr}="${utils.escape(this.attributes[attr])}"`;
    }
  }

  markup += ">";

  // Add the markup of the children, also as markup
  for (let i = 0; i < this.children.length; i++) {
    markup += this.children[i].toMarkup();
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
    this.classes = classes || [];
    this.attributes = {};
    this.style = style || {};
    this.children = children || [];
  }

  setAttribute(attribute: string, value: string): void {
    this.attributes[attribute] = value;
  }

  toNode(): HTMLElement {
    return toNode.call(this, "span");
  }

  toMarkup(): string {
    return toMarkup.call(this, "span");
  }

  // A <span> placed in the MathML tree, e.g. for an equation number, holds no
  // text until postProcess fills it in.
  toText(): string {
    return ""
  }
}

export class TextNode implements VirtualNode {
  text: string;

  constructor(text: string) {
    this.text = text;
  }
  toNode(): Text {
    return document.createTextNode(this.text);
  }
  toMarkup(): string {
    return utils.escape(this.text);
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
    this.children = children || [];
  }

  toNode(): HTMLAnchorElement {
    const node = document.createElement("a")
    node.setAttribute("href", this.href)
    if (this.classes.length > 0) {
      node.className = createClass(this.classes)
    }
    for (let i = 0; i < this.children.length; i++) {
      node.appendChild(this.children[i].toNode());
    }
    return node
  }

  toMarkup(): string {
    let markup = `<a href='${utils.escape(this.href)}'`
    if (this.classes.length > 0) {
      markup += ` class="${utils.escape(createClass(this.classes))}"`
    }
    markup += ">"
    for (let i = 0; i < this.children.length; i++) {
      markup += this.children[i].toMarkup();
    }
    markup += "</a>"
    return markup
  }

  // An anchor for \ref holds no text until postProcess fills it in.
  toText(): string {
    return ""
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
    this.classes = ["mord"];
    this.style = style;
  }

  hasClass(className: string): boolean {
    return this.classes.includes(className);
  }

  toNode(): HTMLImageElement {
    const node = document.createElement("img");
    node.src = this.src;
    node.alt = this.alt;
    node.className = "mord";

    // Apply inline styles
    Object.assign(node.style, this.style);

    return node;
  }

  toMarkup(): string {
    let markup = `<img src='${this.src}' alt='${this.alt}'`;

    // Add the styles, after hyphenation
    let styles = "";
    for (const style in this.style) {
      if (Object.hasOwn(this.style, style)) {
        styles += `${utils.hyphenate(style)}:${this.style[style]};`;
      }
    }
    if (styles) {
      markup += ` style="${utils.escape(styles)}"`;
    }

    markup += ">";
    return markup;
  }

  toText(): string {
    return ""
  }
}
