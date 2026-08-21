export const ONBOARDING_STEPS = [
  "FOOD_PREFERENCES",
  "DIETARY_PREFERENCES",
  "ALLERGIES",
  "LOCATION",
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
] as const;

export type FoodInterest = (typeof FOOD_INTERESTS)[number];

export type OnboardingProgress = {
  locationChoice?: "GRANTED" | "DENIED" | "SKIPPED" | "UNAVAILABLE";
  saveTutorialCompleted?: boolean;
  followedUserIds?: string[];
};

export type OnboardingState = {
  foodInterests: string[];
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
