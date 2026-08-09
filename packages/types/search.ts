import type { UserRelationship } from "./profile";
import type { GoogleRestaurantSuggestion } from "./restaurant";
import type { DishSearchResult } from "./menu";

export type SearchEntityType = "USER" | "RESTAURANT" | "DISH";

export type SearchResultItem = {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  relationship?: UserRelationship;
  restaurantSuggestion?: GoogleRestaurantSuggestion;
  dish?: DishSearchResult;
};

export type UserSearchResult = {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  relationship?: UserRelationship;
};

export type FollowSuggestion = UserSearchResult & {
  creatorScore: number;
  followersCount: number;
  postsCount: number;
};

export type RecentSearchItem = SearchResultItem;
