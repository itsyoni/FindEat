import ChatList from "@/components/chats/ChatList";
import ChatOptionsBottomSheet from "@/components/chats/ChatOptionsBottomSheet";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useAuth } from "@/contexts/AuthContext";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";
import {
  clearChatDraft,
  loadChatDrafts,
  type ChatDraft,
} from "@/lib/chatDrafts";
import { AppAlert as Alert } from "@/lib/appAlert";
import type { Chat } from "@findeat/types";
import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function sortArchivedChats(chats: Chat[], drafts: Record<string, ChatDraft>) {
  return [...chats].sort((left, right) => {
    const leftTime = drafts[left.id]?.updatedAt ?? left.lastMessageAt ?? "";
    const rightTime = drafts[right.id]?.updatedAt ?? right.lastMessageAt ?? "";
    return new Date(rightTime).getTime() - new Date(leftTime).getTime();
  });
}

export default function ArchivedChatsScreen() {
  const { user } = useAuth();
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const { t } = useTranslation("chat");
  const userId = user?.id;
  const [chats, setChats] = useState<Chat[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ChatDraft>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [optionsChat, setOptionsChat] = useState<Chat | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextChats, nextDrafts] = await Promise.all([
        api.chats.archived(),
        userId
          ? loadChatDrafts(userId)
          : Promise.resolve<Record<string, ChatDraft>>({}),
      ]);
      setDrafts(nextDrafts);
      setChats(sortArchivedChats(nextChats, nextDrafts));
    } catch (error) {
      console.error("Failed to load archived chats", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  async function unarchive(chat: Chat) {
    if (updating) return;
    const previous = chats;
    setUpdating(true);
    setChats((current) => current.filter((item) => item.id !== chat.id));
    try {
      await api.chats.setArchived(chat.id, false);
      setOptionsChat(null);
      showToast(t("chatUnarchived"));
    } catch (error) {
      console.error("Failed to unarchive chat", error);
      setChats(previous);
      showToast(t("archiveChatError"), { kind: "error" });
    } finally {
      setUpdating(false);
    }
  }

  function confirmDeleteChat(chat: Chat) {
    setOptionsChat(null);
    Alert.alert(
      t("deleteChatTitle"),
      t("deleteChatDescription"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("deleteChat"),
          style: "destructive",
          onPress: () => void deleteChat(chat),
        },
      ],
      { cancelable: true },
    );
  }

  async function deleteChat(chat: Chat) {
    if (updating) return;
    const previousChats = chats;
    const previousDrafts = drafts;
    setUpdating(true);
    setChats((current) => current.filter((item) => item.id !== chat.id));
    setDrafts((current) => {
      const next = { ...current };
      delete next[chat.id];
      return next;
    });
    try {
      await api.chats.deleteForMe(chat.id);
      if (userId) await clearChatDraft(userId, chat.id);
      showToast(t("chatDeleted"));
    } catch (error) {
      console.error("Failed to delete chat", error);
      setChats(previousChats);
      setDrafts(previousDrafts);
      showToast(t("deleteChatError"), { kind: "error" });
    } finally {
      setUpdating(false);
    }
  }

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: isDark ? "#080808" : "#FBFAF8" }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View className="h-14 flex-row items-center px-4">
        <TouchableOpacity onPress={() => router.back()} className="h-11 w-11 items-center justify-center">
          <DirectionalIcon direction="back" variant="arrow" size={24} color={isDark ? "#FAF9F6" : "#171717"} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-bold text-black dark:text-white">
          {t("archivedChats")}
        </Text>
        <View className="h-11 w-11" />
      </View>
      <View className="flex-1 overflow-hidden rounded-t-[30px] bg-white pt-2 dark:bg-[#0F0F10]">
        <ChatList
          chats={chats}
          loading={loading}
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          drafts={drafts}
          onLongPressChat={setOptionsChat}
          emptyTitle={t("noArchivedChats")}
          emptyDescription={t("noArchivedChatsDescription")}
        />
      </View>
      <ChatOptionsBottomSheet
        chat={optionsChat}
        updating={updating}
        onClose={() => {
          if (!updating) setOptionsChat(null);
        }}
        onTogglePin={() => undefined}
        onToggleArchive={(chat) => void unarchive(chat)}
        onDelete={confirmDeleteChat}
      />
    </SafeAreaView>
  );
}
