export type SupportTicketCategory =
  | "BUG"
  | "FEATURE_REQUEST"
  | "ACCOUNT"
  | "RESTAURANT"
  | "CONTENT"
  | "SAFETY"
  | "OTHER";

export type SupportTicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED";

type SupportTicketUser = {
  id: string;
  displayName: string;
  username: string;
  email?: string;
  avatarUrl?: string | null;
  isAdmin?: boolean;
};

export type SupportTicket = {
  id: string;
  category: SupportTicketCategory;
  subject: string;
  message: string;
  attachments?: Array<{ type: "IMAGE" | "VIDEO"; url: string }> | null;
  status: SupportTicketStatus;
  adminReply?: string | null;
  handledById?: string | null;
  handledBy?: SupportTicketUser | null;
  user?: SupportTicketUser | null;
  submitterName?: string | null;
  submitterEmail?: string | null;
  submittedFromWeb?: boolean;
  restaurantId?: string | null;
  restaurant?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  } | null;
  knownIssue?: {
    id: string;
    title: string;
    description?: string | null;
    status: import("./known-issue").KnownIssueStatus;
    severity?: import("./known-issue").KnownIssueSeverity;
    isPublic?: boolean;
    affectedAreas?: string[];
  } | null;
  plannedFeature?: {
    id: string;
    title: string;
    description?: string | null;
    status: import("./planned-feature").PlannedFeatureStatus;
    targetLabel?: string | null;
  } | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateSupportTicketInput = Pick<
  SupportTicket,
  "category" | "subject" | "message"
> & {
  restaurantId?: string;
  attachments?: Array<{ type: "IMAGE" | "VIDEO"; url: string }>;
};
