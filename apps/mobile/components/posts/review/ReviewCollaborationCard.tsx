import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [responding, setResponding] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const participants = post.reviewParticipants ?? [];
  const joined = participants.filter(
    (participant) =>
      participant.status === "JOINED" && participant.userId !== post.authorId,
  );
  const pending = participants.filter(
    (participant) => participant.status === "INVITED",
  );

  if (
    dismissed ||
    (joined.length === 0 &&
      pending.length === 0 &&
      post.collaborationStatus !== "INVITED")
  ) {
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

  const isInvited = post.collaborationStatus === "INVITED";
  const isHost = post.authorId === user?.id;
  const canAddTake = post.canContribute && post.authorId !== user?.id;

  return (
    <View
      className={`mx-4 mb-4 rounded-3xl border p-4 ${
        isInvited
          ? "border-brand/40 bg-brand/10"
          : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
      }`}
    >
      <View className="flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-brand/20">
          <UsersThreeIcon size={22} color="#C89C25" weight="fill" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-bold text-black dark:text-white">
            {isInvited ? t("inviteTitle") : t("reviewedTogether")}
          </Text>
          <Text className="mt-1 text-sm leading-5 text-gray-500">
            {isInvited
              ? t("inviteBody", {
                  name:
                    post.author?.displayName ||
                    post.author?.username ||
                    t("someone"),
                })
              : joined.length > 0
                ? t("joinedPeople", { count: joined.length })
                : t("pendingPeople", { count: pending.length })}
          </Text>
        </View>
        <View className="ml-2 flex-row">
          {joined.slice(0, 4).map((participant, index) => (
            <View
              key={participant.id}
              style={{ marginLeft: index === 0 ? 0 : -9 }}
            >
              <Avatar
                uri={participant.user.avatarUrl}
                username={participant.user.username}
                size={34}
              />
            </View>
          ))}
        </View>
      </View>

      {isInvited && (
        <View className="mt-4 flex-row gap-3">
          <TouchableOpacity
            disabled={responding}
            onPress={() => void join()}
            className="flex-1 items-center rounded-2xl bg-black py-3.5 dark:bg-white"
          >
            {responding ? (
              <ActivityIndicator color="#9CA3AF" />
            ) : (
              <Text className="font-bold text-white dark:text-black">
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
      )}

      {!isInvited && canAddTake && (
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/posts/contribute/[id]",
              params: { id: post.id },
            })
          }
          className="mt-4 items-center rounded-2xl bg-black py-3.5 dark:bg-white"
        >
          <Text className="font-bold text-white dark:text-black">
            {t("addYourTake")}
          </Text>
        </TouchableOpacity>
      )}

      {!isInvited && isHost && (
        <View className="mt-4 flex-row gap-3">
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/posts/contribute/[id]",
                params: { id: post.id },
              })
            }
            className="flex-1 items-center rounded-2xl bg-black py-3.5 dark:bg-white"
          >
            <Text className="font-bold text-white dark:text-black">
              {t("manageDishes")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/posts/collaborators/[id]",
                params: { id: post.id },
              })
            }
            className="flex-1 items-center rounded-2xl border border-gray-300 py-3.5 dark:border-gray-700"
          >
            <Text className="font-bold text-black dark:text-white">
              {t("managePeople")}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
