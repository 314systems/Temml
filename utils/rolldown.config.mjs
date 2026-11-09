import { defineConfig } from "rolldown";

// Escape non-ASCII characters (combining marks, bidi controls, private use
// area, ...) instead of emitting them as raw, often invisible, characters.
const output = { charset: "ascii" };

export default defineConfig([
  {
    input: "./temml.js",
    output: { ...output, format: "iife", name: "temml", file: "./dist/temml.js" }
  },
  {
    input: "./temml.js",
    output: { ...output, format: "cjs", name: "temml", exports: "auto", file: "./dist/temml.cjs" }
  },
  {
    input: "./temml.js",
    output: { ...output, format: "es", name: "temml", exports: "auto", file: "./dist/temml.mjs" }
  },
  {
    input: "./src/postProcess.ts",
    output: { ...output, format: "umd", name: "temml", file: "./dist/temmlPostProcess.js" }
  }
]);
