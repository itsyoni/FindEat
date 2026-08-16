import {
  RESTAURANT_WEEKDAYS,
  type RestaurantOpeningHours,
} from "@findeat/types";

export function createEmptyOpeningHours(): RestaurantOpeningHours {
  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jerusalem";
  return {
    timezone,
    firstDayOfWeek: "SUNDAY",
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
    firstDayOfWeek: RESTAURANT_WEEKDAYS.includes(
      value.firstDayOfWeek as (typeof RESTAURANT_WEEKDAYS)[number],
    )
      ? value.firstDayOfWeek
      : "SUNDAY",
    weekly: Object.fromEntries(
      RESTAURANT_WEEKDAYS.map((day) => [
        day,
        Array.isArray(value.weekly[day]) ? value.weekly[day] : [],
      ]),
    ) as RestaurantOpeningHours["weekly"],
    happyHours: Object.fromEntries(
      RESTAURANT_WEEKDAYS.map((day) => [
        day,
        Array.isArray(value.happyHours?.[day])
          ? value.happyHours[day].map((period) => ({
              ...period,
              discountPercent: period.discountPercent ?? 20,
              appliesTo: period.appliesTo ?? "ALL_MENU",
            }))
          : [],
      ]),
    ) as NonNullable<RestaurantOpeningHours["happyHours"]>,
  };
}
