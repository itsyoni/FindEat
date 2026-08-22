import type { ProfileTagKey } from "./profile-tags";

export type Language = "EN" | "HE" | "RU";

export type User = {
  id: string;
  email: string;
  displayName: string;
  username: string;
  createdAt: string;
  avatarUrl: string;
  avatarThumbnailUrl?: string | null;
  coverUrl?: string | null;
  coverThumbnailUrl?: string | null;
  bio?: string | null;
  language: Language;
  showActivityStatus?: boolean;
  showWhatsNewPopups?: boolean;
  hideLikeCountsByDefault?: boolean;
  commentsDisabledByDefault?: boolean;
  creatorScore?: number;
  selectedProfileTag?: ProfileTagKey | null;
  isPrivate?: boolean;
  phoneNumber?: string | null;
  birthday?: string | null;
  pronouns?: string | null;
  allergies?: string[];
  foodPreferences?: string[];
  dietaryRestrictions?: string[];
  restaurantDietaryRequirements?: string[];
  favoriteCuisines?: string[];
  foodInterests?: string[];
  profileCompletedFields?: string[];
  onboardingStep?: import("./onboarding").OnboardingStep | null;
  onboardingProgress?: import("./onboarding").OnboardingProgress | null;
  onboardingCompletedAt?: string | null;
  seenCoachMarks?: string[];
  showPhoneNumber?: boolean;
  showBirthday?: boolean;
  showPronouns?: boolean;
  showAllergies?: boolean;
  showFoodPreferences?: boolean;
  showDietaryRestrictions?: boolean;
  showFavoriteCuisines?: boolean;
  authMethods?: {
    hasPassword: boolean;
    providers: Array<"APPLE" | "GOOGLE">;
  };
};

export type FollowRequest = {
  id: string;
  createdAt: string;
  requester: UserSummary & { relationship: import("./profile").UserRelationship };
};

export type UserSummary = {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  avatarThumbnailUrl?: string | null;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  showActivityStatus?: boolean;
};

export type BlockedUser = Pick<
  UserSummary,
  "id" | "username" | "displayName" | "avatarUrl"
> & {
  blockedAt: string;
};

export type UserRestaurant = {
  id: string;
  wantToTry: boolean;
  visited: boolean;
  favorite: boolean;
  savedFromPostId?: string | null;
  recommendedByUserId?: string | null;
  visitedAt?: string | null;
  favoritedAt?: string | null;
};
