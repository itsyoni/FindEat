import type { Restaurant } from "./restaurant";
import type { UserRelationship } from "./profile";
import type { UserSummary } from "./user";
import type { Sound } from "./sound";

export type PostType = "CONTENT" | "REVIEW";
export type FeedScope = "FOLLOWING" | "EXPLORE";
export type PostVisibility = "PUBLIC" | "FRIENDS" | "PRIVATE";

export type ReviewRecommendedFor =
  | "DATE"
  | "FRIENDS"
  | "FAMILY"
  | "SOLO"
  | "BUSINESS"
  | "QUICK_BITE";

export type ContentPost = {
  postId: string;
  title?: string | null;
  caption?: string | null;
  captionEditedAt?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  media?: ContentPostMedia[];
  sound?: Sound | null;
  soundId?: string | null;
  soundStartTimeMs?: number;
  soundVolume?: number;
  originalAudioVolume?: number;
};

export type ContentPostMedia = {
  id: string;
  contentPostId: string;
  type: "IMAGE" | "VIDEO";
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  width: number;
  height: number;
  durationMs?: number | null;
  order: number;
};

export type ReviewItem = {
  id: string;
  reviewPostId: string;
  createdById: string;

  menuItemId?: string | null;
  menuItem?: {
    id: string;
    name: string;
    description?: string | null;
    price?: number | null;
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
    category?: string | null;
    dishTags?: string[];
  } | null;

  customDishName?: string | null;
  customPrice?: number | null;

  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  rating?: number | null;
  text?: string | null;
  textEditedAt?: string | null;
  tagSnapshot?: string[];
  order: number;

  createdAt: string;
  updatedAt: string;
  primaryMediaId?: string | null;
  primaryMedia?: ReviewDishMedia | null;
  contributions?: ReviewDishContribution[];
  media?: ReviewDishMedia[];
};

export type ReviewDishContribution = {
  id: string;
  reviewItemId: string;
  userId: string;
  rating?: number | null;
  text?: string | null;
  textEditedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user: UserSummary;
};

export type ReviewDishMedia = {
  id: string;
  reviewItemId: string;
  uploadedById: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  createdAt: string;
  uploadedBy: UserSummary;
};

export type ReviewParticipantStatus =
  | "INVITED"
  | "REQUESTED"
  | "JOINED"
  | "DECLINED";

export type ReviewParticipant = {
  id: string;
  postId: string;
  userId: string;
  invitedById?: string | null;
  status: ReviewParticipantStatus;
  joinedAt?: string | null;
  respondedAt?: string | null;
  atmosphereRating?: number | null;
  serviceRating?: number | null;
  valueRating?: number | null;
  createdAt: string;
  updatedAt: string;
  user: UserSummary;
};

export type ReviewPost = {
  postId: string;

  coverImageUrl?: string | null;
  coverThumbnailUrl?: string | null;
  title?: string | null;
  summary?: string | null;
  summaryEditedAt?: string | null;
  visitDate?: string | null;

  overallRating?: number | null;
  atmosphereRating?: number | null;
  serviceRating?: number | null;
  valueRating?: number | null;

  totalPrice?: number | null;
  currency: string;

  wouldReturn?: boolean | null;
  recommendedFor?: ReviewRecommendedFor | null;

  items: ReviewItem[];
};

export type LinkedPost = {
  id: string;
  type: PostType;
  visibility: PostVisibility;
  authorId?: string | null;
  restaurantId?: string | null;
  createdAt: string;
  contentPost?: Pick<
    ContentPost,
    "imageUrl" | "videoUrl" | "caption"
  > | null;
  reviewPost?: (
    Pick<ReviewPost, "coverImageUrl" | "summary" | "overallRating"> & {
      previewImageUrl?: string | null;
      previewImageUrls?: string[];
    }
  ) | null;
};

type PostAuthorRestaurant = {
  id: string;
  name: string;
  logoUrl?: string | null;
  logoThumbnailUrl?: string | null;
};

export type Post = {
  id: string;
  type: PostType;
  visibility: PostVisibility;

  authorId?: string | null;
  author?: UserSummary | null;
  authorRelationship?: UserRelationship | null;

  authorRestaurantId?: string | null;
  authorRestaurant?: PostAuthorRestaurant | null;

  restaurantId?: string | null;
  restaurant?: Restaurant | null;

  contentPost?: ContentPost | null;
  reviewPost?: ReviewPost | null;
  experienceId?: string | null;
  linkedPosts?: LinkedPost[];
  reviewParticipants?: ReviewParticipant[];
  taggedUsers?: UserSummary[];
  canRepost?: boolean;
  isReposted?: boolean;
  repostedAt?: string | null;
  repostedBy?: UserSummary | null;
  canContribute?: boolean;
  collaborationStatus?: ReviewParticipantStatus | null;

  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;

  likesCount: number;
  restaurantSavesCount: number;
  restaurantSavedListCount?: number;
  commentsCount: number;
  hideLikeCount: boolean;
  commentsDisabled: boolean;
  canViewLikes: boolean;
  sharesCount: number;
  isLiked: boolean;
  canDelete: boolean;
  canDisputeRestaurantAssociation?: boolean;
};

export type FeedPage = {
  items: Post[];
  nextCursor: string | null;
};
