import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import RelationshipActionButton from "@/components/profile/RelationshipActionButton";
import { homeFeedQueryKey } from "@/hooks/useFeed";
import { api } from "@/lib/api";
import type { FollowSuggestion, UserRelationship } from "@findeat/types";
import {
  getNextRelationshipAfterToggle,
  shouldRemoveFollowRelationship,
} from "@findeat/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";

export const followSuggestionsQueryKey = ["users", "follow-suggestions"] as const;

type Props = {
  topInset: number;
};

export default function FollowingSuggestions({ topInset }: Props) {
  const { t } = useTranslation(["common", "notifications"]);
  const queryClient = useQueryClient();
  const requestsInFlight = useRef(new Set<string>());
  const suggestions = useQuery({
    queryKey: followSuggestionsQueryKey,
    queryFn: () => api.users.followSuggestions(),
    staleTime: 5 * 60_000,
  });

  function updateRelationship(userId: string, relationship: UserRelationship) {
    queryClient.setQueryData<FollowSuggestion[]>(
      followSuggestionsQueryKey,
      (current) =>
        current?.map((item) =>
          item.id === userId ? { ...item, relationship } : item,
        ),
    );
  }

  async function toggleFollow(item: FollowSuggestion) {
    if (requestsInFlight.current.has(item.id)) return;
    requestsInFlight.current.add(item.id);

    const wasFollowing = shouldRemoveFollowRelationship(item.relationship);
    updateRelationship(
      item.id,
      getNextRelationshipAfterToggle(item.relationship),
    );

    try {
      const result = await api.users.toggleFollow(item.id, wasFollowing);
      updateRelationship(item.id, result.relationship);
      await queryClient.invalidateQueries({
        queryKey: homeFeedQueryKey("FOLLOWING"),
      });
    } catch (error) {
      console.error("Could not update suggested follow", error);
      updateRelationship(item.id, item.relationship ?? "NONE");
    } finally {
      requestsInFlight.current.delete(item.id);
    }
  }

  function relationshipLabel(relationship?: UserRelationship) {
    switch (relationship) {
      case "FRIENDS":
        return t("notifications:friends");
      case "FOLLOWING":
        return t("notifications:following");
      case "FOLLOWED_BY":
        return t("notifications:followBack");
      case "REQUESTED":
        return t("notifications:requested");
      default:
        return t("notifications:follow");
    }
  }

  return (
    <View className="px-5" style={{ paddingTop: topInset + 24, paddingBottom: 40 }}>
      <Text className="text-center text-2xl font-bold text-black dark:text-white">
        {t("common:findPeopleToFollow")}
      </Text>
      <Text className="mx-4 mt-2 text-center text-sm leading-5 text-gray-500 dark:text-gray-400">
        {t("common:followSuggestionsHint")}
      </Text>

      {suggestions.isPending ? (
        <ActivityIndicator className="mt-10" />
      ) : (
        <View className="mt-6 gap-4">
          {(suggestions.data ?? []).map((item) => (
            <TouchableOpacity
              key={item.id}
              className="flex-row items-center"
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: "/(users)/[id]",
                  params: { id: item.id },
                })
              }
            >
              <Avatar uri={item.avatarUrl} username={item.username} size={52} />
              <View className="ml-3 min-w-0 flex-1">
                <Text
                  className="font-bold text-black dark:text-white"
                  numberOfLines={1}
                >
                  {item.username}
                </Text>
              </View>
              <RelationshipActionButton
                relationship={item.relationship}
                label={relationshipLabel(item.relationship)}
                className="ml-3 min-w-28"
                onPress={(event) => {
                  event.stopPropagation();
                  void toggleFollow(item);
                }}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
