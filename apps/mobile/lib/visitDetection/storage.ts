import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  RestaurantVisitCandidate,
  VisitDetectionCandidate,
  VisitDetectionPreferences,
} from "@findeat/types";

const ACTIVE_USER_KEY = "findeat_visit_detection_active_user";
const LANGUAGE_KEY = "findeat_visit_detection_language";

const preferencesKey = (userId: string) =>
  `findeat_visit_detection_preferences:${userId}`;
const candidatesKey = (userId: string) =>
  `findeat_visit_detection_candidates:${userId}`;
const regionsKey = (userId: string) =>
  `findeat_visit_detection_regions:${userId}`;
const engagementKey = (userId: string) =>
  `findeat_visit_detection_engagement:${userId}`;
const mutedKey = (userId: string) =>
  `findeat_visit_detection_muted:${userId}`;

export type VisitDetectionEngagement = {
  sessions: number;
  restaurantViews: number;
  usedMap: boolean;
  lastSessionAt?: number;
};

export type RegisteredVisitRegions = {
  refreshedAt: number;
  center: { latitude: number; longitude: number };
  restaurants: VisitDetectionCandidate[];
};

export const defaultVisitDetectionPreferences: VisitDetectionPreferences = {
  enabled: false,
  promptSeen: false,
  mode: "UNAVAILABLE",
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getVisitDetectionPreferences(userId: string) {
  return readJson(
    preferencesKey(userId),
    defaultVisitDetectionPreferences,
  );
}

export async function saveVisitDetectionPreferences(
  userId: string,
  preferences: VisitDetectionPreferences,
) {
  await AsyncStorage.setItem(preferencesKey(userId), JSON.stringify(preferences));
}

export function getVisitCandidates(userId: string) {
  return readJson<RestaurantVisitCandidate[]>(candidatesKey(userId), []);
}

export async function saveVisitCandidates(
  userId: string,
  candidates: RestaurantVisitCandidate[],
) {
  await AsyncStorage.setItem(candidatesKey(userId), JSON.stringify(candidates));
}

export function getRegisteredVisitRegions(userId: string) {
  return readJson<RegisteredVisitRegions | null>(regionsKey(userId), null);
}

export async function saveRegisteredVisitRegions(
  userId: string,
  regions: RegisteredVisitRegions,
) {
  await AsyncStorage.setItem(regionsKey(userId), JSON.stringify(regions));
}

export async function setActiveVisitDetectionUser(
  userId: string,
  language: string,
) {
  await Promise.all([
    AsyncStorage.setItem(ACTIVE_USER_KEY, userId),
    AsyncStorage.setItem(LANGUAGE_KEY, language),
  ]);
}

export function getActiveVisitDetectionUser() {
  return AsyncStorage.getItem(ACTIVE_USER_KEY);
}

export function getVisitDetectionLanguage() {
  return AsyncStorage.getItem(LANGUAGE_KEY);
}

export async function clearActiveVisitDetectionUser(userId: string) {
  const activeUserId = await getActiveVisitDetectionUser();
  if (activeUserId === userId) await AsyncStorage.removeItem(ACTIVE_USER_KEY);
}

export function getVisitDetectionEngagement(userId: string) {
  return readJson<VisitDetectionEngagement>(engagementKey(userId), {
    sessions: 0,
    restaurantViews: 0,
    usedMap: false,
  });
}

export async function updateVisitDetectionEngagement(
  userId: string,
  update: Partial<VisitDetectionEngagement>,
) {
  const current = await getVisitDetectionEngagement(userId);
  const next = { ...current, ...update };
  await AsyncStorage.setItem(engagementKey(userId), JSON.stringify(next));
  return next;
}

export function getLocallyMutedVisitRestaurants(userId: string) {
  return readJson<string[]>(mutedKey(userId), []);
}

export async function setLocallyMutedVisitRestaurant(
  userId: string,
  restaurantId: string,
  muted: boolean,
) {
  const current = await getLocallyMutedVisitRestaurants(userId);
  const next = muted
    ? [...new Set([...current, restaurantId])]
    : current.filter((id) => id !== restaurantId);
  await AsyncStorage.setItem(mutedKey(userId), JSON.stringify(next));
}
