import Text from "@/components/common/AppText";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { updatePostInFeedCache } from "@/hooks/useFeed";
import { api } from "@/lib/api";
import type { Post, UserRelationship } from "@findeat/types";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";

type Props = {
  post: Post;
  onMedia?: boolean;
};

export default function PostAuthorFollowAction({
  post,
  onMedia = false,
}: Props) {
  const { user } = useAuth();
  const { t } = useTranslation("notifications");
  const { t: tCommon } = useTranslation("common");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [relationshipOverride, setRelationshipOverride] = useState<{
    authorId: string;
    relationship: UserRelationship;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const relationship =
    relationshipOverride?.authorId === post.authorId
      ? (relationshipOverride?.relationship ??
        post.authorRelationship ??
        "NONE")
      : (post.authorRelationship ?? "NONE");

  if (
    !post.authorId ||
    !post.author ||
    post.authorRestaurantId ||
    post.authorId === user?.id
  ) {
    return null;
  }

  if (relationship === "FRIENDS" || relationship === "FOLLOWING") {
    return (
      <Text
        weight="medium"
        className={onMedia ? "text-sm text-white/80" : "text-sm text-gray-500"}
      >
        {t(relationship === "FRIENDS" ? "friends" : "following")}
      </Text>
    );
  }

  if (relationship === "REQUESTED") {
    return (
      <Text
        weight="medium"
        className={onMedia ? "text-sm text-white/70" : "text-sm text-gray-400"}
      >
        {t("requested")}
      </Text>
    );
  }

  async function followAuthor() {
    if (submitting || !post.authorId) return;
    setSubmitting(true);

    try {
      const result = await api.users.follow(post.authorId);
      setRelationshipOverride({
        authorId: post.authorId,
        relationship: result.relationship,
      });
      updatePostInFeedCache(queryClient, (cachedPost) =>
        cachedPost.authorId === post.authorId
          ? { ...cachedPost, authorRelationship: result.relationship }
          : cachedPost,
      );
      void queryClient.invalidateQueries({
        queryKey: ["user-profile", post.authorId],
      });
    } catch (error) {
      console.error("Could not follow feed author", error);
      showToast(tCommon("error"), { kind: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TouchableOpacity
      disabled={submitting}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={t("follow")}
      onPress={() => void followAuthor()}
      className={
        onMedia
          ? "min-w-[68px] items-center rounded-full bg-white px-3 py-1.5"
          : "min-w-[68px] items-center rounded-full bg-black px-3 py-1.5 dark:bg-white"
      }
    >
      {submitting ? (
        <ActivityIndicator
          size="small"
          color={onMedia ? "#111111" : undefined}
        />
      ) : (
        <Text
          weight="bold"
          className={
            onMedia ? "text-sm text-black" : "text-sm text-white dark:text-black"
          }
        >
          {t("follow")}
        </Text>
      )}
    </TouchableOpacity>
  );
}
