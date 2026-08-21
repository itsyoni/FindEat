import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type {
  VisitDetectionMode,
  VisitDetectionPreferences,
} from "@findeat/types";
import { api } from "@/lib/api";
import {
  VISIT_DEFAULT_MAX_GEOFENCES,
  VISIT_GEOFENCE_REFRESH_INTERVAL_MS,
  VISIT_GEOFENCE_TASK,
  VISIT_IOS_MAX_GEOFENCES,
  VISIT_REGION_STRATEGY_VERSION,
} from "./config";
import { processVisitGeofenceEvent } from "./geofenceTask";
import { clearVisitNotification } from "./reminders";
import {
  discardStaleDwelling,
  resolveVisitDetectionMode,
} from "./visitCandidateLogic";
import {
  clearActiveVisitDetectionUser,
  getRegisteredVisitRegions,
  getVisitCandidates,
  getVisitDetectionPreferences,
  saveVisitCandidates,
  saveRegisteredVisitRegions,
  saveVisitDetectionPreferences,
  setActiveVisitDetectionUser,
} from "./storage";

function distanceMeters(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number },
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(value));
}

async function determineVisitDetectionMode(): Promise<VisitDetectionMode> {
  const [foreground, background, available] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
    Location.isBackgroundLocationAvailableAsync(),
  ]);
  return resolveVisitDetectionMode({
    foregroundGranted: foreground.status === "granted",
    backgroundGranted: background.status === "granted",
    backgroundAvailable: available,
  });
}

export async function requestVisitDetectionPermissions() {
  let foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    foreground = await Location.requestForegroundPermissionsAsync();
  }
  if (foreground.status !== "granted") return "UNAVAILABLE" as const;

  let notifications = await Notifications.getPermissionsAsync();
  if (notifications.status !== "granted") {
    // Expo selects the current platform's entry from an options object. Passing
    // an iOS-only object on Android produces an undefined native request.
    notifications = await Notifications.requestPermissionsAsync();
  }
  if (notifications.status !== "granted") return "UNAVAILABLE" as const;

  const available = await Location.isBackgroundLocationAvailableAsync();
  if (!available) return "FOREGROUND" as const;
  const background = await Location.requestBackgroundPermissionsAsync();
  return background.status === "granted" ? "FULL" : "FOREGROUND";
}

export async function enableVisitDetection(userId: string, language: string) {
  const mode = await requestVisitDetectionPermissions();
  const current = await getVisitDetectionPreferences(userId);
  const preferences: VisitDetectionPreferences = {
    ...current,
    enabled: mode !== "UNAVAILABLE",
    promptSeen: true,
    promptSuppressed: mode === "UNAVAILABLE",
    mode,
  };
  await saveVisitDetectionPreferences(userId, preferences);
  if (!preferences.enabled) return preferences;
  await setActiveVisitDetectionUser(userId, language);
  return refreshVisitGeofences(userId, true);
}

export async function disableVisitDetection(userId: string) {
  const current = await getVisitDetectionPreferences(userId);
  const preferences = {
    ...current,
    enabled: false,
    promptSeen: true,
    promptSuppressed: true,
  };
  await saveVisitDetectionPreferences(userId, preferences);
  const candidates = await getVisitCandidates(userId);
  await Promise.all(
    candidates.map((candidate) => clearVisitNotification(candidate.notificationId)),
  );
  await stopVisitGeofencing(userId);
  return preferences;
}

export async function stopVisitGeofencing(userId: string) {
  try {
    if (await Location.hasStartedGeofencingAsync(VISIT_GEOFENCE_TASK)) {
      await Location.stopGeofencingAsync(VISIT_GEOFENCE_TASK);
    }
  } catch (error) {
    console.warn("Could not stop visit geofencing", error);
  }
  await clearActiveVisitDetectionUser(userId);
}

export async function suspendVisitDetection(userId: string) {
  const candidates = await getVisitCandidates(userId);
  await Promise.all(
    candidates.map((candidate) => clearVisitNotification(candidate.notificationId)),
  );
  await stopVisitGeofencing(userId);
}

