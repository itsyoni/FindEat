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
  user?: SupportTicketUser;
  restaurantId?: string | null;
  restaurant?: {
    id: string;
    name: string;
    logoUrl?: string | null;
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
