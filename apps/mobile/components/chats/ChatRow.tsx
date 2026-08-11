import { useAuth } from "@/contexts/AuthContext";
import { Chat } from "@findeat/types/chat";
import { router } from "expo-router";
import { PushPinIcon, UsersThreeIcon } from "phosphor-react-native";
import { TouchableOpacity, View } from "react-native";
import Text from "../common/AppText";
import Avatar from "../common/Avatar";
import { useTranslation } from "react-i18next";
import RestaurantBadge from "@/components/restaurants/RestaurantBadge";
import type { ChatDraft } from "@/lib/chatDrafts";
import { userDisplayName } from "@/lib/userIdentity";

type Props = {
  chat: Chat;
  draft?: ChatDraft;
  onLongPress?: () => void;
};

function formatChatTime(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  if (isToday) {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const daysAgo = Math.floor(
    (today.getTime() - date.getTime()) / (24 * 60 * 60 * 1_000),
  );

  if (daysAgo < 7) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export default function ChatRow({ chat, draft, onLongPress }: Props) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation("chat");
  const isRtl = i18n.dir() === "rtl";
  const rtlTextStyle = isRtl
    ? ({ textAlign: "right", writingDirection: "rtl" } as const)
    : undefined;

  const otherUser = chat.participants.find((p) => p.userId !== user?.id)?.user;

  const isGroupChat = chat.type === "GROUP";
  const isRestaurantChat = chat.type === "RESTAURANT";

  const title = isGroupChat
    ? chat.title
    : isRestaurantChat
      ? chat.restaurant?.name
      : userDisplayName(otherUser);

  const imageUrl = isGroupChat
    ? chat.imageUrl
    : isRestaurantChat
      ? chat.restaurant?.logoUrl
      : otherUser?.avatarUrl;

  const subtitle = isGroupChat
    ? t("members", { count: chat.participants.length })
    : isRestaurantChat
      ? t("restaurantChat")
      : otherUser?.isOnline
        ? t("onlineNow")
        : chat.lastMessage
          ? null
          : t("noMessages");

  const unreadCount = chat.unreadCount ?? 0;
  const hasUnread = unreadCount > 0;
  const isMine = chat.lastMessageSenderId === user?.id;

  const lastMessageText = chat.lastMessage
    ? `${isMine ? `${t("you")}: ` : ""}${chat.lastMessage}`
    : subtitle;
  const lastMessageTime = formatChatTime(draft?.updatedAt ?? chat.lastMessageAt);

  return (
    <TouchableOpacity
      activeOpacity={0.65}
      className="mx-4 flex-row items-center border-b border-line py-4 dark:border-gray-900"
      style={isRtl ? { flexDirection: "row-reverse" } : undefined}
      onPress={() =>
        router.push({
          pathname: "/chats/[id]",
          params: {
            id: chat.id,
          },
        })
      }
      onLongPress={onLongPress}
      delayLongPress={350}
    >
      <View className="relative">
        {isGroupChat && !imageUrl ? (
          <View className="h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <UsersThreeIcon size={26} color="#6B7280" weight="fill" />
          </View>
        ) : (
          <Avatar
            uri={imageUrl}
            username={title ?? t("chat")}
            size={56}
            fallbackType={isRestaurantChat ? "restaurant" : "user"}
            showSnapIndicator={false}
          />
        )}
        {!isGroupChat && !isRestaurantChat && otherUser?.isOnline ? (
          <View className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-[3px] border-white bg-success dark:border-[#0F0F10]" />
        ) : null}
      </View>

      <View
        className="min-w-0 flex-1"
        style={isRtl ? { marginRight: 16 } : { marginLeft: 16 }}
      >
        <View
          className="flex-row items-center"
          style={isRtl ? { flexDirection: "row-reverse" } : undefined}
        >
          <View
            className="min-w-0 flex-1 flex-row items-center"
            style={isRtl ? { flexDirection: "row-reverse" } : undefined}
          >
            <Text
              numberOfLines={1}
              style={rtlTextStyle}
              className={`shrink text-base text-black dark:text-white ${hasUnread ? "font-bold" : "font-semibold"}`}
            >
            {title ?? t("chat")}
            </Text>
            {isRestaurantChat ? <RestaurantBadge /> : null}
          </View>
          {lastMessageTime ? (
            <Text
              style={isRtl ? { marginRight: 12 } : { marginLeft: 12 }}
              className={`text-xs ${hasUnread ? "font-bold text-amber-600" : "text-gray-400"}`}
            >
              {lastMessageTime}
            </Text>
          ) : null}
        </View>

        <View
          className="mt-1 flex-row items-center"
          style={isRtl ? { flexDirection: "row-reverse" } : undefined}
        >
          <Text
            numberOfLines={1}
            style={rtlTextStyle}
            className={`min-w-0 flex-1 text-sm ${hasUnread ? "font-semibold text-black dark:text-white" : "text-gray-500 dark:text-gray-400"}`}
          >
            {draft ? (
              <>
                <Text className="font-bold text-red-500">{t("draft")}: </Text>
                {draft.content}
              </>
            ) : (
              lastMessageText
            )}
          </Text>

          {chat.pinned ? (
            <PushPinIcon
              size={16}
              color="#D97706"
              weight="fill"
              style={isRtl ? { marginRight: 10 } : { marginLeft: 10 }}
            />
          ) : null}

          {hasUnread ? (
            <View
              className="h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5"
              style={isRtl ? { marginRight: 12 } : { marginLeft: 12 }}
            >
              <Text className="text-[11px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}