export async function refreshVisitGeofences(userId: string, force = false) {
  const storedCandidates = await getVisitCandidates(userId);
  const retainedCandidates = discardStaleDwelling(storedCandidates, Date.now());
  if (retainedCandidates.length !== storedCandidates.length) {
    await saveVisitCandidates(userId, retainedCandidates);
  }
  const preferences = await getVisitDetectionPreferences(userId);
  if (!preferences.enabled) return preferences;
  const mode = await determineVisitDetectionMode();
  const nextPreferences = {
    ...preferences,
    enabled: mode !== "UNAVAILABLE",
    promptSuppressed:
      mode === "UNAVAILABLE" ? true : preferences.promptSuppressed,
    mode,
  };
  await saveVisitDetectionPreferences(userId, nextPreferences);
  if (mode === "UNAVAILABLE") {
    const candidates = await getVisitCandidates(userId);
    await Promise.all(
      candidates.map((candidate) =>
        clearVisitNotification(candidate.notificationId),
      ),
    );
    await stopVisitGeofencing(userId);
    return nextPreferences;
  }

  const maxGeofences =
    Platform.OS === "ios"
      ? VISIT_IOS_MAX_GEOFENCES
      : VISIT_DEFAULT_MAX_GEOFENCES;
  const registered = await getRegisteredVisitRegions(userId);
  const registeredIsValid =
    !!registered &&
    registered.strategyVersion === VISIT_REGION_STRATEGY_VERSION &&
    Number.isFinite(registered.refreshedAt) &&
    Number.isFinite(registered.center?.latitude) &&
    Number.isFinite(registered.center?.longitude) &&
    Array.isArray(registered.restaurants) &&
    registered.restaurants.length <= maxGeofences;

  // Opening or returning to the app used to request a location every time just
  // to prove that the cached regions were still nearby. Besides being wasteful,
  // those checks made iOS's location-access map look like a movement trail.
  // A fresh region set is safe to reuse without touching Core Location again.
  if (
    !force &&
    registeredIsValid &&
    Date.now() - registered.refreshedAt <
      VISIT_GEOFENCE_REFRESH_INTERVAL_MS
  ) {
    if (mode !== "FULL") return nextPreferences;
    if (await Location.hasStartedGeofencingAsync(VISIT_GEOFENCE_TASK)) {
      return nextPreferences;
    }
  }

  const currentLocation =
    (await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1_000 })) ??
    (await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }));
  const center = {
    latitude: currentLocation.coords.latitude,
    longitude: currentLocation.coords.longitude,
  };
  const canReuse =
    !force &&
    registeredIsValid &&
    Date.now() - registered.refreshedAt <
      VISIT_GEOFENCE_REFRESH_INTERVAL_MS;
  const candidates = canReuse
    ? registered.restaurants
    : await api.restaurants.visitDetectionCandidates({
        ...center,
        limit: maxGeofences,
      });
  const regions = canReuse
    ? registered
    : {
        strategyVersion: VISIT_REGION_STRATEGY_VERSION,
        refreshedAt: Date.now(),
        center,
        restaurants: Array.isArray(candidates) ? candidates : [],
      };
  if (!canReuse) await saveRegisteredVisitRegions(userId, regions);
  if (mode === "FULL") {
    const alreadyStarted = await Location.hasStartedGeofencingAsync(
      VISIT_GEOFENCE_TASK,
    );
    if (regions.restaurants.length === 0) {
      if (alreadyStarted) {
        await Location.stopGeofencingAsync(VISIT_GEOFENCE_TASK);
      }
      return nextPreferences;
    }
    if (canReuse && alreadyStarted) return nextPreferences;
    await Location.startGeofencingAsync(
      VISIT_GEOFENCE_TASK,
      regions.restaurants.map((restaurant) => ({
        identifier: restaurant.id,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        radius: restaurant.radius,
        notifyOnEnter: true,
        notifyOnExit: true,
      })),
    );
  } else if (await Location.hasStartedGeofencingAsync(VISIT_GEOFENCE_TASK)) {
    await Location.stopGeofencingAsync(VISIT_GEOFENCE_TASK);
  }
  return nextPreferences;
}

export async function processForegroundVisitLocation(
  userId: string,
  location: { latitude: number; longitude: number },
) {
  const [regions, candidates] = await Promise.all([
    getRegisteredVisitRegions(userId),
    getVisitCandidates(userId),
  ]);
  if (!regions) return;
  const dwellingIds = new Set(
    candidates
      .filter((candidate) => candidate.status === "DWELLING")
      .map((candidate) => candidate.restaurantId),
  );
  for (const restaurant of regions.restaurants) {
    const inside = distanceMeters(location, restaurant) <= restaurant.radius;
    if (inside && !dwellingIds.has(restaurant.id)) {
      await processVisitGeofenceEvent(
        userId,
        restaurant.id,
        Location.GeofencingEventType.Enter,
      );
    } else if (!inside && dwellingIds.has(restaurant.id)) {
      await processVisitGeofenceEvent(
        userId,
        restaurant.id,
        Location.GeofencingEventType.Exit,
      );
    }
  }
}
