import type { Menu } from "./menu";
import type { UserRestaurant, UserSummary } from "./user";
import type { Post } from "./post";

export type RestaurantStatus =
  | "PENDING"
  | "VERIFIED"
  | "CLAIMED"
  | "REJECTED"
  | "MERGED";

export type RestaurantSource = "USER" | "MAPBOX" | "GOOGLE" | "OSM" | "ADMIN";

export const RESTAURANT_WEEKDAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export type RestaurantWeekday = (typeof RESTAURANT_WEEKDAYS)[number];

export type RestaurantOpeningPeriod = {
  open: string;
  close: string;
};

export type RestaurantOpeningHours = {
  timezone: string;
  weekly: Record<RestaurantWeekday, RestaurantOpeningPeriod[]>;
};

export type RestaurantAddressChangeRequest = {
  id: string;
  restaurantId: string;
  requestedById: string;
  proposedAddress: string;
  proposedCity: string;
  proposedLatitude: number;
  proposedLongitude: number;
  reason?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
};

export type RestaurantPostPreview = {
  id: string;
  type: "CONTENT" | "REVIEW";
  authorRestaurantId?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  rating?: number | null;
  author: UserSummary;
  _count: {
    likes: number;
    comments: number;
  };
};

export type RestaurantMembership = {
  role: "OWNER" | "MANAGER" | "STAFF";
  restaurant: {
    id: string;
    name: string;
    logoUrl: string | null;
    logoThumbnailUrl?: string | null;
    city: string | null;
    status: RestaurantStatus;
  };
};

export type ManagedRestaurant = {
  id: string;
  name: string;
  logoUrl?: string | null;
  logoThumbnailUrl?: string | null;
  coverUrl?: string | null;
  coverThumbnailUrl?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  website?: string | null;
  instagram?: string | null;
  bio?: string | null;
  openingHours?: RestaurantOpeningHours | null;
  categories: string[];
  foodCertifications?: string[];
  setupComplete: boolean;
  missingSetupFields: string[];
  pendingAddressChangeRequest?: RestaurantAddressChangeRequest | null;
  followersCount?: number;
  averageRating?: number | null;
  reviewsCount?: number;
  accessRole?: "OWNER" | "MANAGER" | "ADMIN" | null;
  status?: RestaurantStatus;
};

export const RESTAURANT_CATEGORY_OPTIONS = [
  "Cafe",
  "Bakery",
  "Fast food",
  "Casual dining",
  "Fine dining",
  "Bar",
  "Desserts",
  "Italian",
  "Japanese",
  "Chinese",
  "Indian",
  "Thai",
  "Mexican",
  "Mediterranean",
  "Middle Eastern",
  "American",
  "Korean",
  "Greek",
  "Vegan",
  "Other",
] as const;

export const RESTAURANT_FOOD_CERTIFICATION_OPTIONS = [
  "KOSHER",
  "HALAL",
] as const;

export type RestaurantPostSection = "OFFICIAL" | "COMMUNITY" | "REVIEWS";

export type PlaceSaveStatus =
  | "NONE"
  | "WANT_TO_TRY"
  | "VISITED"
  | "FAVORITE";

export type RestaurantPostsPage = {
  items: RestaurantPostPreview[];
  nextCursor: string | null;
};

export type Restaurant = {
  id: string;
  name: string;
  bio?: string | null;
  logoUrl?: string | null;
  logoThumbnailUrl?: string | null;
  coverUrl?: string | null;
  coverThumbnailUrl?: string | null;

  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;

  mapboxId?: string | null;
  googlePlaceId?: string | null;
  placeName?: string | null;

  phone?: string | null;
  website?: string | null;
  instagram?: string | null;
  openingHours?: RestaurantOpeningHours | null;
  foodCertifications?: string[];

  status?: RestaurantStatus;
  source?: RestaurantSource;

  followersCount: number;
  isFollowing: boolean;

  userSaves?: UserRestaurant[];
  userRestaurant?: UserRestaurant | null;

  menus: Menu[];
  posts: RestaurantPostPreview[];
  averageRating?: number | null;
  reviewsCount?: number;
  distanceKm?: number;
  savedListCount?: number;
  compatibility?: {
    allergenWarnings: Array<{ tag: string; dishCount: number }>;
    dietaryMatches: Array<{ tag: string; dishCount: number }>;
    cuisineMatches: Array<{ tag: string; dishCount: number }>;
  };
};

export type SavedPostAttribution = {
  id: string;
  wantToTry: boolean;
  visited: boolean;
  favorite: boolean;
  restaurant: Pick<Restaurant, "id" | "name" | "logoUrl" | "city">;
  post: Post;
};

export type SavedRestaurant = UserRestaurant & {
  restaurant: Pick<
    Restaurant,
    "id" | "name" | "logoUrl" | "coverUrl" | "city" | "address" | "status"
  >;
};

export type RestaurantMapFilter =
  | "ALL"
  | "SAVED"
  | "WANT_TO_TRY"
  | "VISITED"
  | "FAVORITE"
  | "CLAIMED";

export type RestaurantMapSort =
  | "BEST"
  | "DISTANCE"
  | "RATING"
  | "MOST_REVIEWED";

export type GoogleRestaurantSuggestion = {
  source: "GOOGLE";
  googlePlaceId: string;
  name: string;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number;
};

export type SelectedRestaurant =
  | {
      source: "FINDEAT";
      restaurant: Restaurant;
    }
  | GoogleRestaurantSuggestion;

export type RestaurantSearchResponse = {
  findeat: Restaurant[];
  google: GoogleRestaurantSuggestion[];
};
