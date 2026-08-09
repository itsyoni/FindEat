import type { UserSummary } from "./user";

export const FOOD_PREFERENCE_OPTIONS = [
  "VEGAN",
  "VEGETARIAN",
  "PESCATARIAN",
  "KOSHER",
  "HALAL",
] as const;

export const DIETARY_RESTRICTION_OPTIONS = [
  "GLUTEN_FREE",
  "LACTOSE_FREE",
  "NUT_FREE",
  "SHELLFISH_FREE",
  "LOW_SODIUM",
  "DIABETIC_FRIENDLY",
] as const;

export const DISH_DIETARY_OPTIONS = [
  ...FOOD_PREFERENCE_OPTIONS,
  ...DIETARY_RESTRICTION_OPTIONS,
] as const;

export const ALLERGEN_OPTIONS = [
  "PEANUTS",
  "TREE_NUTS",
  "MILK",
  "EGGS",
  "WHEAT",
  "SOY",
  "FISH",
  "SHELLFISH",
  "SESAME",
] as const;

export const CUISINE_OPTIONS = [
  "ITALIAN",
  "JAPANESE",
  "THAI",
  "MEXICAN",
  "MEDITERRANEAN",
  "MIDDLE_EASTERN",
  "CHINESE",
  "INDIAN",
  "FRENCH",
  "AMERICAN",
  "KOREAN",
  "GREEK",
] as const;

export const DISH_TAG_OPTIONS = [
  "SPICY",
  "SWEET",
  "DESSERT",
  "BRUNCH",
  "SUSHI",
  "BURGER",
  "PASTA",
  "COFFEE",
  "STREET_FOOD",
  "COMFORT_FOOD",
] as const;

export type DishAllergen = (typeof ALLERGEN_OPTIONS)[number];
export type DishDietaryTag = (typeof DISH_DIETARY_OPTIONS)[number];
export type DishCuisineTag = (typeof CUISINE_OPTIONS)[number];
export type DishTag = (typeof DISH_TAG_OPTIONS)[number];

export type DishCompatibility = {
  allergenWarnings: string[];
  dietaryMatches: string[];
  cuisineMatches: string[];
};

export type Dish = {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  category?: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  allergens: string[];
  dietaryTags: string[];
  cuisineTags: string[];
  dishTags: string[];
  compatibility?: DishCompatibility;
  createdAt?: string;
  reviewsCount?: number;
  averageRating?: number | null;
  isNew?: boolean;
  isFavorite?: boolean;
  favoriteCount?: number;
};

type DishReview = {
  id: string;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  rating?: number | null;
  text?: string | null;
  reviewPost?: {
    post?: {
      author?: UserSummary;
    };
  };
};

export type DishDetails = Dish & {
  restaurant?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    city?: string | null;
  };
  menu?: Pick<Menu, "id" | "title"> | null;
  reviewItems?: DishReview[];
};

export type DishSearchResult = Dish & {
  restaurant: {
    id: string;
    name: string;
    logoUrl?: string | null;
    city?: string | null;
    address?: string | null;
  };
  distanceKm?: number | null;
};

export type Menu = {
  id: string;
  title: string;
  description?: string | null;
  items: Dish[];
};
