/** OOXML namespace URIs */
export const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
export const W14_NS = 'http://schemas.microsoft.com/office/word/2010/wordml';
export const W15_NS = 'http://schemas.microsoft.com/office/word/2012/wordml';

/**
 * Extract all plain text from an XML element by concatenating
 * all descendant <w:t> elements. Strips rich text formatting.
 */
export function getTextContent(element: Element): string {
  const textNodes = element.getElementsByTagNameNS(W_NS, 't');
  const parts: string[] = [];
  for (let i = 0; i < textNodes.length; i++) {
    parts.push(textNodes[i].textContent ?? '');
  }
  return parts.join('');
}

/** Parse an XML string into a Document. Returns null if malformed. */
export function parseXml(xml: string): Document | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) {
    return null;
  }
  return doc;
}
