import { describe, it, expect } from 'vitest';
import { parseThreadingXml } from './parse-threading';

const W15 = 'http://schemas.microsoft.com/office/word/2012/wordml';

describe('parseThreadingXml', () => {
  it('extracts resolved status and threading info', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <w15:commentsEx xmlns:w15="${W15}">
        <w15:commentEx w15:paraId="1A2B3C01" w15:done="1"/>
        <w15:commentEx w15:paraId="1A2B3C02" w15:paraIdParent="1A2B3C01" w15:done="0"/>
      </w15:commentsEx>`;

    const extensions = parseThreadingXml(xml);
    expect(extensions).toHaveLength(2);

    expect(extensions[0]).toEqual({
      paraId: '1A2B3C01',
      done: true,
      parentParaId: null,
    });

    expect(extensions[1]).toEqual({
      paraId: '1A2B3C02',
      done: false,
      parentParaId: '1A2B3C01',
    });
  });

  it('treats done="0" as false', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <w15:commentsEx xmlns:w15="${W15}">
        <w15:commentEx w15:paraId="AAA" w15:done="0"/>
      </w15:commentsEx>`;
    const extensions = parseThreadingXml(xml);
    expect(extensions[0].done).toBe(false);
  });

  it('treats missing done attribute as false', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <w15:commentsEx xmlns:w15="${W15}">
        <w15:commentEx w15:paraId="AAA"/>
      </w15:commentsEx>`;
    const extensions = parseThreadingXml(xml);
    expect(extensions[0].done).toBe(false);
  });

  it('returns empty array for null input', () => {
    expect(parseThreadingXml(null)).toEqual([]);
  });

  it('returns empty array for empty XML', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <w15:commentsEx xmlns:w15="${W15}"/>`;
    expect(parseThreadingXml(xml)).toEqual([]);
  });
});
