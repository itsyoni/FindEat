import Text from "@/components/common/AppText";
import SettingsHeader from "@/components/settings/SettingsHeader";
import useSettingsDirection from "@/components/settings/useSettingsDirection";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import type { PlannedFeature, PlannedFeatureStatus } from "@findeat/types";
import { router } from "expo-router";
import { CheckCircleIcon, LightbulbIcon, RocketLaunchIcon } from "phosphor-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

const statusOrder: Record<PlannedFeatureStatus, number> = {
  COMING_SOON: 0,
  IN_PROGRESS: 1,
  PLANNED: 2,
  RELEASED: 3,
};

export default function UpcomingFeaturesScreen() {
  const { t } = useTranslation("settings");
  const { isDark } = useAppTheme();
  const { textStyle, rowStyle } = useSettingsDirection();
  const [features, setFeatures] = useState<PlannedFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const background = isDark ? "#0B0B0A" : "#FBFAF8";
  const surface = isDark ? "#181817" : "#FFFFFF";
  const border = isDark ? "#343431" : "#E7E1D8";
  const muted = isDark ? "#A3A3A3" : "#6B6B67";

  const load = useCallback(async () => {
    setError(false);
    try {
      setFeatures(await api.plannedFeatures.list());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Load once when the settings route mounts; refreshes are user initiated.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const ordered = useMemo(
    () => [...features].sort((left, right) => statusOrder[left.status] - statusOrder[right.status]),
    [features],
  );

  function statusLabel(status: PlannedFeatureStatus) {
    if (status === "COMING_SOON") return t("featureStatusComingSoon");
    if (status === "IN_PROGRESS") return t("featureStatusInProgress");
    if (status === "RELEASED") return t("featureStatusReleased");
    return t("featureStatusPlanned");
  }

  function statusColors(status: PlannedFeatureStatus) {
    if (status === "RELEASED") return { backgroundColor: isDark ? "#17372B" : "#E4F5EA", color: isDark ? "#7DDBA7" : "#267A4A" };
    if (status === "COMING_SOON") return { backgroundColor: isDark ? "#4A3015" : "#FFF0D7", color: isDark ? "#F5BF66" : "#A85C13" };
    if (status === "IN_PROGRESS") return { backgroundColor: isDark ? "#193454" : "#E7F1FF", color: isDark ? "#8FC5FF" : "#2364A9" };
    return { backgroundColor: isDark ? "#292927" : "#F1EEE8", color: muted };
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: background }}>
      <SettingsHeader title={t("upcomingFeatures")} />
      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#D97706" /></View>
      ) : (
        <FlatList
          data={ordered}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor="#D97706" />}
          contentContainerStyle={{ padding: 16, paddingBottom: 48, flexGrow: 1 }}
          ListHeaderComponent={(
            <View className="mb-5 overflow-hidden rounded-3xl border p-5" style={{ backgroundColor: surface, borderColor: border }}>
              <View className="flex-row items-center" style={rowStyle}>
                <View className="size-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950"><RocketLaunchIcon size={27} color="#D97706" weight="duotone" /></View>
                <View className="min-w-0 flex-1" style={{ marginStart: 14 }}>
                  <Text weight="bold" className="text-xl text-black dark:text-white" style={textStyle}>{t("upcomingFeaturesTitle")}</Text>
                  <Text className="mt-1 text-sm leading-5" style={[textStyle, { color: muted }]}>{t("upcomingFeaturesIntro")}</Text>
                </View>
              </View>
              <Pressable onPress={() => router.push("/settings/suggest-feature")} className="mt-5 min-h-12 flex-row items-center justify-center rounded-2xl bg-amber-500 active:opacity-80">
                <LightbulbIcon size={19} color="#171717" weight="fill" />
                <Text weight="bold" className="ml-2 text-[#171717]">{t("suggestFeature")}</Text>
              </Pressable>
            </View>
          )}
          ListEmptyComponent={(
            <View className="flex-1 items-center justify-center px-8 py-16">
              {error ? <RocketLaunchIcon size={46} color={muted} weight="duotone" /> : <CheckCircleIcon size={46} color="#D97706" weight="duotone" />}
              <Text weight="bold" className="mt-4 text-center text-xl text-black dark:text-white">{error ? t("upcomingFeaturesLoadError") : t("noUpcomingFeatures")}</Text>
              <Text className="mt-2 text-center leading-5" style={{ color: muted }}>{error ? t("pullToRetry") : t("noUpcomingFeaturesSubtitle")}</Text>
              {error ? <Pressable onPress={() => void load()} className="mt-5 rounded-xl bg-amber-500 px-5 py-3"><Text weight="bold" className="text-[#171717]">{t("retry")}</Text></Pressable> : null}
            </View>
          )}
          renderItem={({ item }) => {
            const badge = statusColors(item.status);
            return (
              <View className="mb-3 rounded-3xl border p-5" style={{ backgroundColor: surface, borderColor: border }}>
                <View className="flex-row items-center justify-between gap-3" style={rowStyle}>
                  <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: badge.backgroundColor }}><Text weight="bold" className="text-xs" style={{ color: badge.color }}>{statusLabel(item.status)}</Text></View>
                  {item.targetLabel ? <Text className="text-xs" style={[textStyle, { color: muted }]}>{item.targetLabel}</Text> : null}
                </View>
                <Text weight="bold" className="mt-4 text-xl text-black dark:text-white" style={textStyle}>{item.title}</Text>
                {item.description ? <Text className="mt-2 text-[15px] leading-6" style={[textStyle, { color: muted }]}>{item.description}</Text> : null}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
