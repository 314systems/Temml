// Embed extensions into the cjs and mjs version of Temml.

const fs = require("node:fs")

// Get the extension macros. They call `temml.__defineMacro`, which becomes a
// direct call to the bundle's own `defineMacro` once inlined.
const regex = /temml\.__/g;
const plugins = ["mhchem", "texvc", "physics"]
  .map(name => fs.readFileSync(`./contrib/${name}/${name}.js`, "utf8"))
  .map(code => code.replace(/^\uFEFF/, "").replace(regex, ""))
  .join("\n")

// Insert the extension macros right after the last built-in macro definition.
const insert = file => {
  const code = fs.readFileSync(file, "utf8")
  if (!/\b(?:function defineMacro\(|const defineMacro = )/.test(code)) {
    throw new Error(`${file}: defineMacro was renamed by the bundler`)
  }
  const marker = code.indexOf("standardstate")
  if (marker === -1) {
    throw new Error(`${file}: cannot find the \\standardstate macro`)
  }
  const pos = code.indexOf("\n", marker) + 1
  fs.writeFileSync(file, code.slice(0, pos) + "\n" + plugins + "\n" + code.slice(pos))
}

insert("./dist/temml.cjs")
insert("./dist/temml.mjs")
