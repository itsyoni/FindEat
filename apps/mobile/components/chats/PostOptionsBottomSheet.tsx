import AppBottomSheet from "@/components/common/AppBottomSheet";
import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import ReportForm from "@/components/moderation/ReportForm";
import type { Post } from "@findeat/types";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import {
  ArchiveIcon,
  NotePencilIcon,
  TrashIcon,
  WarningCircleIcon,
  FlagIcon,
  UserMinusIcon,
  LinkSimpleIcon,
  UsersThreeIcon,
} from "phosphor-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
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
  const [askingToBlock, setAskingToBlock] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [blockError, setBlockError] = useState("");
  const [post, setPost] = useState<Post | null>(null);
  const [failedPostId, setFailedPostId] = useState<string | null>(null);
  const activePost = post?.id === postId ? post : null;
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
    setAskingToBlock(false);
    setBlocking(false);
    setBlockError("");
    onClose();
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

  function manageReviewPeople() {
    if (!postId) return;
    const id = postId;
    closeSheet();
    router.push({ pathname: "/posts/collaborators/[id]", params: { id } });
  }

  function finishReport() {
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
              ? activePost.type === "REVIEW"
                ? "78%"
                : "67%"
              : "34%",
      ]}
      onClose={closeSheet}
    >
      <BottomSheetView className="flex-1 px-4 pb-5 pt-1">
        {reporting && postId ? (
          <ReportForm
            targetType="POST"
            targetId={postId}
            onCancel={() => setReporting(false)}
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

            {activePost.type === "REVIEW" ? (
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
              <DirectionalIcon direction="forward" size={18} color={isDark ? "#6B7280" : "#9CA3AF"} weight="bold" />
            </TouchableOpacity>

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
      </BottomSheetView>
    </AppBottomSheet>
  );
}
