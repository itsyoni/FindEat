import Text from "@/components/common/AppText";
import SettingsHeader from "@/components/settings/SettingsHeader";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import type { ModerationActionDecision } from "@findeat/types";
import { router } from "expo-router";
import { ShieldCheckIcon, ShieldWarningIcon } from "phosphor-react-native";
import { ActivityIndicator, FlatList, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function actionTarget(item: ModerationActionDecision) {
  if (item.metadata?.targetType === "COMMENT") return "comment";
  if (item.metadata?.targetType === "SNAP") return "snap";
  return "post";
}

export default function ModerationActionsScreen() {
  const { isDark } = useAppTheme();
  const actions = useQuery({
    queryKey: ["moderation-actions"],
    queryFn: () => api.reports.myModerationActions(),
  });

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8",
      }}
    >
      <SettingsHeader title="Moderation decisions" />
      {actions.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#FF5B35" />
        </View>
      ) : (
        <FlatList
          data={actions.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8">
              <ShieldCheckIcon size={42} color="#22C55E" weight="duotone" />
              <Text weight="bold" className="mt-4 text-xl text-ink dark:text-white">
                No moderation decisions
              </Text>
              <Text className="mt-2 text-center leading-5 text-gray-500">
                If FindEat ever takes action on your content, you’ll see the
                decision and appeal options here.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const appeal = item.appeals?.[0];
            const target = actionTarget(item);
            return (
              <View className="rounded-3xl border border-line bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
                <View className="flex-row items-start gap-3">
                  <View className="size-11 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/40">
                    <ShieldWarningIcon size={23} color="#EF4444" weight="duotone" />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text weight="bold" className="text-lg text-ink dark:text-white">
                      Your {target} was removed
                    </Text>
                    <Text className="mt-1 leading-5 text-gray-500" numberOfLines={2}>
                      {item.reason}
                    </Text>
                    <Text className="mt-2 text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {item.reversedAt ? (
                  <Text weight="bold" className="mt-4 text-green-600">
                    Decision reversed · {target} restored
                  </Text>
                ) : appeal ? (
                  <Text weight="bold" className="mt-4 capitalize text-amber-600">
                    Appeal {appeal.status.toLowerCase().replaceAll("_", " ")}
                  </Text>
                ) : null}

                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/settings/moderation-actions/[id]",
                      params: { id: item.id },
                    })
                  }
                  className="mt-4 min-h-12 items-center justify-center rounded-2xl bg-black px-5 dark:bg-white"
                >
                  <Text weight="bold" className="text-white dark:text-black">
                    View decision
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
