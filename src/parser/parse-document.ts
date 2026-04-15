import type { CommentAnchor } from '../types';
import { W_NS, getTextContent, parseXml } from './xml-helpers';

interface ActiveRange {
  texts: string[];
  location: string;
  lastParagraphIndex: number;
}

interface WalkState {
  paragraphIndex: number;
  currentHeading: string | null;
  activeRanges: Map<string, ActiveRange>;
  results: CommentAnchor[];
}

export function parseDocumentXml(xml: string): CommentAnchor[] {
  const doc = parseXml(xml);
  if (!doc) return [];

  const body = doc.getElementsByTagNameNS(W_NS, 'body')[0];
  if (!body) return [];

  const state: WalkState = {
    paragraphIndex: 0,
    currentHeading: null,
    activeRanges: new Map(),
    results: [],
  };

  walkNode(body, state);

  // Finalize any ranges that never got an end marker
  for (const [commentId, range] of state.activeRanges) {
    state.results.push({
      commentId,
      highlightedContent: range.texts.join('').trim(),
      location: range.location,
    });
  }

  return state.results;
}

function walkNode(node: Node, state: WalkState): void {
  if (!(node instanceof Element)) {
    return;
  }

  // Track paragraphs and headings
  if (node.localName === 'p' && node.namespaceURI === W_NS) {
    state.paragraphIndex++;
    const style = getParagraphStyle(node);
    if (style && /^Heading\d+$/i.test(style)) {
      state.currentHeading = getTextContent(node);
    }
  }

  // Comment range start — begin collecting text
  if (node.localName === 'commentRangeStart' && node.namespaceURI === W_NS) {
    const id =
      node.getAttributeNS(W_NS, 'id') ?? node.getAttribute('w:id') ?? '';
    const location = state.currentHeading
      ? `Section: ${state.currentHeading}`
      : `Paragraph ${state.paragraphIndex}`;
    state.activeRanges.set(id, { texts: [], location, lastParagraphIndex: state.paragraphIndex });
  }

  // Text node — add to all active ranges
  if (node.localName === 't' && node.namespaceURI === W_NS) {
    const text = node.textContent ?? '';
    for (const range of state.activeRanges.values()) {
      // Insert a space when crossing a paragraph boundary
      if (range.texts.length > 0 && range.lastParagraphIndex !== state.paragraphIndex) {
        range.texts.push(' ');
        range.lastParagraphIndex = state.paragraphIndex;
      }
      range.texts.push(text);
    }
  }

  // Comment range end — finalize this range
  if (node.localName === 'commentRangeEnd' && node.namespaceURI === W_NS) {
    const id =
      node.getAttributeNS(W_NS, 'id') ?? node.getAttribute('w:id') ?? '';
    const range = state.activeRanges.get(id);
    if (range) {
      state.results.push({
        commentId: id,
        highlightedContent: range.texts.join('').trim(),
        location: range.location,
      });
      state.activeRanges.delete(id);
    }
  }

  // Recurse into children
  for (let i = 0; i < node.childNodes.length; i++) {
    walkNode(node.childNodes[i], state);
  }
}

function getParagraphStyle(p: Element): string | null {
  const pPr = p.getElementsByTagNameNS(W_NS, 'pPr')[0];
  if (!pPr) return null;
  const pStyle = pPr.getElementsByTagNameNS(W_NS, 'pStyle')[0];
  if (!pStyle) return null;
  return (
    pStyle.getAttributeNS(W_NS, 'val') ??
    pStyle.getAttribute('w:val') ??
    null
  );
}
