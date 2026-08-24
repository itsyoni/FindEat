export const ONBOARDING_STEPS = [
  "FOOD_PREFERENCES",
  "DIETARY_PREFERENCES",
  "ALLERGIES",
  "LOCATION",
  "CAMERA_PERMISSION",
  "PHOTOS_PERMISSION",
  "NOTIFICATIONS_PERMISSION",
  "SAVE_TUTORIAL",
  "DISH_REVIEWS",
  "SOCIAL_DISCOVERY",
  "COMPLETION",
  "COMPLETED",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const FOOD_INTERESTS = [
  "SUSHI",
  "ITALIAN",
  "BURGERS",
  "BAKERIES",
  "ASIAN",
  "MEXICAN",
  "STEAKHOUSES",
  "COFFEE",
  "BARS",
  "DESSERTS",
  "HEALTHY",
  "VEGAN",
  "PIZZA",
  "BREAKFAST",
  "BRUNCH",
  "SEAFOOD",
  "STREET_FOOD",
  "MIDDLE_EASTERN",
  "MEDITERRANEAN",
  "INDIAN",
  "THAI",
  "CHINESE",
  "KOREAN",
  "JAPANESE",
  "FRENCH",
  "BBQ",
  "TACOS",
  "COCKTAILS",
  "WINE",
  "LATE_NIGHT",
] as const;

export type FoodInterest = (typeof FOOD_INTERESTS)[number];

export type OnboardingProgress = {
  locationChoice?: "GRANTED" | "DENIED" | "SKIPPED" | "UNAVAILABLE";
  foodPreferencesPreferNotToSay?: boolean;
  dietaryPreferencesPreferNotToSay?: boolean;
  allergiesPreferNotToSay?: boolean;
  saveTutorialCompleted?: boolean;
  followedUserIds?: string[];
};

export type OnboardingState = {
  foodInterests: string[];
  favoriteCuisines: string[];
  foodPreferences: string[];
  dietaryRestrictions: string[];
  restaurantDietaryRequirements: string[];
  allergies: string[];
  onboardingStep: OnboardingStep | null;
  onboardingProgress: OnboardingProgress | null;
  onboardingCompletedAt: string | null;
  seenCoachMarks: string[];
};

export type UpdateOnboardingInput = Partial<
  Pick<
    OnboardingState,
    | "foodInterests"
    | "favoriteCuisines"
    | "foodPreferences"
    | "dietaryRestrictions"
    | "restaurantDietaryRequirements"
    | "allergies"
    | "onboardingStep"
    | "onboardingProgress"
  >
> & {
  step?: OnboardingStep;
  progress?: OnboardingProgress;
};
