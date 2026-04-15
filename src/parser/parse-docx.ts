import JSZip from 'jszip';
import type { Comment, ParseResult, CommentExtension } from '../types';
import { parseCommentsXml } from './parse-comments';
import { parseDocumentXml } from './parse-document';
import { parseThreadingXml } from './parse-threading';

export async function parseDocx(file: File): Promise<ParseResult> {
  const zip = await JSZip.loadAsync(file);

  const commentsFile = zip.file('word/comments.xml');
  if (!commentsFile) {
    throw new Error('This document doesn\'t contain any comment data');
  }

  const documentFile = zip.file('word/document.xml');
  const extendedFile = zip.file('word/commentsExtended.xml');

  const [commentsXml, documentXml, extendedXml] = await Promise.all([
    commentsFile.async('string'),
    documentFile ? documentFile.async('string') : Promise.resolve(''),
    extendedFile ? extendedFile.async('string') : Promise.resolve(null),
  ]);

  const rawComments = parseCommentsXml(commentsXml);
  const anchors = documentXml ? parseDocumentXml(documentXml) : [];
  const extensions = parseThreadingXml(extendedXml);

  const hasThreading = extensions.length > 0;

  const anchorMap = new Map(anchors.map(a => [a.commentId, a]));

  // Build paraId → comment ID mapping
  const paraIdToCommentId = new Map<string, string>();
  for (const raw of rawComments) {
    if (raw.paraId) {
      paraIdToCommentId.set(raw.paraId, raw.id);
    }
  }

  // Build paraId → extension mapping
  const extMap = new Map<string, CommentExtension>();
  for (const ext of extensions) {
    extMap.set(ext.paraId, ext);
  }

  // Determine parent comment IDs via paraId chain
  const commentIdToParentId = new Map<string, string>();
  for (const raw of rawComments) {
    if (!raw.paraId) continue;
    const ext = extMap.get(raw.paraId);
    if (!ext?.parentParaId) continue;
    const parentCommentId = paraIdToCommentId.get(ext.parentParaId);
    if (parentCommentId) {
      commentIdToParentId.set(raw.id, parentCommentId);
    }
  }

  // Assign thread IDs: each top-level comment starts a thread
  const commentIdToThreadId = new Map<string, number>();
  let threadCounter = 0;
  for (const raw of rawComments) {
    if (!commentIdToParentId.has(raw.id)) {
      threadCounter++;
      commentIdToThreadId.set(raw.id, threadCounter);
    }
  }
  // Replies inherit parent's thread ID
  for (const raw of rawComments) {
    const parentId = commentIdToParentId.get(raw.id);
    if (parentId) {
      const threadId = commentIdToThreadId.get(parentId);
      if (threadId) {
        commentIdToThreadId.set(raw.id, threadId);
      }
    }
  }

  // Merge everything into final Comment[]
  const comments: Comment[] = rawComments.map(raw => {
    const anchor = anchorMap.get(raw.id);
    const ext = raw.paraId ? extMap.get(raw.paraId) : undefined;
    const parentCommentId = commentIdToParentId.get(raw.id) ?? null;

    return {
      id: raw.id,
      threadId: commentIdToThreadId.get(raw.id) ?? 0,
      author: raw.author,
      date: raw.date,
      dateDisplay: formatDate(raw.date),
      text: raw.text,
      highlightedContent: anchor?.highlightedContent ?? 'N/A',
      location: anchor?.location ?? 'Unknown',
      resolved: hasThreading ? (ext?.done ?? false) : null,
      parentCommentId,
      isReply: parentCommentId !== null,
    };
  });

  const filename = file.name.replace(/\.docx$/i, '');

  return { comments, filename, hasThreading };
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
