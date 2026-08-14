import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import type {
  VisitDetectionMode,
  VisitDetectionPreferences,
} from "@findeat/types";
import { api } from "@/lib/api";
import {
  VISIT_GEOFENCE_REFRESH_DISTANCE_METERS,
  VISIT_GEOFENCE_REFRESH_INTERVAL_MS,
  VISIT_GEOFENCE_TASK,
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
    notifications = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
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
  await refreshVisitGeofences(userId, true);
  return preferences;
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

  const currentLocation =
    (await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1_000 })) ??
    (await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }));
  const center = {
    latitude: currentLocation.coords.latitude,
    longitude: currentLocation.coords.longitude,
  };
  const registered = await getRegisteredVisitRegions(userId);
  const canReuse =
    !force &&
    registered &&
    Date.now() - registered.refreshedAt <
      VISIT_GEOFENCE_REFRESH_INTERVAL_MS &&
    distanceMeters(center, registered.center) <
      VISIT_GEOFENCE_REFRESH_DISTANCE_METERS;
  const regions = canReuse
    ? registered
    : {
        refreshedAt: Date.now(),
        center,
        restaurants: await api.restaurants.visitDetectionCandidates({
          ...center,
          limit: 18,
        }),
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
