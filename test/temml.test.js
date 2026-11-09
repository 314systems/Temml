import { expect, test } from "vitest"
import temml from "../temml"
import {
  build,
  displayMode,
  mathTagRegEx,
  parse,
  r,
  settings,
  strictSettings,
  throwOnErrorSettings,
  trustSettings,
  wrapSettings
} from "./helpers.js"

/*
 * Unit tests for Temml.
 * Many of these tests have been ported from the Jest tests in KaTeX.
 * Custom matchers (toParse, toBuild, toParseLike, toBuildLike) live in setup.js.
 */

// Scratch variables shared between tests. Tests in a file run sequentially,
// and several tests reuse values computed by an earlier one.
let nodes, markup, node, numer, denom, overline, badUnitRule, noNumberRule, emParse,
    exParse, emKern, exKern, muKern, abKern, muParse, abParse, sqrt, text, macros,
    wideCharText, rule, cmd

test("Parser should work", () => {
  expect("").toParse()
  expect("1234|/@.`abcdefgzABCDEFGZ").toParse()
})

test("Parser should ignore whitespace", () => {
  expect(`    x    y    `).toParseLike("xy")
  expect(`    x   ^ y    `).toParseLike("x^y")
  expect("\u00a0\ufe0e" + `x   ^ y    `).toParseLike("x^y")
})

test("Temml should consolidate numbers into a single <mn> element", () => {
  markup = temml.renderToString(`12.34`)
  expect(markup).toBe("<math><mn>12.34</mn></math>")
  markup = temml.renderToString(`24^3`)
  expect(markup).toBe("<math><msup><mn>24</mn><mn>3</mn></msup></math>")
  markup = temml.renderToString(`1{,}000.2`)
  expect(markup).toBe("<math><mn>1,000.2</mn></math>")
  markup = temml.renderToString(`1 000.2`)
  expect(markup).toBe("<math><mn>1000.2</mn></math>")
  markup = temml.renderToString("1\u2008000.2")
  expect(markup).toBe("<math><mn>1 000.2</mn></math>")
  markup = temml.renderToString(`1,000.2`)
  expect(markup).toBe("<math><mn>1,000.2</mn></math>")
})

test("Temml should split numbers if a space follows a comma", () => {
  markup = temml.renderToString(`12, 340`)
  expect(markup).toBe('<math><mrow><mn>12</mn><mo separator="true">,</mo><mn>340</mn></mrow></math>')
})

test("Parser should build a list of ords", () => {
  const ords = parse("1234|@.`abcdefgzABCDEFGZ");
  for (let i = 0; i < ords.length; i++) {
      expect(ords[i].type.slice(4)).toBe("ord");
  }
})

test("Parser should build bins", () => {
  nodes = parse(r`1 + 2 - 3 * 4 \cdot 5 \pm 6 \div 7`)
  for (let i = 1; i < nodes.length; i+=2) {
    expect(nodes[i].type).toBe("atom");
    expect(nodes[i].family).toBe("bin");
  }
})

test("Asterisk, *, should render as U+2217 in math mode", () => {
  markup = temml.renderToString(r`*, \ast, x^*, x^\ast`)
  expect(markup.indexOf("*")).toBe(-1)
})

test("Asterisk, *, should render as U+002A in text mode", () => {
  markup = temml.renderToString(r`\text{*}`)
  expect(markup.indexOf("*") > -1).toBe(true)
})

test("Parser should change bins to opens when they should be unary", () => {
  nodes = parse(r`a = -1 \ast (-4) \pm {+5} + \sin -2 x^{-2} \ast 3 \sum -c + \dots + d`)
  for (const i of [4, 6, 8, 13, 18, 20]) {
    expect(nodes[i].type).toBe("atom");
    expect(nodes[i].family).toBe("bin");
  }
  expect(nodes[2].type).toBe("atom");
  expect(nodes[2].family).toBe("open");
  expect(nodes[5].body[0].type).toBe("atom");
  expect(nodes[5].body[0].family).toBe("open");
  expect(nodes[7].body[0].type).toBe("atom");
  expect(nodes[7].body[0].family).toBe("open");
  expect(nodes[10].type).toBe("atom");
  expect(nodes[10].family).toBe("open");
})

test("Parser should build a list of rels", () => {
  nodes = parse(r`=<>\leq\geq\neq\nleq\ngeq\cong\in`)
  for (let i = 0; i < nodes.length; i++) {
    expect(nodes[i].type).toBe("atom");
    expect(nodes[i].family).toBe("rel");
  }
})

test("Parser should parse a \\mathinner", () => {
  expect(r`\mathinner{\langle{\psi}\rangle}`).toParse()
  expect(r`\frac 1 {\mathinner{\langle{\psi}\rangle}}`).toParse()
})

test("\\mathinner should return a group, not a fragment", () => {
  expect(build(r`\mathinner{\langle{\psi}\rangle}`).length).toBe(1)
})

test("Parse should build a list of puncts", () => {
  nodes = parse(",;")
  for (let i = 0; i < nodes.length; i++) {
    expect(nodes[i].type).toBe("atom");
    expect(nodes[i].family).toBe("punct");
  }
})

test("Parser should build a list of opens", () => {
  nodes = parse("([")
  for (let i = 0; i < nodes.length; i++) {
    expect(nodes[i].type).toBe("atom");
    expect(nodes[i].family).toBe("open");
  }
})

test("Parser should build a list of closes", () => {
  nodes = parse("])")
  for (let i = 0; i < nodes.length; i++) {
    expect(nodes[i].type).toBe("atom");
    expect(nodes[i].family).toBe("close");
  }
})

test("\\Temml should parse", () => {
  expect("\\Temml").toParse()
})

test("Subscripts and superscripts should parse", () => {
  expect(`x^2`).toParse()
  expect(`x_3`).toParse()
  expect(`x^2_3`).toParse()
  expect(`x_2^3`).toParse()
  expect(`^3`).toParse();
  expect(`^3+`).toParse();
  expect(`_2`).toParse();
  expect(`^3_2`).toParse();
  expect(`_2^3`).toParse();
  expect(r`\hskip1em\relax^2`).toParse()

  node = parse("x^2")[0]
  expect(node.type).toBe("supsub");
  expect(node.base).toBeDefined();
  expect(node.sup).toBeDefined();
  expect(node.sub).toBeUndefined();

  node = parse("x_3")[0]
  expect(node.type).toBe("supsub");
  expect(node.base).toBeDefined();
  expect(node.sub).toBeDefined();
  expect(node.sup).toBeUndefined();

  node = parse("x^2_3")[0]
  expect(node.type).toBe("supsub");
  expect(node.base).toBeDefined();
  expect(node.sub).toBeDefined();
  expect(node.sup).toBeDefined();

  expect(`x^2_3`).toParseLike(`x_3^2`)
})

test("Double exponents should not parse", () => {
  expect(`x^x^x`).not.toParse();
  expect(`x_x_x`).not.toParse();
  expect(`x_x^x_x`).not.toParse();
  expect(`x_x^x^x`).not.toParse();
  expect(`x^x_x_x`).not.toParse();
  expect(`x^x_x^x`).not.toParse();
})

test("\\vec should get the classes for its arrow position", () => {
  // x needs a small nudge. See smallNudge in accent.ts.
  expect(temml.renderToString(r`\vec{x}`)).toContain("chr-sml-vec")
})

test("\\fcolorbox with a color model should use the second color as background", () => {
  const markup = temml.renderToString(r`\fcolorbox[HTML]{FF0000}{00FF00}{x}`)
  expect(markup).toContain(`mathbackground="#00FF00"`)
  expect(markup).toContain("#FF0000")
})

test("Cells added to a short row of an array should have no inline style", () => {
  const markup = temml.renderToString(r`\begin{matrix}a & b \\ c\end{matrix}`)
  expect(markup).not.toContain("level:")
})

test("A missing sub- or superscript should be a ParseError", () => {
  expect(() => parse(`x^`, throwOnErrorSettings())).toThrow(temml.ParseError)
  expect(() => parse(`x_`, throwOnErrorSettings())).toThrow("Expected group after '_'")
  expect(() => parse(`{x^}`, throwOnErrorSettings())).toThrow(temml.ParseError)
  expect(() => parse(r`x^\relax`, throwOnErrorSettings())).toThrow(temml.ParseError)
  // Without throwOnError, the error is rendered rather than thrown.
  expect(temml.renderToString(`x^`)).toContain("temml-error")
})

test("An invalid function name should throw when throwOnError is true", () => {
  expect(() => parse(r`\?`, throwOnErrorSettings())).toThrow();
  expect(() => parse(r`\notSupported`, throwOnErrorSettings())).toThrow();
})

test("A subsup parser should work correctly with {}s", () => {
  expect(`x^{2+3}`).toParse();
  expect(`x_{3-2}`).toParse();
  expect(`x^{2+3}_3`).toParse();
  expect(`x^2_{3-2}`).toParse();
  expect(`x^{2+3}_{3-2}`).toParse();
  expect(`x_{3-2}^{2+3}`).toParse();
  expect(`x_3^{2+3}`).toParse();
  expect(`x_{3-2}^2`).toParse();
})

test("A subsup parser should work with nested super/subscripts", () => {
  expect(`x^{x^x}`).toParse();
  expect(`x^{x_x}`).toParse();
  expect(`x_{x^x}`).toParse();
  expect(`x_{x_x}`).toParse();
})

test("Empty super and subscripts should work", () => {
  expect("x^{}").toBuild();
  expect("x^{}_{}").toBuild();
  expect("x^{}_2").toBuild();
  expect("x^2_{}").toBuild();
  expect("x_{}").toBuild();
})

test("A subsup parser should skip \\relax in super/subscripts", () => {
  expect(r`x^\relax 2`).toParseLike(`x^2`)
  expect(r`x_\relax 2`).toParseLike(`x_2`)
})

test("Deeply nested super and subscripts should have explicit scriptlevel", () => {
  nodes = build("2^{2^{2^{^2}}}")
  expect(nodes[0].children[1].children[1].children[1].attributes.scriptlevel).toBe("2")
  expect(nodes[0].children[1].children[1].children[1].children[1].attributes.scriptlevel).toBe("2")
  nodes = build("2_{2_{2_{_2}}}")
  expect(nodes[0].children[1].children[1].children[1].attributes.scriptlevel).toBe("2")
  expect(nodes[0].children[1].children[1].children[1].children[1].attributes.scriptlevel).toBe("2")
})

test("A row builder should work when given a document fragment", () => {
  expect((build(`x^{\color{red}{hello}}`))[0].children.length).toBe(2)
  expect((build(`x^{\color{red}{hello}}`))[0].children[1].type).toBe("mrow")
})

test("A subscript and superscript tree-builder should not fail when there is no nucleus", () => {
  expect(`^3`).toParse();
  expect(`_2`).toParse();
  expect(`^3_2`).toParse();
  expect(`_2^3`).toParse();
  expect(`^3`).toBuild();
  expect(`_2`).toBuild();
  expect(`^3_2`).toBuild();
  expect(`_2^3`).toBuild();
})

test("A subsup parser should work with Unicode (sub|super)script characters", () => {
  expect(`A² + B²⁺³ + ²C + E₂³ + F₂₊₃`).toBuildLike("A^{2} + B^{2+3} + ^{2}C + E_{2}^{3} + F_{2+3}")
  expect(r`\text{B²⁺³}`).toParse()
  expect(r`\text{B²⁺³}`).toBuild()
})

test("A text builder should consolidate mtext elements when possible", () => {
  nodes = build(r`\text{He\'{A} l\textbf{l}ó w{orl}d}`)
  expect(nodes.length).toBe(1)
  expect(nodes[0].type).toBe("mrow")
  expect(nodes[0].children.length).toBe(3)
})

test("A supsub parser should merge a numeric base with a preceding number", () => {
  expect(temml.renderToString(r`123^4`)).toContain("<mn>123</mn>")
})

test("A parser with limit controls should fail when the limit control is not preceded by an op node", () => {
  expect(r`3\nolimits_2^2`).not.toParse();
  expect(r`\sqrt\limits_2^2`).not.toParse();
  expect(r`45 +\nolimits 45`).not.toParse();
})

test("A parser with limit controls should parse when the limit control directly follows an op node", () => {
  expect(r`\int\limits_2^2 3`).toParse();
  expect(r`\sum\nolimits_3^4 4`).toParse();
})

test("A parser with limit controls should parse when the limit control is in the sup/sub area of an op node", () => {
  expect(r`\int_2^2\limits`).toParse();
  expect(r`\int^2\nolimits_2`).toParse();
  expect(r`\int_2\limits^2`).toParse();
})

test("A parser with limit controls should allow multiple limit controls in the sup/sub area of an op node", () => {
  expect(r`\int_2\nolimits^2\limits 3`).toParse();
  expect(r`\int\nolimits\limits_2^2`).toParse();
  expect(r`\int\limits\limits\limits_2^2`).toParse();
})

test("A parser with limit controls should have the rightmost limit control determine the limits property of the preceding op node", () => {
  expect(parse(r`\int\nolimits\limits_2^2`)[0].base.limits).toBe(true)
  expect(parse(r`\int\limits_2\nolimits^2`)[0].base.limits).toBe(false)
})

test("A group parser should work", () => {
  expect(`{xy}`).toParse();
  nodes = parse(`{xy}`)
  expect(nodes).toHaveLength(1);
  expect(nodes[0].type).toBe("ordgroup");
  expect(nodes[0].body).toBeTruthy();
  expect(nodes[0].semisimple).toBeFalsy();
  expect(r`\begingroup xy \endgroup`).toParse();
  expect(r`\begingroup xy`).not.toParse();
  expect(r`\begingroup xy }`).not.toParse();
  nodes = parse(r`\begingroup xy \endgroup`)
  expect(nodes).toHaveLength(1)
  expect(nodes[0].type).toBe("ordgroup");
  expect(nodes[0].body).toBeTruthy();
  expect(nodes[0].semisimple).toBe(true);
})

test("An implicit group parser should work", () => {
  expect(r`\Large x`).toParse();
  expect(r`abc {abc \Large xyz} abc`).toParse();
  nodes = parse(r`\Large abc`)
  expect(nodes).toHaveLength(1);
  expect(nodes[0].type).toBe("sizing");
  expect(nodes[0].body).toBeTruthy();
  nodes = parse(r`a \Large abc`)
  expect(nodes).toHaveLength(2);
  expect(nodes[1].type).toBe("sizing");
  expect(nodes[1].body).toHaveLength(3);
  nodes = parse(r`a { b \Large c } d`)
  expect(nodes[1].body[1].type).toBe("sizing");
  expect(nodes[1].body[1].body).toHaveLength(1);
})

test("An implicit group parser should work within optional groups", () => {
  expect(r`\sqrt[\small 3]{x}`).toParse();
  expect(r`\sqrt[\color{red} 3]{x}`).toParse()
  expect(r`\sqrt[\textstyle 3]{x}`).toParse()
  expect(r`\sqrt[\tt 3]{x}`).toParse()
})

test("An implicit group parser should work within environment arrays", () => {
  node = parse(r`\begin{array}{l}\color{red}a\\ b \\ c \end{array}`)[0];
  expect(node.type).toBe("array")
  expect(node.body.length).toBe(3)
})

test("A \\color parser should interact properly with a \\right delimiter", () => {
  expect(r`\left(\color{red}1\right)`).toParse()
  // A \right delimiter gets the color.
  expect(temml.renderToString(r`\left(\color{red}1\right)`)).toContain('mathcolor="#ff0000">)</mo>')
  expect(temml.renderToString(r`\left(\textcolor{red}1\right)`)).not.toContain('mathcolor="#ff0000">)</mo>')
  expect(temml.renderToString(r`\left(\color{red}1\right)`, { colorIsTextColor: true })).not.toContain('mathcolor="#ff0000">)</mo>')
  expect(r`\left(\color{red}\right)`).toParse()
  expect(temml.renderToString(r`\left(\color{red}\right)`)).toContain('mathcolor="#ff0000">)</mo>')
  expect(r`\left(\textcolor{red}\right)`).not.toParse()
  expect(r`\left(\color{red}\right)`).not.toParse(settings({ colorIsTextColor: true }))
})

test("A \\color parser should not fail, given an empty fragment.", () => {
  expect(r`101\cdot \color{cc0000}30 \color{000000}`).toParse()
  expect(r`101\cdot \color{cc0000}30 \color{000000}`).toBuild()
})

test("A semi-simple group builder should not affect spacing of operators", () => {
  markup = temml.renderToString(r`1\begingroup + 2 *\endgroup 3`)
  expect(markup).not.toContain("lspace")
  expect(markup).not.toContain("rspace")
})

test("A braced group builder should change spacing of operators at ends of group", () => {
  markup = temml.renderToString(r`1{+ 2 *}3`)
  expect(markup).toContain("lspace")
  expect(markup).toContain("rspace")
})

test("A <mo> between two <mtext>s should get operator spacing", () => {
  markup = temml.renderToString(r`\text{abc} = \text{def}`)
  expect(markup).toContain('<mspace width="0.2778em"></mspace><mo>=</mo><mspace width="0.2778em">')
})

test("A space should be placed between certain atom types and a math operator", () => {
  expect(temml.renderToString(r`d\sin`)).toContain('<mspace width="0.1667em">')
  expect(temml.renderToString(r`\text{d}\sin`)).toContain('<mspace width="0.1667em">')
  expect(temml.renderToString(r`(d+1)\sin`)).toContain('<mspace width="0.1667em">')
  expect(temml.renderToString(r`{d+1}\sin`)).toContain('<mspace width="0.1667em">')
  expect(temml.renderToString(r`\mathrm{d}\sin`)).toContain('<mspace width="0.1667em">')
  expect(temml.renderToString(r`\mathrm{d}\left(\sin \right)`)).not.toContain('<mspace width="0.1667em">')
})

