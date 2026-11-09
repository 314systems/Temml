import temml from '../temml';

// The published bundles have mhchem, texvc and physics built in
// (see utils/insertPlugins.js). The extensions call `temml.__defineMacro`
// on a global, so expose the source build before loading them.
globalThis.temml = temml;
await import('../contrib/mhchem/mhchem.js');
await import('../contrib/texvc/texvc.js');
await import('../contrib/physics/physics.js');

export const r = String.raw;

export const mathTagRegEx = /<\/?math>/g;

// Options for parse()/build() in tests. They default to wrap: "tex" and give
// each options object its own macros table, so that a \gdef seen by one side
// of toParseLike() is also visible to the other side.
export const settings = (options = {}) => ({ wrap: 'tex', macros: {}, ...options });
export const defaultSettings = () => settings();
export const strictSettings = () => settings({ strict: true });
export const displayMode = () => settings({ displayMode: true });
export const trustSettings = () => settings({ trust: true });
export const wrapSettings = (wrap) => settings({ wrap });
export const throwOnErrorSettings = () => settings({ throwOnError: true });

// Strip positions from ParseNodes.
const stripPositions = (expr) => {
  if (typeof expr !== 'object' || expr === null) {
    return expr;
  }
  if (expr.loc?.lexer && typeof expr.loc.start === 'number') {
    delete expr.loc;
  }
  for (const value of Object.values(expr)) {
    stripPositions(value);
  }
  return expr;
};

export const parse = (expr, options = defaultSettings()) =>
  stripPositions(temml.__parse(expr, options));

export const build = (expr, options) => {
  const builtMathML = temml.__renderToMathMLTree(expr, options);
  if (builtMathML.classes.includes('temml-error')) {
    return builtMathML;
  }
  return builtMathML.children;
};
