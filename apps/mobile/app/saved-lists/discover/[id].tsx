import { CommentsBottomSheet } from "@/components/common";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import Tabs from "@/components/common/Tabs";
import PostOptionsBottomSheet from "@/components/chats/PostOptionsBottomSheet";
import SharePostBottomSheet from "@/components/chats/share/SharePostBottomSheet";
import ContentFeed from "@/components/posts/content/ContentFeed";
import ReviewFeed from "@/components/posts/review/ReviewFeed";
import { useAppTheme } from "@/contexts/ThemeContext";
import {
  updatePostInFeedCache,
  updateRestaurantStatusInFeedCache,
  useAreaFeed,
} from "@/hooks/useFeed";
import { api } from "@/lib/api";
import { AppAlert as Alert } from "@/lib/appAlert";
import type { PlaceListDetail, PostType } from "@findeat/types";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DiscoverListPlacesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation("common");
  const { isDark } = useAppTheme();
  const queryClient = useQueryClient();
  const [list, setList] = useState<PlaceListDetail | null>(null);
  const [activeFeed, setActiveFeed] = useState<PostType>("CONTENT");
  const [feedHeight, setFeedHeight] = useState(0);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [optionsPostId, setOptionsPostId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void api.placeLists.get(id).then(setList).catch((error) => {
      console.error("Could not load list area", error);
    });
  }, [id]);

  const area =
    list?.eventLocationLatitude != null && list.eventLocationLongitude != null
      ? {
          id: list.id,
          latitude: list.eventLocationLatitude,
          longitude: list.eventLocationLongitude,
          radiusKm: 25,
        }
      : null;
  const feed = useAreaFeed(activeFeed, area);
  const posts = useMemo(
    () => feed.data?.pages.flatMap((page) => page.items) ?? [],
    [feed.data],
  );

  async function toggleLike(postId: string, isLiked: boolean) {
    updatePostInFeedCache(queryClient, (post) =>
      post.id === postId
        ? {
            ...post,
            isLiked: !isLiked,
            likesCount: Math.max(0, post.likesCount + (isLiked ? -1 : 1)),
          }
        : post,
    );
    try {
      await api.posts.toggleLike(postId, isLiked);
    } catch {
      await feed.refetch();
    }
  }

  async function toggleWantToTry(postId: string, restaurantId: string, isWantToTry: boolean) {
    try {
      if (isWantToTry) {
        await api.restaurants.removeWantToTry(restaurantId);
        updateRestaurantStatusInFeedCache(queryClient, restaurantId, {
          wantToTry: false,
        });
      } else {
        const status = await api.restaurants.wantToTry(restaurantId, postId);
        updateRestaurantStatusInFeedCache(queryClient, restaurantId, status);
      }
    } catch {
      Alert.alert(t("savePlaceError"));
      await feed.refetch();
    }
  }

  async function deletePost(postId: string) {
    try {
      await api.posts.delete(postId);
      updatePostInFeedCache(queryClient, (post) => (post.id === postId ? null : post));
      return true;
    } catch {
      Alert.alert(t("postDeleteError"));
      return false;
    }
  }

  function updateCount(postId: string, field: "commentsCount" | "sharesCount") {
    updatePostInFeedCache(queryClient, (post) =>
      post.id === postId
        ? { ...post, [field]: (post[field] ?? 0) + 1 }
        : post,
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}>
      <View className="h-14 flex-row items-center px-4">
        <TouchableOpacity onPress={() => router.back()} className="h-11 w-11 items-center justify-center">
          <DirectionalIcon direction="back" variant="arrow" size={24} color={isDark ? "#FAF9F6" : "#171717"} />
        </TouchableOpacity>
        <View className="min-w-0 flex-1 items-center">
          <Text numberOfLines={1} className="text-lg font-bold text-black dark:text-white">
            {t("addPlaces")}
          </Text>
          {list?.eventLocation ? (
            <Text numberOfLines={1} className="text-xs text-gray-500">{list.eventLocation}</Text>
          ) : null}
        </View>
        <View className="h-11 w-11" />
      </View>

      <Tabs
        activeTab={activeFeed}
        onChange={setActiveFeed}
        tabs={[
          { label: t("content"), value: "CONTENT" },
          { label: t("reviews"), value: "REVIEW" },
        ]}
      />

      <View className="flex-1" onLayout={(event) => setFeedHeight(event.nativeEvent.layout.height)}>
        {activeFeed === "CONTENT" ? (
          feedHeight > 0 ? (
            <ContentFeed
              posts={posts}
              height={feedHeight}
              refreshing={feed.isRefetching && !feed.isFetchingNextPage}
              onRefresh={() => void feed.refetch()}
              onEndReached={() => {
                if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
              }}
              loadingMore={feed.isFetchingNextPage}
              loading={feed.isPending || !list}
              onToggleLike={(postId, liked) => void toggleLike(postId, liked)}
              onOpenComments={setSelectedPostId}
              onToggleWantToTry={(postId, restaurantId, saved) => void toggleWantToTry(postId, restaurantId, saved)}
              onDeletePost={(postId) => void deletePost(postId)}
              onOpenSharePost={setSharePostId}
              onOpenPostOptions={setOptionsPostId}
            />
          ) : null
        ) : (
          <ReviewFeed
            posts={posts}
            refreshing={feed.isRefetching && !feed.isFetchingNextPage}
            onRefresh={() => void feed.refetch()}
            onEndReached={() => {
              if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
            }}
            loadingMore={feed.isFetchingNextPage}
            loading={feed.isPending || !list}
            onToggleLike={(postId, liked) => void toggleLike(postId, liked)}
            onOpenComments={setSelectedPostId}
            onToggleWantToTry={(postId, restaurantId, saved) => void toggleWantToTry(postId, restaurantId, saved)}
            onOpenSharePost={setSharePostId}
            onOpenPostOptions={setOptionsPostId}
          />
        )}
      </View>

      <PostOptionsBottomSheet postId={optionsPostId} onClose={() => setOptionsPostId(null)} onDelete={deletePost} />
      <SharePostBottomSheet postId={sharePostId} onClose={() => setSharePostId(null)} onShared={(postId) => updateCount(postId, "sharesCount")} />
      <CommentsBottomSheet postId={selectedPostId} onClose={() => setSelectedPostId(null)} onCommentAdded={(postId) => updateCount(postId, "commentsCount")} />
    </SafeAreaView>
  );
}
