import AppBottomSheet from "@/components/common/AppBottomSheet";
import Text from "@/components/common/AppText";
import type { RestaurantEarnedBadge } from "@findeat/types";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { MedalIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

export default function RestaurantBadgesBottomSheet({
  open,
  onClose,
  badges,
}: {
  open: boolean;
  onClose: () => void;
  badges: RestaurantEarnedBadge[];
}) {
  const { t } = useTranslation("restaurants");
  return (
    <AppBottomSheet open={open} onClose={onClose} snapPoints={["66%"]}>
      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}>
        <Text className="text-2xl font-bold text-[#171716] dark:text-[#F7F6F2]">
          {t("earnedBadges")}
        </Text>
        <View className="mt-5 gap-3">
          {badges.map((badge) => (
            <View
              key={badge.key}
              className="flex-row rounded-3xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"
            >
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-amber-200/70 dark:bg-amber-900/60">
                <MedalIcon size={27} color="#D08A00" weight="duotone" />
              </View>
              <View className="ml-3 min-w-0 flex-1">
                <Text className="text-base font-bold text-[#171716] dark:text-[#F7F6F2]">
                  {t(`badges.${badge.key}.title`)}
                </Text>
                <Text className="mt-1 text-sm leading-5 text-[#68645D] dark:text-[#AAA69E]">
                  {t(`badges.${badge.key}.description`)}
                </Text>
                <Text className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {t("badgeEvidence", { count: badge.evidenceCount })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </BottomSheetScrollView>
    </AppBottomSheet>
  );
}