test("A function parser should work", () => {
  expect(r`\div`).toParse();
  expect(r`\blue x`).toParse();
  expect(r`\frac 1 2`).toParse();
  expect(r`\tilde`).not.toParse();
  expect(r`\frac`).not.toParse();
  expect(r`\frac 1`).not.toParse();
  expect(parse(r`\tildex`)[0].color).toBe("#b22222");
  expect(r`\frac12`).toParse();
  expect(r`\;x`).toParse();
})

test("A frac parser should work", () => {
  const expression = r`\frac{x}{y}`;
  const dfracExpression = r`\dfrac{x}{y}`;
  const tfracExpression = r`\tfrac{x}{y}`;
  const cfracExpression = r`\cfrac{x}{y}`;
  const genfrac1 = r`\genfrac ( ] {0.06em}{0}{a}{b+c}`;
  const genfrac2 = r`\genfrac ( ] {0.8pt}{}{a}{b+c}`;
  expect(expression).toParse();
  node = parse(expression)[0];
  expect(node.type).toBe("genfrac");
  expect(node.numer).toBeDefined();
  expect(node.denom).toBeDefined();
  expect(cfracExpression).toParse();
  expect(dfracExpression).toParse();
  expect(tfracExpression).toParse();
  expect(genfrac1).toParse();
  expect(genfrac2).toParse();
  const dfracParse = parse(dfracExpression)[0];
  expect(dfracParse.type).toBe("genfrac");
  expect(dfracParse.numer).toBeDefined();
  expect(dfracParse.denom).toBeDefined();
  const tfracParse = parse(tfracExpression)[0];
  expect(tfracParse.type).toBe("genfrac");
  expect(tfracParse.numer).toBeDefined();
  expect(tfracParse.denom).toBeDefined();
  const cfracParse = parse(cfracExpression)[0];
  expect(cfracParse.type).toBe("genfrac");
  expect(cfracParse.numer).toBeDefined();
  expect(cfracParse.denom).toBeDefined();
  const genfracParse = parse(genfrac1)[0];
  expect(genfracParse.type).toBe("genfrac");
  expect(genfracParse.numer).toBeDefined();
  expect(genfracParse.denom).toBeDefined();
  expect(genfracParse.leftDelim).toBeDefined();
  expect(genfracParse.rightDelim).toBeDefined();
  let badGenFrac = r`\genfrac ( ] {b+c}{0}{a}{b+c}`;
  expect(badGenFrac).not.toParse();
  badGenFrac = r`\genfrac ( ] {0.06em}{0}{a}`;
  expect(badGenFrac).not.toParse();
  node = parse(r`x \atop y`)[0];
  expect(node.type).toBe("genfrac");
  expect(node.numer).toBeDefined();
  expect(node.denom).toBeDefined();
  expect(node.hasBarLine).toBe(false);
  expect(r`2\,\sfrac 3 8`).toParse()
  expect(r`2\,\sfrac 3 8`).toBuild()
})

test("A fraction builder should not over-shrink its  contents", () => {
  nodes = build(r`\frac{2}{c +\frac{2}{d +\frac{2}{\frac 2 2}}}`)
  expect(nodes[0].children[1].children[2].children[1].children[2].children[1].style.mathDepth).toBe("2")
  markup = temml.renderToString(r`x_{y_{\dfrac{a}{b}}}`)
  expect(markup).toContain('scriptlevel="0"')
  expect(markup).not.toContain('scriptlevel="2"')
})

test("An over/brace/brack parser should work", () => {
  const simpleOver = r`1 \over x`;
  const complexOver = r`1+2i \over 3+4i`;
  const braceFrac = r`a+b \brace c+d`;
  const brackFrac = r`a+b \brack c+d`;
  expect(simpleOver).toParse();
  expect(complexOver).toParse();
  expect(braceFrac).toParse();
  expect(brackFrac).toParse();

  node = parse(simpleOver)[0];
  expect(node.type).toBe("genfrac");
  expect(node.numer).toBeDefined();
  expect(node.denom).toBeDefined();

  node = parse(complexOver)[0];
  expect(node.type).toBe("genfrac");
  expect(node.numer).toBeDefined();
  expect(node.denom).toBeDefined();

  const parseBraceFrac = parse(braceFrac)[0];
  expect(parseBraceFrac.type).toBe("genfrac");
  expect(parseBraceFrac.numer).toBeDefined();
  expect(parseBraceFrac.denom).toBeDefined();
  expect(parseBraceFrac.leftDelim).toBeDefined();
  expect(parseBraceFrac.rightDelim).toBeDefined();

  const parseBrackFrac = parse(brackFrac)[0];
  expect(parseBrackFrac.type).toBe("genfrac");
  expect(parseBrackFrac.numer).toBeDefined();
  expect(parseBrackFrac.denom).toBeDefined();
  expect(parseBrackFrac.leftDelim).toBeDefined();
  expect(parseBrackFrac.rightDelim).toBeDefined();
  node = parse(complexOver)[0];

  numer = node.numer;
  expect(numer.body).toHaveLength(4);
  node = parse(complexOver)[0];

  denom = node.denom;
  expect(denom.body).toHaveLength(4);
  const emptyNumerator = r`\over x`;
  node = parse(emptyNumerator)[0];
  expect(node.type).toBe("genfrac");
  expect(node.numer).toBeDefined();
  expect(node.denom).toBeDefined();
  const emptyDenominator = r`1 \over`;
  node = parse(emptyDenominator)[0];
  expect(node.type).toBe("genfrac");
  expect(node.numer).toBeDefined();
  expect(node.denom).toBeDefined();
  const displaystyleExpression = r`\displaystyle 1 \over 2`;
  node = parse(displaystyleExpression)[0];
  expect(node.type).toBe("genfrac");
  expect(node.numer.body[0].type).toBe("styling");
  expect(node.denom).toBeDefined();
  expect(r`\textstyle 1 \over 2`).toParseLike(r`\frac{\textstyle 1}{2}`);
  expect(r`{\textstyle 1} \over 2`).toParseLike(r`\frac{\textstyle 1}{2}`);
  const nestedOverExpression = r`{1 \over 2} \over 3`;
  node = parse(nestedOverExpression)[0];
  expect(node.type).toBe("genfrac");
  expect(node.numer.body[0].type).toBe("genfrac");
  expect(node.numer.body[0].numer.body[0].text).toBe("1");
  expect(node.numer.body[0].denom.body[0].text).toBe("2");
  expect(node.denom).toBeDefined();
  expect(node.denom.body[0].text).toBe("3");
  const badMultipleOvers = r`1 \over 2 + 3 \over 4`;
  expect(badMultipleOvers).not.toParse();
  const badOverChoose = r`1 \over 2 \choose 3`;
  expect(badOverChoose).not.toParse();
})

test(`A genfrac builder should work`, () => {
  expect(r`\frac{x}{y}`).toParse();
  expect(r`\dfrac{x}{y}`).toParse();
  expect(r`\tfrac{x}{y}`).toParse();
  expect(r`\cfrac{x}{y}`).toParse();
  expect(r`\genfrac ( ] {0.06em}{0}{a}{b+c}`).toParse();
  expect(r`\genfrac ( ] {0.8pt}{}{a}{b+c}`).toParse();
  expect(r`\genfrac {} {} {0.8pt}{}{a}{b+c}`).toParse();
  expect(r`\genfrac [ {} {0.8pt}{}{a}{b+c}`).toParse();
  expect(r`\frac{x}{y}`).toBuild();
  expect(r`\dfrac{x}{y}`).toBuild();
  expect(r`\tfrac{x}{y}`).toBuild();
  expect(r`\cfrac{x}{y}`).toBuild();
  expect(r`\genfrac ( ] {0.06em}{0}{a}{b+c}`).toBuild();
  expect(r`\genfrac ( ] {0.8pt}{}{a}{b+c}`).toBuild();
  expect(r`\genfrac {} {} {0.8pt}{}{a}{b+c}`).toBuild();
  expect(r`\genfrac [ {} {0.8pt}{}{a}{b+c}`).toBuild();
})

test(`A infix builder should not fail`, () => {
  expect(r`a \over b`).toParse();
  expect(r`a \atop b`).toParse();
  expect(r`a \choose b`).toParse();
  expect(r`a \brace b`).toParse();
  expect(r`a \brack b`).toParse();
  expect(r`a \over b`).toBuild();
  expect(r`a \atop b`).toBuild();
  expect(r`a \choose b`).toBuild();
  expect(r`a \brace b`).toBuild();
  expect(r`a \brack b`).toBuild();
})

test("A sizing parser should work", () => {
  const sizeExpression = r`\Huge{x}\small{x}`;
  expect(sizeExpression).toParse();
  node = parse(sizeExpression)[0];
  expect(node.type).toBe("sizing");
  expect(node.body).toBeDefined();
})

test("A text parser should work", () => {
  const textExpression = r`\text{a b}`;
  const noBraceTextExpression = r`\text x`;
  const nestedTextExpression = r`\text{a {b} \blue{c} \textcolor{#fff}{x} \llap{x}}`;
  const spaceTextExpression = r`\text{  a \ }`;
  const leadingSpaceTextExpression = r`\text {moo}`;
  const badTextExpression = r`\text{a b%}`;
  const badFunctionExpression = r`\text{\sqrt{x}}`;
  const mathTokenAfterText = r`\text{sin}^2`;
  expect(textExpression).toParse();
  node = parse(textExpression)[0];

  expect(node.type).toBe("text");
  expect(node.body).toBeDefined();

  expect(parse(textExpression)[0].body[0].type).toBe("textord");
  expect(badTextExpression).not.toParse();
  expect(badFunctionExpression).not.toParse();
  expect(noBraceTextExpression).toParse();
  expect(nestedTextExpression).toParse();
  node = parse(spaceTextExpression)[0];
  expect(node.body[0].type).toBe("spacing");
  expect(node.body[1].type).toBe("textord");
  expect(node.body[2].type).toBe("spacing");
  expect(node.body[3].type).toBe("spacing");
  expect(mathTokenAfterText).toParse();
  node = parse(leadingSpaceTextExpression)[0];
  // [m, o, o]
  expect(node.body).toHaveLength(3);
  expect(node.body.map(n => n.text).join("")).toBe("moo");
  expect(r`\text{graph: $y = mx + b$}`).toParse();
  expect(r`\text{graph: \(y = mx + b\)}`).toParse();
  expect(r`\text{hello $x + \text{world $y$} + z$}`).toParse();
  expect(r`\text{hello \(x + \text{world $y$} + z\)}`).toParse();
  expect(r`\text{hello $x + \text{world \(y\)} + z$}`).toParse();
  expect(r`\text{hello \(x + \text{world \(y\)} + z\)}`).toParse();
  expect(r`\(`).not.toParse();
  expect(r`\text{$\(x\)$}`).not.toParse();
  expect(r`$x$`).not.toParse();
  expect(r`\text{\($x$\)}`).not.toParse();
  expect(r`\)`).not.toParse();
  expect(r`\text{\)}`).not.toParse();
  expect(r`$`).not.toParse();
  expect(r`\text{$}`).not.toParse();
  expect(r`\text{$x\)}`).not.toParse();
  expect(r`\text{\(x$}`).not.toParse();
  expect(r`a b\, \; \! \: \> ~ \thinspace \medspace \quad \ `).toParse();
  expect(r`\enspace \thickspace \qquad \space \nobreakspace`).toParse();
  expect(r`a b\, \; \! \: \> ~ \thinspace \medspace \quad \ `).toBuild();
  expect(r`\enspace \thickspace \qquad \space \nobreakspace`).toBuild();
  expect(r`\text{\textellipsis !}`).toParseLike(r`\text{\textellipsis!}`);
  expect(r`\:_*`).toParse();
  expect(r`\:_*`).toBuild();
  // Check for duplication of text. Prevent reoccurence of issue #9.
  node = parse(r`\text{MMö}`)[0];
  expect(node.body[0].text).toBe("M")
  expect(r`\text{a \vdots b ⋮ d}`).toParse()
})

test(`A texvc builder should not fail`, () => {
  expect(r`\lang\N\darr\R\dArr\Z\Darr\alef\rang`).toParse();
  expect(r`\alefsym\uarr\Alpha\uArr\Beta\Uarr\Chi`).toParse();
  expect(r`\clubs\diamonds\hearts\spades\cnums\Complex`).toParse();
  expect(r`\Dagger\empty\harr\Epsilon\hArr\Eta\Harr\exist`).toParse();
  expect(r`\image\larr\infin\lArr\Iota\Larr\isin\Kappa`).toParse();
  expect(r`\Mu\lrarr\natnums\lrArr\Nu\Lrarr\Omicron`).toParse();
  expect(r`\real\rarr\plusmn\rArr\reals\Rarr\Reals\Rho`).toParse();
  expect(r`\text{\sect}\sdot\sub\sube\supe`).toParse();
  expect(r`\Tau\thetasym\weierp\Zeta`).toParse();
  expect(r`\lang\N\darr\R\dArr\Z\Darr\alef\rang`).toBuild();
  expect(r`\alefsym\uarr\Alpha\uArr\Beta\Uarr\Chi`).toBuild();
  expect(r`\clubs\diamonds\hearts\spades\cnums\Complex`).toBuild();
  expect(r`\Dagger\empty\harr\Epsilon\hArr\Eta\Harr\exist`).toBuild();
  expect(r`\image\larr\infin\lArr\Iota\Larr\isin\Kappa`).toBuild();
  expect(r`\Mu\lrarr\natnums\lrArr\Nu\Lrarr\Omicron`).toBuild();
  expect(r`\real\rarr\plusmn\rArr\reals\Rarr\Reals\Rho`).toBuild();
  expect(r`\text{\sect}\sdot\sub\sube\supe`).toBuild();
  expect(r`\Tau\thetasym\weierp\Zeta`).toBuild();
})

test("A tie parser should work", () => {
  const mathTie = "a~b";
  const textTie = r`\text{a~ b}`;
  expect(mathTie).toParse();
  expect(textTie).toParse();
  expect(parse(mathTie)[1].type).toBe("spacing");
  node = parse(textTie)[0];
  expect(node.body[1].type).toBe("spacing");
  node = parse(textTie)[0];
  expect(node.body[2].type).toBe("spacing");
})

test("A delimiter parser should wrap paired delimiters in a mrow", () => {
  const pairedDelimMathML = temml.renderToString(r`( x + y ) + z`);
  expect(pairedDelimMathML).toContain('</mrow><mo>+</mo><mi>z</mi>');
  const nestedPairedDelimMathML = temml.renderToString(r`(( x + y ) + z)^2`);
  expect(nestedPairedDelimMathML).toContain('</mrow><mo>+</mo><mi>z</mi><mo fence="true" form="postfix" stretchy="false">)</mo></mrow><mn>2</mn>');
})

test("A delimiter parser should work with an unpaired delimiter", () => {
  expect(r`( x + y`).toParse();
  expect(r`(a, b]`).toParse();
  expect(r`\langle \phi \vert`).toParse();
})

test("A delimiter sizing parser should work", () => {
  const normalDelim = r`\bigl |`;
  const notDelim = r`\bigl x`;
  const bigDelim = r`\Biggr \langle`;
  expect(normalDelim).toParse();
  expect(bigDelim).toParse();
  expect(notDelim).not.toParse();
  node = parse(normalDelim)[0];
  expect(node.type).toBe("delimsizing");
  const leftParse = parse(normalDelim)[0];
  const rightParse = parse(bigDelim)[0];
  expect(leftParse.mclass).toBe("mopen");
  expect(rightParse.mclass).toBe("mclose");
  const smallParse = parse(normalDelim)[0];
  const bigParse = parse(bigDelim)[0];
  expect(smallParse.size).toBe(1);
  expect(bigParse.size).toBe(4);
  const subBaseDelimParseNode = parse(r`\Big)^2`)[0];
  expect(subBaseDelimParseNode.base.type).toBe('ordgroup') // not 'delimisizing'
  expect(r`\bigg{(}`).toParse(); // Delimiter sizing works with argument inside braces
  expect(r`\bigg{(}`).toParseLike(r`\bigg(`);
})

test("An overline parser should work", () => {
  overline = r`\overline{x}`;
  expect(overline).toParse();
  node = parse(overline)[0];
  expect(node.type).toBe("enclose");
})

test("A lap parser should work", () => {
  expect(r`\rlap{\,/}{=}`).toParse();
  expect(r`\mathrlap{\,/}{=}`).toParse();
  expect(r`{=}\llap{/\,}`).toParse();
  expect(r`{=}\mathllap{/\,}`).toParse();
  expect(r`\sum_{\clap{ABCDEFG}}`).toParse();
  expect(r`\sum_{\mathclap{ABCDEFG}}`).toParse();
  expect(r`\mathrlap{\frac{a}{b}}{=}`).toParse();
  expect(r`{=}\mathllap{\frac{a}{b}}`).toParse();
  expect(r`\sum_{\mathclap{\frac{a}{b}}}`).toParse();
  expect(r`\rlap{\frac{a}{b}}{=}`).not.toParse(strictSettings());
  expect(r`{=}\llap{\frac{a}{b}}`).not.toParse(strictSettings());
  expect(r`\sum_{\clap{\frac{a}{b}}}`).not.toParse(strictSettings());
  node = parse(r`\mathrlap{\,/}`)[0];
  expect(node.type).toBe("lap");
})

