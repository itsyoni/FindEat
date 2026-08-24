import Text from "@/components/common/AppText";
import KnownIssueSuggestionCard from "@/components/settings/KnownIssueSuggestionCard";
import SettingsHeader from "@/components/settings/SettingsHeader";
import useSettingsDirection from "@/components/settings/useSettingsDirection";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";
import type { KnownIssue } from "@findeat/types";
import { router } from "expo-router";
import { BugIcon, CheckCircleIcon } from "phosphor-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

export default function KnownIssuesScreen() {
  const { t } = useTranslation("settings");
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const { textStyle, rowStyle } = useSettingsDirection();
  const [issues, setIssues] = useState<KnownIssue[]>([]);
  const [affectedIds, setAffectedIds] = useState<Set<string>>(new Set());
  const [workingId, setWorkingId] = useState<string | null>(null);
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
      const [nextIssues, mine] = await Promise.all([
        api.knownIssues.list(),
        api.knownIssues.affectedMine(),
      ]);
      setIssues(nextIssues.filter((issue) => issue.status !== "RESOLVED"));
      setAffectedIds(new Set(mine.issueIds));
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

  async function toggleAffected(issue: KnownIssue) {
    if (workingId) return;
    const affected = !affectedIds.has(issue.id);
    setWorkingId(issue.id);
    try {
      const result = await api.knownIssues.setAffected(
        issue.id,
        affected,
        Platform.OS === "ios" ? "iOS" : "Android",
      );
      setAffectedIds((current) => {
        const next = new Set(current);
        if (affected) next.add(issue.id);
        else next.delete(issue.id);
        return next;
      });
      setIssues((current) =>
        current.map((item) =>
          item.id === issue.id
            ? { ...item, affectedCount: result.affectedCount, platforms: result.platforms }
            : item,
        ),
      );
    } catch {
      showToast(t("knownIssueAffectedError"), { kind: "error" });
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: background }}>
      <SettingsHeader title={t("knownIssues")} />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#D97706" />
        </View>
      ) : (
        <FlatList
          data={issues}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor="#D97706"
            />
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 48, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListHeaderComponent={
            <View
              className="mb-5 overflow-hidden rounded-3xl border p-5"
              style={{ backgroundColor: surface, borderColor: border }}
            >
              <View className="flex-row items-center" style={rowStyle}>
                <View className="size-12 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950">
                  <BugIcon size={27} color="#E4573D" weight="duotone" />
                </View>
                <View className="min-w-0 flex-1" style={{ marginStart: 14 }}>
                  <Text weight="bold" className="text-xl text-black dark:text-white" style={textStyle}>
                    {t("knownIssuesTitle")}
                  </Text>
                  <Text className="mt-1 text-sm leading-5" style={[textStyle, { color: muted }]}>
                    {t("knownIssuesIntro")}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => router.push("/settings/report-bug")}
                className="mt-5 min-h-12 flex-row items-center justify-center rounded-2xl bg-[#E4573D] active:opacity-80"
              >
                <BugIcon size={19} color="#FAF9F6" weight="fill" />
                <Text weight="bold" className="ml-2 text-[#FAF9F6]">{t("reportBug")}</Text>
              </Pressable>
            </View>
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8 py-16">
              {error ? (
                <BugIcon size={46} color={muted} weight="duotone" />
              ) : (
                <CheckCircleIcon size={46} color="#2D9B62" weight="duotone" />
              )}
              <Text weight="bold" className="mt-4 text-center text-xl text-black dark:text-white">
                {error ? t("knownIssuesLoadError") : t("noKnownIssues")}
              </Text>
              <Text className="mt-2 text-center leading-5" style={{ color: muted }}>
                {error ? t("pullToRetry") : t("noKnownIssuesSubtitle")}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <KnownIssueSuggestionCard
              issue={item}
              affected={affectedIds.has(item.id)}
              working={workingId === item.id}
              onToggleAffected={() => void toggleAffected(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
