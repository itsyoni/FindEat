import { AppAlert as Alert } from "@/lib/appAlert";
import PostOptionsBottomSheet from "@/components/chats/PostOptionsBottomSheet";
import SharePostBottomSheet from "@/components/chats/share/SharePostBottomSheet";
import { CommentsBottomSheet } from "@/components/common";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import ContentFeedList from "@/components/posts/content/ContentFeed";
import ReviewFeed from "@/components/posts/review/ReviewFeed";
import { useAppTheme } from "@/contexts/ThemeContext";
import { removePostFromAppCache } from "@/hooks/useFeed";
import { useRestaurantPostFeed } from "@/hooks/useRestaurantPostFeed";
import { api } from "@/lib/api";
import type { RestaurantPostSection } from "@findeat/types";
import { useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Dimensions, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { BOTTOM_TAB_BAR_BASE_HEIGHT } from "@/constants/layout";

const { height } = Dimensions.get("window");

export default function RestaurantPostFeedScreen() {
  const { restaurantId, section: sectionParam, postId } =
    useLocalSearchParams<{
      restaurantId: string;
      section: RestaurantPostSection;
      postId: string;
    }>();
  const section: RestaurantPostSection =
    sectionParam === "COMMUNITY" || sectionParam === "REVIEWS"
      ? sectionParam
      : "OFFICIAL";
  const isReviewFeed = section === "REVIEWS";
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const feed = useRestaurantPostFeed(restaurantId, section, postId);
  const standaloneBottomBarHeight = Math.max(
    BOTTOM_TAB_BAR_BASE_HEIGHT,
    BOTTOM_TAB_BAR_BASE_HEIGHT + insets.bottom,
  );
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [optionsPostId, setOptionsPostId] = useState<string | null>(null);

  const posts = useMemo(
    () => feed.data?.pages.flatMap((page) => page.items) ?? [],
    [feed.data],
  );
  const initialIndex = useMemo(
    () => Math.max(posts.findIndex((post) => post.id === postId), 0),
    [postId, posts],
  );

  async function refresh() {
    await feed.refetch();
  }

  async function toggleLike(targetPostId: string, isLiked: boolean) {
    await api.posts.toggleLike(targetPostId, isLiked);
    await refresh();
  }

  async function toggleWantToTry(
    targetPostId: string,
    targetRestaurantId: string,
    isWantToTry: boolean,
  ) {
    await api.restaurants.toggleWantToTry(
      targetRestaurantId,
      isWantToTry,
      targetPostId,
    );
    await refresh();
  }

  async function deletePost(targetPostId: string) {
    try {
      await api.posts.delete(targetPostId);
      removePostFromAppCache(queryClient, targetPostId);
      setOptionsPostId(null);
      await refresh();
    } catch (error) {
      console.error("failed to delete restaurant feed post", error);
      Alert.alert("Error", "Could not delete post");
      return false;
    }
  }

  const backButton = (
    <TouchableOpacity
      className={`h-11 w-11 items-center justify-center rounded-full ${
        isReviewFeed
          ? "bg-white/90 dark:bg-black/80"
          : "bg-black/50"
      }`}
      onPress={() => router.back()}
    >
      <DirectionalIcon
        direction="back"
        size={24}
        color={isReviewFeed && !isDark ? "#171717" : "#FAF9F6"}
        weight="bold"
      />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}>
      <Stack.Screen options={{ headerShown: false }} />
      {!isReviewFeed ? <StatusBar style="light" /> : null}
      <SafeAreaView
        edges={["top"]}
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          paddingLeft: 16,
          paddingTop: 8,
        }}
      >
        {backButton}
      </SafeAreaView>

      {isReviewFeed ? (
        <ReviewFeed
          posts={posts}
          loading={feed.isPending}
          initialIndex={initialIndex}
          contentTopInset={insets.top + 52}
          refreshing={feed.isRefetching && !feed.isFetchingNextPage}
          onRefresh={refresh}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) {
              void feed.fetchNextPage();
            }
          }}
          loadingMore={feed.isFetchingNextPage}
          onToggleLike={toggleLike}
          onOpenComments={setCommentsPostId}
          onToggleWantToTry={toggleWantToTry}
          onOpenSharePost={setSharePostId}
          onOpenPostOptions={setOptionsPostId}
        />
      ) : (
        <ContentFeedList
          posts={posts}
          loading={feed.isPending}
          initialIndex={initialIndex}
          height={height}
          bottomAuthorBarHeight={standaloneBottomBarHeight}
          contentTopInset={0}
          refreshing={feed.isRefetching && !feed.isFetchingNextPage}
          onRefresh={refresh}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) {
              void feed.fetchNextPage();
            }
          }}
          loadingMore={feed.isFetchingNextPage}
          onToggleLike={toggleLike}
          onOpenComments={setCommentsPostId}
          onDeletePost={deletePost}
          onToggleWantToTry={toggleWantToTry}
          onOpenSharePost={setSharePostId}
          onOpenPostOptions={setOptionsPostId}
        />
      )}

      <PostOptionsBottomSheet
        postId={optionsPostId}
        onClose={() => setOptionsPostId(null)}
        onDelete={deletePost}
        onArchived={() => refresh()}
      />
      <SharePostBottomSheet
        postId={sharePostId}
        onClose={() => setSharePostId(null)}
        onShared={() => void refresh()}
      />
      <CommentsBottomSheet
        postId={commentsPostId}
        onClose={() => setCommentsPostId(null)}
        onCommentAdded={() => void refresh()}
      />
    </View>
  );
}
