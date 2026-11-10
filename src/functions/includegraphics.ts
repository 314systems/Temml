import defineFunction from '../defineFunction';
import { calculateSize, validUnit } from '../units';
import ParseError from '../ParseError';
import { Img } from '../domTree';
import * as mathMLTree from '../mathMLTree';
import { assertNodeType } from '../parseNode';
import type { CssStyle } from '../tree';
import type { Measurement } from '../units';

const sizeData = (str: string): Measurement => {
  if (/^[-+]? *(\d+(\.\d*)?|\.\d+)$/.test(str)) {
    // str is a number with no unit specified.
    // default unit is bp, per graphix package.
    return { number: +str, unit: 'bp' };
  } else {
    const match = /([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/.exec(str);
    if (!match) {
      throw new ParseError("Invalid size: '" + str + "' in \\includegraphics");
    }
    const data = {
      number: +(match[1] + match[2]), // sign + magnitude, cast to number
      unit: match[3],
    };
    if (!validUnit(data)) {
      throw new ParseError("Invalid unit: '" + data.unit + "' in \\includegraphics.");
    }
    return data;
  }
};

defineFunction({
  type: 'includegraphics',
  names: ['\\includegraphics'],
  props: {
    numArgs: 1,
    numOptionalArgs: 1,
    argTypes: ['raw', 'url'],
    allowedInText: false,
  },
  handler: ({ parser, token }, args, optArgs) => {
    let width: Measurement = { number: 0, unit: 'em' };
    let height: Measurement = { number: 0.9, unit: 'em' }; // sorta character sized.
    let totalheight: Measurement = { number: 0, unit: 'em' };
    let alt = '';

    if (optArgs[0]) {
      const attributeStr = assertNodeType(optArgs[0], 'raw').string;

      // Parser.js does not parse key/value pairs. We get a string.
      const attributes = attributeStr.split(',');
      for (const attribute of attributes) {
        const keyVal = attribute.split('=');
        if (keyVal.length === 2) {
          const str = keyVal[1].trim();
          switch (keyVal[0].trim()) {
            case 'alt':
              alt = str;
              break;
            case 'width':
              width = sizeData(str);
              break;
            case 'height':
              height = sizeData(str);
              break;
            case 'totalheight':
              totalheight = sizeData(str);
              break;
            default:
              throw new ParseError("Invalid key: '" + keyVal[0] + "' in \\includegraphics.");
          }
        }
      }
    }

    const src = assertNodeType(args[0], 'url').url;

    if (alt === '') {
      // No alt given. Use the file name. Strip away the path.
      alt = src;
      alt = alt.replace(/^.*[\\/]/, '');
      alt = alt.slice(0, Math.max(0, alt.lastIndexOf('.')));
    }

    if (
      !parser.settings.isTrusted({
        command: '\\includegraphics',
        url: src,
      })
    ) {
      throw new ParseError(`Function "\\includegraphics" is not trusted`, token);
    }

    return {
      type: 'includegraphics',
      mode: parser.mode,
      alt: alt,
      width: width,
      height: height,
      totalheight: totalheight,
      src: src,
    };
  },
  mathmlBuilder: (group, style) => {
    const height = calculateSize(group.height, style);
    const depth = { number: 0, unit: 'em' };

    if (
      group.totalheight.number > 0 &&
      group.totalheight.unit === height.unit &&
      group.totalheight.number > height.number
    ) {
      depth.number = group.totalheight.number - height.number;
      depth.unit = height.unit;
    }

    let width: Measurement = { number: 0, unit: 'em' };
    if (group.width.number > 0) {
      width = calculateSize(group.width, style);
    }

    const graphicStyle: CssStyle = { height: `${String(height.number + depth.number)}em` };
    if (width.number > 0) {
      graphicStyle.width = `${String(width.number)}${width.unit}`;
    }
    if (depth.number > 0) {
      graphicStyle.verticalAlign = `${String(-depth.number)}${depth.unit}`;
    }

    const node = new Img(group.src, group.alt, graphicStyle);
    return new mathMLTree.MathNode('mtext', [node]);
  },
});
