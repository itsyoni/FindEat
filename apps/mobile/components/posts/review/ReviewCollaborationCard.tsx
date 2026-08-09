import Text from "@/components/common/AppText";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";
import type { Post } from "@findeat/types";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { UsersThreeIcon } from "phosphor-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";

type Props = {
  post: Post;
};

export default function ReviewCollaborationCard({ post }: Props) {
  const { t } = useTranslation("collaborativeReview");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [responding, setResponding] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Accepted collaborations are already represented in the author header and
  // managed from post options. Keep only pending invitations visible here so
  // accepting or declining one is never hidden behind an overflow menu.
  if (dismissed || post.collaborationStatus !== "INVITED") {
    return null;
  }

  async function join() {
    if (responding) return;
    try {
      setResponding(true);
      await api.posts.joinReview(post.id);
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      router.push({
        pathname: "/posts/contribute/[id]",
        params: { id: post.id },
      });
    } catch (error) {
      console.error("Could not join review", error);
      showToast(t("joinError"), { kind: "error" });
    } finally {
      setResponding(false);
    }
  }

  async function decline() {
    if (responding) return;
    try {
      setResponding(true);
      await api.posts.declineReview(post.id);
      setDismissed(true);
      showToast(t("inviteDeclined"));
    } catch (error) {
      console.error("Could not decline review", error);
      showToast(t("declineError"), { kind: "error" });
    } finally {
      setResponding(false);
    }
  }

  return (
    <View className="mx-4 mb-4 rounded-3xl border border-brand/40 bg-brand/10 p-4">
      <View className="flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-brand/20">
          <UsersThreeIcon size={22} color="#C89C25" weight="fill" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-bold text-black dark:text-white">
            {t("inviteTitle")}
          </Text>
          <Text className="mt-1 text-sm leading-5 text-gray-500">
            {t("inviteBody", {
              name:
                post.author?.username ||
                t("someone"),
            })}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row gap-3">
        <TouchableOpacity
          disabled={responding}
          onPress={() => void join()}
          className="flex-1 items-center rounded-2xl bg-neutral-950 py-3.5 dark:bg-neutral-100"
        >
          {responding ? (
            <ActivityIndicator color="#9CA3AF" />
          ) : (
            <Text className="font-bold text-neutral-50 dark:text-neutral-950">
              {t("joinReview")}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          disabled={responding}
          onPress={() => void decline()}
          className="items-center justify-center rounded-2xl border border-gray-300 px-5 dark:border-gray-700"
        >
          <Text className="font-bold text-gray-600 dark:text-gray-300">
            {t("decline")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
