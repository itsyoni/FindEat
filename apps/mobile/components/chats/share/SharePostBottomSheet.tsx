import Text from "@/components/common/AppText";
import AppBottomSheet from "@/components/common/AppBottomSheet";
import Avatar from "@/components/common/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import type { Chat } from "@findeat/types/chat";
import * as Haptics from "expo-haptics";
import { CheckCircleIcon } from "phosphor-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

type Props = {
  postId: string | null;
  onClose: () => void;
  onShared?: (postId: string) => void;
};

export default function SharePostBottomSheet({
  postId,
  onClose,
  onShared,
}: Props) {
  const { user } = useAuth();
  const { t } = useTranslation("chat");
  const [chats, setChats] = useState<Chat[]>([]);
  const [loadedPostId, setLoadedPostId] = useState<string | null>(null);
  const [errorPostId, setErrorPostId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const loading = !!postId && loadedPostId !== postId;
  const error = !!postId && errorPostId === postId;

  useEffect(() => {
    if (!postId) return;

    let cancelled = false;

    api.chats
      .list()
      .then((nextChats) => {
        if (cancelled) return;

        setChats(nextChats);
        setErrorPostId(null);
        setLoadedPostId(postId);
      })
      .catch((requestError) => {
        console.error("load chats for sharing failed", requestError);
        if (!cancelled) {
          setErrorPostId(postId);
          setLoadedPostId(postId);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [postId]);

  function getChatPresentation(chat: Chat) {
    const otherUser = chat.participants.find(
      (participant) => participant.userId !== user?.id,
    )?.user;

    if (chat.type === "GROUP") {
      return {
        title: chat.title ?? t("group"),
        imageUrl: chat.imageUrl,
        subtitle: t("members", { count: chat.participants.length }),
      };
    }

    if (chat.type === "RESTAURANT") {
      return {
        title: chat.restaurant?.name ?? t("restaurant"),
        imageUrl: chat.restaurant?.logoUrl,
        subtitle: t("restaurantChat"),
      };
    }

    return {
      title: otherUser?.displayName ?? otherUser?.username ?? t("conversation"),
      imageUrl: otherUser?.avatarUrl,
      subtitle: otherUser?.username ? `@${otherUser.username}` : t("directChat"),
    };
  }

  function closeSheet() {
    setSelectedIds(new Set());
    setSending(false);
    onClose();
  }

  function toggleChat(conversationId: string) {
    if (sending) return;
    setErrorPostId(null);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(conversationId)) next.delete(conversationId);
      else next.add(conversationId);
      return next;
    });
  }

  async function shareSelected() {
    if (!postId || sending || selectedIds.size === 0) return;

    try {
      setSending(true);
      const conversationIds = Array.from(selectedIds);
      const results = await Promise.allSettled(
        conversationIds.map((conversationId) =>
          api.chats.sendMessage(conversationId, {
            type: "POST",
            postId,
          }),
        ),
      );
      const failedIds = conversationIds.filter(
        (_, index) => results[index].status === "rejected",
      );
      const successCount = results.length - failedIds.length;

      for (let index = 0; index < successCount; index += 1) {
        onShared?.(postId);
      }

      if (failedIds.length > 0) {
        console.error("share post failed for some conversations");
        setSelectedIds(new Set(failedIds));
        setErrorPostId(postId);
        return;
      }

      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => undefined);
      closeSheet();
    } finally {
      setSending(false);
    }
  }

  return (
    <AppBottomSheet open={!!postId} snapPoints={["68%"]} onClose={closeSheet}>
      <View className="flex-1 px-5 pb-4 dark:bg-gray-900">
        <Text className="mb-1 text-2xl font-bold text-black dark:text-white">
          {t("sharePost")}
        </Text>
        <Text className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {t("shareSubtitle")}
        </Text>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={chats}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              error ? (
                <View className="mb-3 rounded-2xl bg-red-50 px-4 py-3">
                  <Text className="text-sm font-semibold text-red-600">
                    {t("shareError")}
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View className="items-center justify-center py-12">
                <Text className="text-base font-bold text-black dark:text-white">
                  {t("noConversations")}
                </Text>
                <Text className="mt-1 text-center text-sm text-gray-500">
                  {t("noConversationsDescription")}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const presentation = getChatPresentation(item);
              const selected = selectedIds.has(item.id);

              return (
                <TouchableOpacity
                  onPress={() => toggleChat(item.id)}
                  disabled={sending}
                  activeOpacity={0.75}
                  className={`mb-2 flex-row items-center rounded-2xl border px-3 py-3 ${
                    selected
                      ? "border-brand bg-brand-soft"
                      : "border-transparent"
                  }`}
                >
                  <Avatar
                    uri={presentation.imageUrl}
                    username={presentation.title}
                    size={48}
                  />

                  <View className="ml-3 flex-1">
                    <Text className="font-bold text-black dark:text-white">
                      {presentation.title}
                    </Text>
                    <Text numberOfLines={1} className="text-sm text-gray-500">
                      {presentation.subtitle}
                    </Text>
                  </View>

                  <CheckCircleIcon
                    size={27}
                    color={selected ? "#FF5B35" : "#B6B1A8"}
                    weight={selected ? "fill" : "regular"}
                  />
                </TouchableOpacity>
              );
            }}
          />
        )}

        <View className="border-t border-gray-100 pt-3 dark:border-gray-800">
          <TouchableOpacity
            disabled={selectedIds.size === 0 || sending}
            onPress={() => void shareSelected()}
            className="h-13 flex-row items-center justify-center rounded-2xl bg-brand"
            style={{ opacity: selectedIds.size === 0 || sending ? 0.42 : 1 }}
          >
            {sending ? (
              <ActivityIndicator color="#F7F6F2" />
            ) : (
              <Text className="font-bold text-[#F7F6F2]">
                {t("shareSelected", { count: selectedIds.size })}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </AppBottomSheet>
  );
}
