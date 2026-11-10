import defineFunction from '../defineFunction';
import * as mathMLTree from '../mathMLTree';
import { assertNodeType } from '../parseNode';

// Limit valid characters to a small set, for safety.
export const invalidIdRegEx = /[^A-Za-z_0-9-]/g;

defineFunction({
  type: 'label',
  names: ['\\label'],
  props: {
    numArgs: 1,
    argTypes: ['raw'],
  },
  handler({ parser }, args) {
    return {
      type: 'label',
      mode: parser.mode,
      string: assertNodeType(args[0], 'raw').string.replaceAll(invalidIdRegEx, ''),
    };
  },
  mathmlBuilder(group) {
    // Return a no-width, no-ink element with an HTML id.
    const node = new mathMLTree.MathNode('mrow', [], ['tml-label']);
    if (group.string.length > 0) {
      node.setLabel(group.string);
    }
    return node;
  },
});
