import Text from "@/components/common/AppText";
import SettingsHeader from "@/components/settings/SettingsHeader";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, FlatList, TouchableOpacity, View } from "react-native";
import { AppAlert as Alert } from "@/lib/appAlert";
import { useState } from "react";
import { TextInput } from "@/components/common";
import { SafeAreaView } from "react-native-safe-area-context";

type Action = {
  id: string;
  action: string;
  reason: string;
  createdAt: string;
  reversedAt?: string | null;
  appeals?: { status: string }[];
};

export default function ModerationActionsScreen() {
  const { isDark } = useAppTheme();
  const queryClient = useQueryClient();
  const [appealingId, setAppealingId] = useState<string | null>(null);
  const [appealReason, setAppealReason] = useState("");
  const actions = useQuery<Action[]>({
    queryKey: ["moderation-actions"],
    queryFn: () => api.reports.myModerationActions(),
  });
  async function submitAppeal(item: Action) {
    if (!appealReason.trim()) return;
    try {
      await api.reports.appeal(item.id, appealReason.trim());
      setAppealingId(null);
      setAppealReason("");
      await queryClient.invalidateQueries({ queryKey: ["moderation-actions"] });
    } catch {
      Alert.alert("Could not submit appeal", "Please try again.");
    }
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}>
      <SettingsHeader title="Account decisions" />
      {actions.isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={actions.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
          ListEmptyComponent={<View className="flex-1 items-center justify-center"><Text className="text-gray-500">No moderation decisions</Text></View>}
          renderItem={({ item }) => (
            <View className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
              <Text weight="bold" className="text-lg text-black dark:text-white">{item.action.toLowerCase().replaceAll("_", " ")}</Text>
              <Text className="mt-2 leading-5 text-gray-500">{item.reason}</Text>
              <Text className="mt-3 text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</Text>
              {appealingId === item.id ? (
                <View className="mt-4 gap-2">
                  <TextInput
                    value={appealReason}
                    onChangeText={setAppealReason}
                    placeholder="Why should this decision be reviewed?"
                    multiline
                    className="min-h-24"
                  />
                  <TouchableOpacity
                    onPress={() => void submitAppeal(item)}
                    className="items-center rounded-2xl bg-black py-3 dark:bg-white"
                  >
                    <Text weight="bold" className="text-white dark:text-black">Submit appeal</Text>
                  </TouchableOpacity>
                </View>
              ) : !item.reversedAt && !item.appeals?.length ? (
                <TouchableOpacity
                  onPress={() => setAppealingId(item.id)}
                  className="mt-4 items-center rounded-2xl border border-gray-200 py-3 dark:border-gray-700"
                >
                  <Text weight="bold" className="text-black dark:text-white">Appeal decision</Text>
                </TouchableOpacity>
              ) : item.appeals?.[0] ? (
                <Text weight="bold" className="mt-4 text-amber-600">Appeal: {item.appeals[0].status.toLowerCase()}</Text>
              ) : null}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
