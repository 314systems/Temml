export default [
  {
    input: "./temml.js",
    output: { format: "iife", name: "temml", file: "./dist/temml.js" }
  },
  {
    input: "./temml.js",
    output: { format: "cjs", name: "temml", exports: "auto", file: "./dist/temml.cjs" }
  },
  {
    input: "./temml.js",
    output: { format: "es", name: "temml", exports: "auto", file: "./dist/temml.mjs" }
  },
  {
    input: "./src/postProcess.js",
    output: { format: "umd", name: "temml", file: "./dist/temmlPostProcess.js" }
  }
];
