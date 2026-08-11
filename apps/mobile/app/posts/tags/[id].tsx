import ReviewParticipantsStep from "@/components/review-creator/steps/ReviewParticipantsStep";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { updatePostInFeedCache } from "@/hooks/useFeed";
import { api } from "@/lib/api";
import type { ReviewInviteeDraft } from "@findeat/types";
import { useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, View } from "react-native";

export default function ManagePostTagsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const { t } = useTranslation("common");
  const [selected, setSelected] = useState<ReviewInviteeDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api.posts
      .get(id)
      .then((post) => {
        if (cancelled) return;
        setSelected(
          (post.taggedUsers ?? []).map((user) => ({
            id: user.id,
            username: user.username,
            displayName: user.displayName ?? `@${user.username}`,
            avatarUrl: user.avatarUrl,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) {
          showToast(t("manageTagsError"), { kind: "error" });
          router.back();
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, showToast, t]);

  async function save() {
    if (saving) return;
    try {
      setSaving(true);
      const post = await api.posts.updateTags(
        id,
        selected.map((user) => user.id),
      );
      updatePostInFeedCache(queryClient, (cached) =>
        cached.id === post.id ? post : cached,
      );
      showToast(t("tagsUpdated"));
      router.back();
    } catch {
      showToast(t("manageTagsError"), { kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {loading ? (
        <View
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
        >
          <ActivityIndicator color="#FF5B35" />
        </View>
      ) : (
        <ReviewParticipantsStep
          mode="tag"
          selected={selected}
          onChange={setSelected}
          onBack={() => router.back()}
          onDone={() => void save()}
          saving={saving}
        />
      )}
    </>
  );
}
