import SearchBar from "@/components/common/inputs/SearchBar";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import {
  addRecentSearch,
  getRecentSearches,
  removeRecentSearch,
} from "@/lib/recentSearches";
import { RecentSearchItem, UserSummary } from "@findeat/types";
import { router } from "expo-router";
import { XIcon } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import Text from "../common/AppText";
import Avatar from "../common/Avatar";

type Props = {
  onCancel: () => void;
  mode?: "chat" | "profile";
};

export default function SearchUsersView({ onCancel, mode = "profile" }: Props) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    getRecentSearches(user.id).then(setRecentSearches);
  }, [user]);

  async function searchUsers(text: string) {
    setQuery(text);

    if (!text.trim()) {
      setUsers([]);
      return;
    }

    const users = await api.users.search(text);
    setUsers(users);
  }

  async function handleUserPress(userId: string) {
    if (!user) return;

    try {
      const selectedUser = users.find((u) => u.id === userId);
      const recentUser = recentSearches.find(
        (item) => item.type === "USER" && item.id === userId,
      );

      if (selectedUser) {
        const updated = await addRecentSearch(user.id, {
          id: selectedUser.id,
          type: "USER",
          title: selectedUser.username,
          subtitle: undefined,
          imageUrl: selectedUser.avatarUrl,
        });

        setRecentSearches(updated);
      }

      if (mode === "chat") {
        router.push({
          pathname: "/chats/[id]",
          params: {
            id: "new-direct",
            type: "DIRECT",
            targetUserId: userId,
            title: selectedUser?.username || recentUser?.title || userId,
            imageUrl: selectedUser?.avatarUrl ?? recentUser?.imageUrl ?? "",
          },
        });

        return;
      }

      router.push({
        pathname: "/(users)/[id]",
        params: { id: userId },
      });
    } catch (error) {
      console.error(error);
    }
  }

  async function handleRemoveRecentSearch(item: RecentSearchItem) {
    if (!user) return;

    const updated = await removeRecentSearch(user.id, item.id, item.type);
    setRecentSearches(updated);
  }

  return (
    <>
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(120)}
        className="flex-row items-center"
      >
        <Animated.View layout={LinearTransition.springify()} className="flex-1">
          <SearchBar value={query} onChangeText={searchUsers} autoFocus />
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(80).duration(160)}
          exiting={FadeOut.duration(100)}
          layout={LinearTransition.springify()}
        >
          <TouchableOpacity className="pr-5" onPress={onCancel}>
            <Text className="font-semibold text-black">Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {query.trim() ? (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleUserPress(item.id)}
              className="border-b border-gray-100 p-4 flex-1 flex-row items-center gap-4"
            >
              <Avatar uri={item.avatarUrl} username={item.username} size={44} showSnapIndicator={false} />
              <View className="flex-1">
                <Text className="font-bold text-black dark:text-white">
                  {item.username}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          data={recentSearches.filter((item) => item.type === "USER")}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleUserPress(item.id)}
              className="flex-row items-center gap-4 border-b border-gray-100 p-4"
            >
              <Avatar uri={item.imageUrl} username={item.title} size={44} showSnapIndicator={false} />

              <View className="flex-1">
                <Text className="font-bold text-black dark:text-white">
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {item.subtitle.replace(/^@+/, "")}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={(event) => {
                  event.stopPropagation();
                  handleRemoveRecentSearch(item);
                }}
                hitSlop={12}
              >
                <XIcon size={16} color="#0B0B0A" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </>
  );
}
