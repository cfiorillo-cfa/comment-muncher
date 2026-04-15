import { describe, it, expect } from 'vitest';
import { getTextContent, parseXml } from './xml-helpers';

describe('parseXml', () => {
  it('parses valid XML', () => {
    const doc = parseXml('<root><child/></root>');
    expect(doc).not.toBeNull();
    expect(doc!.documentElement.tagName).toBe('root');
  });

  it('returns null for malformed XML', () => {
    const doc = parseXml('<root><unclosed>');
    expect(doc).toBeNull();
  });
});

describe('getTextContent', () => {
  it('extracts text from w:t elements', () => {
    const xml = `
      <w:comment xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:p>
          <w:r><w:t>Hello </w:t></w:r>
          <w:r><w:rPr><w:b/></w:rPr><w:t>world</w:t></w:r>
        </w:p>
      </w:comment>
    `;
    const doc = parseXml(xml)!;
    const comment = doc.documentElement;
    expect(getTextContent(comment)).toBe('Hello world');
  });

  it('returns empty string when no text nodes', () => {
    const xml = `
      <w:comment xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:p><w:pPr><w:pStyle w:val="CommentText"/></w:pPr></w:p>
      </w:comment>
    `;
    const doc = parseXml(xml)!;
    expect(getTextContent(doc.documentElement)).toBe('');
  });
});
