import type { Post } from "./post";
import type { Restaurant } from "./restaurant";
import type { UserSummary } from "./user";

export type ChatType = "DIRECT" | "GROUP" | "RESTAURANT";
export type MessageType =
  | "TEXT"
  | "IMAGE"
  | "VIDEO"
  | "GIF"
  | "POST"
  | "RESTAURANT"
  | "POLL"
  | "SYSTEM"
  | "SNAP";

export type SendMessagePayload = (
  | { type: "TEXT"; content: string }
  | { type: "POST"; postId: string }
  | { type: "RESTAURANT"; restaurantId: string }
  | { type: "IMAGE"; imageUrl: string }
  | { type: "GIF"; imageUrl: string }
  | { type: "VIDEO"; videoUrl: string }
  | { type: "SNAP"; snapId: string; content: string }
) & { replyToId?: string };

export type MessageSnap = {
  id: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  durationMs?: number | null;
  caption?: string | null;
  expiresAt: string;
  userId: string;
};

type MessageReply = {
  id: string;
  type?: MessageType;
  content: string | null;
  editedAt?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  deletedAt?: string | null;
  sender: UserSummary;
  sentAsRestaurant?: Pick<Restaurant, "id" | "name" | "logoUrl"> | null;
};

export type Chat = {
  id: string;
  type: ChatType;
  title?: string | null;
  imageUrl?: string | null;

  restaurantId?: string | null;
  restaurant?: Pick<Restaurant, "id" | "name" | "logoUrl"> | null;

  lastMessage?: string | null;
  lastMessageSenderId?: string | null;
  lastMessageAt?: string | null;

  unreadCount: number;
  pinned: boolean;
  muted: boolean;
  archived?: boolean;

  participants: {
    userId: string;
    lastReadAt?: string | null;
    pinned?: boolean;
    muted?: boolean;
    archivedAt?: string | null;
    role?: "ADMIN" | "MEMBER";
    user: UserSummary;
  }[];
};

export type Message = {
  id: string;
  type?: MessageType;
  content: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;

  postId?: string | null;
  post?: Post | null;

  snapId?: string | null;
  snap?: MessageSnap | null;

  restaurantId?: string | null;
  restaurant?: Restaurant | null;

  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  senderId: string;
  sender: UserSummary;
  sentAsRestaurantId?: string | null;
  sentAsRestaurant?: Pick<Restaurant, "id" | "name" | "logoUrl"> | null;
  replyToId?: string | null;
  replyTo?: MessageReply | null;
  mentions?: { user: UserSummary }[];
  readReceipts?: { userId: string; readAt: string }[];
  starred?: boolean;
  starredAt?: string;
};

export type RestaurantConversation = {
  id: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
  customer?: UserSummary | null;
};

export type RestaurantMessage = {
  id: string;
  type: MessageType;
  content?: string | null;
  imageUrl?: string | null;
  createdAt: string;
  editedAt?: string | null;
  senderId: string;
  sender: UserSummary;
  sentAsRestaurantId?: string | null;
  sentAsRestaurant?: Pick<Restaurant, "id" | "name" | "logoUrl"> | null;
};