test("A rule parser should work", () => {
  const emRule = r`\rule{1em}{2em}`;
  const exRule = r`\rule{1ex}{2em}`;
  badUnitRule = r`\rule{1au}{2em}`;
  noNumberRule = r`\rule{1em}{em}`;
  const incompleteRule = r`\rule{1em}`;
  const hardNumberRule = r`\rule{   01.24ex}{2.450   em   }`;
  expect(emRule).toParse();
  expect(exRule).toParse();
  expect(badUnitRule).not.toParse();
  expect(noNumberRule).not.toParse();
  expect(incompleteRule).not.toParse();
  node = parse(emRule)[0];
  expect(node.type).toBe("rule");
  emParse = parse(emRule)[0];
  exParse = parse(exRule)[0];
  expect(emParse.width.unit).toBe("em");
  expect(emParse.height.unit).toBe("em");
  expect(exParse.width.unit).toBe("ex");
  expect(exParse.height.unit).toBe("em");
  const hardNumberParse = parse(hardNumberRule)[0];
  expect(hardNumberParse.width.number).toBeCloseTo(1.24);
  expect(hardNumberParse.height.number).toBeCloseTo(2.45);
  node = parse(r`\rule{-1em}{- 0.2em}`)[0];
  expect(node.width.number).toBeCloseTo(-1);
  expect(node.height.number).toBeCloseTo(-0.2);
  expect(r`\text{a\rule{1em}{2em}b}`).toParse()
})

test("A kern parser should work", () => {
  emKern = r`\kern{1em}`;
  exKern = r`\kern{1ex}`;
  muKern = r`\mkern{1mu}`;
  abKern = r`a\kern{1em}b`;
  badUnitRule = r`\kern{1au}`;
  noNumberRule = r`\kern{em}`;
  emParse = parse(emKern)[0];
  exParse = parse(exKern)[0];
  muParse = parse(muKern)[0];
  abParse = parse(abKern)[1];
  expect(emParse.dimension.unit).toBe("em");
  expect(exParse.dimension.unit).toBe("ex");
  expect(muParse.dimension.unit).toBe("mu");
  expect(abParse.dimension.unit).toBe("em");
  expect(badUnitRule).not.toParse();
  expect(noNumberRule).not.toParse();
  node = parse(r`\kern{-1em}`)[0];
  expect(node.dimension.number).toBeCloseTo(-1);
  node = parse(r`\kern{+1em}`)[0];
  expect(node.dimension.number).toBeCloseTo(1);
})

test("A non-braced kern parser should work", () => {
  emKern = r`\kern1em`;
  exKern = r`\kern 1 ex`;
  muKern = r`\mkern 1mu`;
  const abKern1 = r`a\mkern1mub`;
  const abKern2 = r`a\mkern-1mub`;
  const abKern3 = r`a\mkern-1mu b`;
  badUnitRule = r`\kern1au`;
  noNumberRule = r`\kern em`;
  emParse = parse(emKern)[0];
  exParse = parse(exKern)[0];
  muParse = parse(muKern)[0];
  let abParse1 = parse(abKern1)[1];
  let abParse2 = parse(abKern2)[1];
  let abParse3 = parse(abKern3)[1];
  expect(emParse.dimension.unit).toBe("em");
  expect(exParse.dimension.unit).toBe("ex");
  expect(muParse.dimension.unit).toBe("mu");
  expect(abParse1.dimension.unit).toBe("mu");
  expect(abParse2.dimension.unit).toBe("mu");
  expect(abParse3.dimension.unit).toBe("mu");
  abParse1 = parse(abKern1);
  abParse2 = parse(abKern2);
  abParse3 = parse(abKern3);
  expect(abParse1).toHaveLength(3);
  expect(abParse1[0].text).toBe("a");
  expect(abParse1[2].text).toBe("b");
  expect(abParse2).toHaveLength(3);
  expect(abParse2[0].text).toBe("a");
  expect(abParse2[2].text).toBe("b");
  expect(abParse3).toHaveLength(3);
  expect(abParse3[0].text).toBe("a");
  expect(abParse3[2].text).toBe("b");
  expect(badUnitRule).not.toParse();
  expect(noNumberRule).not.toParse();
  node = parse(r`\kern-1em`)[0];
  expect(node.dimension.number).toBeCloseTo(-1);
  node = parse(r`\kern+1em`)[0];
  expect(node.dimension.number).toBeCloseTo(1);
  abKern = "a\\mkern\t-\r1  \n mu\nb";
  abParse = parse("a\\mkern\t-\r1  \n mu\nb");
  expect(abParse).toHaveLength(3);
  expect(abParse[0].text).toBe("a");
  expect(abParse[1].dimension.unit).toBe("mu");
  expect(abParse[2].text).toBe("b");
})

test("A left/right parser should work", () => {
  const normalLeftRight = r`\left( \dfrac{x}{y} \right)`;
  const emptyRight = r`\left( \dfrac{x}{y} \right.`;
  expect(normalLeftRight).toParse();
  node = parse(normalLeftRight)[0];
  expect(node.type).toBe("leftright");
  expect(node.left).toBe("(");
  expect(node.right).toBe(")");
  const unmatchedLeft = r`\left( \dfrac{x}{y}`;
  const unmatchedRight = r`\dfrac{x}{y} \right)`;
  expect(unmatchedLeft).not.toParse();
  expect(unmatchedRight).not.toParse();
  const unmatched = r`{ \left( \dfrac{x}{y} } \right)`;
  expect(unmatched).not.toParse();
  const nonDelimiter = r`\left$ \dfrac{x}{y} \right)`;
  expect(nonDelimiter).not.toParse();
  expect(emptyRight).toParse();
  const normalEmpty = r`\Bigl .`;
  expect(normalEmpty).toParse();
  const normalMiddle = r`\left( \dfrac{x}{y} \middle| \dfrac{y}{z} \right)`;
  expect(normalMiddle).toParse();
  const multiMiddle = r`\left( \dfrac{x}{y} \middle| \dfrac{y}{z} \middle/ \dfrac{z}{q} \right)`;
  expect(multiMiddle).toParse();
  const nestedMiddle = r`\left( a^2 \middle| \left( b \middle/ c \right) \right)`;
  expect(nestedMiddle).toParse();
  const unmatchedMiddle = r`(\middle|\dfrac{x}{y})`;
  expect(unmatchedMiddle).not.toParse();
  expect(r`\left\langle \right\rangle`).toBuildLike(r`\left< \right>`);
  expect(r`\left\langle \right\rangle`).toBuildLike("\\left\u27e8 \\right\u27e9");
  expect(r`\left\lparen \right\rparen`).toBuildLike(r`\left( \right)`);
  expect(temml.renderToString(r`\left\{a\over2\middle|b\right\}`)).toContain("<mfrac><mi>a</mi><mn>2</mn>")
})

test("A begin/end parser should work", () => {
  expect(r`\begin{matrix}a&b\\c&d\end{matrix}`).toParse();
  expect(r`\begin{array}{cc}a&b\\c&d\end{array}`).toParse();
  expect(r`\begin{aligned}\end{aligned}`).toParse();
  expect(r`\begin{matrix}\hline a&b\\ \hline c&d\end{matrix}`).toParse();
  expect(r`\begin{matrix}\hdashline a&b\\ \hdashline c&d\end{matrix}`).toParse();
  expect(r`\hline`).not.toParse();
  expect(r`\begin{matrix}a&b\\c&d\end{pmatrix}`).not.toParse();
  expect(r`\begin{matrix}a&b\\c&d\right{pmatrix}`).not.toParse();
  expect(r`\begin{matrix}a&b\\c&d`).not.toParse();
  expect(r`{\begin{matrix}a&b\\c&d}\end{matrix}`).not.toParse();
  expect(r`\begin{matrix}0&1\over2&3\\4&5&6\end{matrix}`).toParse();
  const m1 = `\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}`;
  const m2 = `\\begin{array}{rl}${m1}&0\\\\0&${m1}\\end{array}`;
  expect(m2).toParse();
  expect(r`\begin{matrix}a&b\cr c&d\end{matrix}`).toParse();
  expect(r`\begin{matrix}a&b\\c&d\end{matrix}`).toParse();
  expect(r`\begin{matrix}a&b\cr[c]&d\end{matrix}`).toParse();
  const m3 = parse(r`\begin{matrix}a&b\\ c&d \\ \end{matrix}`)[0];
  expect(m3.body).toHaveLength(2);
  expect(r`\begin{matrix*}[r] a & -1 \\ -1 & d \end{matrix*}`).toParse();
  expect(r`\begin{pmatrix*}[r] a & -1 \\ -1 & d \end{pmatrix*}`).toParse();
  expect(r`\begin{bmatrix*}[r] a & -1 \\ -1 & d \end{bmatrix*}`).toParse();
  expect(r`\begin{Bmatrix*}[r] a & -1 \\ -1 & d \end{Bmatrix*}`).toParse();
  expect(r`\begin{vmatrix*}[r] a & -1 \\ -1 & d \end{vmatrix*}`).toParse();
  expect(r`\begin{Vmatrix*}[r] a & -1 \\ -1 & d \end{Vmatrix*}`).toParse();
  expect(r`\begin{matrix*} a & -1 \\ -1 & d \end{matrix*}`).toParse();
  expect(r`\begin{matrix*}[r] a & -1 \\ -1 & d \end{matrix*}`).toBuild();
  expect(r`\begin{pmatrix*}[r] a & -1 \\ -1 & d \end{pmatrix*}`).toBuild();
  expect(r`\begin{bmatrix*}[r] a & -1 \\ -1 & d \end{bmatrix*}`).toBuild();
  expect(r`\begin{Bmatrix*}[r] a & -1 \\ -1 & d \end{Bmatrix*}`).toBuild();
  expect(r`\begin{vmatrix*}[r] a & -1 \\ -1 & d \end{vmatrix*}`).toBuild();
  expect(r`\begin{Vmatrix*}[r] a & -1 \\ -1 & d \end{Vmatrix*}`).toBuild();
  expect(r`\begin{matrix*} a & -1 \\ -1 & d \end{matrix*}`).toBuild();
  expect(r`\begin{matrix*}[] a & -1 \\ -1 & d \end{matrix*}`).not.toParse();
  expect(r`\begin{matrix}a&b\\ [c]&d\end{matrix}`).toParse()
  expect(r`a\\ [b]`).toParse()
})

test("A \\bordermatrix parser should work", () => {
  expect(r`\bordermatrix{ &1&2 \cr 1&A&B\cr 2&C&D}`).toParse()
  expect(r`\bordermatrix{ &1&2 \cr 1&A&B\cr 2&C&D}`).toBuild()
  expect(r`\bordermatrix[{[]}]{ &1&2 \cr 1&A&B\cr 2&C&D}`).toParse()
  expect(r`\bordermatrix[{[]}]{ &1&2 \cr 1&A&B\cr 2&C&D}`).toBuild()
  expect(r`\matrix{ &1&2 \cr 1&A&B\cr 2&C&D}`).toParse()
  expect(r`\matrix{ &1&2 \cr 1&A&B\cr 2&C&D}`).toBuild()
})

test("A sqrt parser should work", () => {
  sqrt = r`\sqrt{x}`;
  const missingGroup = r`\sqrt`;
  expect(sqrt).toParse();
  expect(missingGroup).not.toParse();
  expect(parse(sqrt)[0].type).toBe("sqrt");
  expect("\\Large\\sqrt[3]{x}").toParse();
  expect("\\sqrt\\foo").toParseLike("\\sqrt123", settings({ macros: { "\\foo": "123" } }));
  expect("\\sqrt[2]\\foo").toParseLike("\\sqrt[2]{123}", settings({ macros: { "\\foo": "123" } }));
})

test("A TeX-compliant parser should work", () => {
  expect(r`\frac 2 3`).toParse();
  const missingGroups = [
    r`\frac{x}`,
    r`\textcolor{#fff}`,
    r`\rule{1em}`,
    r`\llap`,
    r`\bigl`,
    r`\text`
  ];
  for (let i = 0; i < missingGroups.length; i++) {
      expect(missingGroups[i]).not.toParse();
  }
  expect(r`x^`).not.toParse();
  expect(r`x_`).not.toParse();
  const badArguments = [
    r`\frac \frac x y z`,
    r`\frac x \frac y z`,
    r`\frac \sqrt x y`,
    r`\frac x \sqrt y`,
    r`\frac \mathllap x y`,
    r`\frac x \mathllap y`,
    // This actually doesn't work in real TeX, but it is suprisingly
    // hard to get this to correctly work. So, we take hit of very small
    // amounts of non-compatiblity in order for the rest of the tests to
    // work
    // r`\llap \frac x y`,
    r`\mathllap \mathllap x`,
    r`\sqrt \mathllap x`
  ];
  for (let i = 0; i < badArguments.length; i++) {
      expect(badArguments[i]).not.toParse();
  }
  const goodArguments = [
    r`\frac {\frac x y} z`,
    r`\frac x {\frac y z}`,
    r`\frac {\sqrt x} y`,
    r`\frac x {\sqrt y}`,
    r`\frac {\mathllap x} y`,
    r`\frac x {\mathllap y}`,
    r`\mathllap {\frac x y}`,
    r`\mathllap {\mathllap x}`,
    r`\sqrt {\mathllap x}`
  ];
  for (let i = 0; i < goodArguments.length; i++) {
      expect(goodArguments[i]).toParse();
  }
  const badSupSubscripts = [
    r`x^\sqrt x`,
    r`x^\mathllap x`,
    r`x_\sqrt x`,
    r`x_\mathllap x`
  ];
  for (let i = 0; i < badSupSubscripts.length; i++) {
      expect(badSupSubscripts[i]).not.toParse();
  }
  const goodSupSubscripts = [
    r`x^{\sqrt x}`,
    r`x^{\mathllap x}`,
    r`x_{\sqrt x}`,
    r`x_{\mathllap x}`
  ];
  for (let i = 0; i < goodSupSubscripts.length; i++) {
      expect(goodSupSubscripts[i]).toParse();
  }
  expect(r`x''''`).toParse();
  expect(r`x_2''`).toParse();
  expect(r`x''_2`).toParse();
  expect(r`\sqrt^23`).not.toParse();
  expect(r`\frac^234`).not.toParse();
  expect(r`\frac2^34`).not.toParse();
  expect(r`\sqrt2^3`).toParse();
  expect(r`\frac23^4`).toParse();
  expect(r`\sqrt \frac x y`).toParse();
  expect(r`\sqrt \text x`).toParse();
  expect(r`x^\frac x y`).toParse();
  expect(r`x_\text x`).toParse();
  const badLeftArguments = [
    r`\frac \left( x \right) y`,
    r`\frac x \left( y \right)`,
    r`\mathllap \left( x \right)`,
    r`\sqrt \left( x \right)`,
    r`x^\left( x \right)`
  ];
  for (let i = 0; i < badLeftArguments.length; i++) {
      expect(badLeftArguments[i]).not.toParse();
  }
  const goodLeftArguments = [
    r`\frac {\left( x \right)} y`,
    r`\frac x {\left( y \right)}`,
    r`\mathllap {\left( x \right)}`,
    r`\sqrt {\left( x \right)}`,
    r`x^{\left( x \right)}`
  ];
  for (let i = 0; i < goodLeftArguments.length; i++) {
      expect(goodLeftArguments[i]).toParse();
  }
})

test("An op symbol builder should build", () => {
  expect(r`\int_i^n`).toParse();
  expect(r`\iint_i^n`).toParse();
  expect(r`\iiint_i^n`).toParse();
  expect(r`\int\nolimits_i^n`).toParse();
  expect(r`\iint\nolimits_i^n`).toParse();
  expect(r`\iiint\nolimits_i^n`).toParse();
  expect(r`\oint_i^n`).toParse();
  expect(r`\oiint_i^n`).toParse();
  expect(r`\oiiint_i^n`).toParse();
  expect(r`\oint\nolimits_i^n`).toParse();
  expect(r`\oiint\nolimits_i^n`).toParse();
  expect(r`\oiiint\nolimits_i^n`).toParse();
  expect(r`\int_i^n`).toBuild();
  expect(r`\iint_i^n`).toBuild();
  expect(r`\iiint_i^n`).toBuild();
  expect(r`\int\nolimits_i^n`).toBuild();
  expect(r`\iint\nolimits_i^n`).toBuild();
  expect(r`\iiint\nolimits_i^n`).toBuild();
  expect(r`\oint_i^n`).toBuild();
  expect(r`\oiint_i^n`).toBuild();
  expect(r`\oiiint_i^n`).toBuild();
  expect(r`\oint\nolimits_i^n`).toBuild();
  expect(r`\oiint\nolimits_i^n`).toBuild();
  expect(r`\oiiint\nolimits_i^n`).toBuild();
})

test("A class assignment should build an operator", () => {
  expect(r`\mathop{\int}`).toBuild();
  expect(r`\mathop \int`).toBuild();
})

test("A style change parser should work", () => {
  expect(r`\displaystyle x`).toParse();
  expect(r`\textstyle x`).toParse();
  expect(r`\scriptstyle x`).toParse();
  expect(r`\scriptscriptstyle x`).toParse();
  const displayParse = parse(r`\displaystyle x`)[0];
  expect(displayParse.scriptLevel).toBe("display");
  const scriptscriptParse = parse(r`\scriptscriptstyle x`)[0];
  expect(scriptscriptParse.scriptLevel).toBe("scriptscript");
  text = r`a b { c d \displaystyle e f } g h`;
  const displayNode = parse(text)[2].body[2];
  expect(displayNode.type).toBe("styling");
  const displayBody = displayNode.body;
  expect(displayBody).toHaveLength(2);
  expect(displayBody[0].text).toBe("e");
})

