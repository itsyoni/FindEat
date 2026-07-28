import { Post } from "@findeat/types/post";
import {
  ActivityIndicator,
  FlatList,
  View,
  type ViewToken,
} from "react-native";
import ReviewPost from "./ReviewPost";
import ReviewFeedEmptyState from "./ReviewFeedEmptyState";
import { Skeleton, SkeletonPulse } from "@/components/common";
import { useCallback, useEffect, useRef } from "react";
import { prefetchUpcomingPosts } from "@/lib/imagePrefetch";

type Props = {
  posts: Post[];
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached?: () => void;
  loadingMore?: boolean;
  contentTopInset?: number;
  onToggleLike: (postId: string, isLiked: boolean) => void;
  onOpenComments: (postId: string) => void;
  onOpenSharePost: (postId: string) => void;
  onOpenPostOptions: (postId: string) => void;
  onToggleWantToTry: (
    postId: string,
    restaurantId: string,
    isWantToTry: boolean,
  ) => void;
  loading?: boolean;
  initialIndex?: number;
};

const feedViewabilityConfig = { itemVisiblePercentThreshold: 50 };

export default function ReviewFeed({
  posts,
  refreshing,
  onRefresh,
  onEndReached,
  loadingMore = false,
  contentTopInset = 0,
  onToggleLike,
  onOpenComments,
  onToggleWantToTry,
  onOpenSharePost,
  onOpenPostOptions,
  loading = false,
  initialIndex = 0,
}: Props) {
  const listRef = useRef<FlatList<Post>>(null);
  const postsRef = useRef(posts);
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<Post>[] }) => {
      const index = viewableItems.find(
        (item) => item.isViewable && typeof item.index === "number",
      )?.index;
      if (typeof index === "number") {
        prefetchUpcomingPosts(postsRef.current, index);
      }
    },
    [],
  );
  if (loading) {
    return (
      <SkeletonPulse style={{ flex: 1, paddingTop: contentTopInset + 12 }}>
        <View className="mb-4 bg-white dark:bg-black">
          <View className="flex-row items-center gap-3 px-4 py-3">
            <Skeleton width={44} height={44} circle />
            <View className="flex-1 gap-2"><Skeleton width="45%" height={14} radius={7} /><Skeleton width="32%" height={10} radius={5} /></View>
            <Skeleton width={28} height={28} circle />
          </View>
          <Skeleton height={280} radius={0} />
          <View className="flex-row justify-around px-4 py-4">
            {[0, 1, 2, 3].map((item) => <View key={item} className="items-center gap-2"><Skeleton width={44} height={30} radius={10} /><Skeleton width={38} height={9} radius={5} /></View>)}
          </View>
          <View className="gap-2 px-4 pb-5"><Skeleton width="76%" height={13} radius={6} /><Skeleton width="55%" height={13} radius={6} /></View>
        </View>
      </SkeletonPulse>
    );
  }
  return (
    <FlatList
      ref={listRef}
      className="bg-canvas dark:bg-black"
      style={{ flex: 1 }}
      data={posts}
      keyExtractor={(item) => item.id}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      initialNumToRender={3}
      maxToRenderPerBatch={3}
      windowSize={5}
      removeClippedSubviews
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={feedViewabilityConfig}
      initialScrollIndex={initialIndex > 0 ? initialIndex : undefined}
      onScrollToIndexFailed={({ index, averageItemLength }) => {
        listRef.current?.scrollToOffset({
          offset: Math.max(0, averageItemLength * index),
          animated: false,
        });
        requestAnimationFrame(() => {
          listRef.current?.scrollToIndex({ index, animated: false });
        });
      }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: contentTopInset + 12,
      }}
      ListEmptyComponent={
        <View style={{ flex: 1, minHeight: 520 }}>
          <ReviewFeedEmptyState />
        </View>
      }
      ListFooterComponent={
        loadingMore ? (
          <View className="items-center py-6">
            <ActivityIndicator />
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <ReviewPost
          post={item}
          onToggleLike={onToggleLike}
          onOpenComments={onOpenComments}
          onToggleWantToTry={onToggleWantToTry}
          onOpenSharePost={onOpenSharePost}
          onOpenPostOptions={onOpenPostOptions}
        />
      )}
    />
  );
}
