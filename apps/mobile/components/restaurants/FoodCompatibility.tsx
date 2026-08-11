import Text from "@/components/common/AppText";
import type { DishCompatibility, Restaurant } from "@findeat/types";
import {
  CheckCircleIcon,
  SparkleIcon,
  WarningCircleIcon,
} from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";
import { AppAlert as Alert } from "@/lib/appAlert";

function humanizeTag(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function useFoodTagLabel() {
  const { t } = useTranslation("profile");
  return (tag: string) =>
    t(`profileOptions.${tag}`, { defaultValue: humanizeTag(tag) });
}

export function RestaurantCompatibilitySummary({
  compatibility,
}: {
  compatibility: Restaurant["compatibility"];
}) {
  const { t } = useTranslation("restaurants");
  const tagLabel = useFoodTagLabel();

  if (!compatibility) return null;
  const hasWarnings =
    compatibility.allergenWarnings.length > 0 ||
    (compatibility.exclusionWarnings?.length ?? 0) > 0 ||
    compatibility.restaurantEligible === false;
  const hasMatches =
    compatibility.dietaryMatches.length > 0 ||
    compatibility.cuisineMatches.length > 0;
  if (!hasWarnings && !hasMatches) return null;

  function showAllergenDetails() {
    const allergens = compatibility!.allergenWarnings
      .map((match) => tagLabel(match.tag))
      .join(", ");
    const exclusions = [
      ...(compatibility!.exclusionWarnings ?? []).map((match) => tagLabel(match.tag)),
      ...(compatibility!.unmetRestaurantRequirements ?? []).map(tagLabel),
    ].join(", ");
    Alert.alert(
      allergens ? t("allergenWarningTitle") : t("dietaryConflictTitle"),
      `${allergens ? t("restaurantAllergenWarning", { allergens }) : ""}${allergens && exclusions ? "\n\n" : ""}${exclusions ? t("restaurantDietaryConflict", { restrictions: exclusions }) : ""}\n\n${t("allergenDisclaimer")}`,
      [{ text: t("common:ok") }],
      { tone: "warning" },
    );
  }

  function showMatchDetails() {
    const details = [
      ...compatibility!.dietaryMatches.map((match) =>
        t("hasOptions", { tag: tagLabel(match.tag) }),
      ),
      ...compatibility!.cuisineMatches.map((match) =>
        t("cuisineMatch", { tag: tagLabel(match.tag) }),
      ),
    ];
    Alert.alert(t("matchesYourProfile"), details.join("\n"), [
      { text: t("common:ok") },
    ], { tone: "success" });
  }

  return (
    <View className="flex-row gap-3 bg-surface px-5 pb-5 dark:bg-black">
      {hasWarnings && (
        <TouchableOpacity
          activeOpacity={0.78}
          accessibilityRole="button"
          onPress={showAllergenDetails}
          className="min-w-0 flex-1 flex-row items-center rounded-2xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40"
        >
          <View className="h-9 w-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/60">
            <WarningCircleIcon size={21} color="#DC2626" weight="fill" />
          </View>
          <Text
            numberOfLines={2}
            className="ml-2 min-w-0 flex-1 text-sm font-bold text-red-900 dark:text-red-100"
          >
            {compatibility.allergenWarnings.length
              ? t("allergenWarningTitle")
              : t("dietaryConflictTitle")}
          </Text>
        </TouchableOpacity>
      )}

      {hasMatches && (
        <TouchableOpacity
          activeOpacity={0.78}
          accessibilityRole="button"
          onPress={showMatchDetails}
          className="relative min-w-0 flex-1 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/35"
        >
          <View className="absolute left-3 h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/60">
            <SparkleIcon size={19} color="#15803D" weight="fill" />
          </View>
          <Text
            numberOfLines={2}
            className="px-10 text-center text-sm font-bold text-emerald-900 dark:text-emerald-100"
          >
            {t("matchesYourProfile")}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function DishCompatibilityChips({
  compatibility,
  detailed = false,
}: {
  compatibility?: DishCompatibility;
  detailed?: boolean;
}) {
  const { t, i18n } = useTranslation("restaurants");
  const isRtl = i18n.dir() === "rtl";
  const rtlTextStyle = isRtl
    ? ({ textAlign: "right", writingDirection: "rtl" } as const)
    : undefined;
  const tagLabel = useFoodTagLabel();
  if (!compatibility) return null;

  const warningLabels = compatibility.allergenWarnings.map(tagLabel);
  const exclusionLabels = (compatibility.exclusionWarnings ?? []).map(tagLabel);
  const matchTags = [
    ...compatibility.dietaryMatches,
    ...compatibility.cuisineMatches,
  ];
  if (!warningLabels.length && !exclusionLabels.length && !matchTags.length) return null;

  return (
    <View
      className={detailed ? "mt-5 gap-3" : "mt-2 min-w-0 flex-row flex-wrap gap-1.5"}
      style={isRtl && !detailed ? { flexDirection: "row-reverse" } : undefined}
    >
      {!!warningLabels.length && (
        <View
          className={`${detailed ? "p-4" : "max-w-full px-2 py-1"} min-w-0 flex-row items-center gap-1.5 rounded-2xl bg-red-100 dark:bg-red-950/60`}
          style={isRtl ? { flexDirection: "row-reverse" } : undefined}
        >
          <WarningCircleIcon size={detailed ? 20 : 13} color="#DC2626" weight="fill" />
          <Text
            numberOfLines={detailed ? undefined : 2}
            ellipsizeMode="tail"
            style={rtlTextStyle}
            className={`${detailed ? "text-sm" : "text-xs"} min-w-0 flex-shrink font-bold text-red-800 dark:text-red-200`}
          >
            {t("dishContainsAllergens", { allergens: warningLabels.join(", ") })}
          </Text>
        </View>
      )}
      {!!exclusionLabels.length && (
        <View className={`${detailed ? "p-4" : "max-w-full px-2 py-1"} min-w-0 flex-row items-center gap-1.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60`} style={isRtl ? { flexDirection: "row-reverse" } : undefined}>
          <WarningCircleIcon size={detailed ? 20 : 13} color="#D97706" weight="fill" />
          <Text numberOfLines={detailed ? undefined : 2} ellipsizeMode="tail" style={rtlTextStyle} className={`${detailed ? "text-sm" : "text-xs"} min-w-0 flex-shrink font-bold text-amber-900 dark:text-amber-100`}>
            {t("dishConflictsWith", { restrictions: exclusionLabels.join(", ") })}
          </Text>
        </View>
      )}
      {matchTags.slice(0, detailed ? undefined : 2).map((tag) => (
        <View
          key={tag}
          className={`${detailed ? "px-3 py-2" : "max-w-full px-2 py-1"} min-w-0 flex-row items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60`}
          style={isRtl ? { flexDirection: "row-reverse" } : undefined}
        >
          <CheckCircleIcon size={detailed ? 15 : 12} color="#16A34A" weight="fill" />
          <Text
            numberOfLines={detailed ? undefined : 1}
            style={rtlTextStyle}
            className="min-w-0 flex-shrink text-xs font-bold text-emerald-800 dark:text-emerald-200"
          >
            {tagLabel(tag)}
          </Text>
        </View>
      ))}
      {detailed && !!warningLabels.length && (
        <Text style={rtlTextStyle} className="text-xs leading-4 text-gray-500">
          {t("allergenDisclaimer")}
        </Text>
      )}
    </View>
  );
}
