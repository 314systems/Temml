import defineFunction, { ordargument } from '../defineFunction';
import symbols from '../symbols';
import * as mml from '../buildMathML';
import * as utils from '../utils';
import type { AnyParseNode, ParseNode, SymbolParseNode } from '../parseNode';

defineFunction({
  type: 'not',
  names: ['\\not'],
  props: {
    numArgs: 1,
    primitive: true,
    allowedInText: false,
  },
  handler({ parser }, args) {
    const isCharacterBox = utils.isCharacterBox(args[0]);
    let body: AnyParseNode[];
    if (isCharacterBox) {
      body = ordargument(args[0]);
      const first = body[0] as SymbolParseNode;
      if (first.text.charAt(0) === '\\') {
        first.text = symbols.math[first.text].replace!;
      }
      // \u0338 is the Unicode Combining Long Solidus Overlay
      first.text = first.text.slice(0, 1) + '\u0338' + first.text.slice(1);
    } else {
      // When the argument is not a character box, TeX does an awkward, poorly placed overlay.
      // We'll do the same.
      const notNode: ParseNode<'textord'> = { type: 'textord', mode: 'math', text: '\u0338' };
      const kernNode: ParseNode<'kern'> = {
        type: 'kern',
        mode: 'math',
        dimension: { number: -0.6, unit: 'em' },
      };
      body = [notNode, kernNode, args[0]];
    }
    return {
      type: 'not',
      mode: parser.mode,
      body,
      isCharacterBox,
    };
  },
  mathmlBuilder(group, style) {
    if (group.isCharacterBox) {
      const inner = mml.buildExpression(group.body, style, true);
      return inner[0];
    } else {
      return mml.buildExpressionRow(group.body, style);
    }
  },
});
