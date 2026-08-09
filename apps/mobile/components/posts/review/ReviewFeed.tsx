import { Post } from "@findeat/types/post";
import {
  ActivityIndicator,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  View,
  type ViewToken,
} from "react-native";
import ReviewPost from "./ReviewPost";
import ReviewFeedEmptyState from "./ReviewFeedEmptyState";
import { Skeleton, SkeletonPulse } from "@/components/common";
import { useCallback, useEffect, useRef, type ReactElement } from "react";
import { prefetchUpcomingPosts } from "@/lib/imagePrefetch";

type Props = {
  posts: Post[];
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached?: () => void;
  loadingMore?: boolean;
  contentTopInset?: number;
  header?: ReactElement;
  onHeaderVisibilityChange?: (visible: boolean) => void;
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
  preferredPerspectiveUserId?: string;
};

const feedViewabilityConfig = { itemVisiblePercentThreshold: 50 };

export default function ReviewFeed({
  posts,
  refreshing,
  onRefresh,
  onEndReached,
  loadingMore = false,
  contentTopInset = 0,
  header,
  onHeaderVisibilityChange,
  onToggleLike,
  onOpenComments,
  onToggleWantToTry,
  onOpenSharePost,
  onOpenPostOptions,
  loading = false,
  initialIndex = 0,
  preferredPerspectiveUserId,
}: Props) {
  const topSpacing = contentTopInset + (header ? 0 : 12);
  const listRef = useRef<FlatList<Post>>(null);
  const postsRef = useRef(posts);
  const lastScrollOffsetRef = useRef(0);
  const scrollDirectionRef = useRef<"UP" | "DOWN" | null>(null);
  const scrollDistanceRef = useRef(0);
  const headerVisibleRef = useRef(true);

  useEffect(() => {
    if (onHeaderVisibilityChange) return;
    headerVisibleRef.current = true;
    scrollDirectionRef.current = null;
    scrollDistanceRef.current = 0;
  }, [onHeaderVisibilityChange]);

  const setHeaderVisible = useCallback(
    (visible: boolean) => {
      if (headerVisibleRef.current === visible) return;
      headerVisibleRef.current = visible;
      onHeaderVisibilityChange?.(visible);
    },
    [onHeaderVisibilityChange],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = Math.max(0, event.nativeEvent.contentOffset.y);
      const delta = offset - lastScrollOffsetRef.current;
      lastScrollOffsetRef.current = offset;

      if (offset <= 8) {
        scrollDirectionRef.current = null;
        scrollDistanceRef.current = 0;
        setHeaderVisible(true);
        return;
      }
      if (Math.abs(delta) < 0.5) return;

      const direction = delta > 0 ? "DOWN" : "UP";
      if (scrollDirectionRef.current !== direction) {
        scrollDirectionRef.current = direction;
        scrollDistanceRef.current = 0;
      }
      scrollDistanceRef.current += Math.abs(delta);

      if (scrollDistanceRef.current >= 24) {
        setHeaderVisible(direction === "UP");
        scrollDistanceRef.current = 0;
      }
    },
    [setHeaderVisible],
  );
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
      <SkeletonPulse style={{ flex: 1, paddingTop: topSpacing }}>
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
      onScroll={handleScroll}
      scrollEventThrottle={16}
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
        paddingTop: topSpacing,
      }}
      ListHeaderComponent={header}
      ListHeaderComponentStyle={header ? { marginBottom: 12 } : undefined}
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
          preferredPerspectiveUserId={preferredPerspectiveUserId}
        />
      )}
    />
  );
}