test("A font parser should work", () => {
  expect(r`\mathrm x`).toParse();
  expect(r`\mathbb x`).toParse();
  expect(r`\mathit x`).toParse();
  expect(r`\mathnormal x`).toParse();
  expect(r`\mathrm {x + 1}`).toParse();
  expect(r`\mathbb {x + 1}`).toParse();
  expect(r`\mathit {x + 1}`).toParse();
  expect(r`\mathnormal {x + 1}`).toParse();
  expect(r`\mathcal{ABC123}`).toParse();
  expect(r`\mathfrak{abcABC123}`).toParse();
  const mathbbParse = parse(r`\mathbb x`)[0];
  expect(mathbbParse.font).toBe("mathbb");
  expect(mathbbParse.type).toBe("font");
  const mathrmParse = parse(r`\mathrm x`)[0];
  expect(mathrmParse.font).toBe("mathrm");
  expect(mathrmParse.type).toBe("font");
  const mathitParse = parse(r`\mathit x`)[0];
  expect(mathitParse.font).toBe("mathit");
  expect(mathitParse.type).toBe("font");
  const mathnormalParse = parse(r`\mathnormal x`)[0];
  expect(mathnormalParse.font).toBe("mathnormal");
  expect(mathnormalParse.type).toBe("font");
  const mathcalParse = parse(r`\mathcal C`)[0];
  expect(mathcalParse.font).toBe("mathcal");
  expect(mathcalParse.type).toBe("font");
  const mathfrakParse = parse(r`\mathfrak C`)[0];
  expect(mathfrakParse.font).toBe("mathfrak");
  expect(mathfrakParse.type).toBe("font");
  const nestedParse = parse(r`\mathbb{R \neq \mathrm{R}}`)[0];
  expect(nestedParse.font).toBe("mathbb");
  expect(nestedParse.type).toBe("font");
  const bbBody = nestedParse.body.body;
  expect(bbBody).toHaveLength(3);
  expect(bbBody[0].type).toBe("mathord");
  expect(bbBody[2].type).toBe("font");
  expect(bbBody[2].font).toBe("mathrm");
  expect(bbBody[2].type).toBe("font");
  const colorMathbbParse = parse(r`\textcolor{blue}{\mathbb R}`)[0];
  expect(colorMathbbParse.type).toBe("color");
  expect(colorMathbbParse.color).toBe("#0000FF");
  const cbody = colorMathbbParse.body;
  expect(cbody).toHaveLength(1);
  expect(cbody[0].type).toBe("font");
  expect(cbody[0].font).toBe("mathbb");
  const bf = parse(r`\mathbf{a\mathrm{b}c}`)[0];
  expect(bf.type).toBe("font");
  expect(bf.font).toBe("mathbf");
  expect(bf.body.body).toHaveLength(3);
  expect(bf.body.body[0].text).toBe("a");
  expect(bf.body.body[1].type).toBe("font");
  expect(bf.body.body[1].font).toBe("mathrm");
  expect(bf.body.body[2].text).toBe("c");
  expect(r`e^\mathbf{x}`).toParse();
  expect(r`\rm xyz`).toParseLike(r`\mathrm{xyz}`);
  expect(r`\sf xyz`).toParseLike(r`\mathsf{xyz}`);
  expect(r`\tt xyz`).toParseLike(r`\mathtt{xyz}`);
  expect(r`\bf xyz`).toParseLike(r`\mathbf{xyz}`);
  expect(r`\it xyz`).toParseLike(r`\mathit{xyz}`);
  expect(r`\cal xyz`).toParseLike(r`\mathcal{xyz}`);
  expect(r`\uptheta\varDelta`).toParse(strictSettings())
  expect(r`\uptheta\varDelta`).toBuild()
  expect(r`\mathrm{rπh}`).toBuild()
  expect(r`\mathrm{μs}`).toBuild()
})

test("A \\boldsymbol builder should work", () => {
  expect(temml.renderToString(r`\boldsymbol{A}`)).toContain("𝑨")
  expect(temml.renderToString(r`\boldsymbol{\mathrm{b}}`)).toContain('style="font-weight:bold;"')
})

test("A \\pmb builder should work", () => {
  expect(r`\pmb{\mu}`).toParse();
  expect(r`\pmb{=}`).toParse();
  expect(r`\pmb{+}`).toParse();
  expect(r`\pmb{\frac{x^2}{x_1}}`).toParse();
  expect(r`\pmb{}`).toParse();
  expect(r`\pmb{\mu}`).toBuild();
  expect(r`\pmb{=}`).toBuild();
  expect(r`\pmb{+}`).toBuild();
  expect(r`\pmb{\frac{x^2}{x_1}}`).toBuild();
  expect(r`\pmb{}`).toBuild();
  expect(r`\def\x{1}\pmb{\x\def\x{2}}`).toParseLike(r`\pmb{1}`);
})

test(`A raise parser should work`, () => {
  expect(r`\raisebox{5pt}{text}`).toParse(strictSettings());
  expect(r`\raisebox{-5pt}{text}`).toParse(strictSettings());
  expect(r`\vcenter{\frac a b}`).toParse();
  expect(r`\raisebox{5pt}{text}`).toBuild(strictSettings());
  expect(r`\raisebox{-5pt}{text}`).toBuild(strictSettings());
  expect(r`\vcenter{\frac a b}`).toBuild();
  expect(r`\raisebox{5pt}{\frac a b}`).not.toParse();
  expect(r`\raisebox{-5pt}{\frac a b}`).not.toParse();
  expect(r`\hbox{\frac a b}`).not.toParse();
  expect(r`\raisebox5pt{text}`).not.toParse();
  expect(r`\raisebox5pt{text}`).not.toParse();
  expect(r`\raisebox-5pt{text}`).not.toParse();
})

test("A comment parser should work", () => {
  expect("a^2 + b^2 = c^2 % Pythagoras' Theorem\n").toParse();
  expect("% comment\n").toParse();
  expect("% comment 1\n% comment 2\n").toParse();
  expect("x_3 %comment\n^2").toParseLike(`x_3^2`);
  expect("x^ %comment\n{2}").toParseLike(`x^{2}`);
  expect("x^ %comment\n\\frac{1}{2}").toParseLike(r`x^\frac{1}{2}`);
  expect("\\kern{1 %kern\nem}").toParse();
  expect("\\kern1 %kern\nem").toParse();
  expect("\\color{#f00%red\n}").toParse();
  expect("%comment\n{2}").toParseLike(`{2}`);
  expect("\\begin{matrix}a&b\\\\ %hline\n\\hline %hline\n\\hline c&d\\end{matrix}").toParse();
  expect("\\def\\foo{a %}\nb}\n\\foo").toParseLike(`ab`);
  expect("\\def\\foo{1\n2}\nx %\\foo\n").toParseLike(`x`);
  expect(`x%y`).not.toParse(strictSettings());
  expect(`x%y`).toParse();
  expect("\\text{hello% comment 1\nworld}").toParseLike(r`\text{helloworld}`);
  expect("\\text{hello% comment\n\nworld}").toParseLike(r`\text{hello world}`);
  expect("5 % comment\n").toParseLike(`5`);
})

test("A font tree-builder should work", () => {
  markup = temml.renderToString(r`\mathbb{R}`).replace(mathTagRegEx, "");
  expect(markup).toBe('<mi>ℝ</mi>');
  markup = temml.renderToString(r`\mathrm{R}`).replace(mathTagRegEx, "");
  expect(markup).toBe('<mrow><mi mathvariant="normal">R</mi><mspace></mspace></mrow>');
  markup = temml.renderToString(r`\nabla`).replace(mathTagRegEx, "");
  expect(markup).toBe('<mo form="prefix" stretchy="false" lspace="0em" rspace="0em">∇</mo>');
  markup = temml.renderToString(r`\mathord\nabla`).replace(mathTagRegEx, "");
  expect(markup).toBe('<mi mathvariant="normal">∇</mi>');
  markup = temml.renderToString(r`\mathcal{R}`).replace(mathTagRegEx, "");
  expect(markup).toBe('<mi class="mathcal">ℛ</mi>');
  markup = temml.renderToString(r`\mathfrak{R}`).replace(mathTagRegEx, "");
  expect(markup).toBe('<mi>ℜ</mi>');
  markup = temml.renderToString(r`\text{R}`).replace(mathTagRegEx, "");
  expect(markup).toBe('<mtext>R</mtext>');
  markup = temml.renderToString(r`\textit{R}`).replace(mathTagRegEx, "");
  expect(markup).toBe('<mtext>𝑅</mtext>');
  markup = temml.renderToString(r`\text{\textit{R}}`).replace(mathTagRegEx, "");
  expect(markup).toBe('<mtext>𝑅</mtext>');
  let markup1 = temml.renderToString(r`\textup{R}`).replace(mathTagRegEx, "");
  expect(markup1).toBe('<mtext>R</mtext>');
  let markup2 = temml.renderToString(r`\textit{\textup{R}}`).replace(mathTagRegEx, "");
  expect(markup2).toBe('<mtext>R</mtext>');
  let markup3 = temml.renderToString(r`\textup{\textit{R}}`).replace(mathTagRegEx, "");
  expect(markup3).toBe('<mtext>𝑅</mtext>');
  markup = temml.renderToString(r`\text{R\textit{S}T}`).replace(mathTagRegEx, "");
  expect(markup).toBe('<mtext>R𝑆T</mtext>');
  markup1 = temml.renderToString(r`\textmd{R}`).replace(mathTagRegEx, "");
  expect(markup1).toBe('<mtext>R</mtext>');
  markup2 = temml.renderToString(r`\textbf{\textmd{R}}`).replace(mathTagRegEx, "");
  expect(markup2).toBe('<mtext>R</mtext>');
  markup3 = temml.renderToString(r`\textmd{\textbf{R}}`).replace(mathTagRegEx, "");
  expect(markup3).toBe('<mtext>𝐑</mtext>');
  markup = temml.renderToString(r`\textsf{R}`).replace(mathTagRegEx, "");
  expect(markup).toBe('<mtext>𝖱</mtext>');
  markup = temml.renderToString(r`\textsf{\textit{R}G\textbf{B}}`).replace(mathTagRegEx, "");
  expect(markup).toBe('<mtext>𝘙𝖦𝗕</mtext>');
  markup = temml.renderToString(r`\texttt{R}`).replace(mathTagRegEx, "");
  expect(markup).toBe('<mtext>𝚁</mtext>');
})

test("A font tree-builder should render a combination of font and color changes", () => {
  markup = temml.renderToString(r`\textcolor{blue}{\mathbb R}`).replace(mathTagRegEx, "");
  expect(markup).toBe('<mrow><mi style="color:#0000FF;">ℝ</mi></mrow>');
  markup = temml.renderToString(r`\mathbb{\textcolor{blue}{R}}`).replace(mathTagRegEx, "");
  expect(markup).toBe('<mrow><mi style="color:#0000FF;">ℝ</mi></mrow>');
})

test("A font tree-builder should render wide characters with <mi> and with the correct font", () => {
  markup = temml.renderToString("𝐀").replace(mathTagRegEx, "");
  expect(markup).toBe('<mi>𝐀</mi>');
  markup = temml.renderToString(r`\mathord{\text{abc}}`).replace(mathTagRegEx, "");
  expect(markup).toBe('<mi>abc</mi>');
})

test("A parser should throw an error when the expression is of the wrong type", () => {
  expect([1, 2]).not.toParse()
  expect({ badInputType: "yes" }).not.toParse()
  expect(undefined).not.toParse()
  expect(null).not.toParse()
  expect(1.234).not.toParse()
})

test("A parser should work when the expression is of the correct type", () => {
  expect(r`\sqrt{123}`).toParse()
  expect(new String(r`\sqrt{123}`)).toParse()
})

test("A font tree-builder should render the correct mathvariants", () => {
  markup = temml.renderToString(r`Ax2k\omega\Omega\imath+`).replace(mathTagRegEx, "");
  expect(markup).toContain("<mi>A</mi>");
  expect(markup).toContain("<mi>x</mi>");
  expect(markup).toContain("<mn>2</mn>");
  expect(markup).toContain("<mi>ω</mi>");   // \omega
  expect(markup).toContain('<mi mathvariant="normal">Ω</mi>');   // \Omega
  expect(markup).toContain('<mi>ı</mi>');   // \imath
  expect(markup).toContain('<mo>+</mo>');
  markup = temml.renderToString(r`\mathbb{Ax2k\omega\Omega\imath+}`).replace(mathTagRegEx, "");
  expect(markup).toBe('<mrow><mi>𝔸</mi><mi>𝕩</mi><mn>𝟚</mn><mi>𝕜</mi><mi>ω</mi><mi>Ω</mi><mi>ı</mi><mo lspace="0em" rspace="0em">+</mo></mrow>');
  markup = temml.renderToString(r`\mathrm{Ax2k\omega\Omega\imath}`).replace(mathTagRegEx, "");
  expect(markup).toBe('<mpadded lspace="0"><mi>Ax2kωΩı</mi></mpadded>');
  markup = temml.renderToString(r`\mathrm{Ax2k\omega\Omega\imath+}`).replace(mathTagRegEx, "");
  expect(markup).toContain("<mi mathvariant=\"normal\">A</mi>");
  expect(markup).toContain("<mi mathvariant=\"normal\">x</mi>");
  expect(markup).toContain("<mn>2</mn>");
  expect(markup).toContain("<mi mathvariant=\"normal\">ω</mi>");   // \omega
  expect(markup).toContain("<mi mathvariant=\"normal\">Ω</mi>");   // \Omega
  expect(markup).toContain("<mi mathvariant=\"normal\">ı</mi>");   // \imath
  expect(markup).toContain('<mo lspace="0em" rspace="0em">+</mo>');
  markup = temml.renderToString(r`\mathit{Ax2k\omega\Omega\imath+}`).replace(mathTagRegEx, "");
  expect(markup).toBe(`<mrow><mi>A</mi><mi>x</mi><mstyle style="font-style:italic;font-family:Cambria, 'Times New Roman', serif;"><mn>2</mn></mstyle><mi>k</mi><mi>ω</mi><mi>Ω</mi><mi>ı</mi><mo lspace="0em" rspace="0em">+</mo></mrow>`);
  markup = temml.renderToString(r`\mathit{aaAA2\omega\Omega\imath}`).replace(mathTagRegEx, "");
  expect(markup).toBe(`<mi>𝑎𝑎𝐴𝐴2𝜔𝛺ı</mi>`);
  markup = temml.renderToString(r`\mathnormal{Ax2k\omega\Omega\imath+}`).replace(mathTagRegEx, "");
  expect(markup).toContain("<mi>A</mi>");
  expect(markup).toContain("<mi>x</mi>");
  expect(markup).toContain("<mn>2</mn>");
  expect(markup).toContain("<mi>ω</mi>");   // \omega
  expect(markup).toContain("<mi mathvariant=\"normal\">Ω</mi>");   // \Omega
  expect(markup).toContain("<mi>ı</mi>");   // \imath
  expect(markup).toContain('<mo lspace="0em" rspace="0em">+</mo>');
  markup = temml.renderToString(r`\mathbf{Ax2k\omega\Omega\imath+}`).replace(mathTagRegEx, "");
  expect(markup).toBe(`<mrow><mi>𝐀</mi><mi>𝐱</mi><mn>𝟐</mn><mi>𝐤</mi><mi>𝛚</mi><mi>𝛀</mi><mi>ı</mi><mo lspace="0em" rspace="0em">+</mo></mrow>`);
  markup = temml.renderToString(r`\mathcal{Ax2k\omega\Omega\imath+}`).replace(mathTagRegEx, "");
  expect(markup).toBe(`<mrow><mi class="mathcal">𝒜</mi><mi class="mathcal">𝓍</mi><mn>2</mn><mi class="mathcal">𝓀</mi><mi class="mathcal">ω</mi><mi class="mathcal">Ω</mi><mi class="mathcal">ı</mi><mo lspace="0em" rspace="0em">+</mo></mrow>`);
  markup = temml.renderToString(r`\mathfrak{Ax2k\omega\Omega\imath+}`).replace(mathTagRegEx, "");
  expect(markup).toBe(`<mrow><mi>𝔄</mi><mi>𝔵</mi><mn>2</mn><mi>𝔨</mi><mi>ω</mi><mi>Ω</mi><mi>ı</mi><mo lspace="0em" rspace="0em">+</mo></mrow>`);
  markup = temml.renderToString(r`\mathscr{A}`).replace(mathTagRegEx, "");
  expect(markup).toBe(`<mi class="mathscr">𝒜</mi>`);
  markup = temml.renderToString(r`\mathsf{Ax2k\omega\Omega\imath+}`).replace(mathTagRegEx, "");
  expect(markup).toBe(`<mrow><mi>𝖠</mi><mi>𝗑</mi><mn>𝟤</mn><mi>𝗄</mi><mi>𝞈</mi><mi>𝝮</mi><mi>ı</mi><mo lspace="0em" rspace="0em">+</mo></mrow>`);
  markup = temml.renderToString(r`\mathsfit{Ab}`).replace(mathTagRegEx, "")
  expect(markup).toBe(`<mrow><mi>𝘈</mi><mi>𝘣</mi></mrow>`);
})

test("A font tree-builder should render text as <mtext>", () => {
  markup = temml.renderToString(r`\text{for }`);
  expect(markup).toContain("<mtext>for\u00a0</mtext>");
})

test("A font tree-builder should render math within text as side-by-side children", () => {
  markup = temml.renderToString(r`\text{graph: $y = mx + b$}`);
  expect(markup).toContain("<mi>y</mi><mo>=</mo><mi>m</mi><mi>x</mi><mo>+</mo><mi>b</mi>");
})

test("An includegraphics builder should work", () => {
  const img = "\\includegraphics[height=0.9em, totalheight=0.9em, width=0.9em, alt=KA logo]{https://cdn.kastatic.org/images/apple-touch-icon-57x57-precomposed.new.png}";
  expect(img).not.toParse() // no trust
  expect(img).not.toBuild();
  expect(img).toParse(trustSettings()) // no trust
  markup = temml.renderToString(img, trustSettings()).replace(mathTagRegEx, "");
  expect(markup).toBe(`<mtext><img src='https://cdn.kastatic.org/images/apple-touch-icon-57x57-precomposed.new.png' alt='KA logo' style="height:0.9em;width:0.9em;"></mtext>`);
})

test("An HTML extension builder should work", () => {
  const html = r`\id{bar}{x}\class{foo}{x}\style{color: red;}{x}\data{foo=a, bar=b}{x}`;
  expect(html).toParse(trustSettings());
  expect(html).toBuild(trustSettings());
  let built = build(html, trustSettings())[0].children[0].children;
  expect(built[0].attributes.id).toBe("bar");
  expect(built[1].classes).toContain("foo");
  expect(built[2].attributes.style).toBe("color: red;");
})

