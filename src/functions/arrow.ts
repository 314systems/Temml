import defineFunction from "../defineFunction";
import * as mathMLTree from "../mathMLTree";
import * as stretchy from "../stretchy";
import { emScale } from "../units";
import * as mml from "../buildMathML";
import type { MathNode } from "../mathMLTree";
import type { AnyParseNode, ParseNode } from "../parseNode";
import type Style from "../Style";
import type { MathDomNode } from "../tree";

// Helper functions

export const padding = (width: number | string): MathNode => {
  const node = new mathMLTree.MathNode("mspace")
  node.setAttribute("width", width + "em")
  return node
}

const paddedNode = (
  group: MathDomNode | null,
  lspace: number | string = 0.3,
  rspace: number | string = 0,
  mustSmash = false
): MathNode => {
  if (group == null && rspace === 0) { return padding(lspace) }
  const row: MathDomNode[] = group ? [group] : [];
  if (lspace !== 0)   { row.unshift(padding(lspace)) }
  if (Number(rspace) > 0) { row.push(padding(rspace)) }
  if (mustSmash) {
    // Used for the bottom arrow in a {CD} environment
    const mpadded = new mathMLTree.MathNode("mpadded", row)
    mpadded.setAttribute("height", "0.1px") // Don't use 0. WebKit would hide it.
    return mpadded
  } else {
    return new mathMLTree.MathNode("mrow", row)
  }
}

const labelSize = (size: number | string, scriptLevel: number): number =>
  Number(size) / emScale(scriptLevel);

// Whether a label has content: an \hphantom, whose body is a node, or a non-empty group.
const hasContent = (node: AnyParseNode | null | undefined): boolean => {
  const body = (node as { body?: { body?: unknown; length?: number } } | null | undefined)?.body
  return Boolean(body && (body.body || (body.length ?? 0) > 0))
}

const munderoverNode = (
  fName: string,
  body: AnyParseNode | null | undefined,
  below: AnyParseNode | null | undefined,
  style: Style
): MathNode => {
  const arrowNode = stretchy.mathMLnode(fName);
  // Is this the short part of a mhchem equilibrium arrow?
  const isEq = fName.slice(1, 3) === "eq"
  const minWidth = fName.charAt(1) === "x"
    ? "1.75"  // mathtools extensible arrows are ≥ 1.75em long
    : fName.slice(2, 4) === "cd"
    ? "3.0"  // cd package arrows
    : isEq
    ? "1.0"  // The shorter harpoon of a mhchem equilibrium arrow
    : "2.0"; // other mhchem arrows
  // TODO: When Firefox supports minsize, use the next line.
  //arrowNode.setAttribute("minsize", String(minWidth) + "em")
  arrowNode.setAttribute("lspace", "0")
  arrowNode.setAttribute("rspace", (isEq ? "0.5em" : "0"))

  // <munderover> upper and lower labels are set to scriptlevel by MathML
  // So we have to adjust our label dimensions accordingly.
  const labelStyle = style.withLevel(style.level < 2 ? 2 : 3)
  const minArrowWidth = labelSize(minWidth, labelStyle.level)
  // The dummyNode will be inside a <mover> inside a <mover>
  // So it will be at scriptlevel 3
  const dummyWidth = labelSize(minWidth, 3)
  const emptyLabel = paddedNode(null, minArrowWidth.toFixed(4), 0)
  const dummyNode = paddedNode(null, dummyWidth.toFixed(4), 0)
  // The arrow is a little longer than the label. Set a spacer length.
  const space = labelSize((isEq ? 0 : 0.3), labelStyle.level).toFixed(4)
  let upperNode: MathNode | undefined
  let lowerNode: MathNode | undefined

  const gotUpper = hasContent(body)
  if (gotUpper) {
    let label: MathDomNode = mml.buildGroup(body, labelStyle)
    const mustSmash = (fName === "\\\\cdrightarrow" || fName === "\\\\cdleftarrow")
    label = paddedNode(label, space, space, mustSmash)
    // Since Firefox does not support minsize, stack a invisible node
    // on top of the label. Its width will serve as a min-width.
    // TODO: Refactor this after Firefox supports minsize.
    upperNode = new mathMLTree.MathNode("mover", [label, dummyNode])
  }
  const gotLower = hasContent(below)
  if (gotLower) {
    let label: MathDomNode = mml.buildGroup(below, labelStyle)
    label = paddedNode(label, space, space)
    lowerNode = new mathMLTree.MathNode("munder", [label, dummyNode])
  }

  let node: MathNode
  if (!gotUpper && !gotLower) {
    node = new mathMLTree.MathNode("mover", [arrowNode, emptyLabel])
  } else if (gotUpper && gotLower) {
    node = new mathMLTree.MathNode("munderover", [arrowNode, lowerNode!, upperNode!])
  } else if (gotUpper) {
    node = new mathMLTree.MathNode("mover", [arrowNode, upperNode!])
  } else {
    node = new mathMLTree.MathNode("munder", [arrowNode, lowerNode!])
  }
  if (minWidth === "3.0") { node.style.height = "1em" } // CD environment
  node.setAttribute("accent", "false") // Necessary for MS Word
  return node
}

