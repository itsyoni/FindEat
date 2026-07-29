import type { UserRelationship } from "./profile";
import type { GoogleRestaurantSuggestion } from "./restaurant";

export type SearchEntityType = "USER" | "RESTAURANT" | "DISH";

export type SearchResultItem = {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  relationship?: UserRelationship;
  restaurantSuggestion?: GoogleRestaurantSuggestion;
};

export type UserSearchResult = {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  relationship?: UserRelationship;
};

export type RecentSearchItem = SearchResultItem;
