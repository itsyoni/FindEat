import AppBottomSheet from "@/components/common/AppBottomSheet";
import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import ReportForm from "@/components/moderation/ReportForm";
import type { Post } from "@findeat/types";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import {
  ArchiveIcon,
  NotePencilIcon,
  TrashIcon,
  WarningCircleIcon,
  FlagIcon,
  UserMinusIcon,
  LinkSimpleIcon,
  UsersThreeIcon,
  UserPlusIcon,
  EyeSlashIcon,
  ChatSlashIcon,
  RepeatIcon,
} from "phosphor-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  View,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { useToast } from "@/contexts/ToastContext";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { AppAlert as Alert } from "@/lib/appAlert";
import { useQueryClient } from "@tanstack/react-query";
import { removePostFromAppCache } from "@/hooks/useFeed";

type Props = {
  postId: string | null;
  onClose: () => void;
  onDelete: (postId: string) => boolean | void | Promise<boolean | void>;
  onArchived?: (postId: string) => void | Promise<void>;
};

export default function PostOptionsBottomSheet({
  postId,
  onClose,
  onDelete,
  onArchived,
}: Props) {
  const { t } = useTranslation("common");
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportingRestaurantDispute, setReportingRestaurantDispute] =
    useState(false);
  const [askingToBlock, setAskingToBlock] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [requestingReviewJoin, setRequestingReviewJoin] = useState(false);
  const [reposting, setReposting] = useState(false);
  const [untagging, setUntagging] = useState(false);
  const [privacyUpdating, setPrivacyUpdating] = useState<
    "likes" | "comments" | null
  >(null);
  const [blockError, setBlockError] = useState("");
  const [post, setPost] = useState<Post | null>(null);
  const [failedPostId, setFailedPostId] = useState<string | null>(null);
  const activePost = post?.id === postId ? post : null;
  const hasConnectedReview =
    activePost?.linkedPosts?.some((linkedPost) => linkedPost.type === "REVIEW") ??
    false;
  const hasReviewCollaboration =
    activePost?.type === "REVIEW" &&
    (activePost.reviewParticipants?.length ?? 0) > 0;
  const canRequestReviewJoin =
    activePost?.type === "REVIEW" &&
    !activePost.canDelete &&
    (!activePost.collaborationStatus ||
      activePost.collaborationStatus === "DECLINED");
  const reviewJoinRequestPending =
    activePost?.type === "REVIEW" &&
    activePost.collaborationStatus === "REQUESTED";
  const showViewerReviewCollaborationOption =
    activePost?.type === "REVIEW" &&
    (activePost.canContribute ||
      canRequestReviewJoin ||
      reviewJoinRequestPending);
  const loadingPost = !!postId && !activePost && failedPostId !== postId;

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    void api.posts
      .get(postId)
      .then((nextPost) => {
        if (!cancelled) {
          setPost(nextPost);
          setFailedPostId(null);
        }
      })
      .catch(() => {
        if (!cancelled) setFailedPostId(postId);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  function closeSheet() {
    setConfirmingDelete(false);
    setDeleting(false);
    setArchiving(false);
    setReporting(false);
    setReportingRestaurantDispute(false);
    setAskingToBlock(false);
    setBlocking(false);
    setRequestingReviewJoin(false);
    setReposting(false);
    setUntagging(false);
    setPrivacyUpdating(null);
    setBlockError("");
    onClose();
  }

  async function refreshPostSurfaces() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["feed"] }),
      queryClient.invalidateQueries({ queryKey: ["profile"] }),
      queryClient.invalidateQueries({ queryKey: ["user-profile"] }),
      queryClient.invalidateQueries({ queryKey: ["post"] }),
    ]);
  }

  async function toggleRepost() {
    if (!activePost || reposting) return;
    try {
      setReposting(true);
      const nextPost = activePost.isReposted
        ? await api.posts.removeRepost(activePost.id)
        : await api.posts.repost(activePost.id);
      setPost(nextPost);
      await refreshPostSurfaces();
      showToast(t(activePost.isReposted ? "repostRemoved" : "postReposted"));
    } catch {
      showToast(t("repostError"), { kind: "error" });
    } finally {
      setReposting(false);
    }
  }

  function confirmUntag() {
    if (!activePost || untagging) return;
    Alert.alert(t("untagPostTitle"), t("untagPostDescription"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("untagMe"), style: "destructive", onPress: () => void untagMe() },
    ]);
  }

  async function untagMe() {
    if (!activePost || untagging) return;
    try {
      setUntagging(true);
      await api.posts.untagMe(activePost.id);
      await refreshPostSurfaces();
      closeSheet();
      showToast(t("untaggedFromPost"));
    } catch {
      showToast(t("untagPostError"), { kind: "error" });
    } finally {
      setUntagging(false);
    }
  }

  function confirmArchive() {
    if (!postId || archiving) return;
    Alert.alert(t("archivePostTitle"), t("archivePostDescription"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("archivePost"),
        onPress: () => void archivePost(),
      },
    ]);
  }

  async function archivePost() {
    if (!postId || archiving) return;
    const id = postId;
    try {
      setArchiving(true);
      await api.posts.archive(id);
      removePostFromAppCache(queryClient, id);
      await onArchived?.(id);
      closeSheet();
      showToast(t("postArchived"));
    } catch {
      showToast(t("postArchiveError"), { kind: "error" });
    } finally {
      setArchiving(false);
    }
  }

  async function confirmDelete() {
    if (!postId || deleting) return;

    try {
      setDeleting(true);
      const removed = await onDelete(postId);
      if (removed === false) return;
      closeSheet();
      showToast(t("postRemoved"));
    } catch {
      showToast(t("postRemoveError"), { kind: "error" });
    } finally {
      setDeleting(false);
    }
  }

  function editPost() {
    if (!postId) return;
    const id = postId;
    closeSheet();
    router.push({ pathname: "/posts/edit/[id]", params: { id } });
  }

  function manageConnections() {
    if (!postId) return;
    const id = postId;
    closeSheet();
    router.push({ pathname: "/posts/connections/[id]", params: { id } });
  }

  function manageTags() {
    if (!postId) return;
    const id = postId;
    closeSheet();
    router.push({ pathname: "/posts/tags/[id]", params: { id } });
  }

  function addReviewToContent() {
    if (!activePost?.restaurantId || activePost.type !== "CONTENT") return;
    const coverImageUrl =
      activePost.contentPost?.media?.find(
        (mediaItem) => mediaItem.type === "IMAGE" && !!mediaItem.imageUrl,
      )?.imageUrl ?? activePost.contentPost?.imageUrl;
    const id = activePost.id;
    const restaurantId = activePost.restaurantId;
    closeSheet();
    router.push({
      pathname: "/create/review",
      params: {
        restaurantId,
        linkedPostId: id,
        ...(coverImageUrl ? { coverImageUrl } : {}),
      },
    });
  }

  function manageReviewPeople() {
    if (!postId) return;
    const id = postId;
    closeSheet();
    router.push({ pathname: "/posts/collaborators/[id]", params: { id } });
  }

  function editSharedReviewFeedback() {
    if (!postId) return;
    const id = postId;
    closeSheet();
    router.push({ pathname: "/posts/contribute/[id]", params: { id } });
  }

  async function requestToJoinReview() {
    if (!postId || requestingReviewJoin || !canRequestReviewJoin) return;
    try {
      setRequestingReviewJoin(true);
      await api.posts.requestToJoinReview(postId);
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      closeSheet();
      showToast(t("reviewJoinRequestSent"));
    } catch {
      showToast(t("reviewJoinRequestError"), { kind: "error" });
    } finally {
      setRequestingReviewJoin(false);
    }
  }

  async function updatePostPrivacy(
    setting: "likes" | "comments",
    value: boolean,
  ) {
    if (!postId || privacyUpdating) return;
    setPrivacyUpdating(setting);
    try {
      const updated = await api.posts.updateInteractionPrivacy(
        postId,
        setting === "likes"
          ? { hideLikeCount: value }
          : { commentsDisabled: value },
      );
      setPost(updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["feed"] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["post", postId] }),
      ]);
    } catch {
      showToast(t("postPrivacyUpdateError"), { kind: "error" });
    } finally {
      setPrivacyUpdating(null);
    }
  }

  function finishReport() {
    if (reportingRestaurantDispute) {
      closeSheet();
      return;
    }
    if (activePost?.authorId && activePost.author && !activePost.canDelete) {
      setReporting(false);
      setAskingToBlock(true);
      return;
    }
    closeSheet();
  }

  async function blockPostAuthor() {
    if (!activePost?.authorId || blocking) return;
    try {
      setBlocking(true);
      setBlockError("");
      await api.users.block(activePost.authorId);
      closeSheet();
    } catch {
      setBlockError(t("blockAfterReportError"));
      setBlocking(false);
    }
  }

  return (
    <AppBottomSheet
      open={!!postId}
      snapPoints={[
        reporting
          ? "68%"
          : askingToBlock
            ? "48%"
            : activePost?.canDelete
              ? Platform.OS === "android"
                ? "94%"
                : activePost.type === "REVIEW"
                  ? "92%"
                  : "84%"
              : showViewerReviewCollaborationOption
                ? activePost?.canContribute && Platform.OS === "android"
                  ? "72%"
                  : "48%"
                : activePost?.canRepost
                  ? "58%"
                  : "34%",
      ]}
      onClose={closeSheet}
    >
      <BottomSheetScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 20,
          paddingHorizontal: 16,
          paddingTop: 4,
        }}
        showsVerticalScrollIndicator={false}
      >
        {(reporting || reportingRestaurantDispute) && postId ? (
          <ReportForm
            targetType="POST"
            targetId={postId}
            fixedReason={
              reportingRestaurantDispute ? "WRONG_RESTAURANT" : undefined
            }
            reportingRestaurantId={
              reportingRestaurantDispute
                ? (activePost?.restaurantId ?? undefined)
                : undefined
            }
            onCancel={() => {
              setReporting(false);
              setReportingRestaurantDispute(false);
            }}
            onDone={finishReport}
            doneLabel={
              activePost?.authorId && activePost.author
                ? t("continue")
                : undefined
            }
          />
        ) : askingToBlock && activePost?.author ? (
          <View className="flex-1 items-center px-2">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/70">
                <UserMinusIcon size={27} color="#EF4444" weight="fill" />
              </View>
            </View>
            <Text className="mt-4 text-center text-2xl font-bold text-black dark:text-white">
              {t("blockAfterReportTitle", {
                username: activePost.author.username,
              })}
            </Text>
            <Text className="mt-2 max-w-sm px-3 text-center text-sm leading-5 text-gray-500 dark:text-gray-400">
              {t("blockAfterReportDescription")}
            </Text>

            {blockError ? (
              <Text className="mt-3 text-center text-sm text-red-500">
                {blockError}
              </Text>
            ) : null}

            <View className="mt-auto w-full flex-row gap-3">
              <TouchableOpacity
                disabled={blocking}
                onPress={closeSheet}
                className="flex-1 items-center rounded-2xl border border-gray-200 bg-white py-4 dark:border-gray-700 dark:bg-gray-900"
              >
                <Text className="font-bold text-black dark:text-white">
                  {t("notNow")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={blocking}
                onPress={() => void blockPostAuthor()}
                className="flex-1 items-center rounded-2xl bg-red-500 py-4"
              >
                {blocking ? (
                  <ActivityIndicator color="#FAF9F6" />
                ) : (
                  <Text className="font-bold text-white">
                    {t("blockUser")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : confirmingDelete ? (
          <View className="flex-1 items-center px-2">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/70">
                <WarningCircleIcon size={28} color="#EF4444" weight="fill" />
              </View>
            </View>
            <Text className="mt-4 text-center text-2xl font-bold text-black dark:text-white">
              {t("deletePostTitle")}
            </Text>
            <Text className="mt-2 max-w-sm px-3 text-center text-sm leading-5 text-gray-500 dark:text-gray-400">
              {t("deletePostDescription")}
            </Text>

            <View className="mt-auto w-full flex-row gap-3">
              <TouchableOpacity
                disabled={deleting}
                onPress={() => setConfirmingDelete(false)}
                activeOpacity={0.75}
                className="flex-1 items-center rounded-2xl border border-gray-200 bg-white py-4 dark:border-gray-700 dark:bg-gray-900"
              >
                <Text className="font-bold text-black dark:text-white">
                  {t("cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={deleting}
                onPress={() => void confirmDelete()}
                activeOpacity={0.8}
                className="flex-1 items-center rounded-2xl bg-red-500 py-4"
              >
                {deleting ? (
                  <ActivityIndicator color="#FAF9F6" />
                ) : (
                  <Text className="font-bold text-white">
                    {t("deletePost")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : loadingPost ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={isDark ? "#FAF9F6" : "#0B0B0A"} />
          </View>
        ) : (
          <View className="flex-1">
            <View className="items-center px-4 pb-4">
              <Text className="text-xl font-bold text-black dark:text-white">
                {t("postOptions")}
              </Text>
              <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t(activePost?.canDelete ? "managePost" : "reportPostHint")}
              </Text>
            </View>

            {activePost?.canDelete ? (
              <>
              <TouchableOpacity
              activeOpacity={0.72}
              accessibilityRole="button"
              className="mb-3 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4 py-3.5 dark:border-gray-700 dark:bg-gray-900"
              onPress={editPost}
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-950/40">
                <NotePencilIcon size={21} color="#FF5B35" weight="fill" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-black dark:text-white">
                  {t("editPost")}
                </Text>
                <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {t("editPostHint")}
                </Text>
              </View>
              <DirectionalIcon
                direction="forward"
                size={18}
                color={isDark ? "#6B7280" : "#9CA3AF"}
                weight="bold"
              />
            </TouchableOpacity>

            <View className="mb-3 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <View className="flex-row items-center px-4 py-3.5">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <EyeSlashIcon size={21} color={isDark ? "#D1D5DB" : "#4B5563"} weight="fill" />
                </View>
                <View className="ml-3 min-w-0 flex-1">
                  <Text className="text-base font-bold text-black dark:text-white">
                    {t("hideLikeCount")}
                  </Text>
                  <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {t("hideLikeCountHint")}
                  </Text>
                </View>
                {privacyUpdating === "likes" ? (
                  <ActivityIndicator color="#FF5B35" />
                ) : (
                  <Switch
                    value={activePost.hideLikeCount}
                    onValueChange={(value) => void updatePostPrivacy("likes", value)}
                    trackColor={{ false: "#A09D97", true: "#FF5B35" }}
                  />
                )}
              </View>
              <View className="h-px bg-gray-100 dark:bg-gray-800" />
              <View className="flex-row items-center px-4 py-3.5">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <ChatSlashIcon size={21} color={isDark ? "#D1D5DB" : "#4B5563"} weight="fill" />
                </View>
                <View className="ml-3 min-w-0 flex-1">
                  <Text className="text-base font-bold text-black dark:text-white">
                    {t("turnOffComments")}
                  </Text>
                  <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {t("turnOffCommentsHint")}
                  </Text>
                </View>
                {privacyUpdating === "comments" ? (
                  <ActivityIndicator color="#FF5B35" />
                ) : (
                  <Switch
                    value={activePost.commentsDisabled}
                    onValueChange={(value) => void updatePostPrivacy("comments", value)}
                    trackColor={{ false: "#A09D97", true: "#FF5B35" }}
                  />
                )}
              </View>
            </View>

            {activePost.type === "REVIEW" ? (
              <>
              <TouchableOpacity
                activeOpacity={0.72}
                accessibilityRole="button"
                className="mb-3 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4 py-3.5 dark:border-gray-700 dark:bg-gray-900"
                onPress={manageReviewPeople}
              >
                <View className="h-11 w-11 items-center justify-center rounded-full bg-yellow-50 dark:bg-yellow-950/40">
                  <UsersThreeIcon size={21} color="#D4A72C" weight="fill" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-bold text-black dark:text-white">
                    {t("manageReviewPeople")}
                  </Text>
                  <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {t("manageReviewPeopleHint")}
                  </Text>
                </View>
                <DirectionalIcon
                  direction="forward"
                  size={18}
                  color={isDark ? "#6B7280" : "#9CA3AF"}
                  weight="bold"
                />
              </TouchableOpacity>
              {hasReviewCollaboration ? (
                <TouchableOpacity
                  activeOpacity={0.72}
                  accessibilityRole="button"
                  className="mb-3 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4 py-3.5 dark:border-gray-700 dark:bg-gray-900"
                  onPress={editSharedReviewFeedback}
                >
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-yellow-50 dark:bg-yellow-950/40">
                    <NotePencilIcon size={21} color="#D4A72C" weight="fill" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-bold text-black dark:text-white">
                      {t("manageSharedReviewFeedback")}
                    </Text>
                    <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                      {t("manageSharedReviewFeedbackHint")}
                    </Text>
                  </View>
                  <DirectionalIcon
                    direction="forward"
                    size={18}
                    color={isDark ? "#6B7280" : "#9CA3AF"}
                    weight="bold"
                  />
                </TouchableOpacity>
              ) : null}
              </>
            ) : null}

            {activePost.type === "CONTENT" ? (
              <TouchableOpacity
                activeOpacity={0.72}
                accessibilityRole="button"
                className="mb-3 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4 py-3.5 dark:border-gray-700 dark:bg-gray-900"
                onPress={manageTags}
              >
                <View className="h-11 w-11 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-950/40">
                  <UserPlusIcon size={21} color="#FF5B35" weight="fill" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-bold text-black dark:text-white">
                    {t("manageTags")}
                  </Text>
                  <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {t("manageTagsHint")}
                  </Text>
                </View>
                <DirectionalIcon direction="forward" size={18} color={isDark ? "#6B7280" : "#9CA3AF"} weight="bold" />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              disabled={archiving}
              activeOpacity={0.72}
              accessibilityRole="button"
              className="mb-3 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4 py-3.5 dark:border-gray-700 dark:bg-gray-900"
              onPress={confirmArchive}
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/40">
                {archiving ? (
                  <ActivityIndicator color="#3B82F6" />
                ) : (
                  <ArchiveIcon size={21} color="#3B82F6" weight="fill" />
                )}
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-black dark:text-white">
                  {t("archivePost")}
                </Text>
                <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {t("archivePostHint")}
                </Text>
              </View>
              <DirectionalIcon
                direction="forward"
                size={18}
                color={isDark ? "#6B7280" : "#9CA3AF"}
                weight="bold"
              />
            </TouchableOpacity>

            {activePost.type === "CONTENT" && !hasConnectedReview ? (
              <TouchableOpacity
                activeOpacity={0.72}
                accessibilityRole="button"
                className="mb-3 flex-row items-center rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 dark:border-amber-900 dark:bg-amber-950/30"
                onPress={addReviewToContent}
              >
                <View className="h-11 w-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/60">
                  <NotePencilIcon size={21} color="#D4A72C" weight="fill" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-bold text-black dark:text-white">
                    {t("addReviewToPost")}
                  </Text>
                  <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {t("addReviewToPostHint")}
                  </Text>
                </View>
                <DirectionalIcon
                  direction="forward"
                  size={18}
                  color={isDark ? "#6B7280" : "#9CA3AF"}
                  weight="bold"
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.72}
                accessibilityRole="button"
                className="mb-3 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4 py-3.5 dark:border-gray-700 dark:bg-gray-900"
                onPress={manageConnections}
              >
                <View className="h-11 w-11 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/40">
                  <LinkSimpleIcon size={21} color="#D4A72C" weight="bold" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-bold text-black dark:text-white">
                    {t("manageConnections")}
                  </Text>
                  <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {t("manageConnectionsOptionHint")}
                  </Text>
                </View>
                <DirectionalIcon
                  direction="forward"
                  size={18}
                  color={isDark ? "#6B7280" : "#9CA3AF"}
                  weight="bold"
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.72}
              accessibilityRole="button"
              className="flex-row items-center rounded-2xl border border-gray-200 bg-white px-4 py-3.5 dark:border-gray-700 dark:bg-gray-900"
              onPress={() => setConfirmingDelete(true)}
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40">
                <TrashIcon size={21} color="#EF4444" weight="fill" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-black dark:text-white">
                  {t("deletePost")}
                </Text>
                <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {t("deletePostHint")}
                </Text>
              </View>
              <DirectionalIcon
                direction="forward"
                size={18}
                color={isDark ? "#6B7280" : "#9CA3AF"}
                weight="bold"
              />
            </TouchableOpacity>
              </>
            ) : (
              <>
              {activePost?.type === "CONTENT" && activePost.canRepost ? (
                <>
                  <TouchableOpacity
                    disabled={reposting}
                    activeOpacity={0.72}
                    accessibilityRole="button"
                    className="mb-3 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4 py-3.5 dark:border-gray-700 dark:bg-gray-900"
                    onPress={() => void toggleRepost()}
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-950/40">
                      {reposting ? <ActivityIndicator color="#FF5B35" /> : <RepeatIcon size={21} color="#FF5B35" weight="bold" />}
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-base font-bold text-black dark:text-white">
                        {t(activePost.isReposted ? "removeRepost" : "repost")}
                      </Text>
                      <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                        {t(activePost.isReposted ? "removeRepostHint" : "repostHint")}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={untagging}
                    activeOpacity={0.72}
                    accessibilityRole="button"
                    className="mb-3 flex-row items-center rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5 dark:border-red-950 dark:bg-red-950/30"
                    onPress={confirmUntag}
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-red-950/60">
                      {untagging ? <ActivityIndicator color="#EF4444" /> : <UserMinusIcon size={21} color="#EF4444" weight="fill" />}
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-base font-bold text-red-500">{t("untagMe")}</Text>
                      <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{t("untagMeHint")}</Text>
                    </View>
                  </TouchableOpacity>
                </>
              ) : null}
              {activePost?.type === "REVIEW" && activePost.canContribute ? (
                <>
                  <TouchableOpacity
                    activeOpacity={0.72}
                    accessibilityRole="button"
                    className="mb-3 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4 py-3.5 dark:border-gray-700 dark:bg-gray-900"
                    onPress={editSharedReviewFeedback}
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-yellow-50 dark:bg-yellow-950/40">
                      <NotePencilIcon size={21} color="#D4A72C" weight="fill" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-base font-bold text-black dark:text-white">
                        {t("editSharedReviewFeedback")}
                      </Text>
                      <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                        {t("editSharedReviewFeedbackHint")}
                      </Text>
                    </View>
                    <DirectionalIcon
                      direction="forward"
                      size={18}
                      color={isDark ? "#6B7280" : "#9CA3AF"}
                      weight="bold"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.72}
                    accessibilityRole="button"
                    className="mb-3 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4 py-3.5 dark:border-gray-700 dark:bg-gray-900"
                    onPress={manageConnections}
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/40">
                      <LinkSimpleIcon size={21} color="#D4A72C" weight="bold" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-base font-bold text-black dark:text-white">
                        {t("manageConnections")}
                      </Text>
                      <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                        {t("manageConnectionsOptionHint")}
                      </Text>
                    </View>
                    <DirectionalIcon
                      direction="forward"
                      size={18}
                      color={isDark ? "#6B7280" : "#9CA3AF"}
                      weight="bold"
                    />
                  </TouchableOpacity>
                </>
              ) : null}
              {canRequestReviewJoin || reviewJoinRequestPending ? (
                <TouchableOpacity
                  disabled={requestingReviewJoin || reviewJoinRequestPending}
                  activeOpacity={0.72}
                  accessibilityRole="button"
                  className="mb-3 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4 py-3.5 dark:border-gray-700 dark:bg-gray-900"
                  onPress={() => void requestToJoinReview()}
                >
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-yellow-50 dark:bg-yellow-950/40">
                    {requestingReviewJoin ? (
                      <ActivityIndicator color="#D4A72C" />
                    ) : (
                      <UserPlusIcon size={21} color="#D4A72C" weight="fill" />
                    )}
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-bold text-black dark:text-white">
                      {t(
                        reviewJoinRequestPending
                          ? "reviewJoinRequestPending"
                          : "askAuthorToJoin",
                      )}
                    </Text>
                    <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                      {t(
                        reviewJoinRequestPending
                          ? "reviewJoinRequestPendingHint"
                          : "askAuthorToJoinHint",
                      )}
                    </Text>
                  </View>
                  {!reviewJoinRequestPending ? (
                    <DirectionalIcon
                      direction="forward"
                      size={18}
                      color={isDark ? "#6B7280" : "#9CA3AF"}
                      weight="bold"
                    />
                  ) : null}
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                activeOpacity={0.72}
                accessibilityRole="button"
                className="flex-row items-center rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5 dark:border-red-950 dark:bg-red-950/30"
                onPress={() => setReporting(true)}
              >
                <View className="h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-red-950/60">
                  <FlagIcon size={21} color="#EF4444" weight="fill" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-bold text-red-500">
                    {t("reportPost")}
                  </Text>
                  <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {t("reportPostHint")}
                  </Text>
                </View>
                <DirectionalIcon direction="forward" size={18} color="#EF4444" weight="bold" />
              </TouchableOpacity>
              {activePost?.canDisputeRestaurantAssociation ? (
                <TouchableOpacity
                  activeOpacity={0.72}
                  accessibilityRole="button"
                  className="mt-3 flex-row items-center rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 dark:border-amber-900 dark:bg-amber-950/30"
                  onPress={() => setReportingRestaurantDispute(true)}
                >
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-amber-950/60">
                    <WarningCircleIcon size={21} color="#D6A92D" weight="fill" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-bold text-amber-800 dark:text-amber-300">
                      {t("wrongRestaurantAssociation")}
                    </Text>
                    <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                      {t("wrongRestaurantAssociationHint")}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : null}
              </>
            )}

            <TouchableOpacity
              onPress={closeSheet}
              activeOpacity={0.75}
              className="mt-3 items-center rounded-2xl bg-gray-100 py-4 dark:bg-gray-800"
            >
              <Text className="font-bold text-black dark:text-white">
                {t("cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheetScrollView>
    </AppBottomSheet>
  );
}
