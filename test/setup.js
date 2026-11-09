import { expect } from "vitest"
import { build, defaultSettings, parse } from "./helpers.js"

const isErrorTree = tree =>
  tree.length === 1 && tree[0].color === "#b22222"

const isErrorBuild = tree => tree.classes?.[0] === "temml-error"

const attempt = fn => {
  try {
    return { value: fn() }
  } catch (error) {
    return { error }
  }
}

const describeError = error => (error ? `\n\n${error}` : "")

expect.extend({
  toParse(received, options = defaultSettings()) {
    const { value, error } = attempt(() => parse(received, options))
    const pass = !error && !isErrorTree(value)
    return {
      pass,
      message: () =>
        `expected ${JSON.stringify(received)} ${this.isNot ? "not " : ""}to parse` +
        describeError(error)
    }
  },

  toBuild(received, options = defaultSettings()) {
    const { value, error } = attempt(() => build(received, options))
    const pass = !error && !isErrorBuild(value)
    return {
      pass,
      message: () =>
        `expected ${JSON.stringify(received)} ${this.isNot ? "not " : ""}to build` +
        describeError(error)
    }
  },

  toParseLike(received, expected, options = defaultSettings()) {
    const { value, error } = attempt(() => [parse(received, options), parse(expected, options)])
    const pass = !error && JSON.stringify(value[0]) === JSON.stringify(value[1])
    return {
      pass,
      message: () =>
        `expected ${JSON.stringify(received)} ${this.isNot ? "not " : ""}to parse like ` +
        JSON.stringify(expected) + describeError(error),
      actual: value?.[0],
      expected: value?.[1]
    }
  },

  toBuildLike(received, expected, options = defaultSettings()) {
    const { value, error } = attempt(() => [build(received, options), build(expected, options)])
    const pass = !error && JSON.stringify(value[0]) === JSON.stringify(value[1])
    return {
      pass,
      message: () =>
        `expected ${JSON.stringify(received)} ${this.isNot ? "not " : ""}to build like ` +
        JSON.stringify(expected) + describeError(error),
      actual: value?.[0],
      expected: value?.[1]
    }
  }
})
