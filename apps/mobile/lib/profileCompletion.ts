type ProfileCompletionSource = {
  avatarUrl?: string | null;
  coverUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  bio?: string | null;
  birthday?: string | null;
  pronouns?: string | string[] | null;
  allergies?: string[];
  foodPreferences?: string[];
  dietaryRestrictions?: string[];
  restaurantDietaryRequirements?: string[];
  favoriteCuisines?: string[];
  profileCompletedFields?: string[];
};

const DETAIL_FIELDS = [
  "birthday",
  "pronouns",
  "allergies",
  "foodPreferences",
  "dietaryRestrictions",
  "restaurantDietaryRequirements",
  "favoriteCuisines",
] as const;

function hasValue(value: string | string[] | null | undefined) {
  return Array.isArray(value)
    ? value.length > 0
    : typeof value === "string" && value.trim().length > 0;
}

export function getProfileCompletion(source: ProfileCompletionSource) {
  const completedFields = new Set(source.profileCompletedFields ?? []);
  const items = [
    Boolean(source.avatarUrl),
    Boolean(source.coverUrl),
    hasValue(source.displayName),
    hasValue(source.username),
    hasValue(source.bio),
    ...DETAIL_FIELDS.map(
      (field) => hasValue(source[field]) || completedFields.has(field),
    ),
  ];
  const completed = items.filter(Boolean).length;
  const total = items.length;

  return {
    completed,
    total,
    remaining: total - completed,
    percentage: Math.round((completed / total) * 100),
  };
}
