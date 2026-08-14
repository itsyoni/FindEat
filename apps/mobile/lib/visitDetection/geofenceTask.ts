import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import {
  VISIT_GEOFENCE_TASK,
} from "./config";
import { enterRestaurantVisit, exitRestaurantVisit } from "./visitCandidateLogic";
import { scheduleVisitReminder } from "./reminders";
import {
  getActiveVisitDetectionUser,
  getLocallyMutedVisitRestaurants,
  getRegisteredVisitRegions,
  getVisitCandidates,
  getVisitDetectionLanguage,
  getVisitDetectionPreferences,
  saveVisitCandidates,
} from "./storage";

let eventQueue = Promise.resolve();

export async function processVisitGeofenceEvent(
  userId: string,
  restaurantId: string,
  eventType: Location.GeofencingEventType,
  now = Date.now(),
) {
  const [preferences, regions, candidates, muted, language] = await Promise.all([
    getVisitDetectionPreferences(userId),
    getRegisteredVisitRegions(userId),
    getVisitCandidates(userId),
    getLocallyMutedVisitRestaurants(userId),
    getVisitDetectionLanguage(),
  ]);
  const restaurant = regions?.restaurants.find(
    (candidate) => candidate.id === restaurantId,
  );
  if (!restaurant) return;

  if (eventType === Location.GeofencingEventType.Enter) {
    await saveVisitCandidates(
      userId,
      enterRestaurantVisit({
        candidates,
        userId,
        restaurantId,
        restaurantName: restaurant.name,
        now,
        enabled: preferences.enabled,
        muted: muted.includes(restaurantId),
      }),
    );
    return;
  }

  const result = exitRestaurantVisit(candidates, restaurantId, now);
  if (!result.qualified) {
    await saveVisitCandidates(userId, result.candidates);
    return;
  }
  await saveVisitCandidates(userId, result.candidates);
  try {
    const notificationId = await scheduleVisitReminder(
      result.qualified,
      language,
    );
    await saveVisitCandidates(
      userId,
      result.candidates.map((candidate) =>
        candidate.id === result.qualified?.id
          ? { ...candidate, notificationId }
          : candidate,
      ),
    );
  } catch (error) {
    console.warn("Could not schedule visit reminder", error);
  }
}

if (!TaskManager.isTaskDefined(VISIT_GEOFENCE_TASK)) {
  TaskManager.defineTask<{
    eventType: Location.GeofencingEventType;
    region: Location.LocationRegion;
  }>(VISIT_GEOFENCE_TASK, async ({ data, error }) => {
    if (error || !data?.region?.identifier) return;
    eventQueue = eventQueue
      .then(async () => {
        const userId = await getActiveVisitDetectionUser();
        if (!userId) return;
        await processVisitGeofenceEvent(
          userId,
          data.region.identifier as string,
          data.eventType,
        );
      })
      .catch((taskError) =>
        console.error("Visit geofence event failed", taskError),
      );
    await eventQueue;
  });
}
