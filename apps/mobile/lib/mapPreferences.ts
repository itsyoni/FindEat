import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  MapPreferences,
  RestaurantMapFilter,
  RestaurantMapSort,
} from "@findeat/types";

export const DEFAULT_MAP_PREFERENCES: MapPreferences = {
  filter: "ALL",
  sort: "BEST",
  radiusKm: 50,
  matchDietary: false,
  matchCuisines: false,
  hideFlaggedAllergens: false,
  activityHeatmapEnabled: true,
  badgeKeys: [],
};

const MAP_PREFERENCES_VERSION = 3;
const FILTERS: RestaurantMapFilter[] = [
  "ALL",
  "SAVED",
  "WANT_TO_TRY",
  "VISITED",
  "FAVORITE",
  "CLAIMED",
];
const SORTS: RestaurantMapSort[] = [
  "BEST",
  "DISTANCE",
  "RATING",
  "MOST_REVIEWED",
];
const RADII = [10, 50, 100, 200, null];
const BADGE_KEYS = [
  "LOVERS_PLACE",
  "FRIENDS_FAVORITE",
  "FAMILY_PICK",
  "CELEBRATION_SPOT",
  "WORK_FRIENDLY",
  "ACCESSIBLE_CHOICE",
  "EASY_PARKING",
  "WIFI_READY",
  "OUTDOOR_FAVORITE",
  "QUIET_SPOT",
  "PET_FRIENDLY",
  "LATE_NIGHT_GO_TO",
] as const;

function storageKey(userId: string) {
  return `findeat_map_preferences_${userId}`;
}

export async function getMapPreferences(userId: string) {
  try {
    const stored = await AsyncStorage.getItem(storageKey(userId));
    if (!stored) return DEFAULT_MAP_PREFERENCES;

    const parsed = JSON.parse(stored) as Partial<MapPreferences> & {
      version?: number;
    };
    const storedRadius = RADII.includes(parsed.radiusKm as number | null)
      ? (parsed.radiusKm as number | null)
      : DEFAULT_MAP_PREFERENCES.radiusKm;
    return {
      filter: FILTERS.includes(parsed.filter as RestaurantMapFilter)
        ? (parsed.filter as RestaurantMapFilter)
        : DEFAULT_MAP_PREFERENCES.filter,
      sort: SORTS.includes(parsed.sort as RestaurantMapSort)
        ? (parsed.sort as RestaurantMapSort)
        : DEFAULT_MAP_PREFERENCES.sort,
      radiusKm: storedRadius,
      matchDietary: parsed.matchDietary === true,
      matchCuisines: parsed.matchCuisines === true,
      hideFlaggedAllergens: parsed.hideFlaggedAllergens === true,
      activityHeatmapEnabled: parsed.activityHeatmapEnabled !== false,
      badgeKeys: (parsed.badgeKeys ?? []).filter((key): key is typeof BADGE_KEYS[number] =>
        BADGE_KEYS.includes(key as typeof BADGE_KEYS[number]),
      ),
    };
  } catch {
    return DEFAULT_MAP_PREFERENCES;
  }
}

export async function saveMapPreferences(
  userId: string,
  preferences: MapPreferences,
) {
  await AsyncStorage.setItem(
    storageKey(userId),
    JSON.stringify({ ...preferences, version: MAP_PREFERENCES_VERSION }),
  );
}