test("A bin parser should work", () => {
  expect(parse('x + y')[1].family).toBe("bin")
  expect(parse('+ x')[0].family).toBe("open")
  expect(parse(r`x + + 2`)[3].type).toBe("textord");
  expect(parse(r`( + 2`)[2].type).toBe("textord");
  expect(parse(r`= + 2`)[2].type).toBe("textord");
  expect(parse(r`\sin + 2`)[2].type).toBe("textord");
  expect(parse(r`, + 2`)[2].type).toBe("textord");
  expect(parse(r`\textcolor{blue}{x}+y`)[1].family).toBe("bin");
  expect(parse(r`\textcolor{blue}{x+}+y`)[2].type).toBe("mathord");
})

test("A phantom and smash parser should work", () => {
  expect(parse(r`\hphantom{a}`)[0].type).toBe("hphantom");
  expect(parse(r`a\hphantom{=}b`)[2].type).toBe("mathord");
  expect(parse(r`\smash{a}`)[0].type).toBe("smash");
  expect(parse(r`a\smash{+}b`)[2].type).toBe("mathord");
})

test("A markup generator should work", () => {
  // Just a few quick sanity checks here...
  markup = temml.renderToString(r`\sigma^2`);
  expect(markup.indexOf("<span")).toBe(-1);
  expect(markup).toContain("\u03c3");  // sigma
  expect(markup).toContain("<math");
})

test("An accent parser should work", () => {
  expect(r`\vec{x}`).toParse();
  expect(r`\vec{x^2}`).toParse();
  expect(r`\vec{x}^2`).toParse();
  expect(r`\vec x`).toParse();
  expect(parse(r`\vec x`)[0].type).toBe("accent");
  expect(parse(r`\vec x^2`)[0].type).toBe("supsub");
  expect(r`\widehat{x}`).toParse();
  expect(r`\widehat{xy}`).toParse();
  expect(r`\widehat{\mathbf{Y}}`).toParse();
  expect(r`\widecheck{x}`).toParse();
  expect(r`\overrightarrow{x}`).toParse();
})

test("An accent builder should work", () => {
  expect(r`\vec{x}`).toParse();
  expect(r`\vec{x}^2`).toParse();
  expect(r`\vec{x}_2`).toParse();
  expect(r`\vec{x}_2^2`).toParse();
  expect(r`\vec{x}`).toBuild();
  expect(r`\vec{x}^2`).toBuild();
  expect(r`\vec{x}_2`).toBuild();
  expect(r`\vec{x}_2^2`).toBuild();
  expect(r`\widehat{x}`).toBuild();
  expect(r`\widehat{xy}`).toBuild();
  expect(r`\widehat{\mathbf{Y}}`).toBuild();
  expect(build(r`\vec x`)[0].type).toBe("mover");
})

test("An extensible arrow builder should work", () => {
  expect(r`\xrightarrow{x}`).toParse()
  expect(r`\xrightarrow{x^2}`).toParse()
  expect(r`\xrightarrow{x}^2`).toParse()
  expect(r`\xrightarrow x`).toParse()
  expect(r`\xrightarrow[under]{over}`).toParse()
  expect(r`\xrightarrow{x}`).toBuild()
  expect(r`\xrightarrow{x^2}`).toBuild()
  expect(r`\xrightarrow{x}^2`).toBuild()
  expect(r`\xrightarrow x`).toBuild()
  expect(r`\xrightarrow[under]{over}`).toBuild()
})

test("An extensible arrow parser should be grouped more tightly than supsubs", () => {
  expect(parse(r`\xrightarrow x^2`)[0].type).toBe("supsub")
})

test("An extensible arrow builder should produce munderover", () => {
  expect(build(r`\xrightarrow [under]{over}`)[0].children[1].type).toBe("munderover")
})

test("A horizontal brace builder should work", () => {
  expect(r`\overbrace{x}`).toParse()
  expect(r`\overbrace{x^2}`).toParse()
  expect(r`\overbrace{x}^2`).toParse()
  expect(r`\overbrace x`).toParse()
  expect(r`\underbrace{x}_2`).toParse()
  expect(r`\underbrace{x}_2^2`).toParse()
  expect(r`\overbrace{x}`).toBuild()
  expect(r`\overbrace{x^2}`).toBuild()
  expect(r`\overbrace{x}^2`).toBuild()
  expect(r`\overbracket{x}^2`).toBuild()
  expect(r`\overbrace x`).toBuild()
  expect(r`\underbrace{x}_2`).toBuild()
  expect(r`\underbracket{x}_2`).toBuild()
  expect(r`\underbrace{x}_2^2`).toBuild()
})

test("A horizontal brace parser should be grouped more tightly than supsubs", () => {
  expect(parse(r`\overbrace x^2`)[0].type).toBe("supsub")
})

test("A horizontal brace builder should produce mover", () => {
  expect(build(r`\overbrace x`)[0].type).toBe("mover")
})

test("A boxed builder should work", () => {
  expect(r`\boxed{x}`).toParse()
  expect(r`\boxed{x^2}`).toParse()
  expect(r`\boxed{x}^2`).toParse()
  expect(r`\boxed x`).toParse()
  expect(r`\boxed{x}`).toBuild()
  expect(r`\boxed{x^2}`).toBuild()
  expect(r`\boxed{x}^2`).toBuild()
  expect(r`\boxed x`).toBuild()
})

test("A boxed parser should produce enclose", () => {
  expect(parse(r`\boxed{x^2}`)[0].type).toBe("enclose")
})

test("An fbox parser, unlike a boxed parser, should fail when given math", () => {
  expect(r`\fbox{\frac a b}`).not.toParse(strictSettings())
})

test("A colorbox parser should not fail, given a text argument", () => {
  expect(r`\colorbox{red}{a b}`).toParse()
  expect(r`\colorbox{red}{x}^2`).toParse()
  expect(r`\colorbox{red} x`).toParse()
})

test("A colorbox parser should fail, given math", () => {
  expect(r`\colorbox{red}{\frac a b}`).not.toParse(strictSettings())
})

test("A colorbox parser should parse a color", () => {
  expect(r`\colorbox{red}{a b}`).toParse()
  expect(r`\colorbox{Periwinkle}{a b}`).toParse()
  expect(r`\colorbox{#197}{a b}`).toParse()
  expect(r`\colorbox{#1a9b7c}{a b}`).toParse()
  expect(r`\colorbox{1a9b7c}{a b}`).toParse()
})

test("A colorbox parser should produce enclose", () => {
  expect(parse(r`\colorbox{red}{a b}`)[0].type).toBe("enclose")
})

test("An fcolorbox parser should not fail, given a text argument", () => {
  expect(r`\fcolorbox{red}{yellow}{a b}`).toParse()
})

test("A strike-through builder should work", () => {
  expect(r`\cancel{x}`).toParse()
  expect(r`\cancel{x^2}`).toParse()
  expect(r`\cancel{x}^2`).toParse()
  expect(r`\cancel x`).toParse()
  expect(r`\cancel{x}`).toBuild()
  expect(r`\cancel{x^2}`).toBuild()
  expect(r`\cancel{x}^2`).toBuild()
  expect(r`\cancel x`).toBuild()
})

test("A strike-through parser should produce enclose", () => {
  expect(parse(r`\cancel{a b}`)[0].type).toBe("enclose")
})

test("A strike-through parser should be grouped more tightly than supsubs", () => {
  expect(parse(r`\cancel x^2`)[0].type).toBe("supsub")
  expect(r`\cancelto{5}{4}`).toParse()
  expect(r`\cancelto{5}{4}`).toBuild()
  // Without a color, \cancelto should not write one.
  expect(temml.renderToString(r`\cancelto{5}{4}`)).not.toContain("undefined")
})

test("An actuarial angle parser should not fail in math mode", () => {
  expect(r`a_{\angl{n}}`).toParse()
})

test("An actuarial angle parser should fail in text mode", () => {
  expect(r`\text{a_{\angl{n}}}`).not.toParse()
})

test("An actuarial angle builder should work", () => {
  expect(r`a_{\angl{n}}`).toParse()
})

test("A phase parser should not fail in math mode", () => {
  expect(r`\phase{-78.2^\circ}`).toParse()
})

test("A phase parser should fail in text mode", () => {
  expect(r`\text{\phase{-78.2^\circ}}`).not.toParse()
})

test("A phase builder should work", () => {
  expect(r`\phase{-78.2^\circ}`).toParse()
})

test("A phantom builder should work", () => {
  expect(r`\phantom{x}`).toParse()
  expect(r`\phantom{x^2}`).toParse()
  expect(r`\phantom{x}^2`).toParse()
  expect(r`\phantom x`).toParse()
  expect(r`\hphantom{x}`).toParse()
  expect(r`\hphantom{x^2}`).toParse()
  expect(r`\hphantom{x}^2`).toParse()
  expect(r`\hphantom x`).toParse()
  expect(r`\phantom{x}`).toBuild()
  expect(r`\phantom{x^2}`).toBuild()
  expect(r`\phantom{x}^2`).toBuild()
  expect(r`\phantom x`).toBuild()
  expect(r`\hphantom{x}`).toBuild()
  expect(r`\hphantom{x^2}`).toBuild()
  expect(r`\hphantom{x}^2`).toBuild()
  expect(r`\hphantom x`).toBuild()
})

test("A phantom parser should produce phantom", () => {
  expect(parse(r`\phantom{x^2}`)[0].type).toBe("phantom")
})

test("A smash builder should work", () => {
  expect(r`\smash{x}`).toParse()
  expect(r`\smash{x^2}`).toParse()
  expect(r`\smash{x}^2`).toParse()
  expect(r`\smash x`).toParse()
  expect(r`\smash[b]{x}`).toParse()
  expect(r`\smash[b]{x^2}`).toParse()
  expect(r`\smash[b]{x}^2`).toParse()
  expect(r`\smash[b] x`).toParse()
  expect(r`\smash[]{x}`).toParse()
  expect(r`\smash[]{x^2}`).toParse()
  expect(r`\smash[]{x}^2`).toParse()
  expect(r`\smash[] x`).toParse()
  expect(r`\smash{x}`).toBuild()
  expect(r`\smash{x^2}`).toBuild()
  expect(r`\smash{x}^2`).toBuild()
  expect(r`\smash x`).toBuild()
  expect(r`\smash[b]{x}`).toBuild()
  expect(r`\smash[b]{x^2}`).toBuild()
  expect(r`\smash[b]{x}^2`).toBuild()
  expect(r`\smash[b] x`).toBuild()
  expect(r`\smash[]{x}`).toBuild()
  expect(r`\smash[]{x^2}`).toBuild()
  expect(r`\smash[]{x}^2`).toBuild()
  expect(r`\smash[] x`).toBuild()
})

test("A smash parser should produce smash", () => {
  expect(parse(r`\smash{x^2}`)[0].type).toBe("smash")
})

test("A parser error should report the position of an error", () => {
  expect(temml.renderToString(r`\sqrt`)).toContain("end")
})

test("An optional argument parser should not fail", () => {
  expect(r`\frac[1]{2}{3}`).toParse()
  expect(r`\rule[0.2em]{1em}{1em}`).toParse()
  expect(r`\sqrt[3]{2}`).toParse()
})

test("An optional argument parser should work when the optional argument is missing", () => {
  expect(r`\sqrt{2}`).toParse()
  expect(r`\rule{1em}{2em}`).toParse()
})

test("An optional argument parser should fail when the optional argument is mal-formed", () => {
  expect(r`\rule[1]{2em}{3em}`).not.toParse()
  expect(r`\sqrt[`).not.toParse()
})

test("An array environment should accept a single alignment character", () => {
  node = parse(r`\begin{array}r1\\20\end{array}`)[0]
  expect(node.type).toBe("array")
  expect(node.cols[0].align).toBe("r")
})

test("An array environment should accept vertical separators", () => {
  node = parse(r`\begin{array}{|l||c:r::}\end{array}`)[0]
  expect(node.type).toBe("array")
  expect(node.cols[0].separator).toBe("|")
  expect(node.cols[1].align).toBe("l")
  expect(node.cols[5].separator).toBe(":")
})

test("An sub-array environment should accept only a single alignment character", () => {
  node = parse(r`\begin{subarray}{c}a \\ b\end{subarray}`)[0]
  expect(node.type).toBe("array")
  expect(node.cols[0].align).toBe("c")
  expect(r`\begin{subarray}{cc}a \\ b\end{subarray}`).not.toParse()
})

test("A substack function should build", () => {
  expect(r`\sum_{\substack{ 0<i<m \\ 0<j<n }}  P(i,j)`).toParse()
  expect(r`\sum_{\substack{ 0<i<m \\ 0<j<n }}  P(i,j)`).toBuild()
})

test("A substack function should accept spaces in the argument", () => {
  expect(r`\sum_{\substack{ 0<i<m \\ 0<j<n }}  P(i,j)`).toParse()
  expect(r`\sum_{\substack{ 0<i<m \\ 0<j<n }}  P(i,j)`).toBuild()
})

test("A substack function should accept an empty argument", () => {
  expect(r`\sum_{\substack{}}  P(i,j)`).toParse()
  expect(r`\sum_{\substack{}}  P(i,j)`).toBuild()
})

test("A smallmatrix environment should build", () => {
  expect(r`\begin{smallmatrix} a & b \\ c & d \end{smallmatrix}`).toParse()
  expect(r`\begin{smallmatrix} a & b \\ c & d \end{smallmatrix}`).toBuild()
})

test("A cases environment should build", () => {
  expect(r`f(a,b)=\begin{cases}a+1&\text{if }b\text{ is odd}\\a&\text{if }b=0\\a-1&\text{otherwise}\end{cases}`).toParse()
  expect(r`f(a,b)=\begin{cases}a+1&\text{if }b\text{ is odd}\\a&\text{if }b=0\\a-1&\text{otherwise}\end{cases}`).toBuild()
})

test("An empty matrix environment should build", () => {
  expect(r`\begin{pmatrix}\end{pmatrix}`).toParse()
  expect(r`\begin{pmatrix}\end{pmatrix}`).toBuild()
})

test("An environment should fill out a short row with empty cells, with correct CSS classes.", () => {
  expect(r`\begin{cases}0{,}8-0{,}32x & \text{ für } & 0\leq x\leq2{,}5\\0 & \text { sonst} \end{cases}`).toParse()
  expect(r`\begin{cases}0{,}8-0{,}32x & \text{ für } & 0\leq x\leq2{,}5\\0 & \text { sonst} \end{cases}`).toBuild()
})

test("An rcases environment should build", () => {
  expect(r`\begin{rcases} a &\text{if } b \\ c &\text{if } d \end{rcases}⇒…`).toParse()
  expect(r`\begin{rcases} a &\text{if } b \\ c &\text{if } d \end{rcases}⇒…`).toBuild()
})

test("An aligned environment should build", () => {
  expect(r`\begin{aligned}a&=b&c&=d\\e&=f\end{aligned}`).toParse()
  expect(r`\begin{aligned}a&=b&c&=d\\e&=f\end{aligned}`).toBuild()
})

test("An aligned environment should allow cells in brackets", () => {
  expect(r`\begin{aligned}[a]&[b]\\ [c]&[d]\end{aligned}`).toParse()
  expect(r`\begin{aligned}[a]&[b]\\ [c]&[d]\end{aligned}`).toBuild()
})

test("An aligned environment should forbid cells in brackets without space", () => {
  expect(r`\begin{aligned}[a]&[b]\\[c]&[d]\end{aligned}`).not.toParse()
})

test("An aligned environment should not eat the last row when its first cell is empty", () => {
  expect(parse(r`\begin{aligned}&E_1 & (1)\\&E_2 & (2)\\&E_3 & (3)\end{aligned}`)[0].body).toHaveLength(3)
})

test("AMS environments should fail outside of display mode", () => {
  expect(r`\begin{gather}a+b\\c+d\end{gather}`).not.toParse()
  expect(r`\begin{gather*}a+b\\c+d\end{gather*}`).not.toParse()
  expect(r`\begin{align}a&=b+c\\d+e&=f\end{align}`).not.toParse()
  expect(r`\begin{align*}a&=b+c\\d+e&=f\end{align*}`).not.toParse()
  expect(r`\begin{alignat}{2}10&x+ &3&y = 2\\3&x+&13&y = 4\end{alignat}`).not.toParse()
  expect(r`\begin{alignat*}{2}10&x+ &3&y = 2\\3&x+&13&y = 4\end{alignat*}`).not.toParse()
  expect(r`\begin{equation}a=b+c\end{equation}`).not.toParse()
  expect(r`\begin{split}a &=b+c\\&=e+f\end{split}`).not.toParse()
})

test("AMS environments should work in display mode", () => {
  expect(r`\begin{gather}a+b\\c+d\end{gather}`).toParse(displayMode())
  expect(r`\begin{gather*}a+b\\c+d\end{gather*}`).toParse(displayMode())
  expect(r`\begin{align}a&=b+c\\d+e&=f\end{align}`).toParse(displayMode())
  expect(r`\begin{align*}a&=b+c\\d+e&=f\end{align*}`).toParse(displayMode())
  expect(r`\begin{alignat}{2}10&x+ &3&y = 2\\3&x+&13&y = 4\end{alignat}`).toParse(displayMode())
  expect(r`\begin{alignat*}{2}10&x+ &3&y = 2\\3&x+&13&y = 4\end{alignat*}`).toParse(displayMode())
  expect(r`\begin{equation}a=b+c\end{equation}`).toParse(displayMode())
  expect(r`\begin{split}a &=b+c\\&=e+f\end{split}`).toParse(displayMode())
  expect(r`\begin{gather}a+b\\c+d\end{gather}`).toBuild(displayMode())
  expect(r`\begin{gather*}a+b\\c+d\end{gather*}`).toBuild(displayMode())
  expect(r`\begin{align}a&=b+c\\d+e&=f\end{align}`).toBuild(displayMode())
  expect(r`\begin{align*}a&=b+c\\d+e&=f\end{align*}`).toBuild(displayMode())
  expect(r`\begin{alignat}{2}10&x+ &3&y = 2\\3&x+&13&y = 4\end{alignat}`).toBuild(displayMode())
  expect(r`\begin{alignat*}{2}10&x+ &3&y = 2\\3&x+&13&y = 4\end{alignat*}`).toBuild(displayMode())
  expect(r`\begin{equation}a=b+c\end{equation}`).toBuild(displayMode())
  expect(r`\begin{split}a &=b+c\\&=e+f\end{split}`).toBuild(displayMode())
})

