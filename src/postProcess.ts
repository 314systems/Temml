/* Temml Post Process
 * Populate the text contents of each \ref & \eqref
 *
 * As with other Temml code, this file is released under terms of the MIT license.
 * https://mit-license.org/
 */

export const version = '0.14.0';

export const postProcess = (block: Element | Document): void => {
  const labelMap: Record<string, string> = {};
  let i = 0;

  // Get a collection of the parents of each \tag & auto-numbered equation
  const amsEqns = document.getElementsByClassName('tml-eqn');
  for (let parent of amsEqns) {
    // AMS automatically numbered equation.
    // Assign an id.
    i += 1;
    parent.setAttribute('id', 'tml-eqn-' + String(i));
    // No need to write a number into the text content of the element.
    // A CSS counter has done that even if this postProcess() function is not used.

    // Find any \label that refers to an AMS automatic eqn number.
    while (true) {
      if (parent.tagName === 'mtable') {
        break;
      }
      const labels = parent.getElementsByClassName('tml-label');
      if (labels.length > 0) {
        const id = parent.attributes.getNamedItem('id')!.value;
        labelMap[id] = String(i);
        break;
      } else {
        parent = parent.parentElement!;
      }
    }
  }

  // Find \labels associated with \tag
  const taggedEqns = document.getElementsByClassName('tml-tageqn');
  for (const parent of taggedEqns) {
    const labels = parent.getElementsByClassName('tml-label');
    if (labels.length > 0) {
      const tags = parent.getElementsByClassName('tml-tag');
      if (tags.length > 0) {
        const id = parent.attributes.getNamedItem('id')!.value;
        labelMap[id] = tags[0].textContent!;
      }
    }
  }

  // Populate \ref & \eqref text content
  const refs = [...block.getElementsByClassName('tml-ref')];
  for (const ref of refs) {
    const attr = ref.getAttribute('href');
    let str = labelMap[attr!.slice(1)];
    if (ref.className.includes('tml-eqref')) {
      // \eqref. Include parens
      if (str.charAt(0) !== '(') {
        str = '(' + str;
      }
      if (str.slice(-1) !== ')') {
        str = str + ')';
      }
    } else {
      // \ref. Omit parens.
      str = str.replace(/^\(/, '');
      str = str.replace(/\)$/, '');
    }
    const mtext = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'mtext');
    mtext.append(document.createTextNode(str));
    const math = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'math');
    math.append(mtext);
    ref.textContent = '';
    ref.append(math);
  }
};
