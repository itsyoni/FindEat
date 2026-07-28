import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import type { Message } from "@findeat/types";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ChatCircleIcon, ImageIcon, MapPinIcon, StarIcon } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, TouchableOpacity, View } from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { SafeAreaView } from "react-native-safe-area-context";

export default function StarredMessagesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation("chat");
  const { isDark } = useAppTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      let active = true;
      setLoading(true);
      void api.chats
        .starredMessages(id)
        .then((value) => {
          if (active) setMessages(value);
        })
        .catch((error) => console.error("Could not load starred messages", error))
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [id]),
  );

  function preview(message: Message) {
    if (message.content) return message.content;
    if (message.type === "IMAGE") return t("photoMessage");
    if (message.type === "POST") return t("postMessage");
    if (message.type === "RESTAURANT") return t("restaurantMessage");
    return t("message");
  }

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: isDark ? "#080808" : "#FBFAF8" }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View className="h-14 flex-row items-center px-4">
        <TouchableOpacity onPress={() => router.back()} className="h-11 w-11 items-center justify-center">
          <DirectionalIcon direction="back" variant="arrow" size={24} color={isDark ? "#FFF" : "#171717"} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-bold text-black dark:text-white">
          {t("starredMessages")}
        </Text>
        <View className="h-11 w-11" />
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={() => {
          if (!id) return;
          void api.chats.starredMessages(id).then(setMessages);
        }}
        contentContainerStyle={messages.length ? { padding: 16, paddingBottom: 40 } : { flexGrow: 1 }}
        renderItem={({ item }) => {
          const senderName = item.sentAsRestaurant?.name ?? item.sender.displayName ?? item.sender.username;
          const senderImage = item.sentAsRestaurant?.logoUrl ?? item.sender.avatarUrl;
          return (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                router.dismissTo({
                  pathname: "/chats/[id]",
                  params: { id: id!, messageId: item.id },
                })
              }
              className="mb-3 rounded-[22px] border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-[#151517]"
            >
              <View className="flex-row items-center">
                <Avatar uri={senderImage} username={senderName} size={38} fallbackType={item.sentAsRestaurant ? "restaurant" : "user"} />
                <View className="ml-3 min-w-0 flex-1">
                  <Text numberOfLines={1} className="font-bold text-black dark:text-white">{senderName}</Text>
                  <Text className="mt-0.5 text-[11px] text-gray-400">
                    {new Date(item.createdAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                <StarIcon size={17} color="#D97706" weight="fill" />
              </View>
              <View className="mt-3 flex-row items-center rounded-2xl bg-gray-50 p-3 dark:bg-black/25">
                {item.type === "IMAGE" && item.imageUrl ? (
                  <ProgressiveImage source={{ uri: item.imageUrl }} className="mr-3 h-14 w-14 rounded-xl" />
                ) : item.type === "POST" ? (
                  <ImageIcon size={20} color="#9CA3AF" weight="duotone" style={{ marginRight: 10 }} />
                ) : item.type === "RESTAURANT" ? (
                  <MapPinIcon size={20} color="#9CA3AF" weight="duotone" style={{ marginRight: 10 }} />
                ) : null}
                <Text numberOfLines={4} className="min-w-0 flex-1 text-sm leading-5 text-gray-700 dark:text-gray-200">
                  {preview(item)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View className="flex-1 items-center justify-center px-10 pb-20">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
                <StarIcon size={36} color="#D97706" weight="duotone" />
              </View>
              <Text className="mt-5 text-xl font-bold text-black dark:text-white">{t("noStarredMessages")}</Text>
              <Text className="mt-2 text-center text-sm leading-5 text-gray-500">{t("noStarredMessagesDescription")}</Text>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center">
              <ChatCircleIcon size={32} color="#9CA3AF" weight="duotone" />
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
