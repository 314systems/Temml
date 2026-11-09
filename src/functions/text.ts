import defineFunction, { ordargument } from '../defineFunction';
import * as mml from '../buildMathML';
import type { ParseNode } from '../parseNode';
import type Style from '../Style';

// Non-mathy text, possibly in a font
const textFontFamilies: Record<string, string | undefined> = {
  '\\text': undefined,
  '\\textrm': 'textrm',
  '\\textsf': 'textsf',
  '\\texttt': 'texttt',
  '\\textnormal': 'textrm',
  '\\textsc': 'textsc', // small caps
};

const textFontWeights: Record<string, string> = {
  '\\textbf': 'textbf',
  '\\textmd': 'textmd',
};

const textFontShapes: Record<string, string> = {
  '\\textit': 'textit',
  '\\textup': 'textup',
};

const styleWithFont = (group: ParseNode<'text'>, style: Style): Style => {
  const font = group.font;
  // Checks if the argument is a font family or a font style.
  if (!font) {
    return style;
  } else if (textFontFamilies[font]) {
    return style.withTextFontFamily(textFontFamilies[font]!);
  } else if (textFontWeights[font]) {
    return style.withTextFontWeight(textFontWeights[font]);
  } else if (font === '\\emph') {
    return style.fontShape === 'textit'
      ? style.withTextFontShape('textup')
      : style.withTextFontShape('textit');
  }
  return style.withTextFontShape(textFontShapes[font]);
};

defineFunction({
  type: 'text',
  names: [
    // Font families
    '\\text',
    '\\textrm',
    '\\textsf',
    '\\texttt',
    '\\textnormal',
    '\\textsc',
    // Font weights
    '\\textbf',
    '\\textmd',
    // Font Shapes
    '\\textit',
    '\\textup',
    '\\emph',
  ],
  props: {
    numArgs: 1,
    argTypes: ['text'],
    allowedInArgument: true,
    allowedInText: true,
  },
  handler({ parser, funcName }, args) {
    const body = args[0];
    return {
      type: 'text',
      mode: parser.mode,
      body: ordargument(body),
      font: funcName,
    };
  },
  mathmlBuilder(group, style) {
    const newStyle = styleWithFont(group, style);
    const mrow = mml.buildExpressionRow(group.body, newStyle);
    return mml.consolidateText(mrow);
  },
});
