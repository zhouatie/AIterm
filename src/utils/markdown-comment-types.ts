export interface MarkdownCommentAnchor {
  quote: string;
  prefix: string;
  suffix: string;
  startTextOffset: number;
  endTextOffset: number;
}

export interface MarkdownPreviewComment {
  id: string;
  filePath: string;
  anchor: MarkdownCommentAnchor;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarkdownCommentApiResult {
  comments?: MarkdownPreviewComment[];
  success?: boolean;
  error?: string;
}

export interface MarkdownCommentLocationStatus {
  commentId: string;
  located: boolean;
}
