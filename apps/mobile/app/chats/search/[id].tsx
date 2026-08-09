import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import type { Message } from "@findeat/types";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { MagnifyingGlassIcon, StarIcon, XIcon } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SearchChatMessagesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation("chat");
  const { isDark } = useAppTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Message[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState("");

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!id || normalizedQuery.length < 2) return;
    let active = true;
    const timer = setTimeout(() => {
      setSearching(true);
      void api.chats
        .searchMessages(id, normalizedQuery)
        .then((messages) => {
          if (!active) return;
          setResults(messages);
          setSearchedQuery(normalizedQuery);
        })
        .catch((error) => {
          console.error("Could not search messages", error);
          if (active) setResults([]);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id, query]);

  function updateQuery(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setSearchedQuery("");
      setSearching(false);
    }
  }

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: isDark ? "#080808" : "#FBFAF8" }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center px-3 py-2">
        <TouchableOpacity onPress={() => router.back()} className="h-11 w-11 items-center justify-center">
          <DirectionalIcon direction="back" variant="arrow" size={24} color={isDark ? "#FAF9F6" : "#171717"} />
        </TouchableOpacity>
        <View className="ml-1 min-h-12 flex-1 flex-row items-center rounded-2xl bg-white px-3 dark:bg-[#171719]">
          <MagnifyingGlassIcon size={20} color="#9CA3AF" />
          <TextInput
            autoFocus
            value={query}
            onChangeText={updateQuery}
            placeholder={t("searchMessagesPlaceholder")}
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
            className="ml-2 min-h-12 flex-1 text-base text-black dark:text-white"
          />
          {query ? (
            <TouchableOpacity onPress={() => updateQuery("")} className="h-8 w-8 items-center justify-center">
              <XIcon size={18} color="#9CA3AF" weight="bold" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={results.length ? { padding: 16, paddingBottom: 40 } : { flexGrow: 1 }}
        ListHeaderComponent={
          searchedQuery && results.length ? (
            <Text className="mb-3 text-xs font-semibold text-gray-500">
              {t("messageSearchResults", { count: results.length })}
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const senderName = item.sentAsRestaurant?.name ?? item.sender.username;
          const senderImage = item.sentAsRestaurant?.logoUrl ?? item.sender.avatarUrl;
          return (
            <TouchableOpacity
              activeOpacity={0.72}
              onPress={() =>
                router.dismissTo({
                  pathname: "/chats/[id]",
                  params: { id: id!, messageId: item.id },
                })
              }
              className="mb-2 rounded-[20px] border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-[#151517]"
            >
              <View className="flex-row items-center">
                <Avatar uri={senderImage} username={senderName} size={36} fallbackType={item.sentAsRestaurant ? "restaurant" : "user"} showSnapIndicator={false} />
                <View className="ml-3 min-w-0 flex-1">
                  <View className="flex-row items-center">
                    <Text numberOfLines={1} className="min-w-0 flex-1 font-bold text-black dark:text-white">{senderName}</Text>
                    {item.starred ? <StarIcon size={13} color="#D97706" weight="fill" /> : null}
                  </View>
                  <Text className="mt-0.5 text-[11px] text-gray-400">
                    {new Date(item.createdAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              </View>
              <Text numberOfLines={4} className="mt-3 text-sm leading-5 text-gray-700 dark:text-gray-200">
                {item.content}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-10 pb-20">
            {searching ? (
              <ActivityIndicator color="#D97706" size="large" />
            ) : (
              <>
                <View className="h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
                  <MagnifyingGlassIcon size={35} color="#9CA3AF" weight="duotone" />
                </View>
                <Text className="mt-5 text-center text-xl font-bold text-black dark:text-white">
                  {searchedQuery ? t("noMessageSearchResults") : t("searchThisConversation")}
                </Text>
                <Text className="mt-2 text-center text-sm leading-5 text-gray-500">
                  {searchedQuery ? t("tryDifferentMessageSearch") : t("messageSearchMinimum")}
                </Text>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}
