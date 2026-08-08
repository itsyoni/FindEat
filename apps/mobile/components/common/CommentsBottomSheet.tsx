import { AppAlert as Alert } from "@/lib/appAlert";
import AppBottomSheet from "@/components/common/AppBottomSheet";
import {
  COMMENT_PIN_LIMIT_ERROR,
  useComments,
} from "@/hooks/useComments";
import type { Comment } from "@findeat/types";
import {
  BottomSheetFlatList,
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Avatar from "./Avatar";
import Text from "./AppText";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/contexts/ThemeContext";
import SkeletonList from "./feedback/SkeletonList";
import {
  CaretDownIcon,
  CaretUpIcon,
  DotsThreeIcon,
  HeartIcon,
  ChartBarIcon,
  MegaphoneIcon,
  NotePencilIcon,
  PlusIcon,
  PushPinIcon,
  TrashIcon,
  XIcon,
} from "phosphor-react-native";
import { api } from "@/lib/api";
import MentionSuggestions from "./MentionSuggestions";
import MentionText from "./MentionText";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@findeat/utils";

type Props = {
  postId: string | null;
  focusedCommentId?: string;
  onClose: () => void;
  onCommentAdded?: (postId: string) => void;
};

type CommentActionTarget = {
  comment: Comment;
  pin: () => void;
  edit: () => void;
  remove: () => void;
};

type CommentFooterProps = BottomSheetFooterProps & {
  bottomInset: number;
  replyingTo: Comment | null;
  editingComment: Comment | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onAddComment: (content: string, replyToId?: string) => Promise<void>;
  onUpdateComment: (comment: Comment, content: string) => Promise<void>;
};

function formatCommentTime(createdAt: string) {
  const date = new Date(createdAt);
  const now = new Date();

  const diffInSeconds = Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / 1000),
  );

  if (diffInSeconds < 60) {
    return "עכשיו";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);

  if (diffInMinutes < 60) {
    return `לפני ${diffInMinutes} דק׳`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInHours < 24) {
    return `לפני ${diffInHours} שע׳`;
  }

  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays < 7) {
    return `לפני ${diffInDays} ימים`;
  }

  return date.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function CommentFooter({
  bottomInset,
  replyingTo,
  editingComment,
  onCancelReply,
  onCancelEdit,
  onAddComment,
  onUpdateComment,
  ...footerProps
}: CommentFooterProps) {
  const { t } = useTranslation("chat");
  const { isDark } = useAppTheme();
  const [content, setContent] = useState(editingComment?.content ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function submitComment() {
    const trimmed = content.trim();

    if (!trimmed || submitting) return;

    try {
      setSubmitting(true);
      if (editingComment) {
        await onUpdateComment(editingComment, trimmed);
      } else {
        await onAddComment(trimmed, replyingTo?.id);
      }
      setContent("");
      onCancelReply();
      onCancelEdit();
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = !content.trim() || submitting;

  return (
    <BottomSheetFooter
      {...footerProps}
      bottomInset={0}
      style={{
        backgroundColor: isDark ? "#111827" : "#FAF9F6",
        shadowColor: "#0B0B0A",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 10,
      }}
    >
      <View className="bg-white dark:bg-gray-900">
        <View
          className="border-t border-gray-200 bg-white px-4 pt-3 dark:border-gray-700 dark:bg-gray-900"
          style={{
            backgroundColor: isDark ? "#111827" : "#FAF9F6",
            paddingBottom: bottomInset,
          }}
        >
          {editingComment ? (
            <View className="mb-2 flex-row items-center overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
              <View className="h-full w-1 bg-amber-500" />
              <View className="min-w-0 flex-1 px-3 py-2">
                <Text className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  {t("editingComment")}
                </Text>
                <Text numberOfLines={1} className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {editingComment.content}
                </Text>
              </View>
              <TouchableOpacity onPress={onCancelEdit} hitSlop={8} className="h-10 w-10 items-center justify-center">
                <Text className="text-xl text-gray-500 dark:text-gray-300">×</Text>
              </TouchableOpacity>
            </View>
          ) : replyingTo ? (
            <View className="mb-2 flex-row items-center overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
              <View className="h-full w-1 bg-brand" />
              <View className="min-w-0 flex-1 px-3 py-2">
                <Text className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  {t("replyingTo", { username: replyingTo.user.username })}
                </Text>
                <Text numberOfLines={1} className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {replyingTo.content}
                </Text>
              </View>
              <TouchableOpacity onPress={onCancelReply} hitSlop={8} className="h-10 w-10 items-center justify-center">
                <Text className="text-xl text-gray-500 dark:text-gray-300">×</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <MentionSuggestions value={content} onChange={setContent} />
          <View className="flex-row items-center gap-2">
            <BottomSheetTextInput
              className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder={t("addComment")}
              placeholderTextColor="#9CA3AF"
              value={content}
              onChangeText={setContent}
              onSubmitEditing={submitComment}
              returnKeyType="send"
              blurOnSubmit={false}
              editable={!submitting}
            />

            <TouchableOpacity
              className="rounded-2xl bg-black px-4 py-3"
              onPress={submitComment}
              disabled={disabled}
              style={{
                opacity: disabled ? 0.4 : 1,
              }}
            >
              <Text className="font-bold text-white">
                {submitting
                  ? t("sending")
                  : t(editingComment ? "saveComment" : "send")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </BottomSheetFooter>
  );
}

export default function CommentsBottomSheet({
  postId,
  focusedCommentId,
  onClose,
  onCommentAdded,
}: Props) {
  const { t } = useTranslation("chat");
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const {
    comments,
    loading,
    submitting,
    isPostAuthor,
    canCreateAuthorNote,
    canCreatePoll,
    poll,
    addComment,
    addAuthorNote,
    updateAuthorNote,
    addPoll,
    voteOnPoll,
    toggleCommentLike,
    deleteComment,
    updateComment,
    togglePinnedComment,
  } = useComments(postId);
  const insets = useSafeAreaInsets();
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [commentActionTarget, setCommentActionTarget] =
    useState<CommentActionTarget | null>(null);
  const commentActionCount = commentActionTarget
    ? Number(commentActionTarget.comment.canPin) +
      Number(
        commentActionTarget.comment.canDelete &&
          !commentActionTarget.comment.isAuthorNote,
      ) +
      Number(
        commentActionTarget.comment.canDelete ||
          commentActionTarget.comment.canModerate,
      )
    : 0;
  const [showAuthorNoteComposer, setShowAuthorNoteComposer] = useState(false);
  const [showAuthorToolsSheet, setShowAuthorToolsSheet] = useState(false);
  const [authorNoteExpanded, setAuthorNoteExpanded] = useState(false);
  const [pollExpanded, setPollExpanded] = useState(false);
  const [authorNoteContent, setAuthorNoteContent] = useState("");
  const [showPollComposer, setShowPollComposer] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [votingOptionId, setVotingOptionId] = useState<string | null>(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState<
    string | null
  >(null);
  const authorNote = useMemo(
    () => comments.find((comment) => comment.isAuthorNote && !comment.parentId) ?? null,
    [comments],
  );

  const threadedComments = useMemo(() => {
    const roots = comments
      .filter((comment) => !comment.parentId && !comment.isAuthorNote)
      .sort((first, second) => {
        const pinnedDifference =
          Number(second.isPinned) - Number(first.isPinned);
        if (pinnedDifference !== 0) return pinnedDifference;
        if (!first.isPinned || !second.isPinned) return 0;
        return (
          new Date(second.pinnedAt ?? 0).getTime() -
          new Date(first.pinnedAt ?? 0).getTime()
        );
      });
    const repliesByParent = new Map<string, Comment[]>();
    comments.forEach((comment) => {
      if (!comment.parentId) return;
      const replies = repliesByParent.get(comment.parentId) ?? [];
      replies.push(comment);
      repliesByParent.set(comment.parentId, replies);
    });
    const arranged = roots.flatMap((root) => [
      root,
      ...(repliesByParent.get(root.id) ?? []),
    ]);
    const arrangedIds = new Set(arranged.map((comment) => comment.id));
    return [
      ...arranged,
      ...comments.filter(
        (comment) => !comment.isAuthorNote && !arrangedIds.has(comment.id),
      ),
    ];
  }, [comments]);

  const submitAuthorNote = useCallback(async () => {
    const content = authorNoteContent.trim();
    if (!content || submitting) return;
    try {
      if (authorNote) {
        await updateAuthorNote(content);
      } else {
        await addAuthorNote(content);
      }
      setAuthorNoteContent("");
      setShowAuthorNoteComposer(false);
      if (postId) onCommentAdded?.(postId);
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
    } catch {
      Alert.alert(t("authorNoteError"));
    }
  }, [
    addAuthorNote,
    authorNote,
    authorNoteContent,
    onCommentAdded,
    postId,
    submitting,
    t,
    updateAuthorNote,
  ]);

  const submitPoll = useCallback(async () => {
    const question = pollQuestion.trim();
    const options = pollOptions.map((option) => option.trim()).filter(Boolean);
    if (!question || options.length < 2 || creatingPoll) return;
    try {
      setCreatingPoll(true);
      await addPoll(question, options);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setShowPollComposer(false);
    } catch {
      Alert.alert(t("pollCreateError"));
    } finally {
      setCreatingPoll(false);
    }
  }, [addPoll, creatingPoll, pollOptions, pollQuestion, t]);

  const openAuthorTools = useCallback(() => {
    setShowAuthorToolsSheet(true);
  }, []);

  const confirmRemoveAuthorNote = useCallback(() => {
    if (!authorNote) return;
    setShowAuthorToolsSheet(false);
    setAuthorNoteExpanded(false);
    setPollExpanded(false);
    Alert.alert(t("removeAuthorNoteTitle"), t("removeAuthorNoteDescription"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("removeAuthorNote"),
        style: "destructive",
        onPress: () => {
          void deleteComment(authorNote)
            .then(() => {
              setShowAuthorNoteComposer(false);
              setAuthorNoteContent("");
              showToast(t("authorNoteRemoved"));
            })
            .catch(() => Alert.alert(t("commentActionError")));
        },
      },
    ]);
  }, [authorNote, deleteComment, showToast, t]);

  const selectPollOption = useCallback(
    async (optionId: string) => {
      if (votingOptionId || poll?.closedAt) return;
      try {
        setVotingOptionId(optionId);
        await voteOnPoll(optionId);
      } catch {
        Alert.alert(t("pollVoteError"));
      } finally {
        setVotingOptionId(null);
      }
    },
    [poll?.closedAt, t, voteOnPoll, votingOptionId],
  );

  const listRef =
    useRef<React.ElementRef<typeof BottomSheetFlatList<Comment>>>(null);

  const focusedCommentIndex = useMemo(
    () =>
      focusedCommentId
        ? threadedComments.findIndex(
            (comment) => comment.id === focusedCommentId,
          )
        : -1,
    [focusedCommentId, threadedComments],
  );

  useEffect(() => {
    if (!focusedCommentId || focusedCommentIndex < 0) {
      const clearTimer = setTimeout(() => setHighlightedCommentId(null), 0);
      return () => clearTimeout(clearTimer);
    }

    const showTimer = setTimeout(
      () => setHighlightedCommentId(focusedCommentId),
      0,
    );
    const scrollTimer = setTimeout(
      () =>
        listRef.current?.scrollToIndex({
          index: focusedCommentIndex,
          animated: true,
          viewPosition: 0.4,
        }),
      350,
    );
    const highlightTimer = setTimeout(
      () => setHighlightedCommentId(null),
      3000,
    );

    return () => {
      clearTimeout(showTimer);
      clearTimeout(scrollTimer);
      clearTimeout(highlightTimer);
    };
  }, [focusedCommentId, focusedCommentIndex]);

  const handleAddComment = useCallback(
    async (content: string, replyToId?: string): Promise<void> => {
      if (!postId) return;

      await addComment(content, replyToId);
      onCommentAdded?.(postId);

      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({
          animated: true,
        });
      });
    },
    [postId, addComment, onCommentAdded],
  );

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <CommentFooter
        key={editingComment?.id ?? "comment-composer"}
        {...props}
        bottomInset={insets.bottom}
        replyingTo={replyingTo}
        editingComment={editingComment}
        onCancelReply={() => setReplyingTo(null)}
        onCancelEdit={() => setEditingComment(null)}
        onAddComment={handleAddComment}
        onUpdateComment={updateComment}
      />
    ),
    [editingComment, handleAddComment, insets.bottom, replyingTo, updateComment],
  );

  const renderComment = useCallback(
    ({ item, embedded = false }: { item: Comment; embedded?: boolean }) => {
      function confirmRemoveComment() {
        const isModerating = item.canModerate && !item.canDelete;
        Alert.alert(
          t(isModerating ? "removeHatefulCommentTitle" : "unpublishCommentTitle"),
          t(isModerating ? "removeHatefulCommentDescription" : "unpublishCommentDescription"),
          [
            { text: t("cancel"), style: "cancel" },
            {
              text: t(isModerating ? "removeComment" : "unpublishComment"),
              style: "destructive",
              onPress: () => {
                void deleteComment(item)
                  .then((result) => {
                    showToast(
                      t(result?.removedByPostAuthor ? "commentRemoved" : "commentUnpublished"),
                    );
                    if (!result?.removedByPostAuthor) return;
                    Alert.alert(
                      t("commentRemovedTitle"),
                      t("blockAndReportPrompt", { username: item.user.username }),
                      [
                        { text: t("notNow"), style: "cancel" },
                        {
                          text: t("reportOnly"),
                          onPress: () => {
                            void api.reports
                              .create({
                                targetType: "USER",
                                targetId: item.user.id,
                                reason: "HATE_SPEECH",
                                details: item.content,
                              })
                              .catch(() => Alert.alert(t("commentActionError")));
                          },
                        },
                        {
                          text: t("blockAndReport"),
                          style: "destructive",
                          onPress: () => {
                            void Promise.all([
                              api.reports.create({
                                targetType: "USER",
                                targetId: item.user.id,
                                reason: "HATE_SPEECH",
                                details: item.content,
                              }),
                              api.users.block(item.user.id),
                            ]).catch(() => Alert.alert(t("commentActionError")));
                          },
                        },
                      ],
                    );
                  })
                  .catch(() => Alert.alert(t("commentActionError")));
              },
            },
          ],
        );
      }

      function openCommentActions() {
        setCommentActionTarget({
          comment: item,
          pin: () => {
            void togglePinnedComment(item).catch((error) => {
              const message =
                error instanceof Error &&
                error.message === COMMENT_PIN_LIMIT_ERROR
                  ? COMMENT_PIN_LIMIT_ERROR
                  : getErrorMessage(error, "");
              if (
                message === COMMENT_PIN_LIMIT_ERROR ||
                message.includes("up to 3 pinned comments")
              ) {
                Alert.alert(
                  t("commentPinLimitTitle"),
                  t("commentPinLimitDescription"),
                );
                return;
              }
              Alert.alert(
                t("commentActionError"),
                message || t("commentPinUnknownError"),
              );
            });
          },
          edit: () => {
            setReplyingTo(null);
            setEditingComment(item);
          },
          remove: confirmRemoveComment,
        });
      }

      return (
      <View
        className={`flex-row gap-3 rounded-2xl ${
          item.isAuthorNote
            ? embedded
              ? "pb-4"
              : "border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40"
            : item.id === highlightedCommentId
              ? "mb-5 bg-amber-50 p-2 dark:bg-amber-950/30"
              : "mb-5"
        }`}
        style={{ marginLeft: item.parentId ? 44 : 0 }}
      >
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/(users)/[id]", params: { id: item.user.id } })}
        >
          <Avatar
            uri={item.user.avatarUrl}
            username={item.user.username}
            userId={item.user.id}
            size={item.parentId ? 34 : 40}
          />
        </TouchableOpacity>

        <View className="min-w-0 flex-1">
          <View className="flex-row items-center">
            <TouchableOpacity
              className="min-w-0 flex-1 flex-row items-center"
              onPress={() => router.push({ pathname: "/(users)/[id]", params: { id: item.user.id } })}
            >
              <Text className="font-bold text-black dark:text-white">
                @{item.user.username}
              </Text>

              <Text className="ml-2 text-xs text-gray-400">
                {formatCommentTime(item.createdAt)}
              </Text>
              {item.editedAt ? (
                <Text className="ml-1 text-xs text-gray-400">
                  · {t("edited")}
                </Text>
              ) : null}
            </TouchableOpacity>
            {!item.isAuthorNote &&
            (item.canDelete || item.canModerate || item.canPin) ? (
              <TouchableOpacity onPress={openCommentActions} hitSlop={10}>
                <DotsThreeIcon size={18} color="#9CA3AF" weight="bold" />
              </TouchableOpacity>
            ) : null}
          </View>

          {item.isPinned ? (
            <View className="mt-1.5 flex-row items-center gap-1">
              <PushPinIcon size={13} color="#D97706" weight="fill" />
              <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {t("pinnedByAuthor")}
              </Text>
            </View>
          ) : null}

          {item.isAuthorNote && !embedded ? (
            <View className="mt-1.5 flex-row items-center gap-1.5">
              <MegaphoneIcon size={14} color="#D97706" weight="fill" />
              <Text className="text-xs font-bold text-amber-700 dark:text-amber-300">
                {t("authorNote")}
              </Text>
            </View>
          ) : null}

          {item.parent ? (
            <Text className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
              {t("replyingTo", { username: item.parent.user.username })}
            </Text>
          ) : null}

          <MentionText
            className="mt-1 text-gray-700 dark:text-gray-300"
            content={item.content}
            mentions={item.mentions}
          />

          <View className="mt-2 flex-row items-center gap-3">
            {!item.isAuthorNote ? (
              <TouchableOpacity
                onPress={() => {
                  setEditingComment(null);
                  setReplyingTo(item);
                }}
                hitSlop={8}
              >
                <Text className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  {t("reply")}
                </Text>
              </TouchableOpacity>
            ) : null}
            {item.likedByAuthor ? (
              <Text className="text-xs font-bold text-amber-700 dark:text-amber-400">
                {t("likedByAuthor")}
              </Text>
            ) : null}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => void toggleCommentLike(item).catch(console.error)}
          hitSlop={8}
          className="w-9 items-center pt-1"
          accessibilityRole="button"
          accessibilityLabel={item.isLiked ? "Unlike comment" : "Like comment"}
        >
          <HeartIcon
            size={19}
            color={item.isLiked ? "#EF4444" : "#9CA3AF"}
            weight={item.isLiked ? "fill" : "regular"}
          />
          {item.likesCount > 0 ? (
            <Text className="mt-1 text-[11px] font-bold text-gray-500 dark:text-gray-400">
              {item.likesCount}
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>
      );
    },
    [
      deleteComment,
      highlightedCommentId,
      showToast,
      t,
      toggleCommentLike,
      togglePinnedComment,
    ],
  );

  const closeSheet = useCallback(() => {
    setReplyingTo(null);
    setEditingComment(null);
    setCommentActionTarget(null);
    setShowAuthorNoteComposer(false);
    setAuthorNoteContent("");
    setShowPollComposer(false);
    setShowAuthorToolsSheet(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    onClose();
  }, [onClose]);

  return (
    <>
      <AppBottomSheet
      open={!!postId}
      snapPoints={["70%"]}
      onClose={closeSheet}
      footerComponent={renderFooter}
    >
      <BottomSheetFlatList
        ref={listRef}
        data={threadedComments}
        keyExtractor={(item) => item.id}
        renderItem={renderComment}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        onScrollToIndexFailed={(info) => {
          setTimeout(
            () => listRef.current?.scrollToOffset({
              offset: Math.max(0, info.averageItemLength * info.index),
              animated: true,
            }),
            120,
          );
        }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 130 + insets.bottom,
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <View className="mb-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-black dark:text-white">
                {t("comments")}
              </Text>
              {isPostAuthor ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t("authorTools")}
                  onPress={openAuthorTools}
                  className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
                >
                  <DotsThreeIcon
                    size={22}
                    color={isDark ? "#FAF9F6" : "#111827"}
                    weight="bold"
                  />
                </TouchableOpacity>
              ) : null}
            </View>
            {authorNote ? (
              <View className="mt-4 overflow-hidden rounded-3xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
                <TouchableOpacity
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: authorNoteExpanded }}
                  onPress={() => setAuthorNoteExpanded((current) => !current)}
                  className="flex-row items-center p-4"
                >
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/60">
                    <MegaphoneIcon size={19} color="#D97706" weight="fill" />
                  </View>
                  <View className="ml-3 min-w-0 flex-1">
                    <Text className="font-bold text-amber-800 dark:text-amber-200">
                      {t("authorNote")}
                    </Text>
                    {!authorNoteExpanded ? (
                      <Text
                        numberOfLines={1}
                        className="mt-0.5 text-sm text-amber-700 dark:text-amber-300"
                      >
                        {authorNote.content}
                      </Text>
                    ) : null}
                  </View>
                  {authorNoteExpanded ? (
                    <CaretUpIcon size={18} color="#D97706" weight="bold" />
                  ) : (
                    <CaretDownIcon size={18} color="#D97706" weight="bold" />
                  )}
                </TouchableOpacity>
                {authorNoteExpanded ? (
                  <View className="border-t border-amber-200 px-4 pt-4 dark:border-amber-800">
                    {renderComment({ item: authorNote, embedded: true })}
                  </View>
                ) : null}
              </View>
            ) : null}
            {showAuthorNoteComposer && (canCreateAuthorNote || !!authorNote) ? (
                <View className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
                  <View className="flex-row items-center gap-2">
                    <MegaphoneIcon size={18} color="#D97706" weight="fill" />
                    <Text className="font-bold text-amber-800 dark:text-amber-200">
                      {t(authorNote ? "editAuthorNote" : "addAuthorNote")}
                    </Text>
                  </View>
                  <BottomSheetTextInput
                    value={authorNoteContent}
                    onChangeText={setAuthorNoteContent}
                    placeholder={t("authorNotePlaceholder")}
                    placeholderTextColor="#9CA3AF"
                    multiline
                    maxLength={2000}
                    className="mt-3 min-h-24 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-base text-black dark:border-amber-800 dark:bg-gray-900 dark:text-white"
                    style={{ textAlignVertical: "top" }}
                  />
                  <View className="mt-3 flex-row justify-end gap-2">
                    <TouchableOpacity
                      onPress={() => {
                        setShowAuthorNoteComposer(false);
                        setAuthorNoteContent("");
                      }}
                      className="rounded-full px-4 py-2.5"
                    >
                      <Text className="font-bold text-gray-600 dark:text-gray-300">
                        {t("cancel")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={!authorNoteContent.trim() || submitting}
                      onPress={() => void submitAuthorNote()}
                      className="rounded-full bg-amber-600 px-5 py-2.5"
                      style={{
                        opacity:
                          !authorNoteContent.trim() || submitting ? 0.45 : 1,
                      }}
                    >
                      <Text className="font-bold text-white">
                        {submitting
                          ? t("sending")
                          : t(authorNote ? "saveAuthorNote" : "publishAuthorNote")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
            ) : null}

            {showPollComposer && canCreatePoll ? (
              <View className="mt-4 rounded-3xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950/30">
                <View className="flex-row items-center gap-2">
                  <ChartBarIcon size={19} color="#7C3AED" weight="fill" />
                  <Text className="font-bold text-violet-900 dark:text-violet-100">
                    {t("createPoll")}
                  </Text>
                </View>
                <BottomSheetTextInput
                  value={pollQuestion}
                  onChangeText={setPollQuestion}
                  placeholder={t("pollQuestionPlaceholder")}
                  placeholderTextColor="#9CA3AF"
                  maxLength={240}
                  className="mt-3 rounded-2xl border border-violet-200 bg-white px-4 py-3 text-base text-black dark:border-violet-800 dark:bg-gray-900 dark:text-white"
                />
                <View className="mt-3 gap-2">
                  {pollOptions.map((option, index) => (
                    <View key={index} className="flex-row items-center gap-2">
                      <BottomSheetTextInput
                        value={option}
                        onChangeText={(value) =>
                          setPollOptions((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? value : item,
                            ),
                          )
                        }
                        placeholder={t("pollOptionPlaceholder", {
                          number: index + 1,
                        })}
                        placeholderTextColor="#9CA3AF"
                        maxLength={120}
                        className="flex-1 rounded-2xl border border-violet-200 bg-white px-4 py-3 text-black dark:border-violet-800 dark:bg-gray-900 dark:text-white"
                      />
                      {pollOptions.length > 2 ? (
                        <TouchableOpacity
                          onPress={() =>
                            setPollOptions((current) =>
                              current.filter((_, itemIndex) => itemIndex !== index),
                            )
                          }
                          className="h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-gray-900"
                        >
                          <XIcon size={16} color="#7C3AED" weight="bold" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))}
                </View>
                {pollOptions.length < 4 ? (
                  <TouchableOpacity
                    onPress={() => setPollOptions((current) => [...current, ""])}
                    className="mt-3 flex-row items-center self-start rounded-full bg-violet-100 px-3 py-2 dark:bg-violet-900"
                  >
                    <PlusIcon size={15} color="#7C3AED" weight="bold" />
                    <Text className="ml-1.5 text-sm font-bold text-violet-700 dark:text-violet-200">
                      {t("addPollOption")}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <View className="mt-4 flex-row justify-end gap-2">
                  <TouchableOpacity
                    onPress={() => {
                      setShowPollComposer(false);
                      setPollQuestion("");
                      setPollOptions(["", ""]);
                    }}
                    className="rounded-full px-4 py-2.5"
                  >
                    <Text className="font-bold text-gray-600 dark:text-gray-300">
                      {t("cancel")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={
                      !pollQuestion.trim() ||
                      pollOptions.filter((option) => option.trim()).length < 2 ||
                      creatingPoll
                    }
                    onPress={() => void submitPoll()}
                    className="rounded-full bg-violet-600 px-5 py-2.5"
                    style={{
                      opacity:
                        !pollQuestion.trim() ||
                        pollOptions.filter((option) => option.trim()).length < 2 ||
                        creatingPoll
                          ? 0.45
                          : 1,
                    }}
                  >
                    <Text className="font-bold text-white">
                      {creatingPoll ? t("sending") : t("publishPoll")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {poll ? (
              <View
                className={`${authorNote ? "mt-2" : "mt-4"} rounded-3xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950/30`}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: pollExpanded }}
                  onPress={() => setPollExpanded((current) => !current)}
                  className="flex-row items-center gap-2"
                >
                  <ChartBarIcon size={18} color="#7C3AED" weight="fill" />
                  <Text className="flex-1 text-lg font-bold text-violet-950 dark:text-violet-50">
                    {poll.title}
                  </Text>
                  {pollExpanded ? (
                    <CaretUpIcon size={18} color="#7C3AED" weight="bold" />
                  ) : (
                    <CaretDownIcon size={18} color="#7C3AED" weight="bold" />
                  )}
                </TouchableOpacity>
                {pollExpanded ? (
                  <>
                    <View className="mt-3 gap-2">
                      {poll.options.map((option) => {
                        const percentage = poll.totalVotes
                          ? Math.round((option.votesCount / poll.totalVotes) * 100)
                          : 0;
                        return (
                          <TouchableOpacity
                            key={option.id}
                            disabled={!!poll.closedAt || !!votingOptionId}
                            onPress={() => void selectPollOption(option.id)}
                            className="relative overflow-hidden rounded-2xl border border-violet-200 bg-white px-4 py-3 dark:border-violet-800 dark:bg-gray-900"
                          >
                            <View
                              pointerEvents="none"
                              className="absolute inset-0"
                            >
                              <View
                                className="h-full bg-violet-100 dark:bg-violet-900/60"
                                style={{ width: `${percentage}%` }}
                              />
                            </View>
                            <View className="flex-row items-center justify-between">
                              <Text className={`flex-1 font-bold ${option.isVoted ? "text-violet-700 dark:text-violet-200" : "text-black dark:text-white"}`}>
                                {option.title}
                              </Text>
                              <Text className="ml-3 font-bold text-violet-700 dark:text-violet-200">
                                {percentage}%
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <Text className="mt-3 text-xs font-semibold text-violet-600 dark:text-violet-300">
                      {t("pollVotes", { count: poll.totalVotes })}
                    </Text>
                  </>
                ) : null}
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <SkeletonList variant="comments" count={5} />
          ) : (
            <View className="flex-1 items-center justify-center py-10">
              <Text className="text-center text-base text-gray-400">
                {t("noComments")}
              </Text>

              <Text className="mt-1 text-center text-sm text-gray-400">
                {t("firstComment")}
              </Text>
            </View>
          )
        }
      />
      </AppBottomSheet>

      <AppBottomSheet
        open={showAuthorToolsSheet}
        snapPoints={[authorNote ? "48%" : "34%"]}
        stackBehavior="push"
        onClose={() => setShowAuthorToolsSheet(false)}
      >
        <View
          className="px-5 pt-2"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          <Text className="text-xl font-bold text-black dark:text-white">
            {t("authorTools")}
          </Text>
          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("authorToolsHint")}
          </Text>

          <TouchableOpacity
            onPress={() => {
              setAuthorNoteContent(authorNote?.content ?? "");
              setShowPollComposer(false);
              setShowAuthorNoteComposer(true);
              setShowAuthorToolsSheet(false);
            }}
            className="mt-5 flex-row items-center rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/40"
          >
            <View className="h-11 w-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/60">
              {authorNote ? (
                <NotePencilIcon size={21} color="#D97706" weight="bold" />
              ) : (
                <MegaphoneIcon size={21} color="#D97706" weight="fill" />
              )}
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-bold text-amber-950 dark:text-amber-100">
                {t(authorNote ? "editAuthorNote" : "addAuthorNote")}
              </Text>
              <Text className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
                {t("authorNoteHint")}
              </Text>
            </View>
          </TouchableOpacity>

          {authorNote ? (
            <TouchableOpacity
              onPress={confirmRemoveAuthorNote}
              className="mt-3 flex-row items-center rounded-2xl bg-red-50 p-4 dark:bg-red-950/30"
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/60">
                <TrashIcon size={21} color="#DC2626" weight="bold" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-bold text-red-700 dark:text-red-300">
                  {t("removeAuthorNote")}
                </Text>
                <Text className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                  {t("removeAuthorNoteHint")}
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            disabled={!canCreatePoll}
            onPress={() => {
              setShowAuthorNoteComposer(false);
              setShowPollComposer(true);
              setShowAuthorToolsSheet(false);
            }}
            className="mt-3 flex-row items-center rounded-2xl bg-violet-50 p-4 dark:bg-violet-950/30"
            style={{ opacity: canCreatePoll ? 1 : 0.45 }}
          >
            <View className="h-11 w-11 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/60">
              <ChartBarIcon size={21} color="#7C3AED" weight="fill" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-bold text-violet-950 dark:text-violet-100">
                {t("addPoll")}
              </Text>
              <Text className="mt-0.5 text-xs text-violet-700 dark:text-violet-300">
                {t("pollHint")}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </AppBottomSheet>

      <AppBottomSheet
        open={!!commentActionTarget}
        snapPoints={[
          commentActionCount >= 3
            ? "42%"
            : commentActionCount === 2
              ? "34%"
              : "26%",
        ]}
        stackBehavior="push"
        onClose={() => setCommentActionTarget(null)}
      >
        {commentActionTarget ? (
          <View
            className="px-5 pt-2"
            style={{ paddingBottom: Math.max(insets.bottom, 20) }}
          >
            <Text className="text-xl font-bold text-black dark:text-white">
              {t("commentOptions")}
            </Text>
            <Text
              numberOfLines={1}
              className="mt-1 text-sm text-gray-500 dark:text-gray-400"
            >
              {commentActionTarget.comment.content}
            </Text>

            {commentActionTarget.comment.canPin ? (
              <TouchableOpacity
                onPress={() => {
                  const action = commentActionTarget.pin;
                  setCommentActionTarget(null);
                  requestAnimationFrame(action);
                }}
                className="mt-5 flex-row items-center rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/40"
              >
                <View className="h-11 w-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/60">
                  <PushPinIcon size={21} color="#D97706" weight="fill" />
                </View>
                <Text className="ml-3 flex-1 font-bold text-amber-900 dark:text-amber-200">
                  {t(
                    commentActionTarget.comment.isPinned
                      ? "unpinComment"
                      : "pinComment",
                  )}
                </Text>
              </TouchableOpacity>
            ) : null}

            {commentActionTarget.comment.canDelete &&
            !commentActionTarget.comment.isAuthorNote ? (
              <TouchableOpacity
                onPress={() => {
                  const action = commentActionTarget.edit;
                  setCommentActionTarget(null);
                  requestAnimationFrame(action);
                }}
                className={`${commentActionTarget.comment.canPin ? "mt-3" : "mt-5"} flex-row items-center rounded-2xl bg-gray-100 p-4 dark:bg-gray-800`}
              >
                <View className="h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-gray-700">
                  <NotePencilIcon
                    size={21}
                    color={isDark ? "#FAF9F6" : "#111827"}
                    weight="bold"
                  />
                </View>
                <Text className="ml-3 flex-1 font-bold text-black dark:text-white">
                  {t("editComment")}
                </Text>
              </TouchableOpacity>
            ) : null}

            {commentActionTarget.comment.canDelete ||
            commentActionTarget.comment.canModerate ? (
              <TouchableOpacity
                onPress={() => {
                  const action = commentActionTarget.remove;
                  setCommentActionTarget(null);
                  setTimeout(action, 180);
                }}
                className="mt-3 flex-row items-center rounded-2xl bg-red-50 p-4 dark:bg-red-950/30"
              >
                <View className="h-11 w-11 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/60">
                  <TrashIcon size={21} color="#DC2626" weight="bold" />
                </View>
                <Text className="ml-3 flex-1 font-bold text-red-700 dark:text-red-300">
                  {t("removeComment")}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </AppBottomSheet>
    </>
  );
}
