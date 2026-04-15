import type { Comment, ParseResult } from '../types';

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const FIELDS = 'comments(id,content,author/displayName,createdTime,resolved,quotedFileContent/value,replies(id,content,author/displayName,createdTime)),nextPageToken';

export function extractDocId(url: string): string | null {
  const match = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

interface DriveComment {
  id: string;
  content: string;
  author: { displayName: string };
  createdTime: string;
  resolved: boolean;
  quotedFileContent?: { value: string };
  replies: DriveReply[];
}

interface DriveReply {
  id: string;
  content: string;
  author: { displayName: string };
  createdTime: string;
}

interface DriveCommentsResponse {
  comments: DriveComment[];
  nextPageToken?: string;
}

export async function fetchGoogleDocComments(url: string, accessToken: string): Promise<ParseResult> {
  const docId = extractDocId(url);
  if (!docId) throw new Error('Please paste a valid Google Docs URL');

  const allComments = await fetchAllPages(docId, accessToken);
  return mapToParseResult(allComments);
}

async function fetchAllPages(docId: string, accessToken: string): Promise<DriveComment[]> {
  const all: DriveComment[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({ fields: FIELDS, pageSize: '100' });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(`${DRIVE_API}/${docId}/comments?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      if (res.status === 404 || res.status === 403) {
        throw new Error("Couldn't access this document. Make sure the URL is correct and you have permission to view it.");
      }
      throw new Error("Couldn't access this document");
    }

    const data: DriveCommentsResponse = await res.json();
    all.push(...(data.comments ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return all;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function mapToParseResult(driveComments: DriveComment[]): ParseResult {
  const comments: Comment[] = [];
  let threadId = 0;

  for (const dc of driveComments) {
    threadId++;
    comments.push({
      id: dc.id, threadId, author: dc.author.displayName,
      date: dc.createdTime, dateDisplay: formatDate(dc.createdTime),
      text: dc.content, highlightedContent: dc.quotedFileContent?.value ?? '',
      location: '', resolved: dc.resolved, parentCommentId: null, isReply: false,
    });

    for (const reply of dc.replies) {
      comments.push({
        id: reply.id, threadId, author: reply.author.displayName,
        date: reply.createdTime, dateDisplay: formatDate(reply.createdTime),
        text: reply.content, highlightedContent: '', location: '',
        resolved: null, parentCommentId: dc.id, isReply: true,
      });
    }
  }

  return { comments, filename: 'Google Doc', hasThreading: true };
}
