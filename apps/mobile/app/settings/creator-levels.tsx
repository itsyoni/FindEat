import { Skeleton, SkeletonPulse } from "@/components/common";
import Text from "@/components/common/AppText";
import SettingsHeader from "@/components/settings/SettingsHeader";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import {
  CREATOR_LEVELS,
  getCreatorLevel,
  getNextCreatorLevel,
  type CreatorImpactAction,
  type CreatorImpactSummary,
} from "@findeat/types";
import { useFocusEffect } from "expo-router";
import { CheckIcon, LockKeyIcon, TrophyIcon } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ACTIONS: CreatorImpactAction[] = ["VISITED", "CONTENT_POST", "REVIEW_POST"];

export default function CreatorLevelsScreen() {
  const { t } = useTranslation(["settings", "profile"]);
  const { isDark } = useAppTheme();
  const [summary, setSummary] = useState<CreatorImpactSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void api.creatorImpact
        .mine()
        .then((result) => {
          if (active) setSummary(result);
        })
        .catch((error) => console.error("Could not load creator level", error))
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const score = summary?.score ?? 0;
  const currentLevel = getCreatorLevel(score);
  const nextLevel = getNextCreatorLevel(score);
  const progress = nextLevel
    ? Math.min(
        1,
        (score - currentLevel.minimumScore) /
          (nextLevel.minimumScore - currentLevel.minimumScore),
      )
    : 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}>
      <SettingsHeader title={t("settings:creatorLevels")} />
      {loading ? (
        <SkeletonPulse>
          <View className="gap-4 px-5 pt-5">
            <Skeleton width="100%" height={190} radius={28} />
            <Skeleton width="100%" height={170} radius={24} />
            <Skeleton width="100%" height={520} radius={24} />
          </View>
        </SkeletonPulse>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        >
          <View className="items-center overflow-hidden rounded-[28px] bg-amber-400 px-5 py-7">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-black/90">
              <TrophyIcon size={32} color="#FBBF24" weight="fill" />
            </View>
            <Text className="mt-4 text-sm font-bold uppercase tracking-widest text-amber-950/70">
              {t("settings:yourCreatorLevel")}
            </Text>
            <Text className="mt-1 text-3xl font-black text-black">
              {t(`profile:creatorLevels.${currentLevel.key}`)}
            </Text>
            <Text className="mt-2 text-lg font-bold text-black/70">
              {t("settings:creatorPoints", { count: score })}
            </Text>
            {nextLevel ? (
              <View className="mt-5 w-full">
                <View className="h-2.5 overflow-hidden rounded-full bg-black/15">
                  <View
                    className="h-full rounded-full bg-black"
                    style={{ width: `${Math.max(progress * 100, 2)}%` }}
                  />
                </View>
                <Text className="mt-2 text-center text-xs font-bold text-black/65">
                  {t("settings:pointsToNextLevel", {
                    count: nextLevel.minimumScore - score,
                    level: t(`profile:creatorLevels.${nextLevel.key}`),
                  })}
                </Text>
              </View>
            ) : (
              <Text className="mt-3 text-sm font-bold text-black/65">
                {t("settings:highestCreatorLevel")}
              </Text>
            )}
          </View>

          <View className="mt-5 rounded-[24px] bg-white p-5 dark:bg-gray-900">
            <Text className="text-lg font-bold text-black dark:text-white">
              {t("settings:howPointsWork")}
            </Text>
            <Text className="mt-1 text-sm leading-5 text-gray-500">
              {t("settings:creatorPointsExplanation")}
            </Text>
            <View className="mt-4 gap-3">
              {ACTIONS.map((action) => {
                const item = summary?.breakdown.find((entry) => entry.action === action);
                return (
                  <View key={action} className="flex-row items-center rounded-2xl bg-gray-50 p-3 dark:bg-gray-800">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
                      <Text className="font-black text-amber-700 dark:text-amber-300">
                        +{item?.pointsPerAction ?? (action === "VISITED" ? 1 : action === "CONTENT_POST" ? 2 : 3)}
                      </Text>
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="font-bold text-black dark:text-white">
                        {t(`settings:creatorActions.${action}`)}
                      </Text>
                      <Text className="mt-0.5 text-xs text-gray-500">
                        {t("settings:creatorActionCount", {
                          count: item?.count ?? 0,
                          points: item?.points ?? 0,
                        })}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View className="mt-5 rounded-[24px] bg-white px-5 py-6 dark:bg-gray-900">
            <Text className="mb-5 text-lg font-bold text-black dark:text-white">
              {t("settings:levelRoadmap")}
            </Text>
            {CREATOR_LEVELS.map((level, index) => {
              const reached = score >= level.minimumScore;
              const current = level.key === currentLevel.key;
              const isLast = index === CREATOR_LEVELS.length - 1;
              return (
                <View key={level.key} className="flex-row">
                  <View className="items-center">
                    <View
                      className={`h-11 w-11 items-center justify-center rounded-full border-2 ${
                        current
                          ? "border-amber-500 bg-amber-500"
                          : reached
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900"
                      }`}
                    >
                      {reached ? (
                        <CheckIcon size={19} color="#FAF9F6" weight="bold" />
                      ) : (
                        <LockKeyIcon size={17} color="#9CA3AF" weight="fill" />
                      )}
                    </View>
                    {!isLast ? (
                      <View className={`h-12 w-1 ${score >= CREATOR_LEVELS[index + 1].minimumScore ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-800"}`} />
                    ) : null}
                  </View>
                  <View className="ml-4 flex-1 pt-1">
                    <Text className={`text-base font-bold ${current ? "text-amber-600 dark:text-amber-300" : "text-black dark:text-white"}`}>
                      {t(`profile:creatorLevels.${level.key}`)}
                    </Text>
                    <Text className="mt-1 text-xs text-gray-500">
                      {t("settings:levelPointsRequired", { count: level.minimumScore })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
