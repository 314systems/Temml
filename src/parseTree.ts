import Parser from "./Parser"
import ParseError from "./ParseError"
import type { AnyParseNode } from "./parseNode"
import type Settings from "./Settings"

/**
 * Parses an expression using a Parser, then returns the parsed result.
 */
const parseTree = function(toParse: string, settings: Settings): AnyParseNode[] {
  // Also accept String objects from JavaScript callers.
  if (!(typeof toParse === "string" || (toParse as unknown) instanceof String)) {
    throw new TypeError("Temml can only parse string typed expression")
  }
  let tree: AnyParseNode[];
  let parser: Parser;
  try {
    parser = new Parser(toParse, settings)
    // Blank out any \df@tag to avoid spurious "Duplicate \tag" errors
    delete parser.gullet.macros.current["\\df@tag"]

    tree = parser.parse()
  } catch (error) {
    if ((error as Error).toString() === "ParseError:  Unmatched delimiter") {
      // Abandon the attempt to wrap delimiter pairs in an <mrow>.
      // Try again, and put each delimiter into an <mo> element.
      settings.wrapDelimiterPairs = false;
      parser = new Parser(toParse, settings)
      // Blank out any \df@tag to avoid spurious "Duplicate \tag" errors
      delete parser.gullet.macros.current["\\df@tag"]
      tree = parser.parse()
    } else {
      throw error;
    }
  }

  // If the input used \tag, it will set the \df@tag macro to the tag.
  // In this case, we separately parse the tag and wrap the tree.
  if (parser.gullet.macros.get("\\df@tag")) {
    if (!settings.displayMode) {
      throw new ParseError("\\tag works only in display mode")
    }
    parser.gullet.feed("\\df@tag")
    tree = [
      {
        type: "tag",
        mode: "text",
        body: tree,
        tag: parser.parse()
      }
    ]
  }

  return tree
}

export default parseTree
