import Text from "@/components/common/AppText";
import type { Restaurant } from "@findeat/types";
import { CheersIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

type Props = {
  restaurant: Pick<
    Restaurant,
    "isHappyHourNow" | "activeHappyHour" | "resolvedOpeningHours"
  >;
  iconOnly?: boolean;
  compact?: boolean;
};

const WEEKDAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

function clockMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function getActiveHappyHour(
  restaurant: Pick<
    Restaurant,
    "isHappyHourNow" | "activeHappyHour" | "resolvedOpeningHours"
  >,
) {
  if (!restaurant.isHappyHourNow) return null;
  if (restaurant.activeHappyHour?.endsAt) return restaurant.activeHappyHour;

  const hours = restaurant.resolvedOpeningHours;
  if (!hours?.happyHours) return restaurant.activeHappyHour ?? null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: hours.timezone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const weekday = parts.find((part) => part.type === "weekday")?.value.toUpperCase();
  const dayIndex = WEEKDAYS.indexOf(weekday as (typeof WEEKDAYS)[number]);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  if (dayIndex < 0 || !Number.isFinite(hour) || !Number.isFinite(minute)) {
    return restaurant.activeHappyHour ?? null;
  }

  const current = dayIndex * 1_440 + hour * 60 + minute;
  const weekMinutes = 7 * 1_440;
  for (const [periodDayIndex, day] of WEEKDAYS.entries()) {
    for (const period of hours.happyHours[day] ?? []) {
      const start = periodDayIndex * 1_440 + clockMinutes(period.open);
      let end = periodDayIndex * 1_440 + clockMinutes(period.close);
      if (end <= start) end += 1_440;
      if (
        (current >= start && current < end) ||
        (current + weekMinutes >= start && current + weekMinutes < end)
      ) {
        return {
          discountPercent: period.discountPercent,
          appliesTo: period.appliesTo,
          endsAt: period.close,
        };
      }
    }
  }
  return restaurant.activeHappyHour ?? null;
}

export default function HappyHourBadge({
  restaurant,
  iconOnly = false,
  compact = false,
}: Props) {
  const { t } = useTranslation("map");
  if (!restaurant.isHappyHourNow) return null;
  const offer = getActiveHappyHour(restaurant);

  if (iconOnly) {
    return (
      <View
        accessibilityLabel={
          offer?.endsAt
            ? t("happyHourUntil", { time: offer.endsAt })
            : t("happyHour")
        }
        className="h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#E6A700] dark:border-[#111827]"
        style={{
          shadowColor: "#7A5100",
          shadowOpacity: 0.28,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 7,
        }}
      >
        <CheersIcon size={18} color="#FFF8EF" weight="fill" />
      </View>
    );
  }

  const label = offer?.discountPercent
    ? compact
      ? t("happyHourCompact", {
          discount: offer.discountPercent,
          time: offer.endsAt,
        })
      : t("happyHourOfferUntil", {
          discount: offer.discountPercent,
          scope: t(`happyHourScope${offer.appliesTo}`),
          time: offer.endsAt,
        })
    : offer?.endsAt
      ? t("happyHourUntil", { time: offer.endsAt })
      : t("happyHour");

  return (
    <View className={`flex-row items-center rounded-full bg-[#FFF2C7] dark:bg-[#3B2C0A] ${compact ? "px-2 py-1" : "px-3 py-2"}`}>
      <CheersIcon size={compact ? 14 : 16} color="#C18400" weight="fill" />
      <Text className="ml-1 text-xs font-bold text-[#8B5E00] dark:text-[#FFD56A]">
        {label}
      </Text>
    </View>
  );
}
