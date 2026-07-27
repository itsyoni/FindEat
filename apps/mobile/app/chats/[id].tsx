import Text from "@/components/common/AppText";

import Avatar from "@/components/common/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { api, API_URL } from "@/lib/api";
import {
  clearChatDraft,
  loadChatDraft,
  saveChatDraft,
} from "@/lib/chatDrafts";
import { Chat, Message } from "@findeat/types/chat";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  ChecksIcon,
  CheckIcon,
  PaperPlaneTiltIcon,
  StarIcon,
  XIcon,
} from "phosphor-react-native";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Platform,
  Pressable,
  TouchableOpacity,
  View,
  Image,
  TextInput as RNTextInput,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";
import ChatSkeleton, { ChatHeaderSkeleton } from "@/components/chats/ChatSkeleton";
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeOut,
  interpolate,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  ZoomInEasyDown,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/contexts/ThemeContext";
import RestaurantBadge from "@/components/restaurants/RestaurantBadge";
import MessageActionsBottomSheet from "@/components/chats/MessageActionsBottomSheet";
import MentionSuggestions from "@/components/common/MentionSuggestions";
import MentionText from "@/components/common/MentionText";
import SeenByBottomSheet, {
  type SeenByViewer,
} from "@/components/chats/SeenByBottomSheet";

type ChatMessage = Message & {
  renderKey?: string;
};

type MessagesReadEvent = {
  conversationId: string;
  userId: string;
  messageIds: string[];
  readAt: string;
};

function isSameDay(left?: string, right?: string) {
  if (!left || !right) return false;

  const leftDate = new Date(left);
  const rightDate = new Date(right);

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

function formatMessageDate(
  value: string,
  labels: { today: string; yesterday: string },
) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(value, today.toISOString())) return labels.today;
  if (isSameDay(value, yesterday.toISOString())) return labels.yesterday;

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TypingDot({ delay }: { delay: number }) {
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 180 }),
          withTiming(0, { duration: 180 }),
          withTiming(0, { duration: 360 }),
        ),
        -1,
      ),
    );

    return () => cancelAnimation(offset);
  }, [delay, offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.value, [-4, 0], [1, 0.45]),
    transform: [{ translateY: offset.value }],
  }));

  return (
    <Animated.View
      style={animatedStyle}
      className="h-2 w-2 rounded-full bg-gray-500 dark:bg-gray-300"
    />
  );
}

function TypingDots() {
  return (
    <View className="flex-row items-center gap-1">
      <TypingDot delay={0} />
      <TypingDot delay={120} />
      <TypingDot delay={240} />
    </View>
  );
}

