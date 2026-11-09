import defineFunction from "../defineFunction"
import * as mml from "../buildMathML"
import type { MathNode } from "../mathMLTree"

defineFunction({
  type: "reflect",
  names: ["\\reflectbox"],
  props: {
    numArgs: 1,
    argTypes: ["hbox"],
    allowedInText: true
  },
  handler({ parser }, args) {
    return {
      type: "reflect",
      mode: parser.mode,
      body: args[0]
    };
  },
  mathmlBuilder(group, style) {
    const node = mml.buildGroup(group.body, style) as MathNode
    node.style.transform = "scaleX(-1)"
    return node
  }
})