test("AMS environment should fail if there are two tags in one row", () => {
  expect(r`\begin{align}\tag{1}x+y\tag{2}\end{align}`).not.toParse(displayMode())
})

test("{equation} should fail if argument contains two columns.", () => {
  expect(r`\\begin{equation}a &=b+c\end{equation}`).not.toParse(displayMode())
})

test("{split} should fail if argument contains three columns.", () => {
  expect(r`\begin{equation}\begin{split}a &=b &+c\\&=e &+f\end{split}\end{equation}`).not.toParse(displayMode())
})

test("{array} should fail if body contains more columns than specification.", () => {
  expect(r`\begin{array}{2}a & b & c\\d & e  f\end{array}`).not.toParse(displayMode())
})

test("operatorname should work", () => {
  expect(r`\operatorname{x*Π∑\Pi\sum\frac a b}`).toParse()
  expect(r`\operatorname*{x*Π∑\Pi\sum\frac a b}`).toParse()
  expect(r`\operatorname*{x*Π∑\Pi\sum\frac a b}_2`).toParse()
  expect(r`\operatorname*{x*Π∑\Pi\sum\frac a b}\limits_2`).toParse()
  expect(r`\operatorname{x*Π∑\Pi\sum\frac a b}`).toBuild()
  expect(r`\operatorname*{x*Π∑\Pi\sum\frac a b}`).toBuild()
  expect(r`\operatorname*{x*Π∑\Pi\sum\frac a b}_2`).toBuild()
  expect(r`\operatorname*{x*Π∑\Pi\sum\frac a b}\limits_2`).toBuild()
})

test("operatorname should consolidate contents when possible", () => {
  expect(temml.renderToString(r`\operatorname{Max}`)).toContain("<mi>Max</mi>")
})

test("The symbol table integrity should treat certain symbols as synonyms", () => {
  expect(`<`).toBuildLike(r`\lt`)
  expect(`>`).toBuildLike(r`\gt`)
  expect(r`\left<\frac{1}{x}\right>`).toBuildLike(r`\left\lt\frac{1}{x}\right\gt`)
})

test("Symbols should support AMS symbols in both text and math mode", () => {
  expect(r`\yen\checkmark\circledR\maltese`).toBuild(strictSettings())
  expect(r`\text{\yen\checkmark\circledR\maltese}`).toBuild(strictSettings())
  expect(r`\yen\checkmark\circledR\maltese`).toParse(strictSettings())
  expect(r`\text{\yen\checkmark\circledR\maltese}`).toParse(strictSettings())
})

test("Symbol lookup should ignore Object.prototype properties", () => {
  const pollutedKey = "\\temmlProtoPollutionTest"
  Object.prototype[pollutedKey] = { group: "rel", replace: "=" }
  try {
    expect(pollutedKey).not.toParse()
    expect(r`\text{\temmlProtoPollutionTest}`).not.toParse()
    // A polluted Object.prototype must not shadow real symbol lookups either.
    expect(r`\alpha`).toParse()
    expect(r`\text{\yen}`).toParse()
  } finally {
    delete Object.prototype[pollutedKey]
  }
})

test("\\newcommand/\\renewcommand should not mistake a polluted " + "Object.prototype key for an existing symbol", () => {
  const pollutedCommand = "\\temmlProtoPollutionRenew"
  Object.prototype[pollutedCommand] = { group: "rel", replace: "=" }
  try {
    // isDefined() must report this as undefined, so \newcommand may define it...
    expect(r`\newcommand{\temmlProtoPollutionRenew}{x}\temmlProtoPollutionRenew`).toParse()
    // ...and \renewcommand, which requires a pre-existing definition, must fail.
    expect(r`\renewcommand{\temmlProtoPollutionRenew}{x}`).not.toParse()
  } finally {
    delete Object.prototype[pollutedCommand]
  }
})

test("__defineSymbol should accept dangerous-looking keys without " + "polluting Object.prototype", () => {
  // symbols.math/symbols.text are created via Object.create(null), so writing
  // an entry under a key like "__proto__" or "constructor" is just an ordinary
  // own property on that lookup table. It cannot reach Object.prototype.
  temml.__defineSymbol("math", "rel", "≡", "__proto__", true)
  temml.__defineSymbol("math", "rel", null, "constructor")
  temml.__defineSymbol("text", "textord", null, "prototype")
  expect(Object.getPrototypeOf({})).toBe(Object.prototype)
  expect(({}).group).toBe(undefined)
  expect(Object.prototype.hasOwnProperty.call(Object.prototype, "group")).toBe(false)
})

test("Settings should strip prototype-polluting keys from user-supplied macros", () => {
  const evilMacros = JSON.parse(
    '{"__proto__": {"temmlProtoPollutionTest2": "yes"}, "constructor": "boo", "\\\\safe": "42"}'
  )
  expect(temml.renderToString(r`\safe`, { macros: evilMacros })).toContain("42")
  expect({}.temmlProtoPollutionTest2).toBe(undefined)
  expect(Object.prototype.hasOwnProperty.call(evilMacros, "__proto__")).toBe(false)
  expect(Object.prototype.hasOwnProperty.call(evilMacros, "constructor")).toBe(false)
  expect(Object.getPrototypeOf(evilMacros)).toBe(null)
})

test("Settings should not inherit settings from a polluted Object.prototype", () => {
  // Pass a bare {} (not the local test-helper Settings mock) so this exercises
  // Temml's real Settings constructor directly.
  Object.prototype.trust = true
  Object.prototype.strict = true
  Object.prototype.maxExpand = 1
  try {
    // `trust` defaults to false. A polluted Object.prototype.trust must not
    // leak in and trust an \class command that was never explicitly trusted.
    expect(r`\class{foo}{x}`).not.toParse({})
    // `strict` defaults to false, so \class should otherwise be allowed.
    expect(r`\class{foo}{x}`).toParse({ trust: true })
    // `maxExpand` defaults to 1000. A polluted Object.prototype.maxExpand
    // must not leak in and cut macro expansion short.
    expect(r`\def\foo{bar}\foo\foo\foo`).toParse({})
  } finally {
    delete Object.prototype.trust
    delete Object.prototype.strict
    delete Object.prototype.maxExpand
  }
})

test("A macro expander should produce individual tokens", () => {
  expect(r`e^\foo`).toParseLike("e^a 23", settings({macros: {"\\foo": "a23"}}))
  expect(r`e^\foo`).toParseLike("e^1 23", settings({strict: true, macros: {"\\foo": "123"}}))
})

test("A macro expander should preserve leading spaces inside macro definition", () => {
  expect(r`\text{\foo}`).toParseLike(r`\text{ x}`, settings({macros: {"\\foo": " x"}}))
})

test("A macro expander should preserve leading spaces inside macro argument", () => {
  expect(r`\text{\foo{ x}}`).toParseLike(r`\text{ x}`, settings({macros: {"\\foo": "#1"}}))
})

test("A macro expander should ignore expanded spaces in math mode", () => {
  expect(r`\foo`).toParseLike("x", settings({macros: {"\\foo": " x"}}))
})

test("A macro expander should consume spaces after control-word macro", () => {
  expect(r`\text{\foo }`).toParseLike(r`\text{x}`, settings({macros: {"\\foo": "x"}}))
})

test("A macro expander should consume spaces after macro with \\relax", () => {
  expect(r`\text{\foo }`).toParseLike(r`\text{}`, settings({macros: {"\\foo": "\\relax"}}))
})

test("A macro expander not should consume spaces after control-word expansion", () => {
  expect(r`\text{\\ }`).toParseLike(r`\text{ }`, settings({macros: {"\\\\": "\\relax"}}))
})

test("A macro expander should consume spaces after \\relax", () => {
  expect(r`\text{\relax }`).toParseLike(r`\text{}`)
})

test("A macro expander should consume spaces after control-word function", () => {
  expect(r`\text{\yen }`).toParseLike(r`\text{\yen}`)
})

test("A macro expander should preserve spaces after control-symbol macro", () => {
  expect(r`\text{\% y}`).toParseLike(r`\text{x y}`, settings({macros: {"\\%": "x"}}))
})

test("A macro expander should preserve spaces after control-symbol function", () => {
  expect(r`\text{\' }`).toParse()
})

test("A macro expander should consume spaces between arguments", () => {
  expect(r`\text{\foo a 2}`).toParseLike(r`\text{a2end}`, settings({macros: {"\\foo": "#1#2end"}}))
  expect(r`\text{\foo {a} {2}}`).toParseLike(r`\text{a2end}`, settings({macros: {"\\foo": "#1#2end"}}))
})

test("A macro expander should allow for multiple expansion", () => {
  expect(r`1\foo2`).toParseLike("1aa2", settings({macros: {
    "\\foo": "\\bar\\bar",
    "\\bar": "a",
  }}))
})

test("A macro expander should allow for multiple expansion with argument", () => {
  expect(r`1\foo2`).toParseLike("1 2 2 2 2", settings({macros: {
    "\\foo": "\\bar{#1}\\bar{#1}",
    "\\bar": "#1#1",
  }}))
})

test("A macro expander should allow for macro argument", () => {
  expect(r`\foo\bar`).toParseLike("(xyz)", settings({macros: {
    "\\foo": "(#1)",
    "\\bar": "xyz",
  }}))
})

test("A macro expander should allow properly nested group for macro argument", () => {
  expect(r`\foo{e^{x_{12}+3}}`).toParseLike("(e^{x_{12}+3})", settings({macros: {"\\foo": "(#1)"}}))
})

test("A macros argument can simulate \\def with arguments", () => {
  expect(r`\t x`).toParseLike("\\text{x}", settings({macros: {"\\t": {
    tokens: [
        {text: "}"}, {text: "1"}, {text: "#"}, {text: "{"},
        {text: "\\text"},
    ],
    numArgs: 1,
  }}}))
})

test("A macro expander should delay expansion if preceded by \\expandafter", () => {
  expect(r`\expandafter\foo\bar`).toParseLike("x+y", settings({macros: {
    "\\foo": "#1+#2",
    "\\bar": "xy",
  }}))
  // \def is not expandable, i.e., \expandafter doesn't define the macro
  expect(r`\def\foo{x}\def\bar{\def\foo{y}}\expandafter\bar\foo`).toParseLike(`x`)
})

test("\\emph should toggle italics", () => {
  expect(r`\emph{foo \emph{bar}}`).toBuildLike(r`\textit{foo \textup{bar}}`)
  expect(r`\text{\emph{foo \emph{bar}}}`).toBuildLike(r`\text{\textit{foo \textup{bar}}}`)
  expect(r`\textup{\emph{foo \emph{bar}}}`).toBuildLike(r`\textup{\textit{foo \textup{bar}}}`)
  expect(r`\textit{\emph{foo \emph{bar}}}`).toBuildLike(r`\textit{\textup{foo \textit{bar}}}`)
})

test("A macro expander should not expand if preceded by \\noexpand", () => {
  // \foo is not expanded and interpreted as if its meaning were \relax
  expect(r`\noexpand\foo y`).toParseLike(r`y`, settings({macros: {"\\foo": "x"}}))
  expect(r`\expandafter\foo\noexpand\foo`).toParseLike("x", settings({macros: {"\\foo": "x"}}))
  expect(r`\noexpand\frac xy`).toParseLike(`xy`)
  expect(r`\noexpand\def\foo{xy}\foo`).toParseLike(`xy`)
})

test("A macro expander should allow for space macro argument (text version)", () => {
  expect(r`\text{\foo\bar}`).toParseLike(r`\text{( )}`, settings({macros: {
    "\\foo": "(#1)",
    "\\bar": " ",
  }}))
})

test("A macro expander should allow for space macro argument (math version)", () => {
  expect(r`\foo\bar`).toParseLike("()", settings({macros: {
    "\\foo": "(#1)",
    "\\bar": " ",
  }}))
})

test("A macro expander should allow for second argument (text version)", () => {
  expect(r`\text{\foo\bar\bar}`).toParseLike(r`\text{( , )}`, settings({macros: {
    "\\foo": "(#1,#2)",
    "\\bar": " ",
  }}))
})

test("A macro expander should allow for second argument (math version)", () => {
  expect(r`\foo\bar\bar`).toParseLike("(,)", settings({macros: {
    "\\foo": "(#1,#2)",
    "\\bar": " ",
  }}))
})

test("A macro expander should allow for empty macro argument", () => {
  expect(r`\foo\bar`).toParseLike("()", settings({macros: {
    "\\foo": "(#1)",
    "\\bar": "",
  }}))
})

test("A Macro expander should treat \\relax as empty argument", () => {
  expect(r`\text{\foo\relax x}`).toParseLike(r`\text{(,x)}`, settings({macros: { "\\foo": "(#1,#2)" }}))
})

test("A macro expander should allow for space function arguments", () => {
  expect(r`\frac\bar\bar`).toParseLike(r`\frac{}{}`, settings({macros: { "\\bar": " " }}))
})

test("A macro expander should allow aliasing characters", () => {
  expect(r`x’=c`).toParseLike("x'=c", settings({macros: { "’": "'" }}))
})

test("In a macro expander, \\@firstoftwo should consume both, and avoid errors", () => {
  expect(r`\@firstoftwo{yes}{no}`).toParseLike("yes")
  expect(r`\@firstoftwo{yes}{1'_2^3}`).toParseLike("yes")
})

test("In a macro expander, \\@ifstar should consume star but nothing else", () => {
  expect(r`\@ifstar{yes}{no}*!`).toParseLike("yes!")
  expect(r`\@ifstar{yes}{no}?!`).toParseLike("no?!")
})

test("In a macro expander, \\@ifnextchar should not consume nonspaces", () => {
  expect(r`\@ifnextchar!{yes}{no}!!`).toParseLike("yes!!")
  expect(r`\@ifnextchar!{yes}{no}?!`).toParseLike("no?!")
})

test("In a macro expander, \\@ifnextchar should consume spaces", () => {
  expect(r`\def\x#1{\@ifnextchar x{yes}{no}}\x{}x\x{} x`).toParseLike("yesxyesx")
})

test("In a macro expander, \\@ifstar should consume star but nothing else", () => {
  expect(r`\@ifstar{yes}{no}*!`).toParseLike("yes!")
  expect(r`\@ifstar{yes}{no}?!`).toParseLike("no?!")
})

test("In a macro expander, \\def defines macros", () => {
  expect(r`\def\foo{x^2}\foo+\foo`).toParseLike(`x^2+x^2`)
  expect(r`\def\foo{hi}\foo+\text\foo`).toParseLike(r`hi+\text{hi}`)
  expect(r`\def\foo#1{hi #1}\text{\foo{Alice}, \foo{Bob}}`).toParseLike(r`\text{hi Alice, hi Bob}`)
  expect(r`\def\foo#1#2{(#1,#2)}\foo 1 2+\foo 3 4`).toParseLike(r`(1, 2)+(3, 4)`)
  expect(r`\def\foo#a{}`).not.toParse()
  expect(r`\def\foo#1#2#3#4#5#6#7#8#9{}`).toParse()
  expect(r`\def\foo#2{}`).not.toParse()
  expect(r`\def\foo#1#2#3#4#5#6#7#8#9#10{}`).not.toParse()
  expect(r`\def\foo1`).not.toParse()
  expect(r`\def{\foo}{}`).not.toParse()
  expect(r`\def\foo\bar`).not.toParse()
  expect(r`\def{\foo\bar}{}`).not.toParse()
  expect(r`\def{}{}`).not.toParse()
})

test("In a macro expander, \\gdef defines macros", () => {
  expect(r`\gdef\foo{x^2}\foo+\foo`).toParseLike(`x^2+x^2`)
  expect(r`\gdef\foo{hi}\foo+\text\foo`).toParseLike(r`hi+\text{hi}`)
  expect(r`\gdef\foo#1{hi #1}\text{\foo{Alice}, \foo{Bob}}`).toParseLike(r`\text{hi Alice, hi Bob}`)
  expect(r`\gdef\foo#1#2{(#1,#2)}\foo 1 2+\foo 3 4`).toParseLike(r`(1, 2)+(3, 4)`)
  expect(r`\gdef\foo#a{}`).not.toParse()
  expect(r`\gdef\foo#1#2#3#4#5#6#7#8#9{}`).toParse()
  expect(r`\gdef\foo#2{}`).not.toParse()
  expect(r`\gdef\foo#1#2#3#4#5#6#7#8#9#10{}`).not.toParse()
  expect(r`\gdef\foo1`).not.toParse()
  expect(r`\gdef{\foo}{}`).not.toParse()
  expect(r`\gdef\foo\bar`).not.toParse()
  expect(r`\gdef{\foo\bar}{}`).not.toParse()
  expect(r`\gdef{}{}`).not.toParse()
})

test("In a macro expander, \\def defines macros with delimited parameter", () => {
  expect(r`\def\foo|#1||{#1}\text{\foo| x y ||}`).toParseLike(r`\text{ x y }`)
  expect(r`\def\foo#1|#2{#1+#2}\foo a 2 |34`).toParseLike(r`a2+34`)
  expect(r`\def\foo#1#{#1}\foo1^{23}`).toParseLike(r`1^{23}`)
  expect(r`\def\foo|{}\foo`).not.toParse()
  expect(r`\def\foo#1|{#1}\foo1`).not.toParse()
  expect(r`\def\foo#1|{#1}\foo1}|`).not.toParse()
})