export default function ChatScreen() {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const { t } = useTranslation("chat");
  const { isDark } = useAppTheme();
  const { showToast } = useToast();

  const params = useLocalSearchParams<{
    id: string;
    type?: "DIRECT" | "RESTAURANT";
    targetUserId?: string;
    restaurantId?: string;
    title?: string;
    imageUrl?: string;
    messageId?: string;
  }>();

  const { id } = params;
  const isNewChat = id === "new-direct" || id === "new-restaurant";
  const shouldResolveRestaurantChat =
    id === "new-restaurant" &&
    params.type === "RESTAURANT" &&
    !!params.restaurantId;

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState("");
  const [composerHeight, setComposerHeight] = useState(42);
  const [loading, setLoading] = useState(
    !isNewChat || shouldResolveRestaurantChat,
  );
  const [isThreadReady, setIsThreadReady] = useState(
    isNewChat && !shouldResolveRestaurantChat,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [animateNewMessages, setAnimateNewMessages] = useState(false);
  const [conversationId, setConversationId] = useState(id);
  const unresolvedDraftKey =
    params.type === "DIRECT"
      ? `new-direct-${params.targetUserId ?? "unknown"}`
      : `new-restaurant-${params.restaurantId ?? "unknown"}`;
  const draftKey = conversationId.startsWith("new-")
    ? unresolvedDraftKey
    : conversationId;
  const [draftReadyKey, setDraftReadyKey] = useState<string | null>(null);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [seenByMessageId, setSeenByMessageId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const messagesListRef = useRef<FlatList<ChatMessage>>(null);
  const composerBaseContentHeightRef = useRef<number | null>(null);
  const composerInputRef = useRef<RNTextInput>(null);
  const editingSnapshotRef = useRef<{
    content: string;
    replyingTo: Message | null;
  } | null>(null);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const typingUserTimersRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );
  const sentTypingRef = useRef(false);
  const shouldScrollToEndRef = useRef(false);
  const scrollToEndAnimatedRef = useRef(false);
  const hasPositionedAtBottomRef = useRef(false);
  const readReceiptBufferRef = useRef(
    new Map<string, { userId: string; readAt: string }[]>(),
  );
  const previousDraftKeyRef = useRef<string | null>(null);
  const draftSnapshotRef = useRef<{
    userId: string;
    key: string;
    content: string;
  } | null>(null);
  const handledTargetMessageRef = useRef<string | null>(null);

  function withBufferedReadReceipts(message: Message): Message {
    const bufferedReceipts = readReceiptBufferRef.current.get(message.id);
    if (!bufferedReceipts?.length) return message;

    readReceiptBufferRef.current.delete(message.id);
    const receiptsByUserId = new Map(
      (message.readReceipts ?? []).map((receipt) => [receipt.userId, receipt]),
    );
    bufferedReceipts.forEach((receipt) =>
      receiptsByUserId.set(receipt.userId, receipt),
    );
    return { ...message, readReceipts: [...receiptsByUserId.values()] };
  }

  const scheduleScrollToEnd = useCallback((animated: boolean) => {
    shouldScrollToEndRef.current = true;
    scrollToEndAnimatedRef.current = animated;

    requestAnimationFrame(() => {
      messagesListRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const otherUser = chat?.participants.find((p) => p.userId !== user?.id)?.user;
  const mentionCandidates = chat?.participants.map((participant) => participant.user);

  const latestSentMessageId = useMemo(
    () => {
      const latestOwnMessage = [...messages]
        .reverse()
        .find((message) => message.senderId === user?.id);
      return latestOwnMessage?.id.startsWith("pending-")
        ? undefined
        : latestOwnMessage?.id;
    },
    [messages, user?.id],
  );

  function seenByViewers(message?: Message | null): SeenByViewer[] {
    if (!message || !chat || !user?.id) return [];
    const participantsById = new Map(
      chat.participants.map((participant) => [
        participant.userId,
        participant.user,
      ]),
    );

    return (message.readReceipts ?? [])
      .filter((receipt) => receipt.userId !== user.id)
      .map((receipt) => {
        const receiptUser = participantsById.get(receipt.userId);
        return receiptUser
          ? { user: receiptUser, readAt: receipt.readAt }
          : null;
      })
      .filter((viewer): viewer is SeenByViewer => !!viewer)
      .sort(
        (left, right) =>
          new Date(left.readAt).getTime() - new Date(right.readAt).getTime(),
      );
  }

  const selectedSeenByViewers = seenByViewers(
    messages.find((message) => message.id === seenByMessageId),
  );

  const isGroupChat = chat?.type === "GROUP";
  const isRestaurantChat =
    chat?.type === "RESTAURANT" || params.type === "RESTAURANT";

  const headerTitle = isNewChat
    ? params.title
    : isGroupChat
      ? chat?.title
      : isRestaurantChat
        ? chat?.restaurant?.name
        : otherUser?.username;

  const headerImage = isNewChat
    ? params.imageUrl
    : isGroupChat
      ? chat?.imageUrl
      : isRestaurantChat
        ? chat?.restaurant?.logoUrl
        : otherUser?.avatarUrl;

  const typingParticipant = chat?.participants.find(
    (participant) => participant.userId === typingUserIds[0],
  );
  const typingName =
    typingParticipant?.user.displayName ??
    typingParticipant?.user.username ??
    t("someone");
  const typingLabel = isGroupChat
    ? typingUserIds.length > 1
      ? t("peopleTyping", { count: typingUserIds.length })
      : t("userTyping", { name: typingName })
    : t("typing");

  const removeTypingUser = useCallback((typingUserId: string) => {
    const timer = typingUserTimersRef.current.get(typingUserId);
    if (timer) clearTimeout(timer);
    typingUserTimersRef.current.delete(typingUserId);
    setTypingUserIds((current) =>
      current.filter((userId) => userId !== typingUserId),
    );
  }, []);

  const stopTyping = useCallback(() => {
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }

    if (sentTypingRef.current && !isNewChat) {
      socketRef.current?.emit("typing_stop", { conversationId });
    }

    sentTypingRef.current = false;
  }, [conversationId, isNewChat]);

  const handleContentChange = useCallback(
    (nextContent: string) => {
      setContent(nextContent);
      if (editingMessage) return;
      if (currentUserId) {
        draftSnapshotRef.current = {
          userId: currentUserId,
          key: draftKey,
          content: nextContent,
        };
      }

      const socket = socketRef.current;
      if (isNewChat || !socket?.connected) return;

      if (!nextContent.trim()) {
        stopTyping();
        return;
      }

      if (!sentTypingRef.current) {
        socket.emit("typing_start", { conversationId });
        sentTypingRef.current = true;
      }

      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
      }

      typingStopTimerRef.current = setTimeout(() => {
        socket.emit("typing_stop", { conversationId });
        sentTypingRef.current = false;
        typingStopTimerRef.current = null;
      }, 1_500);
    },
    [conversationId, currentUserId, draftKey, editingMessage, isNewChat, stopTyping],
  );

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    let active = true;
    const previousKey = previousDraftKeyRef.current;
    const previousContent = draftSnapshotRef.current?.content ?? "";
    previousDraftKeyRef.current = draftKey;

    async function restoreOrMigrateDraft() {
      if (previousKey && previousKey !== draftKey && previousContent.trim()) {
        await saveChatDraft(userId, draftKey, previousContent);
        await clearChatDraft(userId, previousKey);
        if (active) {
          setContent(previousContent);
          setDraftReadyKey(draftKey);
        }
        return;
      }

      const savedDraft = await loadChatDraft(userId, draftKey);
      if (!active) return;
      setContent((current) => current || savedDraft?.content || "");
      setDraftReadyKey(draftKey);
    }

    void restoreOrMigrateDraft().catch((error) => {
      console.error("Could not restore chat draft", error);
      if (active) setDraftReadyKey(draftKey);
    });

    return () => {
      active = false;
    };
  }, [draftKey, user?.id]);

  useEffect(() => {
    if (!user?.id || draftReadyKey !== draftKey || editingMessage) return;
    draftSnapshotRef.current = { userId: user.id, key: draftKey, content };
    const timer = setTimeout(() => {
      void saveChatDraft(user.id, draftKey, content).catch((error) =>
        console.error("Could not save chat draft", error),
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [content, draftKey, draftReadyKey, editingMessage, user?.id]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      const snapshot = draftSnapshotRef.current;
      if (state !== "active" && snapshot) {
        void saveChatDraft(snapshot.userId, snapshot.key, snapshot.content);
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(
    () => () => {
      const snapshot = draftSnapshotRef.current;
      if (snapshot) {
        void saveChatDraft(snapshot.userId, snapshot.key, snapshot.content);
      }
    },
    [],
  );

  const loadChat = useCallback(async () => {
    if (isNewChat) return;

    const chat = await api.chats.get(conversationId);
    setChat(chat);
  }, [conversationId, isNewChat]);

  const loadMessages = useCallback(async (prepareInitialPosition = false) => {
    if (isNewChat) return;

    const messages = await api.chats.messages(conversationId);
    if (prepareInitialPosition) {
      hasPositionedAtBottomRef.current = false;
      setIsThreadReady(false);
    }
    shouldScrollToEndRef.current = true;
    scrollToEndAnimatedRef.current = false;
    setMessages(messages.map(withBufferedReadReceipts));

    requestAnimationFrame(() => setAnimateNewMessages(true));
  }, [conversationId, isNewChat]);

  useEffect(() => {
    let active = true;

    async function init() {
      if (isNewChat) {
        setAnimateNewMessages(true);

        if (shouldResolveRestaurantChat && params.restaurantId) {
          try {
            setLoading(true);
            const existingChat =
              await api.chats.findRestaurantConversation(params.restaurantId);

            if (!active) return;

            if (existingChat) {
              setChat(existingChat);
              setConversationId(existingChat.id);
              router.setParams({ id: existingChat.id });
              return;
            }
          } catch (error) {
            console.error("Could not resolve restaurant conversation", error);
          }
        }

        if (!active) return;
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        await Promise.all([loadChat(), loadMessages(true)]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    void init();

    return () => {
      active = false;
    };
  }, [
    isNewChat,
    loadChat,
    loadMessages,
    params.restaurantId,
    shouldResolveRestaurantChat,
  ]);

  useEffect(() => {
    if (!user?.id || isNewChat) return;

    const socket = io(API_URL, {
      auth: { userId: user.id },
    });
    const typingUserTimers = typingUserTimersRef.current;

    socketRef.current = socket;

    socket.on("connect", () => {
      setTypingUserIds([]);
      socket.emit("join_conversation", {
        conversationId,
      });
    });

    socket.on("receive_message", (message: Message) => {
      removeTypingUser(message.senderId);
      setMessages((current) => {
        const exists = current.some((item) => item.id === message.id);
        if (exists) return current;

        const matchingPendingMessage = current.find(
          (item) =>
            item.id.startsWith("pending-") &&
            item.senderId === message.senderId &&
            item.type === message.type &&
            item.content === message.content,
        );

        if (matchingPendingMessage) {
          return current.map((item) =>
            item.id === matchingPendingMessage.id
              ? { ...message, renderKey: matchingPendingMessage.renderKey }
              : item,
          );
        }

        return [...current, message];
      });

      if (message.senderId !== user.id) {
        socket.emit("mark_read", { conversationId });
      }
    });

    socket.on("messages_read", (event: MessagesReadEvent) => {
      if (
        event.conversationId !== conversationId ||
        event.userId === user.id
      ) {
        return;
      }

      const readMessageIds = new Set(event.messageIds);
      event.messageIds.forEach((messageId) => {
        const bufferedReceipts =
          readReceiptBufferRef.current.get(messageId) ?? [];
        readReceiptBufferRef.current.set(messageId, [
          ...bufferedReceipts.filter(
            (receipt) => receipt.userId !== event.userId,
          ),
          { userId: event.userId, readAt: event.readAt },
        ]);
      });
      setMessages((current) =>
        current.map((message) => {
          if (!readMessageIds.has(message.id)) return message;
          return withBufferedReadReceipts(message);
        }),
      );
    });

    socket.on(
      "message_deleted",
      (event: { messageId: string; deletedAt: string }) => {
        setMessages((current) =>
          current.map((message) =>
            message.id === event.messageId
              ? {
                  ...message,
                  content: null,
                  imageUrl: null,
                  post: null,
                  restaurant: null,
                  deletedAt: event.deletedAt,
                }
              : message.replyTo?.id === event.messageId
                ? {
                    ...message,
                    replyTo: {
                      ...message.replyTo,
                      content: null,
                      imageUrl: null,
                      deletedAt: event.deletedAt,
                    },
                  }
                : message,
          ),
        );
        setReplyingTo((current) =>
          current?.id === event.messageId ? null : current,
        );
      },
    );

    socket.on("message_edited", (editedMessage: Message) => {
      setMessages((current) =>
        current.map((message) =>
          message.id === editedMessage.id
            ? {
                ...message,
                ...editedMessage,
                renderKey: message.renderKey,
                starred: message.starred,
                starredAt: message.starredAt,
              }
            : message.replyTo?.id === editedMessage.id
              ? {
                  ...message,
                  replyTo: {
                    ...message.replyTo,
                    content: editedMessage.content,
                    editedAt: editedMessage.editedAt,
                  },
                }
              : message,
        ),
      );
      setSelectedMessage((current) =>
        current?.id === editedMessage.id
          ? { ...current, ...editedMessage }
          : current,
      );
    });

    socket.on(
      "typing_changed",
      (event: {
        conversationId: string;
        userId: string;
        isTyping: boolean;
      }) => {
        if (
          event.conversationId !== conversationId ||
          event.userId === user.id
        ) {
          return;
        }

        if (!event.isTyping) {
          removeTypingUser(event.userId);
          return;
        }

        setTypingUserIds((current) =>
          current.includes(event.userId) ? current : [...current, event.userId],
        );

        const currentTimer = typingUserTimers.get(event.userId);
        if (currentTimer) clearTimeout(currentTimer);
        typingUserTimers.set(
          event.userId,
          setTimeout(() => removeTypingUser(event.userId), 3_500),
        );
      },
    );

    return () => {
      if (sentTypingRef.current) {
        socket.emit("typing_stop", { conversationId });
      }
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = null;
      }
      typingUserTimers.forEach(clearTimeout);
      typingUserTimers.clear();
      sentTypingRef.current = false;
      socket.off("receive_message");
      socket.off("messages_read");
      socket.off("message_deleted");
      socket.off("message_edited");
      socket.off("typing_changed");
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [conversationId, isNewChat, removeTypingUser, user?.id]);

  async function onRefresh() {
    if (isNewChat) return;

    setRefreshing(true);
    await Promise.all([loadChat(), loadMessages(false)]);
    setRefreshing(false);
  }

  async function sendMessage() {
    const trimmedContent = content.trim();
    if (!trimmedContent || sending || !user) return;

    if (editingMessage) {
      await saveEditedMessage(editingMessage, trimmedContent);
      return;
    }

    const optimisticId = `pending-${new Date().getTime()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      renderKey: optimisticId,
      type: "TEXT",
      content: trimmedContent,
      createdAt: new Date().toISOString(),
      senderId: user.id,
      sender: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      replyToId: replyingTo?.id,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            type: replyingTo.type,
            content: replyingTo.content,
            imageUrl: replyingTo.imageUrl,
            deletedAt: replyingTo.deletedAt,
            sender: replyingTo.sender,
            sentAsRestaurant: replyingTo.sentAsRestaurant,
          }
        : null,
    };

    stopTyping();
    scheduleScrollToEnd(hasPositionedAtBottomRef.current);
    setMessages((current) => [...current, optimisticMessage]);
    draftSnapshotRef.current = null;
    void clearChatDraft(user.id, draftKey);
    setContent("");
    const replyToId = replyingTo?.id;
    setReplyingTo(null);
    setComposerHeight(42);

    try {
      setSending(true);

      if (isNewChat) {
        const message =
          params.type === "DIRECT"
            ? await api.chats.sendDirectMessage(
                params.targetUserId!,
                trimmedContent,
              )
            : await api.chats.sendRestaurantMessage(
                params.restaurantId!,
                trimmedContent,
              );

        setMessages((current) =>
          current.map((item) =>
            item.id === optimisticId
              ? { ...message, renderKey: item.renderKey }
              : item,
          ),
        );
        setConversationId(message.conversationId);

        router.setParams({
          id: message.conversationId,
        });

        return;
      }

      socketRef.current?.timeout(10_000).emit(
        "send_message",
        {
          conversationId,
          userId: user.id,
          type: "TEXT",
          content: trimmedContent,
          replyToId,
        },
        (error: Error | null, message: Message) => {
          if (error || !message?.id) {
            setMessages((current) =>
              current.filter((item) => item.id !== optimisticId),
            );
            console.error("send message failed", error);
            return;
          }

          const confirmedMessage = withBufferedReadReceipts(message);
          setMessages((current) =>
            current.some((item) => item.id === optimisticId)
              ? current
                  .filter((item) => item.id !== confirmedMessage.id)
                  .map((item) =>
                    item.id === optimisticId
                      ? { ...confirmedMessage, renderKey: item.renderKey }
                      : item,
                  )
              : current.some((item) => item.id === confirmedMessage.id)
                ? current
                : [...current, confirmedMessage],
          );
        },
      );
    } catch (error) {
      setMessages((current) =>
        current.filter((item) => item.id !== optimisticId),
      );
      console.error("send message failed", error);
    } finally {
      setSending(false);
    }
  }

  function startEditingMessage(message: Message) {
    if (!message.content) return;
    editingSnapshotRef.current = { content, replyingTo };
    stopTyping();
    setEditingMessage(message);
    setReplyingTo(null);
    setContent(message.content);
    requestAnimationFrame(() => composerInputRef.current?.focus());
  }

  function finishEditingMessage() {
    const snapshot = editingSnapshotRef.current;
    editingSnapshotRef.current = null;
    setEditingMessage(null);
    setContent(snapshot?.content ?? "");
    setReplyingTo(snapshot?.replyingTo ?? null);
    setComposerHeight(42);
  }

  async function saveEditedMessage(message: Message, nextContent: string) {
    const previousContent = message.content;
    const optimisticEditedAt = new Date().toISOString();
    setSending(true);
    setMessages((current) =>
      current.map((item) =>
        item.id === message.id
          ? { ...item, content: nextContent, editedAt: optimisticEditedAt }
          : item.replyTo?.id === message.id
            ? {
                ...item,
                replyTo: {
                  ...item.replyTo,
                  content: nextContent,
                  editedAt: optimisticEditedAt,
                },
              }
            : item,
      ),
    );

    try {
      const updated = await api.chats.editMessage(
        conversationId,
        message.id,
        nextContent,
      );
      setMessages((current) =>
        current.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                ...updated,
                renderKey: item.renderKey,
                starred: item.starred,
                starredAt: item.starredAt,
              }
            : item.replyTo?.id === updated.id
              ? {
                  ...item,
                  replyTo: {
                    ...item.replyTo,
                    content: updated.content,
                    editedAt: updated.editedAt,
                  },
                }
              : item,
        ),
      );
      finishEditingMessage();
      showToast(t("messageEdited"));
    } catch (error) {
      console.error("Could not edit message", error);
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? { ...item, content: previousContent, editedAt: message.editedAt }
            : item.replyTo?.id === message.id
              ? {
                  ...item,
                  replyTo: {
                    ...item.replyTo,
                    content: previousContent,
                    editedAt: message.editedAt,
                  },
                }
              : item,
        ),
      );
      showToast(t("messageEditFailed"), { kind: "error" });
    } finally {
      setSending(false);
    }
  }

  async function deleteMessage(
    message: Message,
    scope: "me" | "everyone",
  ) {
    if (message.id.startsWith("pending-")) {
      setMessages((current) => current.filter((item) => item.id !== message.id));
      return;
    }

    const result = await api.chats.deleteMessage(
      conversationId,
      message.id,
      scope,
    );
    if (scope === "me") {
      setMessages((current) => current.filter((item) => item.id !== message.id));
    } else {
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? {
                ...item,
                content: null,
                imageUrl: null,
                post: null,
                restaurant: null,
                deletedAt: result.deletedAt ?? new Date().toISOString(),
              }
            : item.replyTo?.id === message.id
              ? {
                  ...item,
                  replyTo: {
                    ...item.replyTo,
                    content: null,
                    imageUrl: null,
                    deletedAt: result.deletedAt ?? new Date().toISOString(),
                  },
                }
              : item,
        ),
      );
    }
    setReplyingTo((current) => current?.id === message.id ? null : current);
  }

  function replyPreview(
    message: Pick<Message, "deletedAt" | "content" | "type">,
  ) {
    if (message.deletedAt) return t("deletedMessage");
    if (message.content) return message.content;
    if (message.type === "IMAGE") return t("photoMessage");
    if (message.type === "POST") return t("postMessage");
    if (message.type === "RESTAURANT") return t("restaurantMessage");
    return t("message");
  }

  function replyAuthor(message: Message) {
    if (message.senderId === user?.id) return t("you");
    return message.sentAsRestaurant?.name ?? message.sender.displayName ?? message.sender.username;
  }

  const scrollToMessage = useCallback((messageId: string) => {
    const index = messages.findIndex((message) => message.id === messageId);
    if (index >= 0) {
      messagesListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }
  }, [messages]);

  useEffect(() => {
    const targetMessageId = params.messageId;
    if (
      !targetMessageId ||
      loading ||
      !isThreadReady ||
      handledTargetMessageRef.current === targetMessageId
    ) {
      return;
    }
    if (!messages.some((message) => message.id === targetMessageId)) return;
    handledTargetMessageRef.current = targetMessageId;
    requestAnimationFrame(() => scrollToMessage(targetMessageId));
  }, [isThreadReady, loading, messages, params.messageId, scrollToMessage]);

  function receiptLabel(message: Message) {
    const viewers = seenByViewers(message);
    if (viewers.length === 0) return null;

    if (!isGroupChat) {
      return t("seenWithTime", {
        time: formatMessageTime(viewers[viewers.length - 1].readAt),
      });
    }

    const expectedViewerCount =
      chat?.participants.filter((participant) => participant.userId !== user?.id)
        .length ?? 0;
    if (expectedViewerCount > 0 && viewers.length >= expectedViewerCount) {
      return t("seenByAll");
    }

    const names = viewers.map(
      ({ user: viewer }) => viewer.displayName ?? viewer.username,
    );
    if (names.length === 1) return t("seenByOne", { name: names[0] });
    if (names.length === 2) {
      return t("seenByTwo", { first: names[0], second: names[1] });
    }
    return t("seenByMany", {
      first: names[0],
      second: names[1],
      count: names.length - 2,
    });
  }

  function getStatusText() {
    if (isNewChat) return t("newConversation");

    if (typingUserIds.length > 0) return typingLabel;

    if (isGroupChat) {
      const count = chat?.participants.length ?? 0;
      return t("members", { count });
    }

    if (isRestaurantChat) {
      return t("restaurantChat");
    }

    if (
      user?.showActivityStatus === false ||
      otherUser?.showActivityStatus === false
    ) {
      return "";
    }

    if (otherUser?.isOnline) return t("onlineNow");

    if (otherUser?.lastSeenAt) {
      return t("lastSeen", {
        time: new Date(otherUser.lastSeenAt).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    }

    return t("lastSeenRecently");
  }

  function openChatInfo() {
    if (isNewChat) return;
    router.push({
      pathname: "/chats/info/[id]",
      params: { id: conversationId },
    });
  }

  async function toggleMessageStar(message: Message) {
    const starred = !message.starred;
    await api.chats.setMessageStarred(conversationId, message.id, starred);
    setMessages((current) =>
      current.map((item) =>
        item.id === message.id ? { ...item, starred } : item,
      ),
    );
    setSelectedMessage((current) =>
      current?.id === message.id ? { ...current, starred } : current,
    );
  }

  const statusText = loading ? "" : getStatusText();
  const canSubmitComposer =
    !!content.trim() &&
    (!editingMessage || content.trim() !== editingMessage.content?.trim());

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => (
            <SafeAreaView
              edges={["top"]}
              style={{ backgroundColor: isDark ? "#0F0F10" : "white" }}
            >
              <View className="h-16 flex-row items-center border-b border-gray-100 bg-white px-2 dark:border-gray-900 dark:bg-[#0F0F10]">
                <Pressable
                  onPress={() => router.back()}
                  hitSlop={8}
                  className="h-11 w-11 items-center justify-center"
                >
                  <DirectionalIcon
                    direction="back"
                    size={28}
                    color={isDark ? "white" : "black"}
                    weight="bold"
                  />
                </Pressable>

                {loading ? <ChatHeaderSkeleton /> : <Pressable
                  onPress={openChatInfo}
                  disabled={isNewChat}
                  className="min-w-0 flex-1 flex-row items-center py-2"
                >
                  <Avatar
                    uri={headerImage}
                    username={headerTitle ?? "Chat"}
                    size={42}
                    fallbackType={isRestaurantChat ? "restaurant" : "user"}
                  />

                  <View className="ml-3 min-w-0 flex-1">
                    <View className="flex-row items-center">
                      <Text numberOfLines={1} className="shrink text-base font-bold text-black dark:text-white">
                        {headerTitle ?? "Chat"}
                      </Text>
                      {isRestaurantChat ? <RestaurantBadge /> : null}
                    </View>

                    {statusText ? (
                      <Text
                        numberOfLines={1}
                        className={`text-xs ${typingUserIds.length > 0 || (!isGroupChat && !isRestaurantChat && otherUser?.isOnline) ? "font-semibold text-emerald-600 dark:text-emerald-400" : "text-gray-500"}`}
                      >
                        {statusText}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>}
              </View>
            </SafeAreaView>
          ),
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView
        edges={["left", "right", "bottom"]}
        style={{ flex: 1, backgroundColor: isDark ? "#080808" : "#FBFAF8" }}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={110}
        >
          {(loading || !isThreadReady) && <ChatSkeleton />}
          {!loading && <>
          <FlatList
            ref={messagesListRef}
            style={{ opacity: isThreadReady ? 1 : 0 }}
            refreshing={refreshing}
            onRefresh={onRefresh}
            data={messages}
            keyExtractor={(item) => item.renderKey ?? item.id}
            keyboardShouldPersistTaps="handled"
            onScrollToIndexFailed={({ index }) => {
              messagesListRef.current?.scrollToOffset({
                offset: Math.max(0, index * 72),
                animated: true,
              });
            }}
            onLayout={() => {
              if (!shouldScrollToEndRef.current) return;
              requestAnimationFrame(() => {
                messagesListRef.current?.scrollToEnd({
                  animated: scrollToEndAnimatedRef.current,
                });
                if (!isThreadReady) {
                  requestAnimationFrame(() => setIsThreadReady(true));
                }
              });
            }}
            onScrollBeginDrag={() => {
              shouldScrollToEndRef.current = false;
            }}
            onContentSizeChange={() => {
              if (!shouldScrollToEndRef.current) return;
              messagesListRef.current?.scrollToEnd({
                animated: scrollToEndAnimatedRef.current,
              });
              hasPositionedAtBottomRef.current = true;
              if (!isThreadReady) {
                requestAnimationFrame(() => {
                  messagesListRef.current?.scrollToEnd({ animated: false });
                  requestAnimationFrame(() => setIsThreadReady(true));
                });
              }
            }}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 12,
              paddingBottom: 8,
              paddingTop: 12,
            }}
            ListEmptyComponent={
              isNewChat ? (
                <View className="flex-1 items-center justify-center px-8">
                  <Text className="text-center text-xl font-bold text-black dark:text-white">
                    {t("noMessages")}
                  </Text>
                </View>
              ) : null
            }
            renderItem={({ item, index }) => {
              const isMine = item.senderId === user?.id;

              const previousMessage = index > 0 ? messages[index - 1] : null;
              const nextMessage =
                index < messages.length - 1 ? messages[index + 1] : null;

              const isGroupMessageFromOther = isGroupChat && !isMine;

              const shouldShowAvatar =
                isGroupMessageFromOther &&
                nextMessage?.senderId !== item.senderId;

              const shouldShowSenderName =
                isGroupMessageFromOther &&
                previousMessage?.senderId !== item.senderId;

              const shouldShowDateSeparator =
                !previousMessage ||
                !isSameDay(previousMessage.createdAt, item.createdAt);

              const nextMessageIsDifferentSender =
                !!nextMessage && nextMessage.senderId !== item.senderId;
              const seenLabel =
                isMine && item.id === latestSentMessageId
                  ? receiptLabel(item)
                  : null;

              return (
                <View>
                  {shouldShowDateSeparator && (
                    <View className="my-4 items-center">
                      <View className="rounded-full bg-white px-3 py-1.5 dark:bg-[#1B1B1D]">
                        <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          {formatMessageDate(item.createdAt, {
                            today: t("today"),
                            yesterday: t("yesterday"),
                          })}
                        </Text>
                      </View>
                    </View>
                  )}

                  <Animated.View
                    entering={
                      animateNewMessages
                        ? ZoomInEasyDown.duration(180)
                        : undefined
                    }
                    layout={LinearTransition.duration(160)}
                    className={`${nextMessageIsDifferentSender ? "mb-3" : "mb-1"} flex-row ${
                      isMine ? "justify-end" : "justify-start"
                    }`}
                  >
                    {isGroupMessageFromOther && (
                      <View className="mr-2 w-8 justify-end">
                        {shouldShowAvatar ? (
                          <Avatar
                            uri={item.sender.avatarUrl}
                            username={item.sender.username}
                            size={32}
                          />
                        ) : null}
                      </View>
                    )}

                    <Pressable
                      onLongPress={() => {
                        if (!item.deletedAt) setSelectedMessage(item);
                      }}
                      delayLongPress={260}
                      className={`max-w-[78%] rounded-[22px] border px-4 py-2.5 ${
                        isMine
                          ? `${nextMessage?.senderId !== item.senderId ? "rounded-br-md" : ""} border-[#FFD8CD] bg-brand-soft`
                          : `${nextMessage?.senderId !== item.senderId ? "rounded-bl-md" : ""} border-gray-100 bg-white dark:border-gray-800 dark:bg-[#1B1B1D]`
                      }`}
                    >
                      {shouldShowSenderName && (
                        <Text className="mb-1 text-xs font-bold text-gray-500">
                          @{item.sender.username}
                        </Text>
                      )}

                      {item.replyTo ? (
                        <Pressable
                          onPress={() => scrollToMessage(item.replyTo!.id)}
                          className={`mb-2 min-w-[150px] overflow-hidden rounded-xl border-l-4 border-brand px-3 py-2 ${isMine ? "bg-white/55" : "bg-gray-100 dark:bg-black/30"}`}
                        >
                          <Text className="text-xs font-bold text-amber-700 dark:text-amber-400">
                            {item.replyTo.sender.id === user?.id
                              ? t("you")
                              : item.replyTo.sentAsRestaurant?.name ?? item.replyTo.sender.displayName ?? item.replyTo.sender.username}
                          </Text>
                          <Text numberOfLines={2} className={`mt-0.5 text-xs ${isMine ? "text-black/60" : "text-gray-500 dark:text-gray-400"}`}>
                            {replyPreview(item.replyTo)}
                          </Text>
                        </Pressable>
                      ) : null}

                      {item.deletedAt ? (
                        <Text className={`italic ${isMine ? "text-black/55" : "text-gray-500 dark:text-gray-400"}`}>
                          {t("deletedMessage")}
                        </Text>
                      ) : item.type === "POST" ? (
                        item.post ? (
                          <Pressable
                            className="overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-900"
                            onPress={() =>
                              router.push({
                                pathname: "/(posts)/[id]",
                                params: { id: item.post!.id },
                              })
                            }
                          >
                            {(() => {
                              const image =
                                item.post.contentPost?.imageUrl ??
                                item.post.reviewPost?.coverImageUrl;

                              const description =
                                item.post.contentPost?.description ??
                                item.post.reviewPost?.summary;

                              return (
                                <>
                                  {!!image && (
                                    <Image
                                      source={{ uri: image }}
                                      className="h-40 w-56"
                                      resizeMode="cover"
                                    />
                                  )}

                                  <View className="p-3">
                                    <View className="flex-row items-center">
                                      <Text className="font-bold text-black dark:text-white">
                                        {item.post.restaurant?.name ?? t("findEatPost")}
                                      </Text>
                                      {item.post.restaurant?.name ? <RestaurantBadge /> : null}
                                    </View>

                                    {!!description && (
                                      <Text
                                        numberOfLines={2}
                                        className="mt-1 text-sm text-gray-600 dark:text-gray-300"
                                      >
                                        {description}
                                      </Text>
                                    )}
                                  </View>
                                </>
                              );
                            })()}
                          </Pressable>
                        ) : (
                          <View className="items-center rounded-xl bg-gray-100 px-5 py-6">
                            <Text className="text-center text-sm font-medium text-gray-500">
                              {t("deletedPost")}
                            </Text>
                          </View>
                        )
                      ) : (
                        <MentionText
                          className={
                            isMine
                              ? "text-black"
                              : "text-black dark:text-white"
                          }
                          content={item.content ?? ""}
                          mentions={item.mentions}
                        />
                      )}

                      <View className="mt-1 flex-row items-center self-end">
                        {item.starred ? (
                          <StarIcon
                            size={10}
                            color={isMine ? "#A16207" : "#D97706"}
                            weight="fill"
                            style={{ marginRight: 3 }}
                          />
                        ) : null}
                        <Text
                          className={`text-[10px] ${
                          isMine
                            ? "text-black/50"
                            : "text-gray-400 dark:text-gray-500"
                          }`}
                        >
                          {item.editedAt && !item.deletedAt ? `${t("edited")} · ` : ""}
                          {formatMessageTime(item.createdAt)}
                        </Text>
                      </View>
                    </Pressable>
                  </Animated.View>
                  {seenLabel ? (
                    <TouchableOpacity
                      disabled={!isGroupChat}
                      onPress={() => setSeenByMessageId(item.id)}
                      className="mb-1 mr-1 flex-row items-center self-end py-0.5"
                    >
                      <ChecksIcon
                        size={14}
                        color="#10B981"
                        weight="bold"
                      />
                      <Text
                        numberOfLines={1}
                        className="ml-1 max-w-[280px] text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
                      >
                        {seenLabel}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            }}
          />

          {typingUserIds.length > 0 ? (
            <Animated.View
              entering={FadeIn.duration(140)}
              exiting={FadeOut.duration(140)}
              className="mx-3 mb-2 self-start flex-row items-center rounded-[18px] rounded-bl-md border border-gray-100 bg-white px-3 py-2 dark:border-gray-800 dark:bg-[#1B1B1D]"
            >
              <TypingDots />
              <Text className="ml-2 text-xs font-semibold text-gray-500 dark:text-gray-300">
                {typingLabel}
              </Text>
            </Animated.View>
          ) : null}

          <View className="border-t border-line bg-white px-3 py-2 dark:border-gray-900 dark:bg-[#0F0F10]">
            {editingMessage ? (
              <View className="mb-2 flex-row items-center overflow-hidden rounded-2xl bg-gray-100 dark:bg-[#1B1B1D]">
                <View className="h-full w-1 bg-brand" />
                <View className="min-w-0 flex-1 px-3 py-2">
                  <Text className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    {t("editingMessage")}
                  </Text>
                  <Text numberOfLines={1} className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {editingMessage.content}
                  </Text>
                </View>
                <TouchableOpacity onPress={finishEditingMessage} hitSlop={8} className="h-11 w-11 items-center justify-center">
                  <XIcon size={20} color={isDark ? "#D1D5DB" : "#6B7280"} weight="bold" />
                </TouchableOpacity>
              </View>
            ) : replyingTo ? (
              <View className="mb-2 flex-row items-center overflow-hidden rounded-2xl bg-gray-100 dark:bg-[#1B1B1D]">
                <View className="h-full w-1 bg-brand" />
                <View className="min-w-0 flex-1 px-3 py-2">
                  <Text className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    {replyAuthor(replyingTo)}
                  </Text>
                  <Text numberOfLines={1} className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {replyPreview(replyingTo)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={8} className="h-11 w-11 items-center justify-center">
                  <XIcon size={20} color={isDark ? "#D1D5DB" : "#6B7280"} weight="bold" />
                </TouchableOpacity>
              </View>
            ) : null}
            <MentionSuggestions
              value={content}
              onChange={handleContentChange}
              candidates={mentionCandidates}
            />
            <View className="flex-row items-end">
            <RNTextInput
              ref={composerInputRef}
              className="flex-1 rounded-3xl border border-line bg-soft px-4 text-ink dark:border-gray-800 dark:bg-[#1B1B1D] dark:text-white"
              placeholder={t("messagePlaceholder")}
              placeholderTextColor="#9CA3AF"
              value={content}
              onChangeText={handleContentChange}
              onBlur={stopTyping}
              multiline
              scrollEnabled={composerHeight >= 136}
              onContentSizeChange={(event) => {
                const measuredHeight = Math.ceil(
                  event.nativeEvent.contentSize.height,
                );

                if (
                  composerBaseContentHeightRef.current === null ||
                  content.length === 0
                ) {
                  composerBaseContentHeightRef.current = measuredHeight;
                }

                const baseHeight = composerBaseContentHeightRef.current;
                const measuredLines = Math.max(
                  1,
                  Math.round((measuredHeight - baseHeight) / 20) + 1,
                );
                const visibleLines = Math.min(6, measuredLines);
                const nextHeight = 42 + (visibleLines - 1) * 20;

                setComposerHeight((currentHeight) =>
                  currentHeight === nextHeight
                    ? currentHeight
                    : nextHeight,
                );
              }}
              style={{
                height: composerHeight,
                minHeight: 42,
                maxHeight: 136,
                paddingTop: 10,
                paddingBottom: 10,
                lineHeight: 20,
                fontSize: 16,
                fontFamily: "CabinetRegular",
              }}
            />

            <TouchableOpacity
              className={`ml-2 h-10 w-10 items-center justify-center rounded-full ${canSubmitComposer && !sending ? "bg-brand" : "bg-gray-200 dark:bg-gray-800"}`}
              onPress={sendMessage}
              disabled={!canSubmitComposer || sending}
            >
              {sending ? (
                <ActivityIndicator color={isDark ? "white" : "#111"} />
              ) : (
                editingMessage ? (
                  <CheckIcon size={21} color={canSubmitComposer ? "#FFF" : "#9CA3AF"} weight="bold" />
                ) : (
                  <PaperPlaneTiltIcon
                    size={21}
                    color={canSubmitComposer ? "#FFF" : "#9CA3AF"}
                    weight="fill"
                  />
                )
              )}
            </TouchableOpacity>
            </View>
          </View>
          </>}
        </KeyboardAvoidingView>
      </SafeAreaView>
      <MessageActionsBottomSheet
        message={selectedMessage}
        isMine={selectedMessage?.senderId === user?.id}
        onClose={() => setSelectedMessage(null)}
        onReply={(message) => setReplyingTo(message)}
        onEdit={startEditingMessage}
        onDelete={deleteMessage}
        onToggleStar={toggleMessageStar}
      />
      <SeenByBottomSheet
        open={!!seenByMessageId}
        viewers={selectedSeenByViewers}
        onClose={() => setSeenByMessageId(null)}
      />
    </>
  );
}
