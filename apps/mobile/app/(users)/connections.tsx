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
import { userDisplayName, usernameLabel } from "@/lib/userIdentity";

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
  const [counts, setCounts] = useState<Record<ConnectionsTab, number>>({
    followers: 0,
    following: 0,
    friends: 0,
  });
  const followRequestsInFlight = useRef(new Set<string>());

  async function onRefresh() {
    setRefreshing(true);
    await loadConnections();
    setRefreshing(false);
  }

  const loadConnections = useCallback(async () => {
    try {
      setLoading(true);

      const [followers, following, friends] = await Promise.all([
        api.users.followers(id),
        api.users.following(id),
        api.users.friends(id),
      ]);
      setCounts({
        followers: followers.length,
        following: following.length,
        friends: friends.length,
      });
      const connections =
        activeTab === "followers" ? followers : activeTab === "following" ? following : friends;

      const currentUserId = currentUser?.id;
      setItems(
        currentUserId
          ? [...connections].sort((left, right) => {
              const leftUser =
                activeTab === "following" ? left.following : left.follower;
              const rightUser =
                activeTab === "following" ? right.following : right.follower;
              return Number(rightUser?.id === currentUserId) -
                Number(leftUser?.id === currentUserId);
            })
          : connections,
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id, activeTab, currentUser?.id]);

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
    <ThemedSafeAreaView edges={["top"]}>
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
            label: `${t("profile:followers")} (${counts.followers})`,
            value: "followers",
          },
          {
            label: `${t("profile:following")} (${counts.following})`,
            value: "following",
          },
          {
            label: `${t("notifications:friends")} (${counts.friends})`,
            value: "friends",
          },
        ]}
      />

      {loading ? <SkeletonList count={7} /> : <FlatList
        className="px-6"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 }}
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
                    {userDisplayName(user)}
                  </Text>
                  {user.displayName?.trim() ? (
                    <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {usernameLabel(user.username)}
                    </Text>
                  ) : null}
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
