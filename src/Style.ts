/**
 * This file contains information about the style that the mathmlBuilder carries
 * around with it. Data is held in an `Style` object, and when
 * recursing, a new `Style` object can be created with the `.with*` functions.
 */

const subOrSupLevel = [2, 2, 3, 3];

export interface StyleData {
  level: number;
  color?: string;
  font?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontShape?: string;
  maxSize: [number, number];
}

/**
 * This is the main Style class. It contains the current style.level, color, and font.
 *
 * Style objects should not be modified. To create a new Style with
 * different properties, call a `.with*` method.
 */
class Style {
  // Style.level can be 0 | 1 | 2 | 3, which correspond to
  //       displaystyle, textstyle, scriptstyle, and scriptscriptstyle.
  // style.level usually does not directly set MathML's script level. MathML does that itself.
  // However, Chromium does not stop shrinking after scriptscriptstyle, so we do explicitly
  // set a scriptlevel attribute in those conditions.
  // We also use style.level to track math style so that we can get the correct
  // scriptlevel when needed in supsub.js, mathchoice.js, or for dimensions in em.
  level: number;
  color: string | undefined;
  // A font family applies to a group of fonts (i.e. SansSerif), while a font
  // represents a specific font (i.e. SansSerif Bold).
  // See: https://tex.stackexchange.com/questions/22350/difference-between-textrm-and-mathrm
  font: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontShape: string;
  maxSize: [number, number];

  constructor(data: StyleData) {
    this.level = data.level;
    this.color = data.color;
    this.font = data.font || '';
    this.fontFamily = data.fontFamily || '';
    this.fontSize = data.fontSize || 1.0;
    this.fontWeight = data.fontWeight || '';
    this.fontShape = data.fontShape || '';
    this.maxSize = data.maxSize;
  }

  /**
   * Returns a new style object with the same properties as "this".  Properties
   * from "extension" will be copied to the new style object.
   */
  extend(extension: Partial<StyleData>): Style {
    return new Style({
      level: this.level,
      color: this.color,
      font: this.font,
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      fontWeight: this.fontWeight,
      fontShape: this.fontShape,
      maxSize: this.maxSize,
      ...extension,
    });
  }

  withLevel(n: number): Style {
    return this.extend({
      level: n,
    });
  }

  incrementLevel(): Style {
    return this.extend({
      level: Math.min(this.level + 1, 3),
    });
  }

  inSubOrSup(): Style {
    return this.extend({
      level: subOrSupLevel[this.level],
    });
  }

  /**
   * Create a new style object with the given color.
   */
  withColor(color: string | undefined): Style {
    return this.extend({
      color: color,
    });
  }

  /**
   * Creates a new style object with the given math font or old text font.
   */
  withFont(font: string): Style {
    return this.extend({
      font,
    });
  }

  /**
   * Create a new style objects with the given fontFamily.
   */
  withTextFontFamily(fontFamily: string): Style {
    return this.extend({
      fontFamily,
      font: '',
    });
  }

  /**
   * Creates a new style object with the given font size
   */
  withFontSize(num: number): Style {
    return this.extend({
      fontSize: num,
    });
  }

  /**
   * Creates a new style object with the given font weight
   */
  withTextFontWeight(fontWeight: string): Style {
    return this.extend({
      fontWeight,
      font: '',
    });
  }

  /**
   * Creates a new style object with the given font weight
   */
  withTextFontShape(fontShape: string): Style {
    return this.extend({
      fontShape,
      font: '',
    });
  }

  /**
   * Gets the CSS color of the current style object
   */
  getColor(): string | undefined {
    return this.color;
  }
}

export default Style;
