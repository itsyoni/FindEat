import type { SelectedRestaurant } from "./restaurant";
import type { PostVisibility } from "./post";
import type { ReviewExperienceTag, ReviewRecommendedFor } from "./post";
import type { UserSummary } from "./user";
import type { Dish } from "./menu";

export type SelectedReviewDish = Pick<
  Dish,
  "id" | "name" | "price" | "imageUrl"
>;

export type CreateReviewStep =
  | "RESTAURANT"
  | "COVER"
  | "PARTICIPANTS"
  | "DISHES"
  | "SELECT_MENU_DISH"
  | "ADD_DISH_DETAILS"
  | "PREVIEW";

export type ReviewDishDraft = {
  id: string;
  menuItemId?: string;
  menuItemName?: string;
  menuItemPrice?: number | null;
  customDishName?: string;
  customPrice?: number;
  fallbackImageUrl?: string | null;
  imageUri?: string;
  rating?: number;
  text?: string;
  order: number;
};

export type ReviewDishFormDraft = {
  dishName: string;
  price?: number;
  imageUri?: string;
  rating?: number;
  text: string;
};

export type ReviewInviteeDraft = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  locked?: boolean;
};

export type CreateReviewDraft = {
  visibility: PostVisibility;
  restaurant: SelectedRestaurant | null;
  linkedPostId?: string;
  coverImageUri?: string;
  coverImageUrl?: string;
  summary: string;
  visitDate?: string;
  recommendedFor?: ReviewRecommendedFor;
  experienceTags: ReviewExperienceTag[];
  atmosphereRating?: number;
  serviceRating?: number;
  valueRating?: number;
  totalPrice?: number;
  items: ReviewDishDraft[];
  participants: ReviewInviteeDraft[];
};

type RestaurantReviewItem = {
  id: string;
  name: string;
  rating?: number | null;
  text?: string | null;
};

export type RestaurantReview = {
  id: string;
  imageUrl?: string | null;
  description?: string | null;
  rating?: number | null;
  createdAt: string;
  author: UserSummary;
  items: RestaurantReviewItem[];
  _count: {
    likes: number;
    comments: number;
  };
};
