import ChatList from "@/components/chats/ChatList";
import ChatOptionsBottomSheet from "@/components/chats/ChatOptionsBottomSheet";
import Text from "@/components/common/AppText";
import SearchBar from "@/components/common/inputs/SearchBar";
import SearchResultRow from "@/components/search/SearchResultRow";
import SearchResultsView from "@/components/search/SearchResultsView";
import { api } from "@/lib/api";
import { searchChatTargets } from "@/services/search";
import { Chat } from "@findeat/types/chat";
import { SearchResultItem } from "@findeat/types/search";
import { router, useFocusEffect } from "expo-router";
import { ArchiveIcon, PlusIcon } from "phosphor-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  clearChatDraft,
  loadChatDrafts,
  type ChatDraft,
} from "@/lib/chatDrafts";
import { AppAlert as Alert } from "@/lib/appAlert";
import { useToast } from "@/contexts/ToastContext";
import { addRecentSearch, getRecentSearches } from "@/lib/recentSearches";
import type { RecentSearchItem } from "@findeat/types";

function sortChats(chats: Chat[], drafts: Record<string, ChatDraft>) {
  return [...chats].sort((left, right) => {
    if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
    const leftTime = drafts[left.id]?.updatedAt ?? left.lastMessageAt ?? "";
    const rightTime = drafts[right.id]?.updatedAt ?? right.lastMessageAt ?? "";
    return new Date(rightTime).getTime() - new Date(leftTime).getTime();
  });
}