// Stretchy arrows with an optional argument
defineFunction({
  type: "xArrow",
  names: [
    "\\xleftarrow",
    "\\xrightarrow",
    "\\xLeftarrow",
    "\\xRightarrow",
    "\\xleftrightarrow",
    "\\xLeftrightarrow",
    "\\xhookleftarrow",
    "\\xhookrightarrow",
    "\\xmapsto",
    "\\xrightharpoondown",
    "\\xrightharpoonup",
    "\\xleftharpoondown",
    "\\xleftharpoonup",
    "\\xlongequal",
    "\\xtwoheadrightarrow",
    "\\xtwoheadleftarrow",
    "\\xtofrom",              // expfeil
    "\\xleftrightharpoons",   // mathtools
    "\\xrightleftharpoons",   // mathtools
    // The next 7 functions are here only to support mhchem
    "\\yields",
    "\\yieldsLeft",
    "\\mesomerism",
    "\\longrightharpoonup",
    "\\longleftharpoondown",
    "\\yieldsLeftRight",
    "\\chemequilibrium",
    // The next 3 functions are here only to support the {CD} environment.
    "\\\\cdrightarrow",
    "\\\\cdleftarrow",
    "\\\\cdlongequal"
  ],
  props: {
    numArgs: 1,
    numOptionalArgs: 1
  },
  handler({ parser, funcName }, args, optArgs) {
    return {
      type: "xArrow",
      mode: parser.mode,
      name: funcName,
      body: args[0],
      below: optArgs[0]
    };
  },
  mathmlBuilder(group, style) {
    // Build the arrow and its labels.
    const node = munderoverNode(group.name, group.body, group.below, style)
    // Create operator spacing for a relation.
    const row = [node]
    row.unshift(padding(0.2778))
    row.push(padding(0.2778))
    return new mathMLTree.MathNode("mrow", row)
  }
});

const arrowComponent: Record<string, [string, string]> = {
  "\\equilibriumRight": ["\\longrightharpoonup", "\\eqleftharpoondown"],
  "\\equilibriumLeft": ["\\eqrightharpoonup", "\\longleftharpoondown"]
}

// Math fonts do not have a single glyph for these two mhchem functions.
// So we stack a pair of single harpoons.
defineFunction({
  type: "stackedArrow",
  names: [
    "\\equilibriumRight",
    "\\equilibriumLeft"
  ],
  props: {
    numArgs: 1,
    numOptionalArgs: 1
  },
  handler({ parser, funcName }, args, optArgs) {
    const lowerArrowBody: ParseNode<"hphantom"> | null = args[0]
      ? {
        type: "hphantom",
        mode: parser.mode,
        body: args[0]
      }
      : null;
    const upperArrowBelow: ParseNode<"hphantom"> | null = optArgs[0]
      ? {
        type: "hphantom",
        mode: parser.mode,
        body: optArgs[0]
      }
      : null;
    return {
      type: "stackedArrow",
      mode: parser.mode,
      name: funcName,
      body: args[0],
      upperArrowBelow,
      lowerArrowBody,
      below: optArgs[0]
    };
  },
  mathmlBuilder(group, style) {
    const topLabel = arrowComponent[group.name][0]
    const botLabel = arrowComponent[group.name][1]
    const topArrow = munderoverNode(topLabel, group.body, group.upperArrowBelow, style)
    const botArrow = munderoverNode(botLabel, group.lowerArrowBody, group.below, style)
    let wrapper: MathNode

    const raiseNode = new mathMLTree.MathNode("mpadded", [topArrow])
    raiseNode.setAttribute("voffset", "0.3em")
    raiseNode.setAttribute("height", "+0.3em")
    raiseNode.setAttribute("depth", "-0.3em")
    // One of the arrows is given ~zero width. so the other has the same horzontal alignment.
    if (group.name === "\\equilibriumLeft") {
      const botNode =  new mathMLTree.MathNode("mpadded", [botArrow])
      botNode.setAttribute("width", "0.5em")
      wrapper = new mathMLTree.MathNode(
        "mpadded",
        [padding(0.2778), botNode, raiseNode, padding(0.2778)]
      )
    } else {
      raiseNode.setAttribute("width", (group.name === "\\equilibriumRight" ? "0.5em" : "0"))
      wrapper = new mathMLTree.MathNode(
        "mpadded",
        [padding(0.2778), raiseNode, botArrow, padding(0.2778)]
      )
    }

    wrapper.setAttribute("voffset", "-0.18em")
    wrapper.setAttribute("height", "-0.18em")
    wrapper.setAttribute("depth", "+0.18em")
    return wrapper
  }
});

