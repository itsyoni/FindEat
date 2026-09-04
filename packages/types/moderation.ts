import type { PostType } from "./post";
import type { UserSummary } from "./user";

export type ReportTargetType =
  | "USER"
  | "POST"
  | "COMMENT"
  | "RESTAURANT"
  | "SNAP";
export type ReportReason =
  | "WRONG_RESTAURANT"
  | "COPYRIGHT_INFRINGEMENT"
  | "HATE_SPEECH"
  | "HARASSMENT"
  | "SPAM"
  | "FALSE_INFORMATION"
  | "INAPPROPRIATE_CONTENT"
  | "OTHER";
export type ReportStatus =
  | "PENDING"
  | "AWAITING_AUTHOR"
  | "UNDER_REVIEW"
  | "RESOLVED"
  | "DISMISSED";
export type ReportSource =
  | "USER_REPORT"
  | "RESTAURANT_REPORT"
  | "COPYRIGHT"
  | "ADMIN"
  | "AUTOMATED";

export type CreateReportInput = {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
  source?: ReportSource;
  reportingRestaurantId?: string;
};

export type ModerationUser = UserSummary & {
  email?: string;
  isSuspended?: boolean;
};

export type ModerationReport = {
  id: string;
  postId?: string | null;
  commentId?: string | null;
  snapId?: string | null;
  targetType: ReportTargetType;
  reason: ReportReason;
  details?: string | null;
  status: ReportStatus;
  source: ReportSource;
  reporter: ModerationUser;
  reportedUser?: ModerationUser | null;
  post?: {
    id: string;
    type: PostType;
    authorId?: string | null;
    contentPost?: { caption?: string | null; imageUrl?: string | null } | null;
    reviewPost?: { summary?: string | null; coverImageUrl?: string | null } | null;
  } | null;
  comment?: {
    id: string;
    content: string;
    postId: string;
    user: ModerationUser;
  } | null;
  snap?: {
    id: string;
    userId: string;
    imageUrl?: string | null;
    videoUrl?: string | null;
    caption?: string | null;
    createdAt: string;
  } | null;
  restaurant?: { id: string; name: string; logoUrl?: string | null } | null;
  reportingRestaurant?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  } | null;
  authorResponse?: "CHANGED_RESTAURANT" | "CONFIRMED_CORRECT" | null;
  resolution?: string | null;
  reviewedBy?: ModerationUser | null;
  resolutionNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ModerationActionDecision = {
  id: string;
  action: string;
  reason: string;
  metadata?: {
    targetType?: "COMMENT" | "POST" | "SNAP";
    content?: string;
    imageUrl?: string | null;
    videoUrl?: string | null;
    caption?: string | null;
  } | null;
  createdAt: string;
  reversedAt?: string | null;
  post?: {
    id: string;
    type: PostType;
    contentPost?: { imageUrl?: string | null; caption?: string | null } | null;
    reviewPost?: {
      coverImageUrl?: string | null;
      summary?: string | null;
    } | null;
  } | null;
  appeals?: Array<{
    id: string;
    reason: string;
    status: string;
    resolutionNote?: string | null;
    createdAt: string;
  }>;
};
