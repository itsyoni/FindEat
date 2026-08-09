import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";
import type { LinkedPost, Post } from "@findeat/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  LinkBreakIcon,
  LinkSimpleIcon,
  NotePencilIcon,
  PlayIcon,
} from "phosphor-react-native";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { SafeAreaView } from "react-native-safe-area-context";

type Target = LinkedPost | Post;

type ReviewPreviewSource = {
  previewImageUrl?: string | null;
  previewImageUrls?: string[];
  coverImageUrl?: string | null;
  items?: {
    imageUrl?: string | null;
    primaryMedia?: { imageUrl?: string | null } | null;
    media?: { imageUrl?: string | null }[];
    menuItem?: { imageUrl?: string | null } | null;
  }[];
};

function ConnectionPreview({
  candidates,
  fallback,
}: {
  candidates: (string | null | undefined)[];
  fallback: ReactNode;
}) {
  const imageUrls = candidates
    .map((candidate) => candidate?.trim())
    .filter(
      (candidate, index, values): candidate is string =>
        Boolean(candidate) && values.indexOf(candidate) === index,
    );
  const candidateKey = imageUrls.join("|");
  const [failedCandidate, setFailedCandidate] = useState({
    key: candidateKey,
    index: 0,
  });
  const candidateIndex =
    failedCandidate.key === candidateKey ? failedCandidate.index : 0;

  const imageUrl = imageUrls[candidateIndex];
  if (!imageUrl) return fallback;

  return (
    <ProgressiveImage
      key={imageUrl}
      source={{ uri: imageUrl }}
      style={{ width: "100%", height: "100%" }}
      contentFit="cover"
      onError={() =>
        setFailedCandidate({ key: candidateKey, index: candidateIndex + 1 })
      }
    />
  );
}

