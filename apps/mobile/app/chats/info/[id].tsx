import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import RestaurantBadge from "@/components/restaurants/RestaurantBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import type { Chat } from "@findeat/types";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  ChatCircleIcon,
  MagnifyingGlassIcon,
  StarIcon,
  StorefrontIcon,
  UserCircleIcon,
  UsersThreeIcon,
} from "phosphor-react-native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { userDisplayName } from "@/lib/userIdentity";

export default function ChatInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useTranslation("chat");
  const { isDark } = useAppTheme();
  const [chat, setChat] = useState<Chat | null>(null);
  const [starredCount, setStarredCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [nextChat, starred] = await Promise.all([
        api.chats.get(id),
        api.chats.starredMessages(id),
      ]);
      setChat(nextChat);
      setStarredCount(starred.length);
    } catch (error) {
      console.error("Could not load conversation info", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const otherUser = chat?.participants.find(
    (participant) => participant.userId !== user?.id,
  )?.user;
  const isGroup = chat?.type === "GROUP";
  const isRestaurant = chat?.type === "RESTAURANT";
  const title = isGroup
    ? chat?.title
    : isRestaurant
      ? chat?.restaurant?.name
      : userDisplayName(otherUser);
  const imageUrl = isGroup
    ? chat?.imageUrl
    : isRestaurant
      ? chat?.restaurant?.logoUrl
      : otherUser?.avatarUrl;
  const subtitle = isGroup
    ? t("members", { count: chat?.participants.length ?? 0 })
    : isRestaurant
      ? t("restaurantChat")
      : "";

  function openProfile() {
    if (!chat) return;
    if (isGroup) {
      router.push({ pathname: "/chats/group/[id]", params: { id: chat.id } });
    } else if (isRestaurant && chat.restaurant?.id) {
      router.push({
        pathname: "/restaurants/[id]",
        params: { id: chat.restaurant.id },
      });
    } else if (otherUser?.id) {
      router.push({ pathname: "/(users)/[id]", params: { id: otherUser.id } });
    }
  }

  const ProfileIcon = isGroup
    ? UsersThreeIcon
    : isRestaurant
      ? StorefrontIcon
      : UserCircleIcon;

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: isDark ? "#080808" : "#FBFAF8" }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View className="h-14 flex-row items-center px-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center"
        >
          <DirectionalIcon
            direction="back"
            variant="arrow"
            size={24}
            color={isDark ? "#FAF9F6" : "#171717"}
          />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-bold text-black dark:text-white">
          {t("conversationInfo")}
        </Text>
        <View className="h-11 w-11" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#D97706" size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="items-center px-5 pb-7 pt-5">
            {isGroup && !imageUrl ? (
              <View className="h-28 w-28 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800">
                <UsersThreeIcon size={48} color="#6B7280" weight="fill" />
              </View>
            ) : (
              <Avatar
                uri={imageUrl}
                username={title ?? t("chat")}
                size={112}
                fallbackType={isRestaurant ? "restaurant" : "user"}
                showSnapIndicator={false}
              />
            )}
            <View className="mt-4 flex-row items-center justify-center">
              <Text className="shrink text-center text-2xl font-bold text-black dark:text-white">
                {title ?? t("chat")}
              </Text>
              {isRestaurant ? <RestaurantBadge size={18} /> : null}
            </View>
            {subtitle ? (
              <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {subtitle}
              </Text>
            ) : null}
            <TouchableOpacity
              onPress={openProfile}
              className="mt-5 flex-row items-center rounded-2xl bg-[#EEEAE2] px-5 py-3 dark:bg-[#171719]"
            >
              <ProfileIcon size={20} color="#D97706" weight="duotone" />
              <Text className="ml-2 font-bold text-black dark:text-white">
                {t(isGroup ? "groupDetails" : isRestaurant ? "viewRestaurant" : "viewProfile")}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="mx-4 overflow-hidden rounded-[22px] bg-white dark:bg-[#111113]">
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/chats/search/[id]",
                  params: { id: id! },
                })
              }
              className="flex-row items-center border-b border-gray-100 px-4 py-4 dark:border-gray-800"
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <MagnifyingGlassIcon size={22} color={isDark ? "#FAF9F6" : "#171717"} weight="duotone" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-black dark:text-white">
                  {t("searchMessages")}
                </Text>
                <Text className="mt-0.5 text-xs text-gray-500">
                  {t("searchMessagesHint")}
                </Text>
              </View>
              <DirectionalIcon direction="forward" variant="caret" size={20} color="#9CA3AF" weight="bold" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/chats/starred/[id]",
                  params: { id: id! },
                })
              }
              className="flex-row items-center px-4 py-4"
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50">
                <StarIcon size={22} color="#D97706" weight="fill" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-black dark:text-white">
                  {t("starredMessages")}
                </Text>
                <Text className="mt-0.5 text-xs text-gray-500">
                  {t("starredMessagesCount", { count: starredCount })}
                </Text>
              </View>
              <DirectionalIcon
                direction="forward"
                variant="caret"
                size={20}
                color="#9CA3AF"
                weight="bold"
              />
            </TouchableOpacity>
          </View>

          <View className="mx-5 mt-5 flex-row items-center justify-center">
            <ChatCircleIcon size={15} color="#9CA3AF" weight="fill" />
            <Text className="ml-2 text-center text-xs text-gray-400">
              {t("starredMessagesPrivate")}
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
