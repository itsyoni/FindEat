import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const TRIP_REMINDER_TYPE = "TRIP_PLAN_REMINDER";
const CHANNEL_ID = "findeat-trip-reminders";
const STORAGE_PREFIX = "findeat:trip-reminders:v1:";

export type TripReminderSettings = {
  trip?: { offsetDays: number; notificationId: string } | null;
  events: Record<string, { offsetMinutes: number; notificationId: string }>;
};

function storageKey(userId: string, listId: string) {
  return `${STORAGE_PREFIX}${userId}:${listId}`;
}

export async function loadTripReminders(userId: string, listId: string) {
  try {
    const stored = await AsyncStorage.getItem(storageKey(userId, listId));
    if (!stored) return { trip: null, events: {} } satisfies TripReminderSettings;
    const parsed = JSON.parse(stored) as Partial<TripReminderSettings>;
    return {
      trip: parsed.trip ?? null,
      events: parsed.events ?? {},
    } satisfies TripReminderSettings;
  } catch {
    return { trip: null, events: {} } satisfies TripReminderSettings;
  }
}

async function saveTripReminders(userId: string, listId: string, settings: TripReminderSettings) {
  await AsyncStorage.setItem(storageKey(userId, listId), JSON.stringify(settings));
  return settings;
}

async function prepareNotifications() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Trip reminders",
      description: "Reminders for trips and planned restaurant visits",
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
      vibrationPattern: [0, 180],
      showBadge: true,
    });
  }
  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== Notifications.PermissionStatus.GRANTED) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (permission.status !== Notifications.PermissionStatus.GRANTED) {
    throw new Error("NOTIFICATION_PERMISSION_REQUIRED");
  }
}

async function cancel(identifier?: string) {
  if (!identifier) return;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
}

function dateFromDayAndMinutes(day: string, minutes: number) {
  const [year, month, date] = day.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, date, Math.floor(minutes / 60), minutes % 60, 0, 0);
}

function trigger(date: Date) {
  if (date.getTime() <= Date.now()) throw new Error("REMINDER_TIME_PASSED");
  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date,
    ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
  } as Notifications.DateTriggerInput;
}

export async function setTripFolderReminder(input: {
  userId: string;
  listId: string;
  listName: string;
  startDay: string;
  offsetDays: number | null;
  language?: string | null;
}) {
  const settings = await loadTripReminders(input.userId, input.listId);
  await cancel(settings.trip?.notificationId);
  if (input.offsetDays == null) {
    return saveTripReminders(input.userId, input.listId, { ...settings, trip: null });
  }
  await prepareNotifications();
  const reminderDate = dateFromDayAndMinutes(input.startDay, 9 * 60);
  reminderDate.setDate(reminderDate.getDate() - input.offsetDays);
  const isHebrew = input.language?.toLowerCase().startsWith("he");
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: isHebrew ? `הטיול ${input.listName} מתקרב ✈️` : `${input.listName} is coming up ✈️`,
      body: isHebrew ? "הגיע הזמן לבדוק את התכנון שלכם." : "Time to check your trip plan.",
      data: { type: TRIP_REMINDER_TYPE, placeListId: input.listId },
    },
    trigger: trigger(reminderDate),
  });
  return saveTripReminders(input.userId, input.listId, {
    ...settings,
    trip: { offsetDays: input.offsetDays, notificationId },
  });
}

export async function setTripEventReminder(input: {
  userId: string;
  listId: string;
  itemId: string;
  restaurantName: string;
  day: string;
  startMinutes: number;
  offsetMinutes: number | null;
  language?: string | null;
}) {
  const settings = await loadTripReminders(input.userId, input.listId);
  await cancel(settings.events[input.itemId]?.notificationId);
  const events = { ...settings.events };
  if (input.offsetMinutes == null) {
    delete events[input.itemId];
    return saveTripReminders(input.userId, input.listId, { ...settings, events });
  }
  await prepareNotifications();
  const reminderDate = dateFromDayAndMinutes(input.day, input.startMinutes);
  reminderDate.setMinutes(reminderDate.getMinutes() - input.offsetMinutes);
  const isHebrew = input.language?.toLowerCase().startsWith("he");
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: isHebrew ? `בקרוב: ${input.restaurantName} 🍽️` : `Coming up: ${input.restaurantName} 🍽️`,
      body: isHebrew ? "המסעדה הבאה בתכנון הטיול שלכם." : "Your next restaurant in the trip plan.",
      data: {
        type: TRIP_REMINDER_TYPE,
        placeListId: input.listId,
        placeListItemId: input.itemId,
      },
    },
    trigger: trigger(reminderDate),
  });
  events[input.itemId] = { offsetMinutes: input.offsetMinutes, notificationId };
  return saveTripReminders(input.userId, input.listId, { ...settings, events });
}
