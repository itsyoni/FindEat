import { Skeleton, SkeletonPulse } from "@/components/common";
import Text from "@/components/common/AppText";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import Tabs from "@/components/common/Tabs";
import SettingsHeader from "@/components/settings/SettingsHeader";
import useSettingsDirection from "@/components/settings/useSettingsDirection";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";
import type { Post, Snap } from "@findeat/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  PlayCircleIcon,
} from "phosphor-react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ArchiveTab = "posts" | "snaps";
type SnapSection = { title: string; data: Snap[][] };

function archivedPostImage(post: Post) {
  return post.type === "REVIEW"
    ? post.reviewPost?.coverImageUrl
    : post.contentPost?.imageUrl;
}

function archivedPostCaption(post: Post) {
  return post.type === "REVIEW"
    ? post.reviewPost?.summary
    : post.contentPost?.caption;
}

function archiveDate(value: string) {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function groupSnapsByDate(snaps: Snap[]): SnapSection[] {
  const groups = new Map<string, Snap[]>();

  [...snaps]
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    )
    .forEach((snap) => {
      const title = archiveDate(snap.createdAt);
      const group = groups.get(title) ?? [];
      group.push(snap);
      groups.set(title, group);
    });

  return [...groups.entries()].map(([title, items]) => ({
    title,
    data: Array.from({ length: Math.ceil(items.length / 3) }, (_, index) =>
      items.slice(index * 3, index * 3 + 3),
    ),
  }));
}

