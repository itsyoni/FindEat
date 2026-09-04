import type { UserSummary } from './user';
import type { UserRelationship } from './profile';
import type { PostType } from './post';

export type NotificationType =
  | 'FRIEND_POST'
  | 'POST_TAG'
  | 'POST_LIKE'
  | 'POST_COMMENT'
  | 'COMMENT_LIKE'
  | 'COMMENT_REPLY'
  | 'COMMENT_MENTION'
  | 'MESSAGE_MENTION'
  | 'FOLLOW'
  | 'FOLLOW_BACK'
  | 'FRIEND'
  | 'FOLLOW_REQUEST'
  | 'FOLLOW_REQUEST_ACCEPTED'
  | 'MESSAGE'
  | 'GROUP_INVITE'
  | 'GROUP_JOIN'
  | 'POLL_CREATED'
  | 'POLL_ENDED'
  | 'RESTAURANT_CLAIM_APPROVED'
  | 'RESTAURANT_CLAIM_REJECTED'
  | 'RESTAURANT_ADDRESS_CHANGE_APPROVED'
  | 'RESTAURANT_ADDRESS_CHANGE_REJECTED'
  | 'RESTAURANT_FOLLOW'
  | 'RESTAURANT_REVIEW'
  | 'RESTAURANT_MENU_PUBLISHED'
  | 'PLACE_LIST_INVITE'
  | 'PROFILE_TAG_UNLOCKED'
  | 'CREATOR_LEVEL_UP'
  | 'RESTAURANT_BADGE_EARNED'
  | 'REVIEW_INVITE'
  | 'REVIEW_JOIN_REQUEST'
  | 'REVIEW_JOIN_REQUEST_APPROVED'
  | 'REVIEW_JOINED'
  | 'REVIEW_CONTRIBUTION'
  | 'RESTAURANT_DISPUTE'
  | 'MODERATION_ACTION'
  | 'APPEAL_DECISION'
  | 'RESTAURANT_OFFER_AVAILABLE'
  | 'RESTAURANT_REWARD_EXPIRING';

export type AppNotification = {
  id: string;
  recipientId: string;
  actorId?: string | null;
  actor?: UserSummary | null;
  actorIsFollowing?: boolean;
  actorRelationship?: UserRelationship;
  type: NotificationType;
  title?: string | null;
  body?: string | null;
  aggregationCount?: number;
  postId?: string | null;
  reviewInvitationStatus?: "INVITED" | "REQUESTED" | "JOINED" | "DECLINED" | null;
  postPreview?: {
    imageUrl?: string | null;
    videoUrl?: string | null;
    text?: string | null;
    type?: PostType;
    rating?: number | null;
  } | null;
  commentId?: string | null;
  conversationId?: string | null;
  restaurantId?: string | null;
  placeListId?: string | null;
  moderationActionId?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export type NotificationsPage = {
  items: AppNotification[];
  nextCursor: string | null;
};

export type RestaurantNotificationsPage = NotificationsPage & {
  unreadCount: number;
};
