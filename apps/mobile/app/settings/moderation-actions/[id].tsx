import Text from "@/components/common/AppText";
import { TextInput } from "@/components/common";
import SettingsHeader from "@/components/settings/SettingsHeader";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import { AppAlert as Alert } from "@/lib/appAlert";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import {
  ChatCircleSlashIcon,
  CheckCircleIcon,
  ShieldWarningIcon,
  WarningCircleIcon,
} from "phosphor-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ModerationActionDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useAppTheme();
  const queryClient = useQueryClient();
  const [appealReason, setAppealReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const action = useQuery({
    queryKey: ["moderation-action", id],
    queryFn: () => api.reports.moderationAction(id),
    enabled: Boolean(id),
  });

  const item = action.data;
  const appeal = item?.appeals?.[0];
  const restored = Boolean(item?.reversedAt);
  const isComment = item?.metadata?.targetType === "COMMENT";
  const isSnap = item?.metadata?.targetType === "SNAP";
  const targetLabel = isComment ? "comment" : isSnap ? "snap" : "post";
  const previewImage =
    item?.metadata?.imageUrl ??
    item?.post?.contentPost?.imageUrl ??
    item?.post?.reviewPost?.coverImageUrl;
  const previewText = isComment
    ? item?.metadata?.content
    : isSnap
      ? item?.metadata?.caption
      : item?.post?.contentPost?.caption ?? item?.post?.reviewPost?.summary;

  async function submitAppeal() {
    if (!item || !appealReason.trim() || submitting) return;
    try {
      setSubmitting(true);
      await api.reports.appeal(item.id, appealReason.trim());
      setAppealReason("");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["moderation-action", item.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["moderation-actions"] }),
      ]);
    } catch {
      Alert.alert("Could not submit appeal", "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8",
      }}
    >
      <SettingsHeader title="Moderation decision" />
      {action.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#FF5B35" />
        </View>
      ) : action.isError || !item ? (
        <View className="flex-1 items-center justify-center px-8">
          <WarningCircleIcon size={38} color="#EF4444" weight="duotone" />
          <Text weight="bold" className="mt-4 text-xl text-ink dark:text-white">
            Decision unavailable
          </Text>
          <Text className="mt-2 text-center leading-5 text-gray-500">
            We couldn’t load this moderation decision. Please try again.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center px-3 pb-6 pt-3">
            <View
              className={`size-20 items-center justify-center rounded-full ${
                restored
                  ? "bg-green-50 dark:bg-green-950/40"
                  : "bg-red-50 dark:bg-red-950/40"
              }`}
            >
              {restored ? (
                <CheckCircleIcon size={40} color="#16A34A" weight="duotone" />
              ) : isComment ? (
                <ChatCircleSlashIcon size={38} color="#EF4444" weight="duotone" />
              ) : (
                <ShieldWarningIcon size={38} color="#EF4444" weight="duotone" />
              )}
            </View>
            <Text
              weight="bold"
              className="mt-5 text-center text-3xl leading-9 text-ink dark:text-white"
            >
              {restored
                ? `We restored your ${targetLabel}`
                : `We removed your ${targetLabel}`}
            </Text>
            <Text className="mt-3 text-center leading-6 text-gray-500">
              {restored
                ? `Your appeal was approved. Your ${targetLabel} is back in its original place.`
                : "We reviewed this content and decided it didn’t follow FindEat’s community guidelines."}
            </Text>
          </View>

          <View className="overflow-hidden rounded-3xl border border-line bg-white dark:border-gray-800 dark:bg-gray-950">
            {previewImage ? (
              <Image
                source={{ uri: previewImage }}
                className="h-48 w-full bg-gray-100 dark:bg-gray-900"
                resizeMode="cover"
              />
            ) : null}
            {previewText ? (
              <View className="border-b border-line p-5 dark:border-gray-800">
                <Text className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  {restored ? "Restored" : "Removed"} {targetLabel}
                </Text>
                <Text className="mt-2 leading-6 text-ink dark:text-white">
                  “{previewText}”
                </Text>
              </View>
            ) : null}
            <View className="p-5">
              <Text className="text-xs font-bold uppercase tracking-wider text-gray-400">
                {restored ? "Original moderation reason" : "Why we took action"}
              </Text>
              <Text weight="bold" className="mt-2 text-lg text-ink dark:text-white">
                {item.reason}
              </Text>
              <Text className="mt-3 text-xs text-gray-400">
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </View>
          </View>

          <View className="mt-5 rounded-3xl border border-line bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <Text weight="bold" className="text-xl text-ink dark:text-white">
              {restored ? "Appeal approved" : "Do you think we made a mistake?"}
            </Text>
            <Text className="mt-2 leading-5 text-gray-500">
              {restored
                ? `We reversed the original decision and restored your ${targetLabel}.`
                : "Tell us what we should reconsider. A FindEat admin will review your appeal and notify you when a decision is made."}
            </Text>

            {item.reversedAt ? (
              <View className="mt-4 rounded-2xl bg-green-50 p-4 dark:bg-green-950/30">
                <Text weight="bold" className="text-green-700 dark:text-green-400">
                  This decision was reversed
                </Text>
                <Text className="mt-1 text-sm text-green-700 dark:text-green-400">
                  Your {targetLabel} was restored.
                </Text>
              </View>
            ) : appeal ? (
              <View className="mt-4 rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/30">
                <Text weight="bold" className="capitalize text-amber-700 dark:text-amber-400">
                  Appeal {appeal.status.toLowerCase().replaceAll("_", " ")}
                </Text>
                <Text className="mt-1 text-sm leading-5 text-amber-700 dark:text-amber-400">
                  {appeal.resolutionNote ??
                    (appeal.status === "PENDING"
                      ? "We received your appeal and will review it soon."
                      : "Your appeal has been reviewed.")}
                </Text>
              </View>
            ) : (
              <View className="mt-4 gap-3">
                <TextInput
                  value={appealReason}
                  onChangeText={setAppealReason}
                  placeholder="Explain why this decision should be reviewed"
                  multiline
                  className="min-h-32"
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={!appealReason.trim() || submitting}
                  onPress={() => void submitAppeal()}
                  className={`min-h-13 items-center justify-center rounded-2xl bg-[#FF5B35] px-5 ${
                    !appealReason.trim() || submitting ? "opacity-50" : ""
                  }`}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text weight="bold" className="text-white">
                      Submit appeal
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