function ArchiveSkeleton() {
  return (
    <SkeletonPulse style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
      {Array.from({ length: 5 }).map((_, index) => (
        <View
          key={index}
          className="flex-row gap-3 rounded-3xl border border-line bg-white p-3 dark:border-gray-800 dark:bg-gray-950"
        >
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

function SnapArchiveSkeleton({ itemWidth }: { itemWidth: number }) {
  return (
    <SkeletonPulse style={{ paddingHorizontal: 16, paddingTop: 18, gap: 14 }}>
      {Array.from({ length: 2 }).map((_, sectionIndex) => (
        <View key={sectionIndex} style={{ gap: 10 }}>
          <Skeleton width={104} height={20} radius={8} />
          <View style={{ flexDirection: "row", gap: 6 }}>
            {Array.from({ length: 3 }).map((__, index) => (
              <Skeleton
                key={index}
                width={itemWidth}
                height={itemWidth * (16 / 9)}
                radius={18}
              />
            ))}
          </View>
        </View>
      ))}
    </SkeletonPulse>
  );
}

function SnapVideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri, useCaching: true }, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.muted = true;
  });

  return (
    <VideoView
      player={player}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      allowsPictureInPicture={false}
      surfaceType="textureView"
    />
  );
}

function SnapArchiveTile({ snap, width }: { snap: Snap; width: number }) {
  return (
    <View
      className="overflow-hidden rounded-[18px] bg-gray-100 dark:bg-gray-900"
      style={{ width, aspectRatio: 9 / 16 }}
    >
      {snap.imageUrl ? (
        <ProgressiveImage
          source={{ uri: snap.imageUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={160}
        />
      ) : snap.videoUrl ? (
        <SnapVideoPreview uri={snap.videoUrl} />
      ) : (
        <View className="flex-1 items-center justify-center">
          <ArchiveIcon size={25} color="#9CA3AF" weight="fill" />
        </View>
      )}
      {snap.videoUrl ? (
        <View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center bg-black/10"
        >
          <PlayCircleIcon size={31} color="#FFFFFF" weight="fill" />
        </View>
      ) : null}
    </View>
  );
}

export default function ArchiveScreen() {
  const { t, i18n } = useTranslation("settings");
  const { width: windowWidth } = useWindowDimensions();
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { rowStyle, textStyle } = useSettingsDirection();
  const [activeTab, setActiveTab] = useState<ArchiveTab>("posts");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const snapWidth = Math.max(88, (windowWidth - 44) / 3);

  const postArchive = useQuery({
    queryKey: ["archived-posts"],
    queryFn: () => api.posts.archived(),
    enabled: activeTab === "posts",
  });
  const snapArchive = useQuery({
    queryKey: ["archived-snaps"],
    queryFn: () => api.snaps.archived(),
    enabled: activeTab === "snaps",
  });

  const snapSections = useMemo(
    () => groupSnapsByDate(snapArchive.data ?? []),
    [snapArchive.data],
  );

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
      void queryClient.invalidateQueries({
        queryKey: ["restaurant-post-feed"],
      });
      showToast(t("postRestored"));
    } catch {
      showToast(t("postRestoreError"), { kind: "error" });
    } finally {
      setRestoringId(null);
    }
  }

  const posts = postArchive.data ?? [];

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      <SettingsHeader title={t("archive")} />
      <Tabs<ArchiveTab>
        tabs={[
          { label: t("postsArchive"), value: "posts" },
          { label: t("snapsArchive"), value: "snaps" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "posts" ? (
        postArchive.isLoading ? (
          <ArchiveSkeleton />
        ) : postArchive.isError ? (
          <View className="flex-1 items-center justify-center px-8 pb-20">
            <Text className="text-center text-gray-500">
              {t("archiveLoadError")}
            </Text>
            <TouchableOpacity
              onPress={() => void postArchive.refetch()}
              className="mt-4 rounded-2xl bg-black px-5 py-3 dark:bg-white"
            >
              <Text weight="bold" className="text-white dark:text-black">
                {t("archiveRetry")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : posts.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8 pb-20">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
              <ArchiveIcon
                size={36}
                color={isDark ? "#FAF9F6" : "#171717"}
                weight="fill"
              />
            </View>
            <Text
              weight="bold"
              className="mt-5 text-xl text-black dark:text-white"
            >
              {t("archiveEmpty")}
            </Text>
            <Text
              className="mt-2 text-center leading-5 text-gray-500"
              style={textStyle}
            >
              {t("archiveEmptySubtitle")}
            </Text>
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
                <View
                  className="flex-row overflow-hidden rounded-3xl border border-line bg-white p-3 dark:border-gray-800 dark:bg-gray-950"
                  style={rowStyle}
                >
                  {image ? (
                    <ProgressiveImage
                      source={{ uri: image }}
                      style={{ width: 92, height: 112, borderRadius: 18 }}
                      contentFit="cover"
                      transition={180}
                    />
                  ) : (
                    <View className="h-28 w-[92px] items-center justify-center rounded-[18px] bg-gray-100 dark:bg-gray-900">
                      <ArchiveIcon size={25} color="#9CA3AF" weight="fill" />
                    </View>
                  )}
                  <View
                    className="min-w-0 flex-1 justify-center"
                    style={{ marginStart: 12 }}
                  >
                    <Text
                      weight="bold"
                      className="text-xs uppercase tracking-wide text-orange-500"
                      style={textStyle}
                    >
                      {t(item.type === "REVIEW" ? "reviewPost" : "contentPost")}
                    </Text>
                    <Text
                      numberOfLines={2}
                      weight="bold"
                      className="mt-1 text-base text-black dark:text-white"
                      style={textStyle}
                    >
                      {caption ||
                        item.restaurant?.name ||
                        item.authorRestaurant?.name}
                    </Text>
                    <Text
                      className="mt-1 text-xs text-gray-500"
                      style={textStyle}
                    >
                      {t("archivedOn", { date: archivedDate })}
                    </Text>
                    <TouchableOpacity
                      disabled={!!restoringId}
                      onPress={() => void restorePost(item.id)}
                      className="mt-3 self-start flex-row items-center rounded-xl bg-black px-3.5 py-2.5 dark:bg-white"
                      style={rowStyle}
                    >
                      {isRestoring ? (
                        <ActivityIndicator
                          size="small"
                          color={isDark ? "#0B0B0A" : "#FAF9F6"}
                        />
                      ) : (
                        <ArrowCounterClockwiseIcon
                          size={16}
                          color={isDark ? "#0B0B0A" : "#FAF9F6"}
                          weight="bold"
                        />
                      )}
                      <Text
                        weight="bold"
                        className="text-sm text-white dark:text-black"
                        style={{ marginStart: 7 }}
                      >
                        {t(isRestoring ? "restoringPost" : "restorePost")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )
      ) : snapArchive.isLoading ? (
        <SnapArchiveSkeleton itemWidth={snapWidth} />
      ) : snapArchive.isError ? (
        <View className="flex-1 items-center justify-center px-8 pb-20">
          <Text className="text-center text-gray-500">
            {t("snapArchiveLoadError")}
          </Text>
          <TouchableOpacity
            onPress={() => void snapArchive.refetch()}
            className="mt-4 rounded-2xl bg-black px-5 py-3 dark:bg-white"
          >
            <Text weight="bold" className="text-white dark:text-black">
              {t("archiveRetry")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : snapSections.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 pb-20">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
            <ArchiveIcon
              size={36}
              color={isDark ? "#FAF9F6" : "#171717"}
              weight="fill"
            />
          </View>
          <Text
            weight="bold"
            className="mt-5 text-xl text-black dark:text-white"
          >
            {t("snapArchiveEmpty")}
          </Text>
          <Text
            className="mt-2 text-center leading-5 text-gray-500"
            style={textStyle}
          >
            {t("snapArchiveEmptySubtitle")}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={snapSections}
          keyExtractor={(row) => row.map((snap) => snap.id).join(":")}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          renderSectionHeader={({ section }) => (
            <Text
              weight="bold"
              className="pb-3 pt-2 text-xl text-black dark:text-white"
              style={textStyle}
            >
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
              {item.map((snap) => (
                <SnapArchiveTile key={snap.id} snap={snap} width={snapWidth} />
              ))}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
