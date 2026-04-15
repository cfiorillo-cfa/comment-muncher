import type { RawComment } from '../types';
import { W_NS, W14_NS, getTextContent, parseXml } from './xml-helpers';

export function parseCommentsXml(xml: string): RawComment[] {
  const doc = parseXml(xml);
  if (!doc) return [];

  const commentElements = doc.getElementsByTagNameNS(W_NS, 'comment');
  const comments: RawComment[] = [];

  for (let i = 0; i < commentElements.length; i++) {
    const el = commentElements[i];
    const id = el.getAttributeNS(W_NS, 'id') ?? el.getAttribute('w:id') ?? '';
    const author = el.getAttributeNS(W_NS, 'author') ?? el.getAttribute('w:author') ?? '';
    const date = el.getAttributeNS(W_NS, 'date') ?? el.getAttribute('w:date') ?? '';

    const paragraphs = el.getElementsByTagNameNS(W_NS, 'p');
    const firstP = paragraphs[0] ?? null;
    const paraId =
      firstP?.getAttributeNS(W14_NS, 'paraId') ??
      firstP?.getAttribute('w14:paraId') ??
      null;

    const text = getTextContent(el);

    comments.push({ id, author, date, text, paraId });
  }

  return comments;
}