export default function ChatsScreen() {
  const { t } = useTranslation("common");
  const { isDark } = useAppTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const userId = user?.id;

  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ChatDraft>>({});
  const [optionsChat, setOptionsChat] = useState<Chat | null>(null);
  const [updatingPin, setUpdatingPin] = useState(false);
  const [archivedCount, setArchivedCount] = useState(0);
  const searchVisibility = useSharedValue(1);
  const isSearchVisible = useRef(true);
  const scrollTransitionLockedUntil = useRef(0);
  const lastScrollOffset = useRef(0);
  const scrollDirection = useRef<"up" | "down" | null>(null);
  const directionDistance = useRef(0);

  const setSearchVisible = useCallback(
    (visible: boolean) => {
      if (isSearchVisible.current === visible) return;

      isSearchVisible.current = visible;
      scrollTransitionLockedUntil.current = Date.now() + 260;
      scrollDirection.current = null;
      directionDistance.current = 0;
      cancelAnimation(searchVisibility);
      searchVisibility.set(
        withTiming(visible ? 1 : 0, {
          duration: visible ? 220 : 190,
          easing: Easing.out(Easing.cubic),
        }),
      );
    },
    [searchVisibility],
  );

  const searchContainerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchVisibility.value, [0, 0.45, 1], [0, 0.15, 1]),
    transform: [{ translateY: -14 * (1 - searchVisibility.value) }],
  }));
  const chatContainerStyle = useAnimatedStyle(() => ({
    borderTopLeftRadius: 30 * searchVisibility.value,
    borderTopRightRadius: 30 * searchVisibility.value,
    transform: [{ translateY: 96 * searchVisibility.value }],
  }));

  const handleChatScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = Math.max(0, event.nativeEvent.contentOffset.y);
      const delta = offset - lastScrollOffset.current;
      lastScrollOffset.current = offset;

      // Collapsing the search area resizes the list. Native platforms can
      // report that layout movement as another scroll in the opposite
      // direction, so ignore it until the single transition has settled.
      if (Date.now() < scrollTransitionLockedUntil.current) return;

      if (offset <= 1) {
        scrollDirection.current = null;
        directionDistance.current = 0;
        setSearchVisible(true);
        return;
      }
      if (Math.abs(delta) < 0.5) return;

      const nextDirection = delta > 0 ? "down" : "up";
      if (scrollDirection.current !== nextDirection) {
        scrollDirection.current = nextDirection;
        directionDistance.current = 0;
      }
      directionDistance.current += Math.abs(delta);

      if (nextDirection === "down" && directionDistance.current >= 18) {
        setSearchVisible(false);
        directionDistance.current = 0;
      } else if (nextDirection === "up" && directionDistance.current >= 12) {
        setSearchVisible(true);
        directionDistance.current = 0;
      }
    },
    [setSearchVisible],
  );

  useEffect(() => {
    if (!isSearching) {
      scrollTransitionLockedUntil.current = 0;
      lastScrollOffset.current = 0;
      scrollDirection.current = null;
      directionDistance.current = 0;
      setSearchVisible(true);
    }
  }, [isSearching, setSearchVisible]);

  const loadChats = useCallback(async () => {
    try {
      const [nextChats, nextArchivedCount, nextDrafts] = await Promise.all([
        api.chats.list(),
        api.chats.archivedCount(),
        userId
          ? loadChatDrafts(userId)
          : Promise.resolve<Record<string, ChatDraft>>({}),
      ]);
      setDrafts(nextDrafts);
      setChats(
        sortChats(
          nextChats.filter(
            (chat) => !!chat.lastMessageAt || !!chat.lastMessage?.trim(),
          ),
          nextDrafts,
        ),
      );
      setArchivedCount(nextArchivedCount);
    } catch (error) {
      console.error("Failed to load chats", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadChats();
    }, [loadChats]),
  );

  async function onRefresh() {
    try {
      setRefreshing(true);
      await loadChats();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSearchSelect(item: SearchResultItem) {
    if (userId) {
      const updated = await addRecentSearch(userId, item);
      setRecentSearches(updated);
    }
    setIsSearching(false);

    if (item.type === "USER") {
      router.push({
        pathname: "/chats/[id]",
        params: {
          id: "new-direct",
          type: "DIRECT",
          targetUserId: item.id,
          title: item.title,
          imageUrl: item.imageUrl ?? "",
        },
      });

      return;
    }

    router.push({
      pathname: "/chats/[id]",
      params: {
        id: "new-restaurant",
        type: "RESTAURANT",
        restaurantId: item.id,
        title: item.title,
        imageUrl: item.imageUrl ?? "",
      },
    });
  }

  async function togglePinned(chat: Chat) {
    if (updatingPin) return;
    const nextPinned = !chat.pinned;
    if (nextPinned && chats.filter((item) => item.pinned).length >= 3) {
      setOptionsChat(null);
      Alert.alert(t("chat:pinLimitTitle"), t("chat:pinLimitDescription"));
      return;
    }

    const previousChats = chats;
    const nextChats = chats.map((item) =>
      item.id === chat.id ? { ...item, pinned: nextPinned } : item,
    );
    setUpdatingPin(true);
    setChats(sortChats(nextChats, drafts));
    try {
      await api.chats.setPinned(chat.id, nextPinned);
      setOptionsChat(null);
      showToast(t(nextPinned ? "chat:chatPinned" : "chat:chatUnpinned"));
    } catch (error) {
      console.error("Failed to update pinned chat", error);
      setChats(previousChats);
      showToast(t("chat:pinChatError"), { kind: "error" });
    } finally {
      setUpdatingPin(false);
    }
  }

  async function archiveChat(chat: Chat) {
    if (updatingPin) return;
    const previousChats = chats;
    setUpdatingPin(true);
    setChats((current) => current.filter((item) => item.id !== chat.id));
    setArchivedCount((count) => count + 1);
    try {
      await api.chats.setArchived(chat.id, true);
      setOptionsChat(null);
      showToast(t("chat:chatArchived"));
    } catch (error) {
      console.error("Failed to archive chat", error);
      setChats(previousChats);
      setArchivedCount((count) => Math.max(0, count - 1));
      showToast(t("chat:archiveChatError"), { kind: "error" });
    } finally {
      setUpdatingPin(false);
    }
  }

  function confirmDeleteChat(chat: Chat) {
    setOptionsChat(null);
    Alert.alert(
      t("chat:deleteChatTitle"),
      t("chat:deleteChatDescription"),
      [
        { text: t("chat:cancel"), style: "cancel" },
        {
          text: t("chat:deleteChat"),
          style: "destructive",
          onPress: () => void deleteChat(chat),
        },
      ],
      { cancelable: true },
    );
  }

  async function deleteChat(chat: Chat) {
    if (updatingPin) return;
    const previousChats = chats;
    const previousDrafts = drafts;
    setUpdatingPin(true);
    setChats((current) => current.filter((item) => item.id !== chat.id));
    setDrafts((current) => {
      const next = { ...current };
      delete next[chat.id];
      return next;
    });
    try {
      await api.chats.deleteForMe(chat.id);
      if (userId) await clearChatDraft(userId, chat.id);
      showToast(t("chat:chatDeleted"));
    } catch (error) {
      console.error("Failed to delete chat", error);
      setChats(previousChats);
      setDrafts(previousDrafts);
      showToast(t("chat:deleteChatError"), { kind: "error" });
    } finally {
      setUpdatingPin(false);
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? "#080808" : "#FBFAF8" }}
      edges={["top"]}
    >
      {isSearching ? (
        <Animated.View
          key="search"
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          className="flex-1"
        >
          <SearchResultsView
            idleData={recentSearches}
            searchRequest={searchChatTargets}
            onCancel={() => setIsSearching(false)}
            onSelect={(item) => void handleSearchSelect(item)}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            renderItem={(item) => <SearchResultRow item={item} />}
          />
        </Animated.View>
      ) : (
        <Animated.View
          key="normal"
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          className="flex-1 overflow-hidden"
        >
          <Animated.View
            style={searchContainerStyle}
            className="absolute inset-x-0 top-0 h-24 overflow-hidden"
          >
            <SearchBar
              editable={false}
              placeholder={t("search")}
              onPress={() => {
                if (loading) return;
                setIsSearching(true);
                if (userId) void getRecentSearches(userId).then(setRecentSearches);
              }}
              rightAccessory={
                <TouchableOpacity
                  className="h-full aspect-square items-center justify-center rounded-2xl bg-brand"
                  onPress={() => router.push("/chats/create-group")}
                >
                  <PlusIcon size={23} color="#FAF9F6" weight="bold" />
                </TouchableOpacity>
              }
            />
          </Animated.View>

          <Animated.View
            style={chatContainerStyle}
            className="flex-1 overflow-hidden bg-white pt-2 dark:bg-[#0F0F10]"
          >
            {archivedCount > 0 ? (
              <TouchableOpacity
                onPress={() => router.push("/chats/archived")}
                className="mx-4 flex-row items-center border-b border-line px-1 py-3.5 dark:border-gray-900"
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <ArchiveIcon size={21} color="#D97706" weight="duotone" />
                </View>
                <Text className="ml-3 flex-1 text-base font-bold text-black dark:text-white">
                  {t("chat:archivedChats")}
                </Text>
                <Text className="text-sm font-bold text-amber-600">{archivedCount}</Text>
              </TouchableOpacity>
            ) : null}
            <ChatList
              chats={chats}
              loading={loading}
              refreshing={refreshing}
              onRefresh={onRefresh}
              drafts={drafts}
              onLongPressChat={setOptionsChat}
              onScroll={handleChatScroll}
            />
          </Animated.View>
        </Animated.View>
      )}
      <ChatOptionsBottomSheet
        chat={optionsChat}
        updating={updatingPin}
        onClose={() => {
          if (!updatingPin) setOptionsChat(null);
        }}
        onTogglePin={(chat) => void togglePinned(chat)}
        onToggleArchive={(chat) => void archiveChat(chat)}
        onDelete={confirmDeleteChat}
      />
    </SafeAreaView>
  );
}
