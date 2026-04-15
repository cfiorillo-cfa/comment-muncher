import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { parseDocx } from './parse-docx';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const W14 = 'http://schemas.microsoft.com/office/word/2010/wordml';
const W15 = 'http://schemas.microsoft.com/office/word/2012/wordml';

async function makeDocx(files: Record<string, string>): Promise<File> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], 'test.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

const COMMENTS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<w:comments xmlns:w="${W}" xmlns:w14="${W14}">
  <w:comment w:id="1" w:author="Maria S." w:date="2024-03-12T10:30:00Z">
    <w:p w14:paraId="AAA001"><w:r><w:t>Check these numbers</w:t></w:r></w:p>
  </w:comment>
  <w:comment w:id="2" w:author="David R." w:date="2024-03-13T14:15:00Z">
    <w:p w14:paraId="AAA002"><w:r><w:t>Numbers are correct</w:t></w:r></w:p>
  </w:comment>
</w:comments>`;

const DOCUMENT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="${W}">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>Budget</w:t></w:r>
    </w:p>
    <w:p>
      <w:commentRangeStart w:id="1"/>
      <w:r><w:t>total allocation of $2.4M</w:t></w:r>
      <w:commentRangeEnd w:id="1"/>
    </w:p>
  </w:body>
</w:document>`;

const COMMENTS_EXTENDED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<w15:commentsEx xmlns:w15="${W15}">
  <w15:commentEx w15:paraId="AAA001" w15:done="1"/>
  <w15:commentEx w15:paraId="AAA002" w15:paraIdParent="AAA001" w15:done="0"/>
</w15:commentsEx>`;

describe('parseDocx', () => {
  it('parses a complete DOCX with all XML files present', async () => {
    const file = await makeDocx({
      'word/comments.xml': COMMENTS_XML,
      'word/document.xml': DOCUMENT_XML,
      'word/commentsExtended.xml': COMMENTS_EXTENDED_XML,
    });

    const result = await parseDocx(file);

    expect(result.filename).toBe('test');
    expect(result.hasThreading).toBe(true);
    expect(result.comments).toHaveLength(2);

    const parent = result.comments[0];
    expect(parent.id).toBe('1');
    expect(parent.author).toBe('Maria S.');
    expect(parent.text).toBe('Check these numbers');
    expect(parent.highlightedContent).toBe('total allocation of $2.4M');
    expect(parent.location).toBe('Section: Budget');
    expect(parent.resolved).toBe(true);
    expect(parent.isReply).toBe(false);
    expect(parent.parentCommentId).toBeNull();
    expect(parent.threadId).toBe(1);

    const reply = result.comments[1];
    expect(reply.id).toBe('2');
    expect(reply.author).toBe('David R.');
    expect(reply.isReply).toBe(true);
    expect(reply.parentCommentId).toBe('1');
    expect(reply.threadId).toBe(1);
    expect(reply.resolved).toBe(false);
  });

  it('handles missing commentsExtended.xml gracefully', async () => {
    const file = await makeDocx({
      'word/comments.xml': COMMENTS_XML,
      'word/document.xml': DOCUMENT_XML,
    });

    const result = await parseDocx(file);

    expect(result.hasThreading).toBe(false);
    expect(result.comments[0].resolved).toBeNull();
    expect(result.comments[0].isReply).toBe(false);
    expect(result.comments[0].parentCommentId).toBeNull();
  });

  it('formats display dates', async () => {
    const file = await makeDocx({
      'word/comments.xml': COMMENTS_XML,
      'word/document.xml': DOCUMENT_XML,
    });

    const result = await parseDocx(file);
    expect(result.comments[0].dateDisplay).toBe('Mar 12, 2024');
  });

  it('throws on missing comments.xml', async () => {
    const file = await makeDocx({
      'word/document.xml': DOCUMENT_XML,
    });

    await expect(parseDocx(file)).rejects.toThrow();
  });

  it('returns empty comments for DOCX with no comment elements', async () => {
    const emptyComments = `<?xml version="1.0" encoding="UTF-8"?>
      <w:comments xmlns:w="${W}"/>`;
    const file = await makeDocx({
      'word/comments.xml': emptyComments,
      'word/document.xml': DOCUMENT_XML,
    });

    const result = await parseDocx(file);
    expect(result.comments).toEqual([]);
  });
});
