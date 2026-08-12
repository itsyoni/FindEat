import Text from "@/components/common/AppText";
import AppBottomSheet from "@/components/common/AppBottomSheet";
import Avatar from "@/components/common/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import type { Chat } from "@findeat/types/chat";
import type { ConnectionItem } from "@findeat/types";
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
import { TextInput } from "@/components/common";
import { useToast } from "@/contexts/ToastContext";
import { userDisplayName } from "@/lib/userIdentity";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  postId: string | null;
  onClose: () => void;
  onShared?: (postId: string) => void;
};

type ShareFriend = NonNullable<ConnectionItem["follower"]>;
type ShareTarget =
  | { id: string; type: "USER"; user: ShareFriend }
  | { id: string; type: "GROUP"; chat: Chat };

export default function SharePostBottomSheet({
  postId,
  onClose,
  onShared,
}: Props) {
  const { user } = useAuth();
  const { t } = useTranslation("chat");
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [targets, setTargets] = useState<ShareTarget[]>([]);
  const [loadedPostId, setLoadedPostId] = useState<string | null>(null);
  const [errorPostId, setErrorPostId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [shareComment, setShareComment] = useState("");

  const loading = !!postId && loadedPostId !== postId;
  const error = !!postId && errorPostId === postId;

  useEffect(() => {
    if (!postId || !user?.id) return;

    let cancelled = false;

    Promise.all([api.users.friends(user.id), api.chats.list()])
      .then(([connections, nextChats]) => {
        if (cancelled) return;

        const friendTargets: ShareTarget[] = connections.flatMap(
          (connection) =>
            connection.follower
              ? [{
                  id: `user:${connection.follower.id}`,
                  type: "USER" as const,
                  user: connection.follower,
                }]
              : [],
        );
        const groupTargets: ShareTarget[] = nextChats
          .filter((chat) => chat.type === "GROUP")
          .map((chat) => ({
            id: `group:${chat.id}`,
            type: "GROUP" as const,
            chat,
          }));
        setTargets([...friendTargets, ...groupTargets]);
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
  }, [postId, user?.id]);

  function getTargetPresentation(target: ShareTarget) {
    if (target.type === "GROUP") {
      return {
        title: target.chat.title ?? t("group"),
        imageUrl: target.chat.imageUrl,
        subtitle: t("members", { count: target.chat.participants.length }),
      };
    }

    return {
      title: userDisplayName(target.user) || t("conversation"),
      imageUrl: target.user.avatarUrl,
      subtitle: target.user.username
        ? `@${target.user.username.replace(/^@/, "")}`
        : t("directChat"),
    };
  }

  function closeSheet() {
    setSelectedIds(new Set());
    setSending(false);
    setShareComment("");
    onClose();
  }

  function toggleTarget(targetId: string) {
    if (sending) return;
    setErrorPostId(null);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(targetId)) next.delete(targetId);
      else next.add(targetId);
      return next;
    });
  }

  async function shareSelected() {
    if (!postId || sending || selectedIds.size === 0) return;

    try {
      setSending(true);
      const selectedTargets = targets.filter((target) =>
        selectedIds.has(target.id),
      );
      const results = await Promise.allSettled(
        selectedTargets.map(async (target) => {
          const conversationId =
            target.type === "GROUP"
              ? target.chat.id
              : (await api.chats.startDirectConversation(target.user.id)).id;
          await api.chats.sendMessage(conversationId, { type: "POST", postId });
          const message = shareComment.trim();
          if (message) {
            await api.chats.sendMessage(conversationId, {
              type: "TEXT",
              content: message,
            });
          }
        }),
      );
      const failedIds = selectedTargets
        .filter((_, index) => results[index].status === "rejected")
        .map((target) => target.id);
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
      showToast(t("shareSuccess"));
      closeSheet();
    } finally {
      setSending(false);
    }
  }

  return (
    <AppBottomSheet
      open={!!postId}
      snapPoints={["68%"]}
      topInset={insets.top + 12}
      onClose={closeSheet}
    >
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
            data={targets}
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
                  {t("noFriendsToShare")}
                </Text>
                <Text className="mt-1 text-center text-sm text-gray-500">
                  {t("noFriendsToShareDescription")}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const presentation = getTargetPresentation(item);
              const selected = selectedIds.has(item.id);

              return (
                <TouchableOpacity
                  onPress={() => toggleTarget(item.id)}
                  disabled={sending}
                  activeOpacity={0.75}
                  className={`mb-2 flex-row items-center rounded-2xl border px-3 py-3 ${
                    selected
                      ? "border-brand bg-brand-soft dark:border-[#FF7658] dark:bg-[#3A211C]"
                      : "border-transparent"
                  }`}
                >
                  <Avatar
                    uri={presentation.imageUrl}
                    username={presentation.title}
                    size={48}
                    showSnapIndicator={false}
                    fallbackType={item.type === "GROUP" ? "group" : "user"}
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

        {selectedIds.size > 0 ? (
          <Animated.View
            entering={FadeInDown.duration(180)}
            exiting={FadeOutDown.duration(130)}
            className="border-t border-gray-100 pt-3 dark:border-gray-800"
          >
            <TextInput
              value={shareComment}
              onChangeText={setShareComment}
              placeholder={t("addShareComment")}
              useBottomSheetInput
              numberOfLines={1}
              returnKeyType="done"
              className="mb-3 h-12"
              style={{ paddingVertical: 0 }}
            />
            <TouchableOpacity
              disabled={sending}
              onPress={() => void shareSelected()}
              className="h-13 flex-row items-center justify-center rounded-2xl bg-brand"
              style={{ opacity: sending ? 0.42 : 1 }}
            >
              {sending ? (
                <ActivityIndicator color="#F7F6F2" />
              ) : (
                <Text className="font-bold text-[#F7F6F2]">
                  {selectedIds.size === 1
                    ? t("share")
                    : t("shareSelected", { count: selectedIds.size })}
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </View>
    </AppBottomSheet>
  );
}
