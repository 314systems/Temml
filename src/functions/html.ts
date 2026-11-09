import defineFunction, { ordargument } from '../defineFunction';
import { assertNodeType } from '../parseNode';
import ParseError from '../ParseError';
import type { MathNode } from '../mathMLTree';
import type { TrustContext } from '../Settings';

import * as mml from '../buildMathML';

defineFunction({
  type: 'html',
  names: ['\\class', '\\id', '\\style', '\\data'],
  props: {
    numArgs: 2,
    argTypes: ['raw', 'original'],
    allowedInText: true,
  },
  handler: ({ parser, funcName, token }, args) => {
    if (parser.settings.strict) {
      throw new ParseError(`Function "${funcName}" is disabled in strict mode`, token);
    }
    const value = assertNodeType(args[0], 'raw').string;
    const body = args[1];

    let trustContext: TrustContext;
    const attributes: Record<string, string> = {};

    switch (funcName) {
      case '\\class':
        attributes.class = value;
        trustContext = {
          command: '\\class',
          class: value,
        };
        break;
      case '\\id':
        attributes.id = value;
        trustContext = {
          command: '\\id',
          id: value,
        };
        break;
      case '\\style':
        attributes.style = value;
        trustContext = {
          command: '\\style',
          style: value,
        };
        break;
      case '\\data': {
        const data = value.split(',');
        for (let i = 0; i < data.length; i++) {
          const keyVal = data[i].split('=');
          if (keyVal.length !== 2) {
            throw new ParseError('Error parsing key-value for \\data');
          }
          attributes['data-' + keyVal[0].trim()] = keyVal[1].trim();
        }

        trustContext = {
          command: '\\data',
          attributes,
        };
        break;
      }
      default:
        throw new Error('Unrecognized html command');
    }

    if (!parser.settings.isTrusted(trustContext)) {
      throw new ParseError(`Function "${funcName}" is not trusted`, token);
    }
    return {
      type: 'html',
      mode: parser.mode,
      attributes,
      body: ordargument(body),
    };
  },
  mathmlBuilder: (group, style) => {
    const element = mml.buildExpressionRow(group.body, style) as MathNode;

    const classes: string[] = [];
    if (group.attributes.class) {
      classes.push(...group.attributes.class.trim().split(/\s+/));
    }
    element.classes = classes;

    for (const attr in group.attributes) {
      if (attr !== 'class' && Object.hasOwn(group.attributes, attr)) {
        element.setAttribute(attr, group.attributes[attr]);
      }
    }

    return element;
  },
});
