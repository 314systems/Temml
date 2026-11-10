import defineFunction from '../defineFunction';
import environments from '../environments';
import type { ParseNode } from '../parseNode';

// \bordermatrix  from TeXbook pp 177 & 361
// Optional argument from Herbert Voß, Math mode, p 20
// Ref: https://tug.ctan.org/obsolete/info/math/voss/mathmode/Mathmode.pdf

defineFunction({
  // The handler returns the node built by the bordermatrix environment.
  type: 'array',
  names: ['\\bordermatrix', '\\matrix'],
  props: {
    numArgs: 0,
    numOptionalArgs: 1,
  },
  handler: ({ parser, funcName }, args, optArgs) => {
    // Find out if the author has defined custom delimiters
    let delimiters = ['(', ')']; // default
    const optArg = optArgs[0] as ParseNode<'ordgroup'> | null | undefined;
    if (funcName === '\\bordermatrix' && optArg?.body) {
      const body = optArg.body;
      const first = body[0];
      if (body.length === 1 && first.type === 'delimiter') {
        delimiters = [first.left, first.right];
      }
    }
    // consume the opening brace
    parser.consumeSpaces();
    parser.consume();

    // Pass control to the environment handler in array.js.
    const env = environments.bordermatrix;
    const context = {
      mode: parser.mode,
      envName: funcName.slice(1),
      delimiters,
      parser,
    };
    const result = env.handler(context, [], []);
    parser.expect('}', true);
    return result;
  },
});
