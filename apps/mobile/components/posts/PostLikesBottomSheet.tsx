import AppBottomSheet from "@/components/common/AppBottomSheet";
import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import { api } from "@/lib/api";
import type { UserSummary } from "@findeat/types";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { userDisplayName, usernameLabel } from "@/lib/userIdentity";

type Props = {
  postId: string;
  open: boolean;
  onClose: () => void;
};

export default function PostLikesBottomSheet({ postId, open, onClose }: Props) {
  if (!open) return null;
  return <PresentedPostLikesBottomSheet postId={postId} onClose={onClose} />;
}

function PresentedPostLikesBottomSheet({
  postId,
  onClose,
}: Omit<Props, "open">) {
  const { t, i18n } = useTranslation("common");
  const isRtl = i18n.dir() === "rtl";
  const rtlTextStyle = isRtl
    ? ({ textAlign: "right", writingDirection: "rtl" } as const)
    : undefined;
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const page = await api.posts.likes(postId);
      setUsers(page.items);
      setNextCursor(page.nextCursor);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    let active = true;
    api.posts
      .likes(postId)
      .then((page) => {
        if (!active) return;
        setUsers(page.items);
        setNextCursor(page.nextCursor);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [postId]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await api.posts.likes(postId, nextCursor);
      setUsers((current) => {
        const knownIds = new Set(current.map((user) => user.id));
        return [
          ...current,
          ...page.items.filter((user) => !knownIds.has(user.id)),
        ];
      });
      setNextCursor(page.nextCursor);
    } catch {
      setFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }

  function openProfile(userId: string) {
    onClose();
    router.push({ pathname: "/(users)/[id]", params: { id: userId } });
  }

  return (
    <AppBottomSheet open onClose={onClose} snapPoints={["55%", "85%"]}>
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        <Text
          style={isRtl ? { ...rtlTextStyle, width: "100%" } : undefined}
          className="mb-4 text-xl font-bold text-[#171716] dark:text-[#F7F6F2]"
        >
          {t("likedBy")}
        </Text>

        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#FF5B35" />
          </View>
        ) : failed && users.length === 0 ? (
          <View className="items-center py-10">
            <Text className="text-gray-500 dark:text-gray-400">
              {t("likesLoadError")}
            </Text>
            <TouchableOpacity
              className="mt-4 rounded-full bg-[#EEEAE2] px-5 py-2.5 dark:bg-gray-800"
              onPress={() => void loadInitial()}
            >
              <Text className="font-bold text-[#171716] dark:text-[#F7F6F2]">
                {t("retry")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : users.length === 0 ? (
          <Text className="py-10 text-center text-gray-500 dark:text-gray-400">
            {t("noLikesYet")}
          </Text>
        ) : (
          <View className="gap-1">
            {users.map((user) => (
              <TouchableOpacity
                key={user.id}
                activeOpacity={0.7}
                className="flex-row items-center rounded-2xl px-1 py-2.5"
                style={isRtl ? { flexDirection: "row-reverse" } : undefined}
                onPress={() => openProfile(user.id)}
              >
                <Avatar
                  uri={user.avatarUrl}
                  thumbnailUrl={user.avatarThumbnailUrl}
                  username={user.username}
                  userId={user.id}
                  size={44}
                  showSnapIndicator={false}
                />
                <View
                  className="min-w-0 flex-1"
                  style={isRtl ? { marginRight: 12 } : { marginLeft: 12 }}
                >
                  <Text
                    numberOfLines={1}
                    style={rtlTextStyle}
                    className="font-bold text-[#171716] dark:text-[#F7F6F2]"
                  >
                    {userDisplayName(user)}
                  </Text>
                  {user.displayName?.trim() ? (
                    <Text
                      numberOfLines={1}
                      style={rtlTextStyle}
                      className="mt-0.5 text-xs text-gray-500 dark:text-gray-400"
                    >
                      {usernameLabel(user.username)}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}

            {nextCursor ? (
              <TouchableOpacity
                disabled={loadingMore}
                className="mt-2 items-center rounded-full bg-[#EEEAE2] py-3 dark:bg-gray-800"
                onPress={() => void loadMore()}
              >
                {loadingMore ? (
                  <ActivityIndicator color="#FF5B35" />
                ) : (
                  <Text className="font-bold text-[#171716] dark:text-[#F7F6F2]">
                    {t("loadMore")}
                  </Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </BottomSheetScrollView>
    </AppBottomSheet>
  );
}
