/** Inline styles, keyed by camelCase or hyphenated CSS property name. */
export type CssStyle = Record<string, string>;

/** A node that can be rendered either to a DOM node or to markup. */
export interface VirtualNode {
  toNode(): Node;
  toMarkup(): string;
}

/** A node that may be a child of a MathML node. */
export interface MathDomNode extends VirtualNode {
  toText(): string;
}

/**
 * This node represents a document fragment, which contains elements, but when
 * placed into the DOM doesn't have any representation itself. It only contains
 * children and doesn't have any DOM node properties.
 */
export class DocumentFragment implements MathDomNode {
  children: MathDomNode[];
  classes: string[];
  style: CssStyle;

  constructor(children: MathDomNode[]) {
    this.children = children;
    this.classes = [];
    this.style = {};
  }

  hasClass(className: string): boolean {
    return this.classes.includes(className);
  }

  /** Convert the fragment into a node. */
  toNode(): Node {
    const frag = document.createDocumentFragment();

    for (let i = 0; i < this.children.length; i++) {
      frag.append(this.children[i].toNode());
    }

    return frag;
  }

  /** Convert the fragment into HTML markup. */
  toMarkup(): string {
    let markup = '';

    // Simply concatenate the markup for the children together.
    for (let i = 0; i < this.children.length; i++) {
      markup += this.children[i].toMarkup();
    }

    return markup;
  }

  /**
   * Converts the math node into a string, similar to innerText. Applies to
   * MathDomNode's only.
   */
  toText(): string {
    return this.children.map((child) => child.toText()).join('');
  }
}
