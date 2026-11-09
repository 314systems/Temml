import { NON_ATOMS } from "./symbols";
import type SourceLocation from "./SourceLocation";
import type { Token } from "./Token";
import type { Mode, StyleStr } from "./types";
import type { Measurement } from "./units";

/** Families of symbols that are parsed into an "atom" node. See symbols.js. */
export type AtomFamily = "bin" | "close" | "inner" | "open" | "punct" | "rel";

/** A column specification of an {array}-like environment. */
export type ColSpec =
  | { type: "align"; align: string }
  | { type: "separator"; separator: string };

/** Sub- and superscripts attached to an operator or a \prescript base. */
export interface Scripts {
  sup?: AnyParseNode | null;
  sub?: AnyParseNode | null;
}

/**
 * The fields of each parse node type, other than `type`, `mode`, and `loc`,
 * which every node has. See `ParseNode` below.
 */
export interface ParseNodeTypes {
  // Nodes created directly by Parser.js
  "ordgroup": {
    body: AnyParseNode[];
    semisimple?: boolean;
  };
  "raw": {
    string: string;
  };
  "size": {
    value: Measurement;
    isBlank: boolean;
  };
  "styling": {
    scriptLevel: StyleStr;
    body: AnyParseNode[];
  };
  "supsub": {
    base: AnyParseNode | null | undefined;
    sup?: AnyParseNode | null;
    sub?: AnyParseNode | null;
    stack?: boolean;
    isFollowedByDelimiter?: boolean;
  };
  "tag": {
    body: AnyParseNode[];
    tag: AnyParseNode[];
  };
  "text": {
    body: AnyParseNode[];
    font?: string;
  };
  "toggle": {
    body: AnyParseNode[];
    semisimple?: boolean;
  };
  "url": {
    url: string;
  };
  "verb": {
    body: string;
    star: boolean;
  };

  // From symbol groups, constructed in Parser.js via `symbols` lookup.
  // (Some of these have "-token" suffix to distinguish them from existing
  // `ParseNode` types.)
  "atom": {
    family: AtomFamily;
    text: string;
    needsSpacing?: boolean;
  };
  "mathord": {
    text: string;
  };
  "spacing": {
    text: string;
  };
  "textord": {
    text: string;
  };
  "accent-token": {
    text: string;
  };
  "op-token": {
    text: string;
  };

  // From functions.js and functions/*.js. See also "styling", "supsub", and
  // "text" above, which Parser.js creates as well.
  "accent": {
    label: string;
    isStretchy?: boolean;
    base: AnyParseNode;
  };
  "accentUnder": {
    label: string;
    base: AnyParseNode;
  };
  "cancelto": {
    body: AnyParseNode;
    to: AnyParseNode;
    isCharacterBox: boolean;
  };
  "color": {
    color: string;
    isTextColor?: boolean;
    body: AnyParseNode[];
  };
  "cr": {
    newLine: boolean;
    size: Measurement | null | undefined;
  };
  "delimiter": {
    body: AnyParseNode[];
    left: string;
    right: string;
  };
  "delimsizing": {
    size: number;
    mclass: string;
    delim: string;
  };
  "enclose": {
    label: string;
    backgroundColor?: string;
    borderColor?: string;
    body: AnyParseNode;
  };
  "environment": {
    name: string;
    nameGroup: AnyParseNode;
  };
  "envTag": {
    body: AnyParseNode;
  };
  "font": {
    font: string;
    body: AnyParseNode;
  };
  "genfrac": {
    continued: boolean;
    numer: AnyParseNode;
    denom: AnyParseNode;
    hasBarLine: boolean;
    leftDelim: string | null;
    rightDelim: string | null;
    scriptLevel: StyleStr | "auto";
    barSize: Measurement | null;
  };
  "hbox": {
    body: AnyParseNode[];
  };
  "horizBracket": {
    label: string;
    isOver: boolean;
    base: AnyParseNode;
  };
  "hphantom": {
    body: AnyParseNode;
  };
  "html": {
    attributes: Record<string, string>;
    body: AnyParseNode[];
  };
  "includegraphics": {
    alt: string;
    width: Measurement;
    height: Measurement;
    totalheight: Measurement;
    src: string;
  };
  "infix": {
    replaceWith: string;
    barSize?: Measurement;
    token: Token | null | undefined;
  };
  "internal": Record<never, never>;
  "kern": {
    dimension: Measurement;
  };
  "label": {
    string: string;
  };
  "lap": {
    alignment: string;
    body: AnyParseNode;
  };
  "leftright": {
    body: AnyParseNode[];
    left: string;
    right: string;
    rightColor?: string;
    isStretchy?: boolean;
  };
  "leftright-right": {
    delim: string;
  };
  "mathchoice": {
    display: AnyParseNode[];
    text: AnyParseNode[];
    script: AnyParseNode[];
    scriptscript: AnyParseNode[];
  };
  "mclass": {
    mclass: string;
    body: AnyParseNode[];
    isCharacterBox: boolean;
    mustPromote?: boolean;
  };
  "middle": {
    delim: string;
  };
  "multiscript": {
    base: AnyParseNode;
    isSideset: boolean;
    prescripts: Scripts;
    postscripts: Scripts | null;
  };
  "noTag": Record<never, never>;
  "not": {
    body: AnyParseNode[];
    isCharacterBox: boolean;
  };
  "op": {
    limits: boolean;
    alwaysHandleSupSub?: boolean;
    suppressBaseShift?: boolean;
    parentIsSupSub: boolean;
    symbol: boolean;
    stack?: boolean;
    name?: string | null;
    body?: AnyParseNode[] | null;
    fromMathOp?: boolean;
    isFollowedByDelimiter?: boolean;
    needsLeadingSpace?: boolean;
  };
  "operatorname": {
    body: AnyParseNode[];
    alwaysHandleSupSub: boolean;
    limits: boolean;
    parentIsSupSub: boolean;
    isFollowedByDelimiter: boolean;
    needsLeadingSpace: boolean;
  };
  "phantom": {
    body: AnyParseNode[];
  };
  "pmb": {
    body: AnyParseNode[];
  };
  "raise": {
    dy: Measurement;
    body: AnyParseNode;
  };
  "ref": {
    funcName: string;
    string: string;
  };
  "reflect": {
    body: AnyParseNode;
  };
  "rule": {
    shift: Measurement | null | undefined;
    width: Measurement;
    height: Measurement;
  };
  "sfrac": {
    numerator: string;
    denominator: string;
  };
  "sizing": {
    funcName: string;
    body: AnyParseNode[];
  };
  "smash": {
    body: AnyParseNode;
    smashHeight: boolean;
    smashDepth: boolean;
  };
  "sqrt": {
    body: AnyParseNode;
    index?: AnyParseNode | null;
  };
  "stackedArrow": {
    name: string;
    body: AnyParseNode;
    upperArrowBelow: ParseNode<"hphantom"> | null;
    lowerArrowBody: ParseNode<"hphantom"> | null;
    below?: AnyParseNode | null;
  };
  "tip": {
    body: AnyParseNode;
    tip: AnyParseNode;
  };
  "vcenter": {
    body: AnyParseNode;
  };
  "vphantom": {
    body: AnyParseNode;
  };
  "xArrow": {
    name: string;
    body: AnyParseNode;
    below?: AnyParseNode | null;
  };

