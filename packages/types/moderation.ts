import type { PostType } from "./post";
import type { UserSummary } from "./user";

export type ReportTargetType = "USER" | "POST" | "COMMENT" | "RESTAURANT";
export type ReportReason =
  | "HATE_SPEECH"
  | "HARASSMENT"
  | "SPAM"
  | "FALSE_INFORMATION"
  | "INAPPROPRIATE_CONTENT"
  | "OTHER";
export type ReportStatus = "PENDING" | "RESOLVED" | "DISMISSED";

export type CreateReportInput = {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
};

export type ModerationUser = UserSummary & {
  email?: string;
  isSuspended?: boolean;
};

export type ModerationReport = {
  id: string;
  targetType: ReportTargetType;
  reason: ReportReason;
  details?: string | null;
  status: ReportStatus;
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
  restaurant?: { id: string; name: string; logoUrl?: string | null } | null;
  reviewedBy?: ModerationUser | null;
  resolutionNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};
