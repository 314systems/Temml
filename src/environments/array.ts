import defineEnvironment from '../defineEnvironment';
import { parseCD } from './cd';
import { bordermatrixParseTree } from './borderTree';
import defineFunction from '../defineFunction';
import * as mathMLTree from '../mathMLTree';
import { Span } from '../domTree';
import { Token } from '../Token';
import { StyleLevel } from '../constants';
import ParseError from '../ParseError';
import { assertNodeType, assertSymbolNodeType } from '../parseNode';
import { checkSymbolNodeType } from '../parseNode';
import { stringFromArg } from '../macros';
import { calculateSize } from '../units';
import * as mml from '../buildMathML';
import { isMathNodeOfType } from '../mathMLTree';
import type { MathNode } from '../mathMLTree';
import type { EnvContext } from '../defineEnvironment';
import type { MacroDefinition, MacroExpansion } from '../defineMacro';
import type { MathMLBuilder } from '../defineFunction';
import type Namespace from '../Namespace';
import type Parser from '../Parser';
import type { AnyParseNode, ColSpec, ParseNode } from '../parseNode';
import type { MathDomNode } from '../tree';
import type { StyleStr } from '../types';
import type { Measurement } from '../units';

// Helper functions
const getHLines = (parser: Parser): boolean[] => {
  // Return an array. The array length = number of hlines.
  // Each element in the array tells if the line is dashed.
  const hlineInfo: boolean[] = [];
  parser.consumeSpaces();
  let nxt = parser.fetch().text;
  if (nxt === '\\relax') {
    parser.consume();
    parser.consumeSpaces();
    nxt = parser.fetch().text;
  }
  while (nxt === '\\hline' || nxt === '\\hdashline') {
    parser.consume();
    hlineInfo.push(nxt === '\\hdashline');
    parser.consumeSpaces();
    nxt = parser.fetch().text;
  }
  return hlineInfo;
};

const validateAmsEnvironmentContext = (context: EnvContext): void => {
  const settings = context.parser.settings;
  if (!settings.displayMode) {
    throw new ParseError(`{${context.envName}} can be used only in display mode.`);
  }
};