  // From environments.js and environments/*.js
  "array": {
    body: AnyParseNode[][]; // List of rows in the (2D) array.
    cols?: ColSpec[];
    rowGaps?: Array<Measurement | null>;
    hLinesBeforeRow: boolean[][];
    envClasses?: string[];
    autoTag?: boolean;
    scriptLevel?: StyleStr;
    tags?: Array<boolean | AnyParseNode[]> | null;
    labels?: string[];
    leqno?: boolean;
    arraystretch?: number | null;
    arraycolsep?: Measurement | null;
  };
  "cdlabel": {
    side: string;
    label: AnyParseNode;
  };
  "cdlabelparent": {
    fragment: AnyParseNode;
  };
}

export type NodeType = keyof ParseNodeTypes;

/** A parse node of the given type. */
export type ParseNode<TYPE extends NodeType> = {
  type: TYPE;
  mode: Mode;
  loc?: SourceLocation | null;
} & ParseNodeTypes[TYPE];

/** Union of all parse node types, discriminated by `type`. */
export type AnyParseNode = { [TYPE in NodeType]: ParseNode<TYPE> }[NodeType];

/** Parse nodes built from symbols, i.e. nodes with a `text` field. See symbols.js. */
export type SymbolParseNode =
  | ParseNode<"atom">
  | ParseNode<"accent-token">
  | ParseNode<"mathord">
  | ParseNode<"op-token">
  | ParseNode<"spacing">
  | ParseNode<"textord">;

/**
 * Asserts that the node is of the given type and returns it with stricter
 * typing. Throws if the node's type does not match.
 */
export function assertNodeType<NODETYPE extends NodeType>(
  node: AnyParseNode | null | undefined,
  type: NODETYPE
): ParseNode<NODETYPE> {
  if (!node || node.type !== type) {
    throw new Error(
      `Expected node of type ${type}, but got ` +
        (node ? `node of type ${node.type}` : String(node))
    );
  }
  return node as ParseNode<NODETYPE>;
}

/**
 * Returns the node more strictly typed iff it is of the given type. Otherwise,
 * returns null.
 */
export function assertSymbolNodeType(node: AnyParseNode | null | undefined): SymbolParseNode {
  const typedNode = checkSymbolNodeType(node);
  if (!typedNode) {
    throw new Error(
      `Expected node of symbol group type, but got ` +
        (node ? `node of type ${node.type}` : String(node))
    );
  }
  return typedNode;
}

/**
 * Returns the node more strictly typed iff it is of the given type. Otherwise,
 * returns null.
 */
export function checkSymbolNodeType(
  node: AnyParseNode | null | undefined
): SymbolParseNode | null {
  if (node && (node.type === "atom" || node.type === "delimiter" ||
      Object.hasOwn(NON_ATOMS, node.type))) {
    return node as SymbolParseNode;
  }
  return null;
}