test("In a macro expander, \\gdef defines macros with delimited parameter", () => {
  expect(r`\gdef\foo|#1||{#1}\text{\foo| x y ||}`).toParseLike(r`\text{ x y }`)
  expect(r`\gdef\foo#1|#2{#1+#2}\foo a 2 |34`).toParseLike(r`a2+34`)
  expect(r`\gdef\foo#1#{#1}\foo1^{23}`).toParseLike(r`1^{23}`)
  expect(r`\gdef\foo|{}\foo`).not.toParse()
  expect(r`\gdef\foo#1|{#1}\foo1`).not.toParse()
  expect(r`\gdef\foo#1|{#1}\foo1}|`).not.toParse()
})

test("In a macro expander, \\edef should expand definition", () => {
  expect(r`\def\foo{a}\edef\bar{\foo}\def\foo{}\bar`).toParseLike(`a`)
  // \def\noexpand\foo{} expands into \def\foo{}
  expect(r`\def\foo{a}\edef\bar{\def\noexpand\foo{}}\foo\bar\foo`).toParseLike(r`a`)
  // \foo\noexpand\foo expands into a\foo
  expect(r`\def\foo{a}\edef\bar{\foo\noexpand\foo}\def\foo{b}\bar`).toParseLike(r`ab`)
  // \foo is not defined
  expect(r`\edef\bar{\foo}`).not.toParse(strictSettings())
})

test("\\def should be handled in Parser", () => {
  expect(r`\gdef\foo{1}`).toParse(settings({maxExpand: 0}))
  expect(r`2^\def\foo{1}2`).not.toParse()
})

test("\\def works locally", () => {
  expect("\\def\\x{1}\\x{\\def\\x{2}\\x{\\def\\x{3}\\x}\\x}\\x").toParseLike(`1{2{3}2}1`)
})

test("\\newcommand and \\renewcommand work locally", () => {
  expect("\\newcommand\\x{1}\\x{\\renewcommand\\x{2}\\x{\\renewcommand\\x{3}\\x}\\x}\\x").toParseLike(`1{2{3}2}1`)
})

test("\\gdef overrides at all levels", () => {
  expect("\\def\\x{1}\\x{\\def\\x{2}\\x{\\gdef\\x{3}\\x}\\x}\\x").toParseLike(`1{2{3}3}3`)
  expect("\\def\\x{1}\\x{\\def\\x{2}\\x{\\global\\def\\x{3}\\x}\\x}\\x").toParseLike(`1{2{3}3}3`)
})

test("\\global needs to followed by macro prefixes, \\def or \\edef", () => {
  expect(r`\global\def\foo{}\foo`).toParseLike("")
  expect(r`\global\edef\foo{}\foo`).toParseLike("")
  expect(r`\def\DEF{\def}\global\DEF\foo{}\foo`).toParseLike("")
  expect(r`\global\global\def\foo{}\foo`).toParseLike("")
  expect(r`\global\long\def\foo{}\foo`).toParseLike("")
  expect(r`\global\foo`).not.toParse()
  expect(r`\global\bar x`).not.toParse()
})

test("\\gdef changes settings.macros", () => {
  macros = {};
  expect(r`\gdef\foo{1}`).toParse(settings({macros}))
  expect(macros["\\foo"]).toBeTruthy()
})

test("\\def doesn't change settings.macros", () => {
  macros = {}
  expect(r`\def\foo{1}`).toParse(settings({macros}))
  expect(macros["\\foo"]).toBeFalsy()
})

test("\\newcommand doesn't change settings.macros", () => {
  macros = {}
  expect(r`\newcommand\foo{1}`).toParse(settings({macros}))
  expect(macros["\\foo"]).toBeFalsy()
})

test("In a macro expander, \\long needs to be followed by macro prefixes, \\def or \\edef", () => {
  expect(r`\long\def\foo{}\foo`).toParseLike("")
  expect(r`\long\edef\foo{}\foo`).toParseLike("")
  expect(r`\long\foo`).not.toParse()
})

test("In a macro expander, \\let copies the definition", () => {
  expect(r`\let\foo=\frac\def\frac{}\foo1a`).toParseLike(r`\frac1a`)
  expect(r`\def\foo{1}\let\bar\foo\def\foo{2}\bar`).toParseLike(r`1`)
  expect(r`\let\foo=\kern\edef\bar{\foo1em}\let\kern=\relax\bar`).toParseLike(r`\kern1em`)
  // \foo = { (left brace)
  expect(r`\let\foo{\sqrt\foo1}`).toParseLike(r`\sqrt{1}`)
  // \equals = = (equal sign)
  expect(r`\let\equals==a\equals b`).toParseLike(r`a=b`)
  // \foo should not be expandable and not affected by \noexpand or \edef
  expect(r`\let\foo=x\noexpand\foo`).toParseLike(r`x`)
  expect(r`\let\foo=x\edef\bar{\foo}\def\foo{y}\bar`).toParseLike(r`y`)
})

test("In a macro expander, \\let should consume one optional space after equals sign", () => {
  // https://tex.stackexchange.com/questions/141166/let-foo-bar-vs-let-foo-bar-let-with-equals-sign
  expect(r`\def\:{\let\space= }\: \text{\space}`).toParseLike(r`\text{ }`)
})

test("In a macro expander, \\futurelet should parse correctly", () => {
  expect(r`\futurelet\foo\frac1{2+\foo}`).toParseLike(r`\frac1{2+1}`)
})

test("In a macro expander, \\newcommand defines new macros", () => {
  expect(r`\newcommand\foo{x^2}\foo+\foo`).toParseLike(`x^2+x^2`, strictSettings())
  expect(r`\newcommand{\foo}{x^2}\foo+\foo`).toParseLike(`x^2+x^2`, strictSettings())
  // Function detection
  expect(r`\newcommand\bar{x^2}\bar+\bar`).not.toParse()
  expect(r`\newcommand{\bar}{x^2}\bar+\bar`).not.toParse()
  // Symbol detection
  expect(r`\newcommand\lambda{x^2}\lambda`).not.toParse()
  expect(r`\newcommand\textdollar{x^2}\textdollar`).not.toParse()
  // Macro detection
  expect(r`\newcommand{\foo}{1}\foo\newcommand{\foo}{2}\foo`).not.toParse()
  // Implicit detection
  expect(r`\newcommand\limits{}`).not.toParse()
})

test("In a macro expander, \\renewcommand redefines macro", () => {
  expect(r`\renewcommand\foo{x^2}\foo+\foo`).not.toParse(strictSettings())
  expect(r`\renewcommand{\foo}{x^2}\foo+\foo`).not.toParse(strictSettings())
  expect(r`\renewcommand\bar{x^2}\bar+\bar`).toParseLike(r`x^2+x^2`, strictSettings())
  expect(r`\renewcommand{\bar}{x^2}\bar+\bar`).toParseLike(r`x^2+x^2`, strictSettings())
  expect(r`\newcommand{\foo}{1}\foo\renewcommand{\foo}{a}\foo`).toParseLike(r`1a`, strictSettings())
})

test("In a macro expander, \\providecommand defines macros but does not redefine them", () => {
  expect(r`\providecommand\foo{x^2}\foo+\foo`).toParseLike(r`x^2+x^2`, strictSettings())
  expect(r`\providecommand{\foo}{x^2}\foo+\foo`).toParseLike(r`x^2+x^2`, strictSettings())
  expect(r`\providecommand\bar{x^2}\bar+\bar`).toParseLike(r`x^2+x^2`, strictSettings())
  expect(r`\providecommand{\bar}{x^2}\bar+\bar`).toParseLike(r`x^2+x^2`, strictSettings())
  expect(r`\newcommand{\foo}{1}\foo\providecommand{\foo}{b}\foo`).toParseLike(r`11`, strictSettings())
  expect(r`\providecommand{\foo}{1}\foo\renewcommand{\foo}{b}\foo`).toParseLike(r`1b`, strictSettings())
  expect(r`\providecommand{\foo}{1}\foo\providecommand{\foo}{b}\foo`).toParseLike(r`11`, strictSettings())
})

test("In a macro expander, \\newcommand accepts number of arguments", () => {
  expect(r`\newcommand\foo[1]{#1^2}\foo x+\foo{y}`).toParseLike(r`x^2+y^2`, strictSettings())
  expect(r`\newcommand\foo[9]{#1^2}\foo abcdefghi`).toParseLike(r`a^2`, strictSettings())
  expect(r`\newcommand\foo[x]{}`).not.toParse(strictSettings())
  expect(r`\newcommand\foo[1.5]{}`).not.toParse(strictSettings())

  // This may change in the future, if we support the extra features of  \hspace.
})

test("A macro expander should treat \\hspace, \\hskip like \\kern", () => {
  expect(r`\hspace{1em}`).toParseLike(r`\kern1em`)
  expect(r`\hskip{1em}`).toParseLike(r`\kern1em`)
})

test("A macro expander should expand \\limsup and \\liminf as expected", () => {
  expect(r`\limsup`).toParseLike(r`\operatorname*{lim\,sup}`)
  expect(r`\liminf`).toParseLike(r`\operatorname*{lim\,inf}`)
})

test("A macro expander should expand AMS log-like symbols as expected", () => {
  expect(r`\injlim`).toParseLike(r`\operatorname*{inj\,lim}`)
  expect(r`\projlim`).toParseLike(r`\operatorname*{proj\,lim}`)
  expect(r`\varlimsup`).toParseLike(r`\operatorname*{\overline{\text{lim}}}`)
  expect(r`\varliminf`).toParseLike(r`\operatorname*{\underline{\text{lim}}}`)
  expect(r`\varinjlim`).toParseLike(r`\operatorname*{\underrightarrow{\text{lim}}}`)
  expect(r`\varinjlim`).toParseLike(r`\operatorname*{\underrightarrow{\text{lim}}}`)
  expect(r`\varprojlim`).toParseLike(r`\operatorname*{\underleftarrow{\text{lim}}}`)
})

test("A macro expander should expand \\plim and \\argmin and \\argmax as expected", () => {
  expect(r`\plim`).toParseLike(r`\operatorname*{plim}`)
  expect(r`\argmin`).toParseLike(r`\operatorname*{arg\,min}`)
  expect(r`\argmax`).toParseLike(r`\operatorname*{arg\,max}`)
})

test("A macro expander should expand \\bra and \ket as expected", () => {
  expect(r`\Braket{ ϕ | \frac{∂^2}{∂ t^2} | ψ }`).toParse()
  expect(r`\bra{\phi}`).toParseLike(r`\mathinner{\langle{\phi}|}`)
  expect(r`\ket{\psi}`).toParseLike(r`\mathinner{|{\psi}\rangle}`)
  expect(r`\braket{\phi|\psi}`).toParseLike(r`\mathinner{\langle{\phi|\psi}\rangle}`)
  expect(r`\Bra{\phi}`).toParseLike(r`\left\langle\phi\right|`)
  expect(r`\Ket{\psi}`).toParseLike(r`\left|\psi\right\rangle`)
  expect(temml.renderToString(r`\Braket{ ϕ | \frac{∂^2}{∂ t^2} | ψ }`)).toContain('<mo stretchy="true" form="infix" lspace="0.05em" rspace="0.05em">|</mo>')
  expect(temml.renderToString(r`\Set{\color{red}222|11111}`)).toContain('<mn style="color:#ff0000;">222</mn></mrow><mspace width="0.1667em"></mspace><mo stretchy="true" form="infix" lspace="0.05em" rspace="0.05em">|</mo>')
  expect(temml.renderToString(r`\Set{a\over b}`)).toContain('<mfrac><mi>a</mi><mi>b</mi></mfrac>')
  expect(temml.renderToString(r`\Set{a\over b | c}`)).toContain('<mfrac><mi>a</mi><mi>b</mi></mfrac>')
  expect(temml.renderToString(r`\Set{a\over b || c}`)).toContain('‖')
})

test("Macro arguments do not generate groups", () => {
  expect("\\def\\x{a}\\x\\def\\foo#1{#1}\\foo{\\x\\def\\x{b}\\x}\\x").toParseLike(`aabb`)
})

test("\\gdef or \\xdef should produce an error", () => {
  expect(temml.renderToString("\gdef\foo{Nope}")).toContain("#b22222") // color of error message
  expect(temml.renderToString("\xdef\foo{Nope}")).toContain("#b22222")
})

test("A preamble should capture viable macros and definecolor.", () => {
  macros = temml.definePreamble(r`\definecolor{sortaGreen}{RGB}{128,128,0}`)
  expect(r`\color{sortaGreen} F=ma`).toParse(settings({macros}))
  macros = temml.definePreamble(r`\def\foo{x^2}`)
  markup = temml.renderToString(r`\foo + \foo`, settings({macros}))
  expect(markup).toContain(`<math>`)
  macros = temml.definePreamble(r`\newcommand\d[0]{\operatorname{d}\!}`)
  markup = temml.renderToString(r`\d x`, settings({macros}))
  expect(markup).toContain(`<math>`)
})

test("\\textbf arguments do generate groups", () => {
  expect("\\def\\x{a}\\x\\textbf{\\x\\def\\x{b}\\x}\\x").toParseLike(r`a\textbf{ab}a`)
})

test("\\sqrt optional arguments generate groups", () => {
  expect("\\def\\x{a}\\def\\y{a}\\x\\y" + "\\sqrt[\\def\\x{b}\\x]{\\def\\y{b}\\y}\\x\\y").toParseLike(r`aa\sqrt[b]{b}aa`)
})

test("Array cells generate groups", () => {
  expect(r`\def\x{a}\begin{matrix}\x&\def\x{b}\x&\x\end{matrix}\x`).toParseLike(r`\begin{matrix}a&b&a\end{matrix}a`)
  expect(r`\def\x{1}\begin{matrix}\def\x{2}\x&\x\end{matrix}\x`).toParseLike(r`\begin{matrix}2&1\end{matrix}1`)
})

test("\\char produces literal characters", () => {
  expect("\\char`a").toParseLike("\\char`\\a");
  expect("\\char`\\%").toParseLike("\\char37");
  expect("\\char`\\%").toParseLike("\\char'45");
  expect("\\char`\\%").toParseLike('\\char"25');
  expect("\\char").not.toParse();
  expect("\\char`").not.toParse();
  expect("\\char'").not.toParse();
  expect('\\char"').not.toParse();
  expect("\\char'a").not.toParse();
  expect('\\char"g').not.toParse();
  expect('\\char"g').not.toParse();
})

test("Unicode private area characters should build", () => {
  expect(r`\gvertneqq\lvertneqq\ngeqq\ngeqslant\nleqq`).toParse()
  expect(r`\nleqslant\nshortmid\nshortparallel\varsubsetneq`).toParse()
  expect(r`\varsubsetneqq\varsupsetneq\varsupsetneqq`).toParse()
  expect(r`\gvertneqq\lvertneqq\ngeqq\ngeqslant\nleqq`).toBuild()
  expect(r`\nleqslant\nshortmid\nshortparallel\varsubsetneq`).toBuild()
  expect(r`\varsubsetneqq\varsupsetneq\varsupsetneqq`).toBuild()
})

test("\\overset and \\underset should work", () => {
  expect(r`\overset{f}{\rightarrow} Y`).toParse()
  expect("\\underset{f}{\\rightarrow} Y").toParse()
  expect(r`\overset{f}{\rightarrow} Y`).toBuild()
  expect("\\underset{f}{\\rightarrow} Y").toBuild()
})

test("\\iff, \\implies, and \\impliedby should work", () => {
  expect(r`X \iff Y`).toParse()
  expect(r`X \implies Y`).toParse()
  expect(r`X \impliedby Y`).toParse()
  expect(r`X \iff Y`).toBuild()
  expect(r`X \implies Y`).toBuild()
  expect(r`X \impliedby Y`).toBuild()
})

test("\\tag support should fail outside display mode", () => {
  expect(r`\tag{hi}x+y`).not.toParse()
})

test("\\tag support should fail with multiple tags", () => {
  expect(r`\tag{1}\tag{2}x+y`).not.toParse(displayMode())
})

test("\\tag should build", () => {
  expect(r`\tag{hi}x+y`).toParse(displayMode());
  expect(r`\tag{hi}x+y`).toBuild(displayMode());
})

test("\\tag support should ignore location of \\tag", () => {
  expect(r`\tag{hi}x+y`).toParseLike(r`x+y\tag{hi}`, displayMode());
})

test("\\tag support should handle \\tag* like \\tag", () => {
  expect(r`\tag{hi}x+y`).toParseLike(r`\tag*{({hi})}x+y`, displayMode());
})

test("\\tag support should add tml-tageqn class", () => {
  expect(temml.renderToString(r`\tag{hi}x+y`, displayMode())).toContain("tml-tageqn")
})

test("leqno rendering option should differ from default", () => {
  // In the table row, read the left cell instead of the right cell.
  node = build(r`\tag{hi}x+y`, settings({ displayMode: true, leqno: true }))[0].children[0].children[0].children[0];
  expect(node.classes).toContain("tml-tag")
})

test("\\@binrel automatic bin/rel/ord should generate proper class", () => {
  expect(parse("L\\@binrel+xR")[1].mclass).toBe("mbin")
  expect(parse("L\\@binrel=xR")[1].mclass).toBe("mrel")
  expect(parse("L\\@binrel xxR")[1].mclass).toBe("mord")
  expect(parse("L\\@binrel=xR")[1].mclass).toBe("mrel")
  expect(parse("L\\@binrel{+}{x}R")[1].mclass).toBe("mbin")
  expect(parse("L\\@binrel{=}{x}R")[1].mclass).toBe("mrel")
  expect(parse("L\\@binrel{z}{x}R")[1].mclass).toBe("mord")
})

test("A parser taking String objects should not fail on an empty String object", () => {
  expect(new String("")).toParse()
  expect(new String("")).toBuild()
})

