import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import { Skeleton, SkeletonList, SkeletonPulse, ThemedSafeAreaView } from "@/components/common";
import { api } from "@/lib/api";
import { Chat } from "@findeat/types/chat";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { UserPlusIcon } from "phosphor-react-native";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";

export default function GroupDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useAppTheme();
  const foreground = isDark ? "#FAF9F6" : "#111827";

  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api.chats
      .get(id)
      .then((chat) => {
        if (!cancelled) setChat(chat);
      })
      .catch((error) => console.error("load group failed", error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading || !chat) {
    return (
      <>
        <Stack.Screen options={{ title: "", headerBackVisible: false }} />
        <ThemedSafeAreaView>
          <SkeletonPulse>
            <View className="items-center border-b border-gray-100 px-6 py-8 dark:border-gray-800">
              <Skeleton width={96} height={96} circle />
              <Skeleton width="48%" height={28} radius={10} style={{ marginTop: 16 }} />
              <Skeleton width="24%" height={12} radius={6} style={{ marginTop: 10 }} />
              <Skeleton width={150} height={46} radius={16} style={{ marginTop: 24 }} />
            </View>
          </SkeletonPulse>
          <SkeletonList count={7} />
        </ThemedSafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerBackVisible: false,
          headerStyle: { backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6" },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              className="flex-row items-center pr-3"
              onPress={() => router.back()}
            >
              <DirectionalIcon direction="back" size={24} color={foreground} />
              <Text className="text-lg text-black dark:text-white">Back</Text>
            </Pressable>
          ),
        }}
      />

      <ThemedSafeAreaView>
        <View className="items-center border-b border-gray-100 px-6 py-8 dark:border-gray-800">
          <Avatar
            uri={chat.imageUrl}
            username={chat.title ?? "Group"}
            size={96}
          />

          <Text className="mt-4 text-3xl font-bold text-black dark:text-white">
            {chat.title ?? "Group"}
          </Text>

          <Text className="mt-2 text-gray-500">
            {chat.participants.length} members
          </Text>

          <TouchableOpacity
            className="mt-6 flex-row items-center rounded-2xl bg-black px-5 py-3 dark:bg-white"
            onPress={() =>
              router.push({
                pathname: "/chats/group/add-members",
                params: { id: chat.id },
              })
            }
          >
            <UserPlusIcon size={20} color={isDark ? "#0B0B0A" : "#FAF9F6"} weight="bold" />
            <Text className="ml-2 font-bold text-white dark:text-black">Add members</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={chat.participants}
          keyExtractor={(item) => item.userId}
          ListHeaderComponent={
            <Text className="px-5 py-4 text-sm font-bold uppercase text-gray-400">
              Members
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              className="flex-row items-center border-b border-gray-100 px-5 py-4 dark:border-gray-900"
              onPress={() =>
                router.push({
                  pathname: "/(users)/[id]",
                  params: { id: item.userId },
                })
              }
            >
              <Avatar
                uri={item.user.avatarUrl}
                username={item.user.username}
                size={48}
              />

              <View className="ml-4 flex-1">
                <Text className="font-bold text-black dark:text-white">
                  @{item.user.username}
                </Text>

                <Text className="mt-1 text-sm text-gray-500">
                  {item.role === "ADMIN" ? "Admin" : "Member"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </ThemedSafeAreaView>
    </>
  );
}
