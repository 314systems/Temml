import ParseError from './ParseError';
import { postProcess } from './postProcess';
import type Temml from '../temml';
import type { Options } from './Settings';

// Importing temml.js would be a circular dependency, so the global is used.
declare const temml: typeof Temml;

interface Delimiter {
  left: string;
  right: string;
  display: boolean;
}

/** A piece of text, split at math delimiters by splitAtDelimiters(). */
type SplitData =
  | { type: 'text'; data: string }
  | { type: 'math'; data: string; rawData: string; display: boolean };

export interface AutoRenderOptions extends Options {
  delimiters?: Delimiter[];
  fences?: string;
  ignoredTags?: string[];
  ignoredClasses?: string[];
  errorCallback?: (msg: string, err: ParseError) => void;
  preProcess?: (math: string) => string;
}

/** The options after renderMathInElement() has filled in the defaults. */
interface ResolvedOptions extends AutoRenderOptions {
  delimiters: Delimiter[];
  ignoredTags: string[];
  ignoredClasses: string[];
  errorCallback: (msg: string, err: ParseError) => void;
}

const findEndOfMath = (delimiter: string, text: string, startIndex: number): number => {
  // Adapted from
  // https://github.com/Khan/perseus/blob/master/src/perseus-markdown.jsx
  let index = startIndex;
  let braceLevel = 0;

  const delimLength = delimiter.length;

  while (index < text.length) {
    const character = text[index];

    if (braceLevel <= 0 && text.slice(index, index + delimLength) === delimiter) {
      return index;
    } else
      switch (character) {
        case '\\': {
          index++;

          break;
        }
        case '{': {
          braceLevel++;

          break;
        }
        case '}': {
          braceLevel--;

          break;
        }
        // No default
      }

    index++;
  }

  return -1;
};

const escapeRegex = (string: string): string => {
  return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
};

const amsRegex = /^\\(?:begin|(?:eq)?ref){/;

const splitAtDelimiters = (text: string, delimiters: Delimiter[]): SplitData[] => {
  let index: number;
  const data: SplitData[] = [];

  const regexLeft = new RegExp('(' + delimiters.map((x) => escapeRegex(x.left)).join('|') + ')');

  while (true) {
    index = text.search(regexLeft);
    if (index === -1) {
      break;
    }
    if (index > 0) {
      data.push({
        type: 'text',
        data: text.slice(0, index),
      });
      text = text.slice(index); // now text starts with delimiter
    }
    // ... so this always succeeds:
    const i = delimiters.findIndex((delim) => text.startsWith(delim.left));
    index = findEndOfMath(delimiters[i].right, text, delimiters[i].left.length);
    if (index === -1) {
      break;
    }
    const rawData = text.slice(0, index + delimiters[i].right.length);
    const math = amsRegex.test(rawData) ? rawData : text.slice(delimiters[i].left.length, index);
    data.push({
      type: 'math',
      data: math,
      rawData,
      display: delimiters[i].display,
    });
    text = text.slice(index + delimiters[i].right.length);
  }

  if (text !== '') {
    data.push({
      type: 'text',
      data: text,
    });
  }

  return data;
};

const defaultDelimiters: Delimiter[] = [
  { left: '$$', right: '$$', display: true },
  { left: '\\(', right: '\\)', display: false },
  // LaTeX uses $…$, but it ruins the display of normal `$` in text:
  // {left: "$", right: "$", display: false},
  // $ must come after $$

  // Render AMS environments even if outside $$…$$ delimiters.
  { left: '\\begin{equation}', right: '\\end{equation}', display: true },
  { left: '\\begin{equation*}', right: '\\end{equation*}', display: true },
  { left: '\\begin{align}', right: '\\end{align}', display: true },
  { left: '\\begin{align*}', right: '\\end{align*}', display: true },
  { left: '\\begin{alignat}', right: '\\end{alignat}', display: true },
  { left: '\\begin{alignat*}', right: '\\end{alignat*}', display: true },
  { left: '\\begin{gather}', right: '\\end{gather}', display: true },
  { left: '\\begin{gather*}', right: '\\end{gather*}', display: true },
  { left: '\\begin{CD}', right: '\\end{CD}', display: true },
  // Ditto \ref & \eqref
  { left: '\\ref{', right: '}', display: false },
  { left: '\\eqref{', right: '}', display: false },

  { left: '\\[', right: '\\]', display: true },
];

const firstDraftDelimiters: Record<string, Delimiter[]> = {
  $: [
    { left: '$$', right: '$$', display: true },
    { left: '$`', right: '`$', display: false },
    { left: '$', right: '$', display: false },
  ],
  '(': [
    { left: '\\[', right: '\\]', display: true },
    { left: '\\(', right: '\\)', display: false },
  ],
};

const amsDelimiters: Delimiter[] = [
  { left: '\\begin{equation}', right: '\\end{equation}', display: true },
  { left: '\\begin{equation*}', right: '\\end{equation*}', display: true },
  { left: '\\begin{align}', right: '\\end{align}', display: true },
  { left: '\\begin{align*}', right: '\\end{align*}', display: true },
  { left: '\\begin{alignat}', right: '\\end{alignat}', display: true },
  { left: '\\begin{alignat*}', right: '\\end{alignat*}', display: true },
  { left: '\\begin{gather}', right: '\\end{gather}', display: true },
  { left: '\\begin{gather*}', right: '\\end{gather*}', display: true },
  { left: '\\begin{CD}', right: '\\end{CD}', display: true },
  { left: '\\ref{', right: '}', display: false },
  { left: '\\eqref{', right: '}', display: false },
];

const delimitersFromKey = (key: string): Delimiter[] => {
  switch (key) {
    case '$':
    case '(': {
      return firstDraftDelimiters[key];
    }
    case '$+':
    case '(+': {
      const firstDraft = firstDraftDelimiters[key.slice(0, 1)];
      return firstDraft.concat(amsDelimiters);
    }
    case 'ams': {
      return amsDelimiters;
    }
    case 'all': {
      return firstDraftDelimiters['('].concat(firstDraftDelimiters['$']).concat(amsDelimiters);
    }
    default: {
      return defaultDelimiters;
    }
  }
};

/* Note: optionsCopy is mutated by this method. If it is ever exposed in the
 * API, we should copy it before mutating.
 */
const renderMathInText = (text: string, optionsCopy: ResolvedOptions): DocumentFragment | null => {
  const data = splitAtDelimiters(text, optionsCopy.delimiters);
  if (data.length === 1 && data[0].type === 'text') {
    // There is no formula in the text.
    // Let's return null which means there is no need to replace
    // the current text node with a new one.
    return null;
  }

  const fragment = document.createDocumentFragment();

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (item.type === 'text') {
      fragment.append(document.createTextNode(item.data));
    } else {
      const span = document.createElement('span');
      let math = item.data;
      // Override any display mode defined in the settings with that
      // defined by the text itself
      optionsCopy.displayMode = item.display;
      try {
        if (optionsCopy.preProcess) {
          math = optionsCopy.preProcess(math);
        }
        // Importing render() from temml.js would be a circular dependency.
        // So call the global version.
        temml.render(math, span, optionsCopy);
      } catch (e) {
        if (!(e instanceof ParseError)) {
          throw e;
        }
        optionsCopy.errorCallback(
          'Temml auto-render: Failed to parse `' + item.data + '` with ',
          e,
        );
        fragment.append(document.createTextNode(item.rawData));
        continue;
      }
      fragment.append(span);
    }
  }

  return fragment;
};

