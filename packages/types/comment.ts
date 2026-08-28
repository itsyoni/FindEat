import type { UserSummary } from "./user";

export type Comment = {
  id: string;
  content: string;
  gifUrl?: string | null;
  createdAt: string;
  editedAt?: string | null;
  user: UserSummary;
  parentId?: string | null;
  parent?: {
    id: string;
    content: string;
    user: UserSummary;
  } | null;
  likesCount: number;
  isLiked: boolean;
  likedByAuthor: boolean;
  canDelete: boolean;
  canModerate: boolean;
  isPinned: boolean;
  pinnedAt?: string | null;
  isAuthorNote?: boolean;
  authorRole?: "CREATOR" | "COLLABORATOR" | "OWNER" | null;
  canPin: boolean;
  mentions?: { user: UserSummary }[];
};

export type CommentContext = {
  isPostAuthor: boolean;
  canCreateAuthorNote: boolean;
  canCreatePoll: boolean;
  poll: PostPoll | null;
};

export type PostPoll = {
  id: string;
  title: string;
  createdAt?: string;
  createdBy?: UserSummary;
  closedAt?: string | null;
  totalVotes: number;
  options: Array<{
    id: string;
    title?: string | null;
    order: number;
    votesCount: number;
    isVoted: boolean;
  }>;
};
