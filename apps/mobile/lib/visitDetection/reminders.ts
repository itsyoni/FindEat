import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { RestaurantVisitCandidate } from "@findeat/types";
import {
  VISIT_MAX_REMINDER_RETRIES,
  VISIT_NOTIFICATION_TYPE,
  VISIT_REMINDER_DELAY_SECONDS,
  VISIT_REMIND_LATER_SECONDS,
} from "./config";
import { remindVisitLater, updateVisitStatus } from "./visitCandidateLogic";
import { getVisitCandidates, saveVisitCandidates } from "./storage";

export const VISIT_NOTIFICATION_CHANNEL = "findeat-visit-reminders";

export async function configureVisitReminderNotifications() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(VISIT_NOTIFICATION_CHANNEL, {
    name: "Restaurant visit reminders",
    description: "Optional reminders after a possible restaurant visit",
    importance: Notifications.AndroidImportance.DEFAULT,
    enableVibrate: true,
    vibrationPattern: [0, 180],
    showBadge: true,
  });
}

function notificationCopy(restaurantName: string, language?: string | null) {
  const isHebrew = language?.toLowerCase().startsWith("he");
  return isHebrew
    ? {
        title: `נראה שביקרת ב-${restaurantName} 👀`,
        body: "רוצה לשתף איך היה?",
      }
    : {
        title: `Looks like you visited ${restaurantName} 👀`,
        body: "Want to share how it was?",
      };
}

export async function scheduleVisitReminder(
  candidate: RestaurantVisitCandidate,
  language?: string | null,
  seconds = VISIT_REMINDER_DELAY_SECONDS,
) {
  await configureVisitReminderNotifications();
  const copy = notificationCopy(candidate.restaurantName, language);
  return Notifications.scheduleNotificationAsync({
    content: {
      ...copy,
      data: {
        type: VISIT_NOTIFICATION_TYPE,
        restaurantId: candidate.restaurantId,
        visitCandidateId: candidate.id,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
      ...(Platform.OS === "android"
        ? { channelId: VISIT_NOTIFICATION_CHANNEL }
        : {}),
    },
  });
}

export async function clearVisitNotification(identifier?: string) {
  if (!identifier) return;
  await Promise.allSettled([
    Notifications.cancelScheduledNotificationAsync(identifier),
    Notifications.dismissNotificationAsync(identifier),
  ]);
}

async function updateCandidate(
  userId: string,
  candidateId: string,
  update: (candidate: RestaurantVisitCandidate) => RestaurantVisitCandidate,
) {
  const candidates = await getVisitCandidates(userId);
  const current = candidates.find((candidate) => candidate.id === candidateId);
  if (!current) return null;
  const nextCandidate = update(current);
  await saveVisitCandidates(
    userId,
    candidates.map((candidate) =>
      candidate.id === candidateId ? nextCandidate : candidate,
    ),
  );
  return nextCandidate;
}

export async function remindCandidateLater(
  userId: string,
  candidateId: string,
  language: string,
) {
  const candidate = await updateCandidate(userId, candidateId, (current) =>
    remindVisitLater(current, Date.now()),
  );
  if (!candidate || candidate.status !== "REMIND_LATER") return candidate;
  await clearVisitNotification(candidate.notificationId);
  const notificationId = await scheduleVisitReminder(
    candidate,
    language,
    VISIT_REMIND_LATER_SECONDS,
  );
  return updateCandidate(userId, candidateId, (current) => ({
    ...current,
    notificationId,
    updatedAt: Date.now(),
  }));
}

export async function finishVisitCandidate(
  userId: string,
  candidateId: string,
  status: "DISMISSED" | "COMPLETED",
) {
  const candidate = await updateCandidate(userId, candidateId, (current) =>
    updateVisitStatus(current, status, Date.now()),
  );
  await clearVisitNotification(candidate?.notificationId);
  return candidate;
}

export function canRetryVisitReminder(candidate: RestaurantVisitCandidate) {
  return candidate.reminderCount < VISIT_MAX_REMINDER_RETRIES;
}
