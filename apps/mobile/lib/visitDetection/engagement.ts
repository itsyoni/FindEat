import {
  getVisitDetectionEngagement,
  getVisitDetectionPreferences,
  updateVisitDetectionEngagement,
} from "./storage";
import { isVisitDetectionPromptEligible } from "./visitCandidateLogic";

export async function recordVisitDetectionSession(userId: string) {
  const current = await getVisitDetectionEngagement(userId);
  const now = Date.now();
  if (current.lastSessionAt && now - current.lastSessionAt < 30 * 60 * 1_000) {
    return current;
  }
  return updateVisitDetectionEngagement(userId, {
    sessions: current.sessions + 1,
    lastSessionAt: now,
  });
}

export async function recordVisitDetectionMapUse(userId: string) {
  return updateVisitDetectionEngagement(userId, { usedMap: true });
}

export async function recordVisitDetectionRestaurantView(userId: string) {
  const current = await getVisitDetectionEngagement(userId);
  return updateVisitDetectionEngagement(userId, {
    restaurantViews: current.restaurantViews + 1,
  });
}

export async function shouldIntroduceVisitDetection(
  userId: string,
  accountCreatedAt: string,
) {
  const [preferences, engagement] = await Promise.all([
    getVisitDetectionPreferences(userId),
    getVisitDetectionEngagement(userId),
  ]);
  return isVisitDetectionPromptEligible({
    enabled: preferences.enabled,
    promptSuppressed: preferences.promptSuppressed,
    promptDismissedAt: preferences.promptDismissedAt,
    sessions: engagement.sessions,
    restaurantViews: engagement.restaurantViews,
    usedMap: engagement.usedMap,
    accountCreatedAt: new Date(accountCreatedAt).getTime(),
    now: Date.now(),
  });
}
