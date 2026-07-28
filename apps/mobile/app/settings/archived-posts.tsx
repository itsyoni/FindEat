import Text from "@/components/common/AppText";
import { Skeleton, SkeletonPulse } from "@/components/common";
import SettingsHeader from "@/components/settings/SettingsHeader";
import useSettingsDirection from "@/components/settings/useSettingsDirection";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";
import type { Post } from "@findeat/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { ArchiveIcon, ArrowCounterClockwiseIcon } from "phosphor-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function archivedPostImage(post: Post) {
  return post.type === "REVIEW"
    ? post.reviewPost?.coverImageUrl
    : post.contentPost?.imageUrl;
}

function archivedPostCaption(post: Post) {
  return post.type === "REVIEW"
    ? post.reviewPost?.summary
    : post.contentPost?.description;
}

function ArchiveSkeleton() {
  return (
    <SkeletonPulse style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
      {Array.from({ length: 5 }).map((_, index) => (
        <View key={index} className="flex-row gap-3 rounded-3xl border border-line bg-white p-3 dark:border-gray-800 dark:bg-gray-950">
          <Skeleton width={92} height={112} radius={18} />
          <View className="flex-1 justify-center gap-3">
            <Skeleton width="38%" height={13} radius={7} />
            <Skeleton width="88%" height={17} radius={8} />
            <Skeleton width="62%" height={13} radius={7} />
            <Skeleton width={94} height={34} radius={12} />
          </View>
        </View>
      ))}
    </SkeletonPulse>
  );
}

export default function ArchivedPostsScreen() {
  const { t, i18n } = useTranslation("settings");
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { rowStyle, textStyle } = useSettingsDirection();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const archive = useQuery({
    queryKey: ["archived-posts"],
    queryFn: () => api.posts.archived(),
  });

  async function restorePost(postId: string) {
    if (restoringId) return;
    try {
      setRestoringId(postId);
      await api.posts.restore(postId);
      queryClient.setQueryData<Post[]>(["archived-posts"], (current = []) =>
        current.filter((post) => post.id !== postId),
      );
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["restaurant-posts"] });
      void queryClient.invalidateQueries({ queryKey: ["restaurant-post-feed"] });
      showToast(t("postRestored"));
    } catch {
      showToast(t("postRestoreError"), { kind: "error" });
    } finally {
      setRestoringId(null);
    }
  }

  const posts = archive.data ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#000" : "#FBFAF8" }}>
      <SettingsHeader title={t("archivedPosts")} />
      {archive.isLoading ? (
        <ArchiveSkeleton />
      ) : archive.isError ? (
        <View className="flex-1 items-center justify-center px-8 pb-20">
          <Text className="text-center text-gray-500">{t("archiveLoadError")}</Text>
          <TouchableOpacity onPress={() => void archive.refetch()} className="mt-4 rounded-2xl bg-black px-5 py-3 dark:bg-white">
            <Text weight="bold" className="text-white dark:text-black">{t("archiveRetry")}</Text>
          </TouchableOpacity>
        </View>
      ) : posts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 pb-20">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
            <ArchiveIcon size={36} color={isDark ? "#FFF" : "#171717"} weight="fill" />
          </View>
          <Text weight="bold" className="mt-5 text-xl text-black dark:text-white">{t("archiveEmpty")}</Text>
          <Text className="mt-2 text-center leading-5 text-gray-500" style={textStyle}>{t("archiveEmptySubtitle")}</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(post) => post.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
          renderItem={({ item }) => {
            const image = archivedPostImage(item);
            const caption = archivedPostCaption(item);
            const archivedDate = new Intl.DateTimeFormat(i18n.language, {
              dateStyle: "medium",
            }).format(new Date(item.archivedAt ?? item.updatedAt));
            const isRestoring = restoringId === item.id;

            return (
              <View className="flex-row overflow-hidden rounded-3xl border border-line bg-white p-3 dark:border-gray-800 dark:bg-gray-950" style={rowStyle}>
                {image ? (
                  <ProgressiveImage source={{ uri: image }} style={{ width: 92, height: 112, borderRadius: 18 }} contentFit="cover" transition={180} />
                ) : (
                  <View className="h-28 w-[92px] items-center justify-center rounded-[18px] bg-gray-100 dark:bg-gray-900">
                    <ArchiveIcon size={25} color="#9CA3AF" weight="fill" />
                  </View>
                )}
                <View className="min-w-0 flex-1 justify-center" style={{ marginStart: 12 }}>
                  <Text weight="bold" className="text-xs uppercase tracking-wide text-orange-500" style={textStyle}>
                    {t(item.type === "REVIEW" ? "reviewPost" : "contentPost")}
                  </Text>
                  <Text numberOfLines={2} weight="bold" className="mt-1 text-base text-black dark:text-white" style={textStyle}>
                    {caption || item.restaurant?.name || item.authorRestaurant?.name}
                  </Text>
                  <Text className="mt-1 text-xs text-gray-500" style={textStyle}>{t("archivedOn", { date: archivedDate })}</Text>
                  <TouchableOpacity
                    disabled={!!restoringId}
                    onPress={() => void restorePost(item.id)}
                    className="mt-3 self-start flex-row items-center rounded-xl bg-black px-3.5 py-2.5 dark:bg-white"
                    style={rowStyle}
                  >
                    {isRestoring ? (
                      <ActivityIndicator size="small" color={isDark ? "#000" : "#FFF"} />
                    ) : (
                      <ArrowCounterClockwiseIcon size={16} color={isDark ? "#000" : "#FFF"} weight="bold" />
                    )}
                    <Text weight="bold" className="text-sm text-white dark:text-black" style={{ marginStart: 7 }}>
                      {t(isRestoring ? "restoringPost" : "restorePost")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
