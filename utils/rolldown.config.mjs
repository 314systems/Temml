import { defineConfig } from 'rolldown';
import { dts } from 'rolldown-plugin-dts';

// Escape non-ASCII characters (combining marks, bidi controls, private use
// area, ...) instead of emitting them as raw, often invisible, characters.
const output = { charset: 'ascii' };

export default defineConfig([
  {
    input: './temml.ts',
    output: [
      { ...output, format: 'iife', name: 'temml', file: './dist/temml.js' },
      { ...output, format: 'iife', name: 'temml', file: './dist/temml.min.js', minify: true },
    ],
  },
  {
    input: './temml.ts',
    output: { ...output, format: 'cjs', name: 'temml', exports: 'auto', file: './dist/temml.cjs' },
  },
  {
    input: './temml.ts',
    output: { ...output, format: 'es', name: 'temml', exports: 'auto', file: './dist/temml.mjs' },
  },
  {
    input: './src/postProcess.ts',
    output: { ...output, format: 'umd', name: 'temml', file: './dist/temmlPostProcess.js' },
  },
  ...['mhchem', 'copy-tex'].map((name) => ({
    input: `./contrib/${name}/${name}.js`,
    output: { ...output, format: 'iife', file: `./contrib/${name}/${name}.min.js`, minify: true },
  })),
  // Bundle the declarations into dist/temml.d.ts.
  {
    input: './temml.ts',
    plugins: [dts({ generator: 'tsc', dtsOnly: true, compilerOptions: { noEmit: false } })],
    output: { dir: './dist', format: 'es' },
  },
]);
