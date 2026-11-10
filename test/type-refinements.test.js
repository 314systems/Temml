import { expect, test } from 'vitest';
import temml from '../temml';
import symbols from '../src/symbols';

test.each([String.raw`\widehat{^2}`, String.raw`\widehat{_2}`])(
  'renders an accent over a script with no base: %s',
  (expression) => {
    const markup = temml.renderToString(expression, { throwOnError: true });
    expect(markup).toContain('<mover>');
    expect(markup).toContain('<mn>2</mn>');
    expect(markup).not.toContain('NaN');
  },
);

test.each([
  [String.raw`\mathord{\text{\textbf{a}}}`, '𝐚'],
  [String.raw`\mathord{\text{a\textbf{b}}}`, 'a𝐛'],
  [String.raw`\mathrel{\text{\textbf{a}}}`, '𝐚'],
])('preserves nested text formatting in %s', (expression, text) => {
  const markup = temml.renderToString(expression, { throwOnError: true });
  expect(markup).toContain(`<mtext>${text}</mtext>`);
  expect(markup).not.toContain('undefined');
  expect(markup).not.toContain('<mi><mtext>');
  expect(markup).not.toContain('<mo><mtext>');
});

test('preserves the original symbol text when its replacement is null', () => {
  temml.__defineSymbol('math', 'mathord', null, String.raw`\nullablemclasstest`);
  try {
    const options = { throwOnError: true };
    expect(temml.renderToString(String.raw`\mathord{\nullablemclasstest}`, options)).toBe(
      temml.renderToString(String.raw`\nullablemclasstest`, options),
    );
  } finally {
    delete symbols.math['\\nullablemclasstest'];
  }
});
