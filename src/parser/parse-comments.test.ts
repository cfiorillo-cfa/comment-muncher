import { describe, it, expect } from 'vitest';
import { parseCommentsXml } from './parse-comments';

const COMMENTS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">
  <w:comment w:id="1" w:author="Maria S." w:date="2024-03-12T10:30:00Z" w:initials="MS">
    <w:p w14:paraId="1A2B3C01" w14:textId="00000001" w:rsidR="00000000">
      <w:pPr><w:pStyle w:val="CommentText"/></w:pPr>
      <w:r><w:t>Need to verify these numbers with finance</w:t></w:r>
    </w:p>
  </w:comment>
  <w:comment w:id="2" w:author="David R." w:date="2024-03-13T14:15:00Z" w:initials="DR">
    <w:p w14:paraId="1A2B3C02" w14:textId="00000002" w:rsidR="00000000">
      <w:pPr><w:pStyle w:val="CommentText"/></w:pPr>
      <w:r><w:t>Confirmed with Jess, </w:t></w:r>
      <w:r><w:rPr><w:b/></w:rPr><w:t>numbers are correct</w:t></w:r>
    </w:p>
  </w:comment>
</w:comments>`;

describe('parseCommentsXml', () => {
  it('extracts comment id, author, date, and text', () => {
    const comments = parseCommentsXml(COMMENTS_XML);
    expect(comments).toHaveLength(2);
    expect(comments[0]).toEqual({
      id: '1',
      author: 'Maria S.',
      date: '2024-03-12T10:30:00Z',
      text: 'Need to verify these numbers with finance',
      paraId: '1A2B3C01',
    });
  });

  it('concatenates text across multiple runs (strips formatting)', () => {
    const comments = parseCommentsXml(COMMENTS_XML);
    expect(comments[1].text).toBe('Confirmed with Jess, numbers are correct');
  });

  it('extracts paraId from first paragraph', () => {
    const comments = parseCommentsXml(COMMENTS_XML);
    expect(comments[0].paraId).toBe('1A2B3C01');
    expect(comments[1].paraId).toBe('1A2B3C02');
  });

  it('returns null paraId when w14:paraId is absent', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:comment w:id="1" w:author="Test" w:date="2024-01-01T00:00:00Z">
          <w:p><w:r><w:t>No paraId here</w:t></w:r></w:p>
        </w:comment>
      </w:comments>`;
    const comments = parseCommentsXml(xml);
    expect(comments[0].paraId).toBeNull();
  });

  it('returns empty array for XML with no comments', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>`;
    expect(parseCommentsXml(xml)).toEqual([]);
  });
});
