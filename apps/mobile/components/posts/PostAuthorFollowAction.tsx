import Text from "@/components/common/AppText";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { homeFeedQueryKey, updatePostInFeedCache } from "@/hooks/useFeed";
import { api } from "@/lib/api";
import type { Post, UserRelationship } from "@findeat/types";
import { getNextRelationshipAfterToggle } from "@findeat/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";

type Props = {
  post?: Post;
  authorId?: string | null;
  hasAuthor?: boolean;
  authorRestaurantId?: string | null;
  authorRelationship?: UserRelationship | null;
  onMedia?: boolean;
};

export default function PostAuthorFollowAction({
  post,
  authorId: authorIdProp,
  hasAuthor: hasAuthorProp,
  authorRestaurantId: authorRestaurantIdProp,
  authorRelationship: authorRelationshipProp,
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
  const authorId = post?.authorId ?? authorIdProp ?? null;
  const hasAuthor = post ? Boolean(post.author) : Boolean(hasAuthorProp);
  const authorRestaurantId =
    post?.authorRestaurantId ?? authorRestaurantIdProp ?? null;
  const authorRelationship =
    post?.authorRelationship ?? authorRelationshipProp ?? "NONE";
  const [submitting, setSubmitting] = useState(false);
  const relationship =
    relationshipOverride?.authorId === authorId
      ? (relationshipOverride?.relationship ??
        authorRelationship ??
        "NONE")
      : (authorRelationship ?? "NONE");

  if (
    !authorId ||
    !hasAuthor ||
    authorRestaurantId ||
    authorId === user?.id
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
    if (submitting || !authorId) return;
    const previousRelationship = relationship;
    setSubmitting(true);
    setRelationshipOverride({
      authorId,
      relationship: getNextRelationshipAfterToggle(relationship),
    });

    try {
      const result = await api.users.follow(authorId);
      setRelationshipOverride({
        authorId,
        relationship: result.relationship,
      });
      updatePostInFeedCache(queryClient, (cachedPost) =>
        cachedPost.authorId === authorId
          ? { ...cachedPost, authorRelationship: result.relationship }
          : cachedPost,
      );
      void queryClient.invalidateQueries({
        queryKey: ["user-profile", authorId],
      });
      void queryClient.invalidateQueries({
        queryKey: homeFeedQueryKey("EXPLORE"),
        refetchType: "none",
      });
    } catch (error) {
      setRelationshipOverride({
        authorId,
        relationship: previousRelationship,
      });
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
      accessibilityLabel={t(relationship === "FOLLOWED_BY" ? "followBack" : "follow")}
      onPress={() => void followAuthor()}
      className={
        onMedia
          ? "min-w-[68px] items-center rounded-full bg-white px-3 py-1.5"
          : "min-w-[68px] items-center rounded-full bg-black px-3 py-1.5 dark:bg-white"
      }
    >
      <Text
        weight="bold"
        className={
          onMedia ? "text-sm text-black" : "text-sm text-white dark:text-black"
        }
      >
        {t(relationship === "FOLLOWED_BY" ? "followBack" : "follow")}
      </Text>
    </TouchableOpacity>
  );
}
