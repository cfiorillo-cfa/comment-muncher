/** Raw comment data extracted from comments.xml */
export interface RawComment {
  id: string;
  author: string;
  date: string;
  text: string;
  paraId: string | null;
}

/** Highlighted content and location extracted from document.xml */
export interface CommentAnchor {
  commentId: string;
  highlightedContent: string;
  location: string;
}

/** Threading and resolved status from commentsExtended.xml */
export interface CommentExtension {
  paraId: string;
  done: boolean;
  parentParaId: string | null;
}

/** Final merged comment for display and export */
export interface Comment {
  id: string;
  threadId: number;
  author: string;
  date: string;
  dateDisplay: string;
  text: string;
  highlightedContent: string;
  location: string;
  resolved: boolean | null;
  parentCommentId: string | null;
  isReply: boolean;
}

/** Result of parsing a DOCX file */
export interface ParseResult {
  comments: Comment[];
  filename: string;
  hasThreading: boolean;
}
