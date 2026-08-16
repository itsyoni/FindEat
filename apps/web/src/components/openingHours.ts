import {
  RESTAURANT_WEEKDAYS,
  type RestaurantOpeningHours,
} from "@findeat/types";

export function createEmptyOpeningHours(): RestaurantOpeningHours {
  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jerusalem";
  return {
    timezone,
    weekly: {
      MONDAY: [],
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
      SATURDAY: [],
      SUNDAY: [],
    },
    happyHours: {
      MONDAY: [],
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
      SATURDAY: [],
      SUNDAY: [],
    },
  };
}

export function normalizeOpeningHours(
  value?: RestaurantOpeningHours | null,
): RestaurantOpeningHours {
  const empty = createEmptyOpeningHours();
  if (!value?.weekly) return empty;
  return {
    timezone: value.timezone || empty.timezone,
    weekly: Object.fromEntries(
      RESTAURANT_WEEKDAYS.map((day) => [
        day,
        Array.isArray(value.weekly[day]) ? value.weekly[day] : [],
      ]),
    ) as RestaurantOpeningHours["weekly"],
    happyHours: Object.fromEntries(
      RESTAURANT_WEEKDAYS.map((day) => [
        day,
        Array.isArray(value.happyHours?.[day]) ? value.happyHours[day] : [],
      ]),
    ) as NonNullable<RestaurantOpeningHours["happyHours"]>,
  };
}
