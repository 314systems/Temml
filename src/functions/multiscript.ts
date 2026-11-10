import defineFunction from '../defineFunction';
import * as mathMLTree from '../mathMLTree';
import * as mml from '../buildMathML';
import ParseError from '../ParseError';
import { isMathNodeOfType } from '../mathMLTree';
import type { MathNode } from '../mathMLTree';
import { assertNodeType } from '../parseNode';
import type { AnyParseNode, ParseNode } from '../parseNode';
import type Style from '../Style';
import type { MathDomNode } from '../tree';

// Helper function
export const buildGroup = (
  el: AnyParseNode | null | undefined,
  style: Style,
  noneNode: MathNode,
): MathDomNode => {
  if (!el) {
    return noneNode;
  }
  const node = mml.buildGroup(el, style);
  if (isMathNodeOfType(node, 'mrow') && node.children.length === 0) {
    return noneNode;
  }
  return node;
};

defineFunction({
  type: 'multiscript',
  names: ['\\sideset', '\\pres@cript'], // See macros.js for \prescript
  props: {
    numArgs: 3,
  },
  handler({ parser, funcName, token }, args) {
    const preArg = assertNodeType(args[0], 'ordgroup');
    const postArg = assertNodeType(args[1], 'ordgroup');
    const baseArg = assertNodeType(args[2], 'ordgroup');
    if (baseArg.body.length === 0) {
      throw new ParseError(funcName + `cannot parse an empty base.`);
    }
    const base = baseArg.body[0];
    if (
      parser.settings.strict &&
      funcName === '\\sideset' &&
      !(base as { symbol?: boolean }).symbol
    ) {
      throw new ParseError(`The base of \\sideset must be a big operator. Try \\prescript.`);
    }

    if (
      (preArg.body.length > 0 && preArg.body[0].type !== 'supsub') ||
      (postArg.body.length > 0 && postArg.body[0].type !== 'supsub')
    ) {
      throw new ParseError(
        '\\sideset can parse only subscripts and superscripts in its first two arguments',
        token,
      );
    }

    // The prescripts and postscripts come wrapped in a supsub.
    const prescripts = preArg.body.length > 0 ? (preArg.body[0] as ParseNode<'supsub'>) : null;
    const postscripts = postArg.body.length > 0 ? (postArg.body[0] as ParseNode<'supsub'>) : null;

    if (prescripts) {
      return {
        type: 'multiscript',
        mode: parser.mode,
        isSideset: funcName === '\\sideset',
        prescripts,
        postscripts,
        base,
      };
    } else if (postscripts) {
      // It's not a multi-script. Get a \textstyle supsub.
      return {
        type: 'styling',
        mode: parser.mode,
        scriptLevel: 'text',
        body: [
          {
            type: 'supsub',
            mode: parser.mode,
            base,
            sup: postscripts.sup,
            sub: postscripts.sub,
          },
        ],
      };
    }
    return base;
  },
  mathmlBuilder(group, style) {
    const base = mml.buildGroup(group.base, style);

    const prescriptsNode = new mathMLTree.MathNode('mprescripts');
    const noneNode = new mathMLTree.MathNode('none');
    let children: MathDomNode[];

    const preSub = buildGroup(group.prescripts.sub, style, noneNode);
    const preSup = buildGroup(group.prescripts.sup, style, noneNode);
    if (group.isSideset) {
      // This seems silly, but LaTeX does this. Firefox ignores it, which does not make me sad.
      (preSub as MathNode).setAttribute('style', 'text-align: left;');
      (preSup as MathNode).setAttribute('style', 'text-align: left;');
    }

    if (group.postscripts) {
      const postSub = buildGroup(group.postscripts.sub, style, noneNode);
      const postSup = buildGroup(group.postscripts.sup, style, noneNode);
      children = [base, postSub, postSup, prescriptsNode, preSub, preSup];
    } else {
      children = [base, prescriptsNode, preSub, preSup];
    }

    return new mathMLTree.MathNode('mmultiscripts', children);
  },
});