const renderElem = (elem: Element, optionsCopy: ResolvedOptions): void => {
  for (let i = 0; i < elem.childNodes.length; i++) {
    const childNode = elem.childNodes[i];
    if (childNode.nodeType === 3) {
      // Text node
      const frag = renderMathInText(childNode.textContent!, optionsCopy);
      if (frag) {
        i += frag.childNodes.length - 1;
        childNode.replaceWith(frag);
      }
    } else if (childNode.nodeType === 1) {
      // Element node
      const className = ' ' + (childNode as Element).className + ' ';
      const shouldRender =
        !optionsCopy.ignoredTags.includes(childNode.nodeName.toLowerCase()) &&
        optionsCopy.ignoredClasses.every((x) => !className.includes(' ' + x + ' '));

      if (shouldRender) {
        renderElem(childNode as Element, optionsCopy);
      }
    }
    // Otherwise, it's something else, and ignore it.
  }
};

export const renderMathInElement = (elem: Element, options?: AutoRenderOptions): void => {
  if (!elem) {
    throw new Error('No element provided to render');
  }

  // Copy the own properties of the options.
  const optionsCopy: AutoRenderOptions = { ...options };

  if (optionsCopy.fences) {
    optionsCopy.delimiters = delimitersFromKey(optionsCopy.fences);
  } else {
    optionsCopy.delimiters = optionsCopy.delimiters || defaultDelimiters;
  }
  optionsCopy.ignoredTags = optionsCopy.ignoredTags || [
    'script',
    'noscript',
    'style',
    'textarea',
    'pre',
    'code',
    'option',
  ];
  optionsCopy.ignoredClasses = optionsCopy.ignoredClasses || [];
  optionsCopy.errorCallback = optionsCopy.errorCallback || console.error;

  // Enable sharing of global macros defined via `\gdef` between different
  // math elements within a single call to `renderMathInElement`.
  optionsCopy.macros = optionsCopy.macros || Object.create(null);

  renderElem(elem, optionsCopy as ResolvedOptions);
  postProcess(elem);
};
