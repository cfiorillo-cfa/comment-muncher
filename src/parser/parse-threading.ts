import type { CommentExtension } from '../types';
import { W15_NS, parseXml } from './xml-helpers';

export function parseThreadingXml(xml: string | null): CommentExtension[] {
  if (!xml) return [];

  const doc = parseXml(xml);
  if (!doc) return [];

  const elements = doc.getElementsByTagNameNS(W15_NS, 'commentEx');
  const extensions: CommentExtension[] = [];

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const paraId =
      el.getAttributeNS(W15_NS, 'paraId') ??
      el.getAttribute('w15:paraId') ??
      '';
    const doneAttr =
      el.getAttributeNS(W15_NS, 'done') ?? el.getAttribute('w15:done');
    const parentParaId =
      el.getAttributeNS(W15_NS, 'paraIdParent') ??
      el.getAttribute('w15:paraIdParent') ??
      null;

    extensions.push({
      paraId,
      done: doneAttr === '1',
      parentParaId,
    });
  }

  return extensions;
}
