import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import { SkeletonList, TextInput, ThemedSafeAreaView } from "@/components/common";
import SearchBar from "@/components/common/inputs/SearchBar";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import { getSuggestedFriends, searchFriends } from "@/services/search";
import type { SearchResultItem } from "@findeat/types/search";
import { router, Stack } from "expo-router";
import {
  CheckCircleIcon,
  CheckIcon,
  UsersThreeIcon,
} from "phosphor-react-native";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

type Step = "MEMBERS" | "DETAILS";

export default function CreateGroupScreen() {
  const { t } = useTranslation("chat");
  const { isDark } = useAppTheme();
  const [step, setStep] = useState<Step>("MEMBERS");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [suggestedFriends, setSuggestedFriends] = useState<SearchResultItem[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getSuggestedFriends()
      .then((friends) => {
        if (!cancelled) setSuggestedFriends(friends);
      })
      .catch((suggestionError) => {
        console.error("suggested friends failed", suggestionError);
        if (!cancelled) setSuggestedFriends([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggestions(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      try {
        setSearching(true);
        const friends = await searchFriends(trimmedQuery);
        if (!cancelled) setResults(friends);
      } catch (searchError) {
        console.error("friend search failed", searchError);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  function handleQueryChange(value: string) {
    setQuery(value);

    if (!value.trim()) {
      setResults([]);
      setSearching(false);
    }
  }

  function toggleUser(user: SearchResultItem) {
    setSelectedUsers((current) =>
      current.some((item) => item.id === user.id)
        ? current.filter((item) => item.id !== user.id)
        : [...current, user],
    );
  }

  function goBack() {
    if (step === "DETAILS") {
      setStep("MEMBERS");
      setError(null);
      return;
    }

    router.back();
  }

  async function createGroup() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || selectedUsers.length < 2 || creating) return;

    try {
      setCreating(true);
      setError(null);
      const group = await api.chats.createGroup({
        title: trimmedTitle,
        participantIds: selectedUsers.map((user) => user.id),
      });

      router.replace({ pathname: "/chats/[id]", params: { id: group.id } });
    } catch (createError) {
      console.error("create group failed", createError);
      setError(t("createGroupError"));
    } finally {
      setCreating(false);
    }
  }

  const iconColor = isDark ? "#FAF9F6" : "#111827";
  const showingSearch = query.trim().length > 0;
  const visibleFriends = showingSearch ? results : suggestedFriends;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ThemedSafeAreaView edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View className="flex-row items-center border-b border-gray-100 px-4 py-3 dark:border-gray-900">
            <TouchableOpacity
              onPress={goBack}
              className="h-11 w-11 items-center justify-center rounded-full"
            >
              <DirectionalIcon direction="back" size={25} color={iconColor} weight="bold" />
            </TouchableOpacity>

            <View className="ml-2 flex-1">
              <Text className="text-xl font-bold text-black dark:text-white">
                {step === "MEMBERS"
                  ? t("newGroup")
                  : t("groupDetails")}
              </Text>
              <Text className="text-sm text-gray-500">
                {step === "MEMBERS"
                  ? t("selectedMembers", { count: selectedUsers.length })
                  : t("groupMembers", { count: selectedUsers.length + 1 })}
              </Text>
            </View>
          </View>

          {step === "MEMBERS" ? (
            <View className="flex-1">
              {selectedUsers.length > 0 && (
                <View className="border-b border-gray-100 py-3 dark:border-gray-900">
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
                  >
                    {selectedUsers.map((user) => (
                      <TouchableOpacity
                        key={user.id}
                        onPress={() => toggleUser(user)}
                        className="w-16 items-center"
                      >
                        <View>
                          <Avatar
                            uri={user.imageUrl}
                            username={user.title}
                            size={52}
                          />
                          <View className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full bg-black dark:bg-white">
                            <CheckIcon
                              size={12}
                              color={isDark ? "#0B0B0A" : "#FAF9F6"}
                              weight="bold"
                            />
                          </View>
                        </View>
                        <Text
                          numberOfLines={1}
                          className="mt-2 text-center text-xs text-black dark:text-white"
                        >
                          {user.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <SearchBar
                value={query}
                onChangeText={handleQueryChange}
                placeholder={t("searchFriends")}
              />

              {!showingSearch && !loadingSuggestions && suggestedFriends.length > 0 && (
                <View className="px-5 pb-1 pt-4">
                  <Text className="text-lg font-bold text-black dark:text-white">
                    {t("suggestedFriends")}
                  </Text>
                  <Text className="mt-1 text-sm text-gray-500">
                    {t("suggestedFriendsHint")}
                  </Text>
                </View>
              )}

              {searching || (!showingSearch && loadingSuggestions) ? (
                <SkeletonList />
              ) : (
                <FlatList
                  data={visibleFriends}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ flexGrow: 1 }}
                  ListEmptyComponent={
                    query.trim() ? (
                      <Text className="mt-8 text-center text-gray-500">
                        {t("noFriendsFound")}
                      </Text>
                    ) : (
                      <View className="flex-1 items-center justify-center px-10 pb-20">
                        <UsersThreeIcon size={54} color="#9CA3AF" />
                        <Text className="mt-4 text-center text-gray-500">
                          {t("noSuggestedFriends")}
                        </Text>
                      </View>
                    )
                  }
                  renderItem={({ item }) => {
                    const selected = selectedUsers.some(
                      (user) => user.id === item.id,
                    );

                    return (
                      <TouchableOpacity
                        onPress={() => toggleUser(item)}
                        className="flex-row items-center px-5 py-3"
                      >
                        <Avatar
                          uri={item.imageUrl}
                          username={item.title}
                          size={50}
                        />
                        <View className="ml-4 flex-1">
                          <Text className="font-bold text-black dark:text-white">
                            {item.title}
                          </Text>
                          {!!item.subtitle && (
                            <Text className="mt-1 text-sm text-gray-500">
                              {item.subtitle}
                            </Text>
                          )}
                        </View>
                        <CheckCircleIcon
                          size={26}
                          color={selected ? "#E0B84F" : "#D1D5DB"}
                          weight={selected ? "fill" : "regular"}
                        />
                      </TouchableOpacity>
                    );
                  }}
                />
              )}

              <View className="border-t border-gray-100 px-5 py-4 dark:border-gray-900">
                <TouchableOpacity
                  disabled={selectedUsers.length < 2}
                  onPress={() => setStep("DETAILS")}
                  className={`items-center rounded-2xl py-4 ${
                    selectedUsers.length >= 2
                      ? "bg-black dark:bg-white"
                      : "bg-gray-200 dark:bg-gray-800"
                  }`}
                >
                  <Text
                    className={`font-bold ${
                      selectedUsers.length >= 2
                        ? "text-white dark:text-black"
                        : "text-gray-400"
                    }`}
                  >
                    {t("next")}
                  </Text>
                </TouchableOpacity>
                <Text className="mt-2 text-center text-xs text-gray-500">
                  {t("minimumGroupMembers")}
                </Text>
              </View>
            </View>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 20, flexGrow: 1 }}
            >
              <View className="items-center py-5">
                <View className="h-24 w-24 items-center justify-center rounded-full bg-[#F7D786]">
                  <UsersThreeIcon size={46} color="#111827" weight="fill" />
                </View>
                <Text className="mt-4 text-sm text-gray-500">
                  {t("groupPhotoLater")}
                </Text>
              </View>

              <Text className="mb-2 mt-4 font-bold text-black dark:text-white">
                {t("groupName")}
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={t("groupNamePlaceholder")}
                maxLength={80}
                autoFocus
              />
              <Text className="mt-2 text-right text-xs text-gray-400">
                {title.length}/80
              </Text>

              <Text className="mb-3 mt-7 font-bold text-black dark:text-white">
                {t("participants")}
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {selectedUsers.map((user) => (
                  <View
                    key={user.id}
                    className="flex-row items-center rounded-full bg-gray-100 py-2 pl-2 pr-4 dark:bg-gray-900"
                  >
                    <Avatar
                      uri={user.imageUrl}
                      username={user.title}
                      size={30}
                    />
                    <Text className="ml-2 text-sm font-semibold text-black dark:text-white">
                      {user.title}
                    </Text>
                  </View>
                ))}
              </View>

              {!!error && (
                <Text className="mt-5 text-center text-sm text-red-500">
                  {error}
                </Text>
              )}

              <View className="flex-1" />
              <TouchableOpacity
                disabled={!title.trim() || creating}
                onPress={createGroup}
                className={`mt-8 items-center rounded-2xl py-4 ${
                  title.trim() && !creating
                    ? "bg-black dark:bg-white"
                    : "bg-gray-200 dark:bg-gray-800"
                }`}
              >
                {creating ? (
                  <ActivityIndicator color={isDark ? "#0B0B0A" : "#FAF9F6"} />
                ) : (
                  <Text
                    className={`font-bold ${
                      title.trim()
                        ? "text-white dark:text-black"
                        : "text-gray-400"
                    }`}
                  >
                    {t("createGroup")}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </ThemedSafeAreaView>
    </>
  );
}
