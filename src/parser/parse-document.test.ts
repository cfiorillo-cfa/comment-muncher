import { describe, it, expect } from 'vitest';
import { parseDocumentXml } from './parse-document';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function makeDocXml(bodyContent: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="${W}">
      <w:body>${bodyContent}</w:body>
    </w:document>`;
}

describe('parseDocumentXml', () => {
  it('extracts highlighted text for a single-run comment', () => {
    const xml = makeDocXml(`
      <w:p>
        <w:r><w:t>Before </w:t></w:r>
        <w:commentRangeStart w:id="1"/>
        <w:r><w:t>highlighted text</w:t></w:r>
        <w:commentRangeEnd w:id="1"/>
        <w:r><w:t> after</w:t></w:r>
      </w:p>
    `);
    const anchors = parseDocumentXml(xml);
    expect(anchors).toHaveLength(1);
    expect(anchors[0].commentId).toBe('1');
    expect(anchors[0].highlightedContent).toBe('highlighted text');
  });

  it('extracts highlighted text spanning multiple runs', () => {
    const xml = makeDocXml(`
      <w:p>
        <w:commentRangeStart w:id="1"/>
        <w:r><w:t>first </w:t></w:r>
        <w:r><w:t>second</w:t></w:r>
        <w:commentRangeEnd w:id="1"/>
      </w:p>
    `);
    const anchors = parseDocumentXml(xml);
    expect(anchors[0].highlightedContent).toBe('first second');
  });

  it('extracts highlighted text spanning multiple paragraphs', () => {
    const xml = makeDocXml(`
      <w:p>
        <w:commentRangeStart w:id="1"/>
        <w:r><w:t>paragraph one</w:t></w:r>
      </w:p>
      <w:p>
        <w:r><w:t>paragraph two</w:t></w:r>
        <w:commentRangeEnd w:id="1"/>
      </w:p>
    `);
    const anchors = parseDocumentXml(xml);
    expect(anchors[0].highlightedContent).toBe('paragraph one paragraph two');
  });

  it('handles multiple simultaneous comment ranges', () => {
    const xml = makeDocXml(`
      <w:p>
        <w:commentRangeStart w:id="1"/>
        <w:r><w:t>shared </w:t></w:r>
        <w:commentRangeStart w:id="2"/>
        <w:r><w:t>overlap</w:t></w:r>
        <w:commentRangeEnd w:id="1"/>
        <w:r><w:t> extra</w:t></w:r>
        <w:commentRangeEnd w:id="2"/>
      </w:p>
    `);
    const anchors = parseDocumentXml(xml);
    const byId = new Map(anchors.map(a => [a.commentId, a]));
    expect(byId.get('1')!.highlightedContent).toBe('shared overlap');
    expect(byId.get('2')!.highlightedContent).toBe('overlap extra');
  });

  it('returns empty array when no comment ranges exist', () => {
    const xml = makeDocXml(`<w:p><w:r><w:t>No comments here</w:t></w:r></w:p>`);
    const anchors = parseDocumentXml(xml);
    expect(anchors).toEqual([]);
  });

  it('uses nearest preceding heading for location', () => {
    const xml = makeDocXml(`
      <w:p>
        <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
        <w:r><w:t>Budget Overview</w:t></w:r>
      </w:p>
      <w:p>
        <w:commentRangeStart w:id="1"/>
        <w:r><w:t>some text</w:t></w:r>
        <w:commentRangeEnd w:id="1"/>
      </w:p>
    `);
    const anchors = parseDocumentXml(xml);
    expect(anchors[0].location).toBe('Section: Budget Overview');
  });

  it('falls back to paragraph number when no headings exist', () => {
    const xml = makeDocXml(`
      <w:p><w:r><w:t>First paragraph</w:t></w:r></w:p>
      <w:p><w:r><w:t>Second paragraph</w:t></w:r></w:p>
      <w:p>
        <w:commentRangeStart w:id="1"/>
        <w:r><w:t>third</w:t></w:r>
        <w:commentRangeEnd w:id="1"/>
      </w:p>
    `);
    const anchors = parseDocumentXml(xml);
    expect(anchors[0].location).toBe('Paragraph 3');
  });

  it('falls back to paragraph number when comment is before first heading', () => {
    const xml = makeDocXml(`
      <w:p>
        <w:commentRangeStart w:id="1"/>
        <w:r><w:t>before heading</w:t></w:r>
        <w:commentRangeEnd w:id="1"/>
      </w:p>
      <w:p>
        <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
        <w:r><w:t>First Heading</w:t></w:r>
      </w:p>
    `);
    const anchors = parseDocumentXml(xml);
    expect(anchors[0].location).toBe('Paragraph 1');
  });

  it('handles missing commentRangeEnd gracefully', () => {
    const xml = makeDocXml(`
      <w:p>
        <w:commentRangeStart w:id="1"/>
        <w:r><w:t>orphaned start</w:t></w:r>
      </w:p>
    `);
    const anchors = parseDocumentXml(xml);
    expect(anchors[0].highlightedContent).toBe('orphaned start');
  });
});