export default function PostConnectionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { isDark } = useAppTheme();
  const { t } = useTranslation("common");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [changingId, setChangingId] = useState<string | null>(null);
  const connectionQueryKey = ["post-connections", id] as const;
  const {
    data: connectionData,
    isLoading: loading,
    isError,
  } = useQuery({
    queryKey: connectionQueryKey,
    queryFn: async () => {
      const source = await api.posts.get(id);
      const canManageConnections =
        source.canDelete ||
        (source.type === "REVIEW" && source.canContribute === true);
      if (!canManageConnections || !source.restaurantId) {
        throw new Error("Post connections are not available to this user");
      }
      const targetType = source.type === "CONTENT" ? "REVIEW" : "CONTENT";
      const available = await api.posts.linkCandidates(
        source.restaurantId,
        targetType,
      );
      return { post: source, candidates: available };
    },
  });
  const post = connectionData?.post ?? null;
  const candidates = connectionData?.candidates ?? [];

  async function changeConnection(targetId: string, connected: boolean) {
    if (!post || changingId) return;
    try {
      setChangingId(targetId);
      const updated = connected
        ? await api.posts.unlink(post.id, targetId)
        : await api.posts.link(post.id, targetId);
      const nextCandidates = await api.posts.linkCandidates(
        updated.restaurantId!,
        updated.type === "CONTENT" ? "REVIEW" : "CONTENT",
      );
      queryClient.setQueryData(connectionQueryKey, {
        post: updated,
        candidates: nextCandidates,
      });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["restaurant-posts"] });
      showToast(t(connected ? "postsDisconnected" : "postsConnected"));
    } catch (error) {
      console.error("failed to change post connection", error);
      showToast(t("connectionsUpdateError"), { kind: "error" });
    } finally {
      setChangingId(null);
    }
  }

  const linked = (post?.linkedPosts ?? []).filter(
    (target) => post?.canDelete || target.authorId === user?.id,
  );
  const linkedIds = new Set(linked.map((target) => target.id));
  const available = candidates.filter((target) => !linkedIds.has(target.id));

  function renderTarget(target: Target, connected: boolean) {
    const review = target.type === "REVIEW";
    const reviewPost = target.reviewPost as ReviewPreviewSource | null | undefined;
    const imageCandidates = review
      ? [
          ...(reviewPost?.previewImageUrls ?? []),
          reviewPost?.previewImageUrl,
          ...(reviewPost?.items ?? []).flatMap((item) => [
            item.primaryMedia?.imageUrl,
            item.media?.[0]?.imageUrl,
            item.imageUrl,
            item.menuItem?.imageUrl,
          ]),
          reviewPost?.coverImageUrl,
        ]
      : [target.contentPost?.imageUrl];
    const text = review
      ? target.reviewPost?.summary
      : target.contentPost?.caption;

    return (
      <View
        key={target.id}
        className="mb-3 flex-row items-center rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
      >
        <View className="h-16 w-14 items-center justify-center overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
          <ConnectionPreview
            candidates={imageCandidates}
            fallback={
              review ? (
                <NotePencilIcon size={25} color="#9CA3AF" weight="fill" />
              ) : (
                <PlayIcon size={25} color="#9CA3AF" weight="fill" />
              )
            }
          />
        </View>
        <View className="mx-3 flex-1">
          <Text className="font-bold text-black dark:text-white">
            {t(review ? "writtenReview" : "quickPost")}
            {target.reviewPost?.overallRating != null
              ? ` · ${target.reviewPost.overallRating}/10`
              : ""}
          </Text>
          <Text numberOfLines={2} className="mt-1 text-sm text-gray-500">
            {text || t("sameExperience")}
          </Text>
        </View>
        <TouchableOpacity
          disabled={!!changingId}
          onPress={() => void changeConnection(target.id, connected)}
          className={`h-11 min-w-24 flex-row items-center justify-center rounded-xl px-3 ${
            connected ? "bg-gray-100 dark:bg-gray-800" : "bg-black dark:bg-white"
          }`}
        >
          {changingId === target.id ? (
            <ActivityIndicator
              size="small"
              color={
                connected
                  ? isDark
                    ? "#FAF9F6"
                    : "#171717"
                  : isDark
                    ? "#171717"
                    : "#FAF9F6"
              }
            />
          ) : connected ? (
            <LinkBreakIcon size={18} color={isDark ? "#FAF9F6" : "#171717"} weight="bold" />
          ) : (
            <LinkSimpleIcon size={18} color={isDark ? "#171717" : "#FAF9F6"} weight="bold" />
          )}
          {changingId !== target.id ? (
            <Text
              className={`ml-1.5 font-bold ${
                connected ? "text-black dark:text-white" : "text-white dark:text-black"
              }`}
            >
              {t(connected ? "disconnect" : "connect")}
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center border-b border-gray-200 px-4 py-2 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="h-11 w-11 items-center justify-center">
          <DirectionalIcon direction="back" size={24} color={isDark ? "#FAF9F6" : "#171717"} weight="bold" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-bold text-black dark:text-white">
          {t("manageConnections")}
        </Text>
        <View className="w-11" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={isDark ? "#FAF9F6" : "#171717"} />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center font-bold text-black dark:text-white">
            {t("connectionsLoadError")}
          </Text>
          <TouchableOpacity onPress={() => router.back()} className="mt-4 rounded-xl bg-black px-5 py-3 dark:bg-white">
            <Text className="font-bold text-white dark:text-black">{t("back")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <Text className="text-sm leading-5 text-gray-500">
            {t("manageConnectionsHint")}
          </Text>

          {linked.length > 0 ? (
            <View className="mt-6">
              <Text className="mb-3 text-lg font-bold text-black dark:text-white">
                {t("connectedPosts")}
              </Text>
              {linked.map((target) => renderTarget(target, true))}
            </View>
          ) : null}

          <View className="mt-6">
            <Text className="mb-3 text-lg font-bold text-black dark:text-white">
              {t("availableToConnect")}
            </Text>
            {available.length > 0 ? (
              available.map((target) => renderTarget(target, false))
            ) : (
              <View className="items-center rounded-3xl bg-gray-100 px-6 py-10 dark:bg-gray-900">
                <LinkSimpleIcon size={34} color="#9CA3AF" weight="duotone" />
                <Text className="mt-3 text-center font-bold text-black dark:text-white">
                  {t("noPostsToConnect")}
                </Text>
                <Text className="mt-1 text-center text-sm text-gray-500">
                  {t("noPostsToConnectHint")}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