test("A parser taking String objects should parse the same as a regular string", () => {
  expect(new String("xy")).toParseLike(`xy`)
  expect(new String(r`\div`)).toParseLike(r`\div`)
  expect(new String(r`\frac 1 2`)).toParseLike(r`\frac 1 2`)
})

test("Unicode accents should parse Latin-1 letters in math mode", () => {
  expect(`ÀÁÂÃÄÅÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝàáâãäåèéêëìíîïñòóôõöùúûüýÿ`).toBuildLike(
    r`\grave A\acute A\hat A\tilde A\ddot A\mathring A` +
    r`\grave E\acute E\hat E\ddot E` +
    r`\grave I\acute I\hat I\ddot I` +
    r`\tilde N` +
    r`\grave O\acute O\hat O\tilde O\ddot O` +
    r`\grave U\acute U\hat U\ddot U` +
    r`\acute Y` +
    r`\grave a\acute a\hat a\tilde a\ddot a\mathring a` +
    r`\grave e\acute e\hat e\ddot e` +
    r`\grave ı\acute ı\hat ı\ddot ı` +
    r`\tilde n` +
    r`\grave o\acute o\hat o\tilde o\ddot o` +
    r`\grave u\acute u\hat u\ddot u` +
    r`\acute y\ddot y`
  )
  expect(r`\AA\AE\DH\O\TH\ss\aa\ae\dh\o\th\DJ\dj\L\l\NG\ng\OE\oe`).toBuild()
  expect(r`\text{\AA\AE\DH\O\TH\ss\aa\ae\dh\o\DJ\dj\L\l\NG\ng\OE\oe}`).toBuild()
})

test("Unicode accents should parse Latin-1 letters in text mode", () => {
  expect(temml.renderToString(r`\text{ÀÁÂÃÄÅÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝàáâãäåèéêëìíîïñòóôõöùúûüýÿ}`))
    .toContain("ÀÁÂÃÄÅÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝàáâãäåèéêëìíîïñòóôõöùúûüýÿ")
})

test("Unicode accents should parse combining characters", () => {
  expect("A\u0301C\u0301").toBuildLike(r`Á\acute C`);
})

test("Unicode accents should build multi-accented characters", () => {
  expect(`ấā́ắ\text{ấā́ắ}`).toParse()
  expect(`ấā́ắ\text{ấā́ắ}`).toBuild()
})

test("Unicode accents should parse accented i's and j's", () => {
  expect(`íȷ́`).toBuildLike(r`\acute ı\acute ȷ`);
  expect(`ấā́ắ\text{ấā́ắ}`).toParse();
  expect(`ấā́ắ\text{ấā́ắ}`).toBuild();
})

test("Temml should build Unicode relations", () => {
  expect(`∈∋∝∼∽≂≃≅≈≊≍≎≏≐≑≒≓≖⩵≗≜≡≤≥≦≧≪≫≬≳≷≺≻≼≽≾≿∴∵∣≔≕⩴⋘⋙⟂⊨∌⊶⊷⊂⊃⊆⊇⊏⊐⊑⊒⊢⊣⊩⊪⊸⋈⋍⋐⋑⋔⋛⋞⋟⌢⌣⩾⪆⪌⪕⪖⪯⪰⪷⪸⫅⫆≘≙≚≛≝≞≟≲⩽⪅≶⋚⪋`).toParse()
  expect(`∈∋∝∼∽≂≃≅≈≊≍≎≏≐≑≒≓≖⩵≗≜≡≤≥≦≧≪≫≬≳≷≺≻≼≽≾≿∴∵∣≔≕⩴⋘⋙⟂⊨∌⊶⊷⊂⊃⊆⊇⊏⊐⊑⊒⊢⊣⊩⊪⊸⋈⋍⋐⋑⋔⋛⋞⋟⌢⌣⩾⪆⪌⪕⪖⪯⪰⪷⪸⫅⫆≘≙≚≛≝≞≟≲⩽⪅≶⋚⪋`).toBuild()
})

test("Temml should build Unicode negated relations", () => {
  expect(`∉∤∦≁≆≠≨≩≮≯≰≱⊀⊁⊈⊉⊊⊋⊬⊭⊮⊯⋠⋡⋦⋧⋨⋩⋬⋭⪇⪈⪉⪊⪵⪶⪹⪺⫋⫌`).toParse()
  expect(`∉∤∦≁≆≠≨≩≮≯≰≱⊀⊁⊈⊉⊊⊋⊬⊭⊮⊯⋠⋡⋦⋧⋨⋩⋬⋭⪇⪈⪉⪊⪵⪶⪹⪺⫋⫌`).toBuild()
})

test("Temml should build Unicode big operators", () => {
  expect(`∏∐∑∫∬∭∮⋀⋁⋂⋃⨀⨁⨂⨄⨆`).toParse()
  expect(`∏∐∑∫∬∭∮⋀⋁⋂⋃⨀⨁⨂⨄⨆`).toBuild()
})

test("Temml should build Unicode symbols", () => {
  expect(`£¥ℂℍℑℎℓℕ℘ℙℚℜℝℤℲℵðℶℷℸ⅁∀∁∂∃∇∞∠∡∢♠♡♢♣♭♮♯✓°¬‼⋮\u00B7\u00A9\\text{£¥ℂℍℎ\u00A9\u00AE\uFE0F}`).toParse()
  expect(`£¥ℂℍℑℎℓℕ℘ℙℚℜℝℤℲℵðℶℷℸ⅁∀∁∂∃∇∞∠∡∢♠♡♢♣♭♮♯✓°¬‼⋮\u00B7\u00A9\\text{£¥ℂℍℎ\u00A9\u00AE\uFE0F}`).toBuild()
  expect(temml.renderToString("ℓ")).toContain("ℓ")
})

test("Temml should build capital Greek letters", () => {
  expect(`\u0391\u0392\u0395\u0396\u0397\u0399\u039A\u039C\u039D\u039F\u03A1\u03A4\u03A7\u03DD`).toParse(strictSettings())
  expect(`\u0391\u0392\u0395\u0396\u0397\u0399\u039A\u039C\u039D\u039F\u03A1\u03A4\u03A7\u03DD`).toBuild(strictSettings())
})

test("Temml should build Unicode arrows", () => {
  expect(`←↑→↓↔↕↖↗↘↙↚↛↞↠↢↣↦↩↪↫↬↭↮↰↱↶↷↼↽↾↾↿⇀⇁⇂⇃⇄⇆⇇⇈⇉⇊⇋⇌⇍⇎⇏⇐⇑⇒⇓⇔⇕⇚⇛⇝⟵⟶⟷⟸⟹⟺⟼`).toParse()
  expect(`←↑→↓↔↕↖↗↘↙↚↛↞↠↢↣↦↩↪↫↬↭↮↰↱↶↷↼↽↾↾↿⇀⇁⇂⇃⇄⇆⇇⇈⇉⇊⇋⇌⇍⇎⇏⇐⇑⇒⇓⇔⇕⇚⇛⇝⟵⟶⟷⟸⟹⟺⟼`).toBuild()
})

test("Temml should build Unicode binary operators", () => {
  expect(`±×÷∓∔∧∨∩∪≀⊎⊓⊔⊕⊖⊗⊘⊙⊚⊛⊝◯⊞⊟⊠⊡⊺⊻⊼⋇⋉⋊⋋⋌⋎⋏⋒⋓⩞\u22C5\u2216\u2218\u2219`).toParse()
  expect(`±×÷∓∔∧∨∩∪≀⊎⊓⊔⊕⊖⊗⊘⊙⊚⊛⊝◯⊞⊟⊠⊡⊺⊻⊼⋇⋉⋊⋋⋌⋎⋏⋒⋓⩞\u22C5\u2216\u2218\u2219`).toBuild()
})

test("Temml should build Unicode delimiters", () => {
  expect("\\left\u230A\\frac{a}{b}\\right\u230B").toParse()
  expect("\\left\u2308\\frac{a}{b}\\right\u2308").toParse()
  expect("\\left\u27ee\\frac{a}{b}\\right\u27ef").toParse()
  expect("\\left\u27e8\\frac{a}{b}\\right\u27e9").toParse()
  expect("\\left\u23b0\\frac{a}{b}\\right\u23b1").toParse()
  expect(`┌x┐ └x┘`).toParse()
  expect("\u231Cx\u231D \u231Ex\u231F").toParse()
  expect("\u27E6x\u27E7").toParse()
  expect("\\llbracket \\rrbracket").toParse()
  expect("\\lBrace \\rBrace").toParse()
  expect("\\left\u230A\\frac{a}{b}\\right\u230B").toBuild()
  expect("\\left\u2308\\frac{a}{b}\\right\u2308").toBuild()
  expect("\\left\u27ee\\frac{a}{b}\\right\u27ef").toBuild()
  expect("\\left\u27e8\\frac{a}{b}\\right\u27e9").toBuild()
  expect("\\left\u23b0\\frac{a}{b}\\right\u23b1").toBuild()
  expect(`┌x┐ └x┘`).toBuild()
  expect("\u231Cx\u231D \u231Ex\u231F").toBuild()
  expect("\u27E6x\u27E7").toBuild()
  expect("\\llbracket \\rrbracket").toBuild()
  expect("\\lBrace \\rBrace").toBuild()
})

test("Temml should build some Unicode surrogate pairs", () => {
  let wideCharStr = "";
  wideCharStr += String.fromCharCode(0xD835, 0xDC00);   // bold A
  wideCharStr += String.fromCharCode(0xD835, 0xDC68);   // bold italic A
  wideCharStr += String.fromCharCode(0xD835, 0xDD04);   // Fraktur A
  wideCharStr += String.fromCharCode(0xD835, 0xDD38);   // double-struck
  wideCharStr += String.fromCharCode(0xD835, 0xDC9C);   // script A
  wideCharStr += String.fromCharCode(0xD835, 0xDDA0);   // sans serif A
  wideCharStr += String.fromCharCode(0xD835, 0xDDD4);   // bold sans A
  wideCharStr += String.fromCharCode(0xD835, 0xDE08);   // italic sans A
  wideCharStr += String.fromCharCode(0xD835, 0xDE70);   // monospace A
  wideCharStr += String.fromCharCode(0xD835, 0xDFCE);   // bold zero
  wideCharStr += String.fromCharCode(0xD835, 0xDFE2);   // sans serif zero
  wideCharStr += String.fromCharCode(0xD835, 0xDFEC);   // bold sans zero
  wideCharStr += String.fromCharCode(0xD835, 0xDFF6);   // monospace zero
  expect(wideCharStr).toParse(strictSettings());
  expect(wideCharStr).toBuild(strictSettings());
  wideCharText = "\text{";
  wideCharText += String.fromCharCode(0xD835, 0xDC00);   // bold A
  wideCharText += String.fromCharCode(0xD835, 0xDC68);   // bold italic A
  wideCharText += String.fromCharCode(0xD835, 0xDD04);   // Fraktur A
  wideCharText += String.fromCharCode(0xD835, 0xDD38);   // double-struck
  wideCharText += String.fromCharCode(0xD835, 0xDC9C);   // script A
  wideCharText += String.fromCharCode(0xD835, 0xDDA0);   // sans serif A
  wideCharText += String.fromCharCode(0xD835, 0xDDD4);   // bold sans A
  wideCharText += String.fromCharCode(0xD835, 0xDE08);   // italic sans A
  wideCharText += String.fromCharCode(0xD835, 0xDE70);   // monospace A
  wideCharText += String.fromCharCode(0xD835, 0xDFCE);   // bold zero
  wideCharText += String.fromCharCode(0xD835, 0xDFE2);   // sans serif zero
  wideCharText += String.fromCharCode(0xD835, 0xDFEC);   // bold sans zero
  wideCharText += String.fromCharCode(0xD835, 0xDFF6);   // monospace zero
  wideCharText += "}";
  expect(wideCharText).toParse(strictSettings());
  expect(wideCharText).toBuild(strictSettings());
})

test("Unicode script characters should parse correctly.", () => {
  wideCharText = String.fromCharCode(0xD835, 0xdcaa); // Script O
  markup = temml.renderToString(wideCharText)
  expect(markup).toContain('class="mathcal"')
  wideCharText = String.fromCharCode(0xD835, 0xdcaa, 0xfe01); // Trailing U_FE01 per Unicode 14
  markup = temml.renderToString(wideCharText)
  expect(markup).toContain('class="mathscr"')
})

test("The maxSize setting should clamp size when set", () => {
  rule = r`\rule{999em}{999em}`
  markup = temml.renderToString(rule, settings({ maxSize: [5, 80] }))
  expect(markup).toContain(`width="5em"`)
  expect(markup).toContain(`height="5em"`)
})

test("The maxSize setting should not clamp size when not set", () => {
  markup = temml.renderToString(rule)
  expect(markup).not.toContain(`width="5em"`)
  expect(markup).not.toContain(`height="5em"`)
})

test("The maxSize setting should make zero-width rules if a negative maxSize is passed", () => {
  markup = temml.renderToString(rule, settings({ maxSize: [-5, -80] }))
  expect(markup).toContain(`width="0em"`)
  expect(markup).toContain(`height="0em"`)
})

test("The maxExpand setting should prevent expansion", () => {
  expect(r`\def\foo{1}\foo`).toParse()
  expect(r`\def\foo{1}\foo`).toBuild()
  expect(r`\def\foo{1}\foo`).toParse(settings({maxExpand: 1}))
  expect(r`\def\foo{1}\foo`).not.toParse(settings({maxExpand: 0}))
})

test("The maxExpand setting should prevent infinite loops", () => {
  expect(r`\def\foo{\foo}\foo`).not.toParse(settings({maxExpand: 10}))
  expect(r`\edef0{x}\edef0{00}\edef0{00}\edef0{00}\edef0{00}`).not.toParse(settings({maxExpand: 10}))
})

test("The \\mathchoice function should render as if there is nothing other in display math", () => {
  cmd = r`\sum_{k = 0}^{\infty} x^k`
  expect(`\\displaystyle\\mathchoice{${cmd}}{T}{S}{SS}`).toBuildLike(`\\displaystyle${cmd}`)
})

test("The \\mathchoice function should render as if there is nothing other in text", () => {
  expect(`\\textstyle\\mathchoice{D}{${cmd}}{S}{SS}`).toBuildLike(`\\textstyle${cmd}`)
})

test("The \\mathchoice function should render as if there is nothing other in scriptstyle", () => {
  expect(`\\scriptstyle\\mathchoice{D}{T}{${cmd}}{SS}`).toBuildLike(`\\scriptstyle${cmd}`)
})

test("The \\mathchoice function should render as if there is nothing other in scriptscriptstyle", () => {
  expect(`\\scriptscriptstyle\\mathchoice{D}{T}{S}{${cmd}}`).toBuildLike(`\\scriptscriptstyle${cmd}`)
})

test("Newlines via \\\\ and \\newline should build \\\\ without the optional argument and \\newline the same", () => {
  expect(r`hello \\ world`).toBuildLike(r`hello \newline world`)
})

test("Newlines via \\\\ and \\newline should not allow \\newline to scan for an optional size argument", () => {
  expect(r`hello \newline[w]orld`).toParse()
  expect(r`hello \newline[w]orld`).toBuild()
})

test("Newlines via \\\\ and \\newline should not allow \\cr at top level", () => {
  expect(temml.renderToString(r`hello \cr world`)).toContain("#b22222") // color of error message
})

test("Newlines via \\\\ and \\newline: \\\\ causes newline, even after mrel and mop", () => {
  markup = temml.renderToString(r`M = \\ a + \\ b \\ c`)
  expect(markup).toMatch(/=.+mo linebreak.+\+.+mo linebreak.+b.+mo linebreak/)
})

test("Newlines should cause left-justified lines.", () => {
  markup = temml.renderToString(r`a + b \\ c + d`)
  expect([...markup.matchAll(/text-align:left/g)].length).toBe(2)
})

test("Symbols should build", () => {
  expect(r`\text{\i\j}`).toParse(strictSettings())
  expect(r`A\;B\,C\nobreakspace \text{A\;B\,C\nobreakspace}`).toParse(strictSettings())
  expect(r`\standardstate`).toParse(strictSettings())
  expect(r`\text{\i\j}`).toBuild(strictSettings())
  expect(r`A\;B\,C\nobreakspace \text{A\;B\,C\nobreakspace}`).toBuild(strictSettings())
  expect(r`\standardstate`).toBuild(strictSettings())
  expect(r`\text{\ae\AE\oe\OE\o\O\ss}`).toBuildLike(r`\text{æÆœŒøØß}`, strictSettings())
})

test("\\AA should render upright in text mode and italic in math mode", () => {
  expect(temml.renderToString(r`\text{\AA}`)).toContain("Å")
  expect(temml.renderToString(r`\AA`)).toContain("<mi>A</mi>")
})

test("Settings should allow unicode text when not strict", () => {
  expect(`é`).toParse()
  expect(`試`).toParse()
})

test("Settings should forbid math-mode unicode text when strict", () => {
  expect(`é`).not.toParse(strictSettings())
  expect(`試`).not.toParse(strictSettings());
})

test("Unicode characters inside \\text{} should parse", () => {
  expect(`\text{é}`).toParse()
  expect(`\text{試}`).toParse()
})

test("Line-wrapping should work", () => {
  const wrapExpression = r`x = a \textcolor{blue}{+ a + a} = b + b + b`;
  expect(wrapExpression).toParse()
  expect(wrapExpression).toBuild();
  expect(wrapExpression).toBuild(wrapSettings("none"));
  expect(wrapExpression).toBuild(wrapSettings("tex"));
  expect(wrapExpression).toBuild(wrapSettings("="));
  // Line wrapping works by creating a series of <mrow> elements.
  // We check for regression by counting the number of elements.
  expect(build(wrapExpression, wrapSettings("tex"))[0].children.length).toBe(6)
  expect(build(wrapExpression, wrapSettings("="))[0].children.length).toBe(2)
  expect(build(r`x^{\textcolor{red}{-yz}}`)[0].children.length).toBe(2)
})