const sizeRegEx = /([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/;
const arrayGaps = (macros: Namespace<MacroDefinition>): [number | null, Measurement | null] => {
  const stretchMacro = macros.get('\\arraystretch');
  const stretchStr: string =
    typeof stretchMacro === 'string'
      ? stretchMacro
      : stringFromArg((stretchMacro as MacroExpansion).tokens);
  const arraystretch = isNaN(Number(stretchStr)) ? null : Number(stretchStr);
  const colsepMacro = macros.get('\\arraycolsep');
  const arraycolsepStr: string =
    typeof colsepMacro === 'string'
      ? colsepMacro
      : stringFromArg((colsepMacro as MacroExpansion).tokens);
  const match = sizeRegEx.exec(arraycolsepStr);
  const arraycolsep = match ? { number: +(match[1] + match[2]), unit: match[3] } : null;
  return [arraystretch, arraycolsep];
};

const checkCellForLabels = (cell: AnyParseNode[]): string => {
  // Check if the author wrote a \tag{} inside this cell.
  let rowLabel = '';
  for (let i = 0; i < cell.length; i++) {
    const node = cell[i];
    if (node.type === 'label') {
      if (rowLabel) {
        throw new ParseError('Multiple \\labels in one row');
      }
      rowLabel = node.string;
    }
  }
  return rowLabel;
};

// autoTag (an argument to parseArray) can be one of three values:
// * undefined: Regular (not-top-level) array; no tags on each row
// * true: Automatic equation numbering, overridable by \tag
// * false: Tags allowed on each row, but no automatic numbering
// This function *doesn't* work with the "split" environment name.
const getAutoTag = (name: string): boolean | undefined => {
  if (name.indexOf('ed') === -1) {
    return name.indexOf('*') === -1;
  }
  // return undefined;
};

/**
 * Parse the body of the environment, with rows delimited by \\ and
 * columns delimited by &, and create a nested list in row-major order
 * with one group per cell.  If given an optional argument scriptLevel
 * ("text", "display", etc.), then each cell is cast into that scriptLevel.
 */
interface ArrayOptions {
  cols?: ColSpec[];
  envClasses: string[]; // align(ed|at|edat) | array | cases | cd | small | multline
  autoTag?: boolean;
  singleRow?: boolean;
  emptySingleRow?: boolean;
  maxNumCols?: number;
  leqno?: boolean;
  arraystretch?: number | null;
  arraycolsep?: Measurement | null;
}

const parseArray = (
  parser: Parser,
  {
    cols,
    envClasses,
    autoTag,
    singleRow,
    emptySingleRow,
    maxNumCols,
    leqno,
    arraystretch,
    arraycolsep,
  }: ArrayOptions,
  scriptLevel: StyleStr,
): ParseNode<'array'> => {
  const endToken = envClasses && envClasses.includes('bordermatrix') ? '}' : '\\end';
  parser.gullet.beginGroup();
  if (!singleRow) {
    // \cr is equivalent to \\ without the optional size argument (see below)
    // TODO: provide helpful error when \cr is used outside array environment
    parser.gullet.macros.set('\\cr', '\\\\\\relax');
  }

  // Start group for first cell
  parser.gullet.beginGroup();

  let row: AnyParseNode[] = [];
  const body = [row];
  const rowGaps: Array<Measurement | null> = [];
  const labels: string[] = [];

  const hLinesBeforeRow: boolean[][] = [];

  const tags: Array<boolean | AnyParseNode[]> | undefined = autoTag != null ? [] : undefined;

  // amsmath uses \global\@eqnswtrue and \global\@eqnswfalse to represent
  // whether this row should have an equation number.  Simulate this with
  // a \@eqnsw macro set to 1 or 0.
  const beginRow = () => {
    if (autoTag) {
      parser.gullet.macros.set('\\@eqnsw', '1', true);
    }
  };
  const endRow = () => {
    if (tags) {
      if (parser.gullet.macros.get('\\df@tag')) {
        tags.push(parser.subparse([new Token('\\df@tag')]));
        // Undefine \df@tag.
        parser.gullet.macros.set('\\df@tag', undefined as unknown as MacroDefinition, true);
      } else {
        tags.push(Boolean(autoTag) && parser.gullet.macros.get('\\@eqnsw') === '1');
      }
    }
  };
  beginRow();

  // Test for \hline at the top of the array.
  hLinesBeforeRow.push(getHLines(parser));

  while (true) {
    // Parse each cell in its own group (namespace)
    const cellBody = parser.parseExpression(false, singleRow ? '\\end' : '\\\\');
    parser.gullet.endGroup();
    parser.gullet.beginGroup();

    const cell: ParseNode<'ordgroup'> = {
      type: 'ordgroup',
      mode: parser.mode,
      body: cellBody,
      semisimple: true,
    };
    row.push(cell);
    const next = parser.fetch().text;
    if (next === '&') {
      if (maxNumCols && row.length === maxNumCols) {
        if (envClasses.includes('array')) {
          if (parser.settings.strict) {
            throw new ParseError(
              'Too few columns ' + 'specified in the {array} column argument.',
              parser.nextToken,
            );
          }
        } else if (maxNumCols === 2) {
          throw new ParseError(
            'The split environment accepts no more than two columns',
            parser.nextToken,
          );
        } else {
          throw new ParseError(
            'The equation environment accepts only one column',
            parser.nextToken,
          );
        }
      }
      parser.consume();
    } else if (next === endToken) {
      endRow();
      // Arrays terminate newlines with `\crcr` which consumes a `\cr` if
      // the last line is empty.  However, AMS environments keep the
      // empty row if it's the only one.
      // NOTE: Currently, `cell` is the last item added into `row`.
      if (row.length === 1 && cell.body.length === 0 && (body.length > 1 || !emptySingleRow)) {
        body.pop();
      }
      labels.push(checkCellForLabels(cell.body));
      if (hLinesBeforeRow.length < body.length + 1) {
        hLinesBeforeRow.push([]);
      }
      break;
    } else if (next === '\\\\') {
      parser.consume();
      let size: ParseNode<'size'> | null | undefined;
      // \def\Let@{\let\\\math@cr}
      // \def\math@cr{...\math@cr@}
      // \def\math@cr@{\new@ifnextchar[\math@cr@@{\math@cr@@[\z@]}}
      // \def\math@cr@@[#1]{...\math@cr@@@...}
      // \def\math@cr@@@{\cr}
      if (parser.gullet.future().text !== ' ') {
        size = parser.parseSizeGroup(true);
      }
      rowGaps.push(size ? size.value : null);
      endRow();

      labels.push(checkCellForLabels(cell.body));

      // check for \hline(s) following the row separator
      hLinesBeforeRow.push(getHLines(parser));

      row = [];
      body.push(row);
      beginRow();
    } else {
      throw new ParseError('Expected & or \\\\ or \\cr or ' + endToken, parser.nextToken);
    }
  }

  // End cell group
  parser.gullet.endGroup();
  // End array group defining \cr
  parser.gullet.endGroup();

  return {
    type: 'array',
    mode: parser.mode,
    body,
    cols,
    rowGaps,
    hLinesBeforeRow,
    envClasses,
    autoTag,
    scriptLevel,
    tags,
    labels,
    leqno,
    arraystretch,
    arraycolsep,
  };
};

// Decides on a scriptLevel for cells in an array according to whether the given
// environment name starts with the letter 'd'.
const dCellStyle = (envName: string): StyleStr => {
  return envName.slice(0, 1) === 'd' ? 'display' : 'text';
};

const alignMap: Record<string, string> = {
  c: 'center ',
  l: 'left ',
  r: 'right ',
};

const glue = (group: ParseNode<'array'>): MathNode => {
  const glueNode = new mathMLTree.MathNode('mtd', []);
  glueNode.style = { padding: '0', width: '50%' };
  if (group.envClasses.includes('multline')) {
    glueNode.style.width = '7.5%';
  }
  return glueNode;
};

// The cells of a table row. Rows only ever contain <mtd> cells.
const cellsOf = (mtr: MathNode): MathNode[] => mtr.children as MathNode[];

const mathmlBuilder: MathMLBuilder<'array'> = (group, style) => {
  const tbl: MathNode[] = [];
  const numRows = group.body.length;
  const hlines = group.hLinesBeforeRow;
  const tagIsPresent = group.tags && group.tags.some((tag) => tag);

  for (let i = 0; i < numRows; i++) {
    const rw = group.body[i];
    const row: MathNode[] = [];
    const cellLevel =
      group.scriptLevel === 'text'
        ? StyleLevel.TEXT
        : group.scriptLevel === 'script'
          ? StyleLevel.SCRIPT
          : StyleLevel.DISPLAY;

    for (let j = 0; j < rw.length; j++) {
      const mtd = new mathMLTree.MathNode('mtd', [
        mml.buildGroup(rw[j], style.withLevel(cellLevel)),
      ]);

      if (group.envClasses.includes('multline')) {
        const align = i === 0 ? 'left' : i === numRows - 1 ? 'right' : 'center';
        if (align !== 'center') {
          mtd.classes.push('tml-' + align);
        }
      }
      row.push(mtd);
    }
    const numColumns = group.body[0].length;
    // Fill out a short row with empty <mtd> elements.
    for (let k = 0; k < numColumns - rw.length; k++) {
      row.push(new mathMLTree.MathNode('mtd', [], []));
    }
    if (tagIsPresent) {
      const tag = group.tags![i];
      let tagElement: MathDomNode;
      if (tag === true) {
        // automatic numbering
        tagElement = new mathMLTree.MathNode('mtext', [new Span(['tml-eqn'])]);
      } else if (tag === false) {
        // \nonumber/\notag or starred environment
        tagElement = new mathMLTree.MathNode('mtext', [], []);
      } else {
        // manual \tag
        const tagNode = mml.consolidateText(
          mml.buildExpressionRow(
            (tag[0] as ParseNode<'text'>).body,
            style.withLevel(cellLevel),
            true,
          ),
        ) as MathNode;
        tagNode.classes = ['tml-tag'];
        tagElement = tagNode;
      }
      if (tagElement) {
        row.unshift(glue(group));
        row.push(glue(group));
        if (group.leqno) {
          row[0].children.push(tagElement);
        } else {
          row[row.length - 1].children.push(tagElement);
        }
      }
    }
    const mtr = new mathMLTree.MathNode('mtr', row, []);
    const label = group.labels.shift();
    if (label && group.tags && group.tags[i]) {
      mtr.setAttribute('id', label);
      if (Array.isArray(group.tags[i])) {
        mtr.classes.push('tml-tageqn');
      }
    }

    // Write horizontal rules
    if (i === 0 && hlines[0].length > 0) {
      if (hlines[0].length === 2) {
        cellsOf(mtr).forEach((cell) => {
          cell.style.borderTop = '0.15em double';
        });
      } else {
        cellsOf(mtr).forEach((cell) => {
          cell.style.borderTop = hlines[0][0] ? '0.06em dashed' : '0.06em solid';
        });
      }
    }
    if (hlines[i + 1].length > 0) {
      if (hlines[i + 1].length === 2) {
        cellsOf(mtr).forEach((cell) => {
          cell.style.borderBottom = '0.15em double';
        });
      } else {
        cellsOf(mtr).forEach((cell) => {
          cell.style.borderBottom = hlines[i + 1][0] ? '0.06em dashed' : '0.06em solid';
        });
      }
    }

    // Check for \hphantom \from \bordermatrix
    let mustSquashRow = true;
    for (let j = 0; j < mtr.children.length; j++) {
      const child = cellsOf(mtr)[j].children[0];
      if (!(isMathNodeOfType(child, 'mpadded') && child.attributes.height === '0px')) {
        mustSquashRow = false;
        break;
      }
    }
    if (mustSquashRow) {
      // All the cell contents are \hphantom. Squash the cell.
      // TODO: Remove the next line when Firefox no longer needs it.
      mtr.classes.push('ff-squash'); // necessary in Firefox only.
      for (let j = 0; j < mtr.children.length; j++) {
        cellsOf(mtr)[j].style.paddingTop = '0';
        cellsOf(mtr)[j].style.paddingBottom = '0';
      }
    }

    tbl.push(mtr);
  }

  if (group.arraystretch && group.arraystretch !== 1) {
    // In LaTeX, \arraystretch is a factor applied to a 12pt strut height.
    // It defines a baseline to baseline distance.
    // Here, we do an approximation of that approach.
    const pad = String(1.4 * group.arraystretch - 0.8) + 'ex';
    for (let i = 0; i < tbl.length; i++) {
      for (let j = 0; j < tbl[i].children.length; j++) {
        cellsOf(tbl[i])[j].style.paddingTop = pad;
        cellsOf(tbl[i])[j].style.paddingBottom = pad;
      }
    }
  }

  let sidePadding: string | undefined;
  let sidePadUnit: string | undefined;
  if (group.envClasses.length > 0) {
    sidePadding = group.envClasses.includes('abut')
      ? '0'
      : group.envClasses.includes('cases')
        ? '0'
        : group.envClasses.includes('small')
          ? '0.1389'
          : group.envClasses.includes('cd')
            ? '0.25'
            : '0.4'; // default side padding
    sidePadUnit = 'em';
  }
  if (group.arraycolsep) {
    const arraySidePad = calculateSize(group.arraycolsep, style);
    sidePadding = arraySidePad.number.toFixed(4);
    sidePadUnit = arraySidePad.unit;
  }
  if (sidePadding) {
    const numCols = tbl.length === 0 ? 0 : tbl[0].children.length;

    const sidePad = (j: number, hand: number): string | undefined => {
      if (j === 0 && hand === 0) {
        return '0';
      }
      if (j === numCols - 1 && hand === 1) {
        return '0';
      }
      if (group.envClasses[0] !== 'align') {
        return sidePadding;
      }
      if (hand === 1) {
        return '0';
      }
      if (tagIsPresent) {
        return j % 2 ? '1' : '0';
      } else {
        return j % 2 ? '0' : '1';
      }
    };

    // Side padding
    for (let i = 0; i < tbl.length; i++) {
      for (let j = 0; j < tbl[i].children.length; j++) {
        cellsOf(tbl[i])[j].style.paddingLeft = `${sidePad(j, 0)}${sidePadUnit}`;
        cellsOf(tbl[i])[j].style.paddingRight = `${sidePad(j, 1)}${sidePadUnit}`;
      }
    }
  }
  if (group.envClasses.length === 0) {
    // Set zero padding on side of the matrix
    for (let i = 0; i < tbl.length; i++) {
      cellsOf(tbl[i])[0].style.paddingLeft = '0em';
      if (tbl[i].children.length === tbl[0].children.length) {
        cellsOf(tbl[i])[tbl[i].children.length - 1].style.paddingRight = '0em';
      }
    }
  }

  if (group.envClasses.length > 0) {
    // Justification
    const align = group.envClasses.includes('align') || group.envClasses.includes('alignat');
    for (let i = 0; i < tbl.length; i++) {
      const row = tbl[i];
      if (align) {
        for (let j = 0; j < row.children.length; j++) {
          // Chromium does not recognize text-align: left. Use -webkit-
          // TODO: Remove -webkit- when Chromium no longer needs it.
          cellsOf(row)[j].classes = ['tml-' + (j % 2 ? 'left' : 'right')];
        }
        if (tagIsPresent) {
          const k = group.leqno ? 0 : row.children.length - 1;
          cellsOf(row)[k].classes = []; // Default is center.
        }
      }
      if (row.children.length > 1 && group.envClasses.includes('cases')) {
        cellsOf(row)[1].style.paddingLeft = '1em';
      }

      if (group.envClasses.includes('cases') || group.envClasses.includes('subarray')) {
        for (const cell of cellsOf(row)) {
          cell.classes.push('tml-left');
        }
      }
    }
  }

  let table = new mathMLTree.MathNode('mtable', tbl);
  if (group.envClasses.length > 0) {
    // Top & bottom padding
    if (group.envClasses.includes('jot')) {
      table.classes.push('tml-jot');
    } else if (group.envClasses.includes('small')) {
      table.classes.push('tml-small');
    }
  }
  if (group.scriptLevel === 'display') {
    table.setAttribute('displaystyle', 'true');
  }

  if (group.autoTag || group.envClasses.includes('multline')) {
    table.style.width = '100%';
  }

  // Column separator lines and column alignment

  if (group.cols && group.cols.length > 0) {
    const cols = group.cols;
    let prevTypeWasAlign = false;
    let iStart = 0;
    let iEnd = cols.length;

    while (cols[iStart].type === 'separator') {
      iStart += 1;
    }
    while (cols[iEnd - 1].type === 'separator') {
      iEnd -= 1;
    }

    if (cols[0].type === 'separator') {
      const sep =
        cols[1].type === 'separator'
          ? '0.15em double'
          : cols[0].separator === '|'
            ? '0.06em solid '
            : '0.06em dashed ';
      for (const row of table.children as MathNode[]) {
        cellsOf(row)[0].style.borderLeft = sep;
      }
    }
    let iCol = tagIsPresent ? 0 : -1;
    for (let i = iStart; i < iEnd; i++) {
      const col = cols[i];
      if (col.type === 'align') {
        const colAlign = alignMap[col.align];
        iCol += 1;
        for (const row of table.children as MathNode[]) {
          if (colAlign.trim() !== 'center' && iCol < row.children.length) {
            cellsOf(row)[iCol].classes = ['tml-' + colAlign.trim()];
          }
        }
        prevTypeWasAlign = true;
      } else if (col.type === 'separator') {
        // MathML accepts only single lines between cells.
        // So we read only the first of consecutive separators.
        if (prevTypeWasAlign) {
          const sep =
            cols[i + 1].type === 'separator'
              ? '0.15em double'
              : col.separator === '|'
                ? '0.06em solid'
                : '0.06em dashed';
          for (const row of table.children as MathNode[]) {
            if (iCol < row.children.length) {
              cellsOf(row)[iCol].style.borderRight = sep;
            }
          }
        }
        prevTypeWasAlign = false;
      }
    }
    const lastCol = cols[cols.length - 1];
    if (lastCol.type === 'separator') {
      const sep =
        cols[cols.length - 2].type === 'separator'
          ? '0.15em double'
          : lastCol.separator === '|'
            ? '0.06em solid'
            : '0.06em dashed';
      for (const row of table.children as MathNode[]) {
        cellsOf(row)[row.children.length - 1].style.borderRight = sep;
        cellsOf(row)[row.children.length - 1].style.paddingRight = '0.4em';
      }
    }
  }

  if (group.envClasses.includes('small')) {
    // A small array. Wrap in scriptstyle.
    table = new mathMLTree.MathNode('mstyle', [table]);
    table.setAttribute('scriptlevel', '1');
  }

  return table;
};

// Convenience function for align, align*, aligned, alignat, alignat*, alignedat, split.
const alignedHandler = (context: EnvContext, args: AnyParseNode[]): ParseNode<'array'> => {
  if (context.envName.indexOf('ed') === -1) {
    validateAmsEnvironmentContext(context);
  }
  const isSplit = context.envName === 'split';
  const cols: ColSpec[] = [];
  const res = parseArray(
    context.parser,
    {
      cols,
      emptySingleRow: true,
      autoTag: isSplit ? undefined : getAutoTag(context.envName),
      envClasses: ['abut', 'jot'], // set row spacing & provisional column spacing
      maxNumCols: context.envName === 'split' ? 2 : undefined,
      leqno: context.parser.settings.leqno,
    },
    'display',
  );

  // Determining number of columns.
  // 1. If the first argument is given, we use it as a number of columns,
  //    and makes sure that each row doesn't exceed that number.
  // 2. Otherwise, just count number of columns = maximum number
  //    of cells in each row ("aligned" mode -- isAligned will be true).
  //
  // At the same time, prepend empty group {} at beginning of every second
  // cell in each row (starting with second cell) so that operators become
  // binary.  This behavior is implemented in amsmath's \start@aligned.
  let numMaths: number | undefined;
  let numCols = 0;
  const isAlignedAt = context.envName.indexOf('at') > -1;
  if (args[0] && isAlignedAt) {
    // alignat environment takes an argument w/ number of columns
    let arg0 = '';
    const arg0Body = assertNodeType(args[0], 'ordgroup').body;
    for (let i = 0; i < arg0Body.length; i++) {
      const textord = assertNodeType(arg0Body[i], 'textord');
      arg0 += textord.text;
    }
    if (isNaN(Number(arg0))) {
      throw new ParseError('The alignat enviroment requires a numeric first argument.');
    }
    numMaths = Number(arg0);
    numCols = numMaths * 2;
  }
  res.body.forEach((row) => {
    if (isAlignedAt) {
      // Case 1
      const curMaths = row.length / 2;
      if (numMaths! < curMaths) {
        throw new ParseError(
          'Too many math in a row: ' + `expected ${numMaths}, but got ${curMaths}`,
          row[0],
        );
      }
    } else if (numCols < row.length) {
      // Case 2
      numCols = row.length;
    }
  });

  // Adjusting alignment.
  // In aligned mode, we add one \qquad between columns;
  // otherwise we add nothing.
  for (let i = 0; i < numCols; ++i) {
    let align = 'r';
    if (i % 2 === 1) {
      align = 'l';
    }
    cols[i] = {
      type: 'align',
      align: align,
    };
  }
  if (context.envName === 'split') {
    // Append no more classes
  } else if (isAlignedAt) {
    res.envClasses.push('alignat'); // Sets justification
  } else {
    res.envClasses[0] = 'align'; // Sets column spacing & justification
  }
  return res;
};

// Arrays are part of LaTeX, defined in lttab.dtx so its documentation
// is part of the source2e.pdf file of LaTeX2e source documentation.
// {darray} is an {array} environment where cells are set in \displaystyle,
// as defined in nccmath.sty.
defineEnvironment({
  type: 'array',
  names: ['array', 'darray'],
  props: {
    numArgs: 1,
  },
  handler(context, args) {
    // Since no types are specified above, the two possibilities are
    // - The argument is wrapped in {} or [], in which case Parser's
    //   parseGroup() returns an "ordgroup" wrapping some symbol node.
    // - The argument is a bare symbol node.
    const symNode = checkSymbolNodeType(args[0]);
    const colalign = symNode ? [args[0]] : assertNodeType(args[0], 'ordgroup').body;
    const cols = colalign.map((nde): ColSpec => {
      const node = assertSymbolNodeType(nde);
      const ca = node.text;
      if ('lcr'.indexOf(ca) !== -1) {
        return {
          type: 'align',
          align: ca,
        };
      } else if (ca === '|') {
        return {
          type: 'separator',
          separator: '|',
        };
      } else if (ca === ':') {
        return {
          type: 'separator',
          separator: ':',
        };
      }
      throw new ParseError('Unknown column alignment: ' + ca, nde);
    });
    const [arraystretch, arraycolsep] = arrayGaps(context.parser.gullet.macros);
    const res: ArrayOptions = {
      cols,
      envClasses: ['array'],
      maxNumCols: cols.length,
      arraystretch,
      arraycolsep,
    };
    return parseArray(context.parser, res, dCellStyle(context.envName));
  },
  mathmlBuilder,
});

// The matrix environments of amsmath build on the array environment
// of LaTeX, which is discussed above.
// The mathtools package adds starred versions of the same environments.
// These have an optional argument to choose left|center|right justification.
defineEnvironment({
  type: 'array',
  names: [
    'matrix',
    'pmatrix',
    'bmatrix',
    'Bmatrix',
    'vmatrix',
    'Vmatrix',
    'matrix*',
    'pmatrix*',
    'bmatrix*',
    'Bmatrix*',
    'vmatrix*',
    'Vmatrix*',
  ],
  props: {
    numArgs: 0,
  },
  handler(context) {
    const delimiters = (
      {
        matrix: null,
        pmatrix: ['(', ')'],
        bmatrix: ['[', ']'],
        Bmatrix: ['\\{', '\\}'],
        vmatrix: ['|', '|'],
        Vmatrix: ['\\Vert', '\\Vert'],
      } as Record<string, string[] | null>
    )[context.envName.replace('*', '')];
    // \hskip -\arraycolsep in amsmath
    let colAlign = 'c';
    const payload: ArrayOptions = {
      envClasses: [],
      cols: [],
    };
    if (context.envName.charAt(context.envName.length - 1) === '*') {
      // It's one of the mathtools starred functions.
      // Parse the optional alignment argument.
      const parser = context.parser;
      parser.consumeSpaces();
      if (parser.fetch().text === '[') {
        parser.consume();
        parser.consumeSpaces();
        colAlign = parser.fetch().text;
        if ('lcr'.indexOf(colAlign) === -1) {
          throw new ParseError('Expected l or c or r', parser.nextToken);
        }
        parser.consume();
        parser.consumeSpaces();
        parser.expect(']');
        parser.consume();
        payload.cols = [];
      }
    }
    const res = parseArray(context.parser, payload, 'text');
    res.cols =
      res.body.length > 0
        ? new Array(res.body[0].length).fill({ type: 'align', align: colAlign })
        : [];
    const [arraystretch, arraycolsep] = arrayGaps(context.parser.gullet.macros);
    res.arraystretch = arraystretch;
    // Apply \arraycolsep even at its default of 6pt, as {array} does.
    if (arraycolsep) {
      res.arraycolsep = arraycolsep;
    }
    return delimiters
      ? {
          type: 'leftright',
          mode: context.mode,
          body: [res],
          left: delimiters[0],
          right: delimiters[1],
          rightColor: undefined, // \right uninfluenced by \color in array
        }
      : res;
  },
  mathmlBuilder,
});

defineEnvironment({
  type: 'array',
  names: ['bordermatrix'],
  props: {
    numArgs: 0,
  },
  handler(context) {
    const payload: ArrayOptions = { cols: [], envClasses: ['bordermatrix'] };
    const res = parseArray(context.parser, payload, 'text');
    res.cols =
      res.body.length > 0 ? new Array(res.body[0].length).fill({ type: 'align', align: 'c' }) : [];
    res.envClasses = [];
    res.arraystretch = 1;
    if (context.envName === 'matrix') {
      return res;
    }
    return bordermatrixParseTree(res, context.delimiters);
  },
  mathmlBuilder,
});

defineEnvironment({
  type: 'array',
  names: ['smallmatrix'],
  props: {
    numArgs: 0,
  },
  handler(context) {
    const payload = { envClasses: ['small'] };
    const res = parseArray(context.parser, payload, 'script');
    return res;
  },
  mathmlBuilder,
});

defineEnvironment({
  type: 'array',
  names: ['subarray'],
  props: {
    numArgs: 1,
  },
  handler(context, args) {
    // Parsing of {subarray} is similar to {array}
    const symNode = checkSymbolNodeType(args[0]);
    const colalign = symNode ? [args[0]] : assertNodeType(args[0], 'ordgroup').body;
    const cols = colalign.map((nde): ColSpec => {
      const node = assertSymbolNodeType(nde);
      const ca = node.text;
      // {subarray} only recognizes "l" & "c"
      if ('lc'.indexOf(ca) !== -1) {
        return {
          type: 'align',
          align: ca,
        };
      }
      throw new ParseError('Unknown column alignment: ' + ca, nde);
    });
    if (cols.length > 1) {
      throw new ParseError('{subarray} can contain only one column');
    }
    const res = parseArray(context.parser, { cols, envClasses: ['small'] }, 'script');
    if (res.body.length > 0 && res.body[0].length > 1) {
      throw new ParseError('{subarray} can contain only one column');
    }
    return res;
  },
  mathmlBuilder,
});

// A cases environment (in amsmath.sty) is almost equivalent to
// \def
// \left\{\begin{array}{@{}l@{\quad}l@{}} … \end{array}\right.
// {dcases} is a {cases} environment where cells are set in \displaystyle,
// as defined in mathtools.sty.
// {rcases} is another mathtools environment. It's brace is on the right side.
defineEnvironment({
  type: 'array',
  names: ['cases', 'dcases', 'rcases', 'drcases'],
  props: {
    numArgs: 0,
  },
  handler(context) {
    const payload: ArrayOptions = {
      cols: [],
      envClasses: ['cases'],
    };
    const res = parseArray(context.parser, payload, dCellStyle(context.envName));
    return {
      type: 'leftright',
      mode: context.mode,
      body: [res],
      left: context.envName.indexOf('r') > -1 ? '.' : '\\{',
      right: context.envName.indexOf('r') > -1 ? '\\}' : '.',
      rightColor: undefined,
    };
  },
  mathmlBuilder,
});

// In the align environment, one uses ampersands, &, to specify number of
// columns in each row, and to locate spacing between each column.
// align gets automatic numbering. align* and aligned do not.
// The alignedat environment can be used in math mode.
defineEnvironment({
  type: 'array',
  names: ['align', 'align*', 'aligned', 'split'],
  props: {
    numArgs: 0,
  },
  handler: alignedHandler,
  mathmlBuilder,
});

// alignat environment is like an align environment, but one must explicitly
// specify maximum number of columns in each row, and can adjust where spacing occurs.
defineEnvironment({
  type: 'array',
  names: ['alignat', 'alignat*', 'alignedat'],
  props: {
    numArgs: 1,
  },
  handler: alignedHandler,
  mathmlBuilder,
});

// A gathered environment is like an array environment with one centered
// column, but where rows are considered lines so get \jot line spacing
// and contents are set in \displaystyle.
defineEnvironment({
  type: 'array',
  names: ['gathered', 'gather', 'gather*'],
  props: {
    numArgs: 0,
  },
  handler(context) {
    if (context.envName !== 'gathered') {
      validateAmsEnvironmentContext(context);
    }
    const res = {
      cols: [],
      envClasses: ['abut', 'jot'],
      autoTag: getAutoTag(context.envName),
      emptySingleRow: true,
      leqno: context.parser.settings.leqno,
    };
    return parseArray(context.parser, res, 'display');
  },
  mathmlBuilder,
});

defineEnvironment({
  type: 'array',
  names: ['equation', 'equation*'],
  props: {
    numArgs: 0,
  },
  handler(context) {
    validateAmsEnvironmentContext(context);
    const res = {
      autoTag: getAutoTag(context.envName),
      emptySingleRow: true,
      singleRow: true,
      maxNumCols: 1,
      envClasses: ['align'],
      leqno: context.parser.settings.leqno,
    };
    return parseArray(context.parser, res, 'display');
  },
  mathmlBuilder,
});

defineEnvironment({
  type: 'array',
  names: ['multline', 'multline*'],
  props: {
    numArgs: 0,
  },
  handler(context) {
    validateAmsEnvironmentContext(context);
    const res = {
      autoTag: context.envName === 'multline',
      maxNumCols: 1,
      envClasses: ['jot', 'multline'],
      leqno: context.parser.settings.leqno,
    };
    return parseArray(context.parser, res, 'display');
  },
  mathmlBuilder,
});

defineEnvironment({
  type: 'array',
  names: ['CD'],
  props: {
    numArgs: 0,
  },
  handler(context) {
    validateAmsEnvironmentContext(context);
    return parseCD(context.parser);
  },
  mathmlBuilder,
});

// Catch \hline outside array environment
defineFunction({
  type: 'text', // Doesn't matter what this is.
  names: ['\\hline', '\\hdashline'],
  props: {
    numArgs: 0,
    allowedInText: true,
    allowedInMath: true,
  },
  handler(context, args) {
    throw new ParseError(`${context.funcName} valid only within array environment`);
  },
});
