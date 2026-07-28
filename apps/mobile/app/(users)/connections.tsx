import {
  IconButton,
  SkeletonList,
  ThemedSafeAreaView,
} from "@/components/common";
import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import Tabs from "@/components/common/Tabs";
import RelationshipActionButton from "@/components/profile/RelationshipActionButton";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { ConnectionItem, UserRelationship } from "@findeat/types";
import {
  getNextRelationshipAfterToggle,
  shouldRemoveFollowRelationship,
} from "@findeat/utils";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import { DirectionalBackIcon } from "@/components/common/icons/DirectionalIcon";
import { useTranslation } from "react-i18next";

type ConnectionsTab = "followers" | "following" | "friends";

export default function ConnectionsScreen() {
  const { t } = useTranslation(["profile", "common", "notifications"]);
  const { user: currentUser } = useAuth();
  const { id, type } = useLocalSearchParams<{
    id: string;
    type?: ConnectionsTab;
  }>();

  const [activeTab, setActiveTab] = useState<ConnectionsTab>(
    type ?? "followers",
  );
  const [items, setItems] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const followRequestsInFlight = useRef(new Set<string>());

  async function onRefresh() {
    setRefreshing(true);
    await loadConnections();
    setRefreshing(false);
  }

  const loadConnections = useCallback(async () => {
    try {
      setLoading(true);

      const connections =
        activeTab === "followers"
          ? await api.users.followers(id)
          : activeTab === "following"
            ? await api.users.following(id)
            : await api.users.friends(id);

      setItems(connections);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id, activeTab]);

  async function toggleFollow(
    targetUserId: string,
    relationship?: UserRelationship,
  ) {
    if (followRequestsInFlight.current.has(targetUserId)) return;
    followRequestsInFlight.current.add(targetUserId);
    const isFollowing = shouldRemoveFollowRelationship(relationship);
    const optimisticRelationship =
      getNextRelationshipAfterToggle(relationship);

    function updateRelationship(nextRelationship: UserRelationship) {
      setItems((current) =>
        current.map((item) => {
          const user = getUserFromConnection(item);

          if (user?.id !== targetUserId) return item;
          if (user.relationship === nextRelationship) return item;

          if (activeTab === "following") {
            return {
              ...item,
              following: {
                ...item.following!,
                relationship: nextRelationship,
              },
            };
          }

          return {
            ...item,
            follower: {
              ...item.follower!,
              relationship: nextRelationship,
            },
          };
        }),
      );
    }

    updateRelationship(optimisticRelationship);

    try {
      const result = await api.users.toggleFollow(targetUserId, isFollowing);
      updateRelationship(result.relationship);
    } catch (error) {
      console.error("Could not update follow relationship", error);
      updateRelationship(relationship ?? "NONE");
    } finally {
      followRequestsInFlight.current.delete(targetUserId);
    }
  }
  function getUserFromConnection(item: ConnectionItem) {
    if (activeTab === "following") return item.following;
    return item.follower;
  }

  function getRelationshipText(relationship?: UserRelationship) {
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

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  return (
    <ThemedSafeAreaView edges={["top"]} className="pt-4">
      <View className="px-4 pb-2">
        <IconButton
          icon={DirectionalBackIcon}
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            label: "Followers",
            value: "followers",
          },
          {
            label: "Following",
            value: "following",
          },
          {
            label: "Friends",
            value: "friends",
          },
        ]}
      />

      {loading ? <SkeletonList count={7} /> : <FlatList
        className="mt-6 px-6"
        refreshing={refreshing}
        onRefresh={onRefresh}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const user = getUserFromConnection(item);

          if (!user) return null;

          const relationship = user.relationship;

          const buttonText = getRelationshipText(relationship);
          const isCurrentUser = currentUser?.id === user.id;

          return (
            <TouchableOpacity
              className="mb-5 flex-row items-center justify-between"
              onPress={() =>
                router.push({
                  pathname: "/(users)/[id]",
                  params: { id: user.id },
                })
              }
            >
              <View className="flex-1 flex-row items-center">
                <Avatar
                  uri={user.avatarUrl}
                  username={user.username}
                  size={48}
                />

                <View className="ml-4 flex-1">
                  <Text className="text-lg font-bold text-black dark:text-white">
                    {user.displayName?.trim() || user.username}
                  </Text>
                  <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    @{user.username}
                  </Text>
                </View>
              </View>

              {!isCurrentUser ? (
                <RelationshipActionButton
                  className="w-30"
                  relationship={relationship}
                  label={buttonText}
                  onPress={(event) => {
                    event.stopPropagation();
                    void toggleFollow(user.id, relationship);
                  }}
                />
              ) : null}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text className="text-gray-500">No users yet</Text>}
      />}
    </ThemedSafeAreaView>
  );
}
