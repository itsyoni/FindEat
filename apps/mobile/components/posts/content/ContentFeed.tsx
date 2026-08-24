import { Post } from "@findeat/types/post";
import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Platform,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";
import ContentPost from "./ContentPost";
import EmptyPostsState from "../EmptyPostsState";
import { Skeleton, SkeletonPulse } from "@/components/common";
import { prefetchUpcomingPosts } from "@/lib/imagePrefetch";

type Props = {
  posts: Post[];
  height: number;
  contentTopInset?: number;
  controlsTopInset?: number;
  bottomAuthorBarHeight?: number;
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached?: () => void;
  loadingMore?: boolean;
  onToggleLike: (postId: string, isLiked: boolean) => void;
  onOpenComments: (postId: string) => void;
  onDeletePost: (postId: string) => void;
  onOpenSharePost: (postId: string) => void;
  onOpenPostOptions: (postId: string) => void;
  onToggleWantToTry: (
    postId: string,
    restaurantId: string,
    isWantToTry: boolean,
  ) => void;
  preventTopOverscroll?: boolean;
  feedScrollEnabled?: boolean;
  nativeRefreshEnabled?: boolean;
  onPullDownAtTop?: () => void;
  onScrollOffsetChange?: (offset: number) => void;
  initialIndex?: number;
  initialPostId?: string;
  loading?: boolean;
  emptyComponent?: ReactElement | null;
  active?: boolean;
  useExternalBookmarkHandler?: boolean;
  externalSavedRestaurantIds?: ReadonlySet<string>;
};

const contentViewabilityConfig = { itemVisiblePercentThreshold: 60 };
export default function ContentFeed({
  posts,
  height,
  contentTopInset = 0,
  controlsTopInset = 0,
  bottomAuthorBarHeight = 0,
  refreshing,
  onRefresh,
  onEndReached,
  onToggleLike,
  onOpenComments,
  onToggleWantToTry,
  onDeletePost,
  initialIndex = 0,
  initialPostId,
  onOpenSharePost,
  onOpenPostOptions,
  preventTopOverscroll = false,
  feedScrollEnabled = true,
  nativeRefreshEnabled = true,
  onPullDownAtTop,
  onScrollOffsetChange,
  loading = false,
  emptyComponent,
  active = true,
  useExternalBookmarkHandler = false,
  externalSavedRestaurantIds,
}: Props) {
  const [isPinchingMedia, setIsPinchingMedia] = useState(false);
  const [visiblePostIndex, setVisiblePostIndex] = useState(initialIndex);
  const [activePostId, setActivePostId] = useState<string | null>(
    initialPostId ?? posts[initialIndex]?.id ?? null,
  );
  const listRef = useRef<FlatList<Post>>(null);
  const appliedInitialPostIdRef = useRef<string | null>(null);
  const pendingInitialPostIdRef = useRef<string | null>(
    initialPostId ?? posts[initialIndex]?.id ?? null,
  );
  const scrollOffsetRef = useRef(initialIndex * height);
  const dragStartRef = useRef({ index: initialIndex, offset: initialIndex * height });
  const gestureScrollOffset = useSharedValue(initialIndex * height);
  const topPullStartX = useSharedValue(0);
  const topPullStartY = useSharedValue(0);
  const topPullStartedAtTop = useSharedValue(false);
  const postsRef = useRef(posts);
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    const selectedIndex = initialPostId
      ? posts.findIndex((post) => post.id === initialPostId)
      : initialIndex;
    const initialPost = posts[selectedIndex];
    if (!initialPost || selectedIndex < 0) return;
    if (appliedInitialPostIdRef.current === initialPost.id) return;
    appliedInitialPostIdRef.current = initialPost.id;
    pendingInitialPostIdRef.current = initialPost.id;
    setActivePostId(initialPost.id);
    setVisiblePostIndex(selectedIndex);

    const scrollToSelectedPost = () => {
      const offset = selectedIndex * height;
      listRef.current?.scrollToOffset({ offset, animated: false });
      scrollOffsetRef.current = offset;
      gestureScrollOffset.set(offset);
    };
    const frame = requestAnimationFrame(scrollToSelectedPost);
    return () => cancelAnimationFrame(frame);
  }, [gestureScrollOffset, height, initialIndex, initialPostId, posts]);
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<Post>[] }) => {
      const visibleItem = viewableItems.find(
        (item) => item.isViewable && typeof item.index === "number",
      );
      const index = visibleItem?.index;
      const visiblePostId = visibleItem?.item?.id;
      const pendingInitialPostId = pendingInitialPostIdRef.current;

      // FlatList can briefly report the first rendered row before it has
      // applied initialScrollIndex. Keep the selected profile post active
      // until that post is actually visible so its video is not paused.
      if (pendingInitialPostId && visiblePostId !== pendingInitialPostId) return;

      if (typeof index === "number" && visiblePostId) {
        pendingInitialPostIdRef.current = null;
        setVisiblePostIndex(index);
        setActivePostId(visiblePostId);
        prefetchUpcomingPosts(postsRef.current, index);
      }
    },
    [],
  );

  const handleScrollBeginDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Platform.OS !== "android") return;
      const offset = Math.max(0, event.nativeEvent.contentOffset.y);
      dragStartRef.current = {
        index: Math.max(
          0,
          Math.min(postsRef.current.length - 1, Math.round(offset / height)),
        ),
        offset,
      };
    },
    [height],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const rawOffset = event.nativeEvent.contentOffset.y;
      scrollOffsetRef.current = Math.max(
        0,
        rawOffset,
      );
      gestureScrollOffset.set(scrollOffsetRef.current);
      onScrollOffsetChange?.(scrollOffsetRef.current);
    },
    [gestureScrollOffset, onScrollOffsetChange],
  );

  const topPullGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(feedScrollEnabled && Boolean(onPullDownAtTop))
        .manualActivation(true)
        .maxPointers(1)
        .onTouchesDown((event) => {
          const touch = event.allTouches[0] ?? event.changedTouches[0];
          if (!touch) return;
          topPullStartX.set(touch.absoluteX);
          topPullStartY.set(touch.absoluteY);
          topPullStartedAtTop.set(gestureScrollOffset.get() <= 48);
        })
        .onTouchesMove((event, manager) => {
          const touch = event.allTouches[0] ?? event.changedTouches[0];
          if (!touch) return;
          const distanceX = touch.absoluteX - topPullStartX.get();
          const distanceY = touch.absoluteY - topPullStartY.get();
          if (Math.abs(distanceX) < 12 && Math.abs(distanceY) < 12) return;
          if (
            !topPullStartedAtTop.get() ||
            distanceY <= 0 ||
            Math.abs(distanceY) <= Math.abs(distanceX)
          ) {
            manager.fail();
            return;
          }
          manager.activate();
        })
        .onEnd((event) => {
          if (event.translationY >= 12 && onPullDownAtTop) {
            runOnJS(onPullDownAtTop)();
          }
        }),
    [
      feedScrollEnabled,
      gestureScrollOffset,
      onPullDownAtTop,
      topPullStartedAtTop,
      topPullStartX,
      topPullStartY,
    ],
  );
  const feedGesture = useMemo(
    () => Gesture.Exclusive(topPullGesture, Gesture.Native()),
    [topPullGesture],
  );

  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Platform.OS !== "android") return;
      const offset = Math.max(0, event.nativeEvent.contentOffset.y);
      const delta = offset - dragStartRef.current.offset;
      const velocity = event.nativeEvent.velocity?.y ?? 0;
      if (dragStartRef.current.index === 0 && delta < 0) return;

      const shouldChangePost =
        Math.abs(delta) >= Math.min(72, height * 0.1) ||
        Math.abs(velocity) >= 0.15;
      const direction = delta !== 0 ? Math.sign(delta) : Math.sign(velocity);
      const targetIndex = shouldChangePost
        ? Math.max(
            0,
            Math.min(
              postsRef.current.length - 1,
              dragStartRef.current.index + direction,
            ),
          )
        : dragStartRef.current.index;

      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({
          offset: targetIndex * height,
          animated: true,
        });
      });
    },
    [height],
  );

  if (loading) {
    return (
      <SkeletonPulse style={{ height }}>
        <View className="flex-row items-center gap-3 px-4 py-3">
          <Skeleton width={44} height={44} circle />
          <View className="flex-1 gap-2">
            <Skeleton width="42%" height={14} radius={7} />
            <Skeleton width="30%" height={10} radius={5} />
          </View>
          <Skeleton width={28} height={28} circle />
        </View>
        <Skeleton height={Math.max(320, height - contentTopInset - 210)} radius={0} />
        <View className="flex-row gap-5 px-4 py-4">
          <Skeleton width={28} height={28} circle />
          <Skeleton width={28} height={28} circle />
          <Skeleton width={28} height={28} circle />
          <Skeleton width={28} height={28} circle style={{ marginLeft: "auto" }} />
        </View>
        <View className="gap-2 px-4">
          <Skeleton width="72%" height={12} radius={6} />
          <Skeleton width="48%" height={12} radius={6} />
        </View>
      </SkeletonPulse>
    );
  }

  const lockTopOverscroll = preventTopOverscroll && visiblePostIndex === 0;
  const hasPosts = posts.length > 0;

  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={feedGesture}>
      <FlatList
        ref={listRef}
        data={posts}
        keyExtractor={(item) => item.id}
        refreshing={nativeRefreshEnabled ? refreshing : false}
        onRefresh={nativeRefreshEnabled ? onRefresh : undefined}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        initialNumToRender={Math.max(
          2,
          Math.min(posts.length, initialIndex + 1),
        )}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={contentViewabilityConfig}
        pagingEnabled={hasPosts && Platform.OS !== "android"}
        snapToInterval={hasPosts && Platform.OS === "android" ? height : undefined}
        snapToAlignment="start"
        disableIntervalMomentum={hasPosts && Platform.OS === "android"}
        onScrollBeginDrag={hasPosts ? handleScrollBeginDrag : undefined}
        onScrollEndDrag={hasPosts ? handleScrollEndDrag : undefined}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        scrollEnabled={feedScrollEnabled && !isPinchingMedia}
        bounces={!lockTopOverscroll}
        alwaysBounceVertical={!lockTopOverscroll}
        overScrollMode={lockTopOverscroll ? "never" : "auto"}
        showsVerticalScrollIndicator={false}
        decelerationRate={hasPosts ? "fast" : "normal"}
        initialScrollIndex={initialIndex}
        onScrollToIndexFailed={({ index }) => {
          requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({
              offset: Math.max(0, index * height),
              animated: false,
            });
          });
        }}
        contentContainerStyle={{
          flexGrow: 1,
        }}
        ListEmptyComponent={emptyComponent ?? <EmptyPostsState type="CONTENT" />}
        getItemLayout={(_, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
        renderItem={({ item, index }) => (
          <ContentPost
            post={item}
            height={height}
            isActive={active && item.id === activePostId}
            contentTopInset={contentTopInset}
            controlsTopInset={controlsTopInset}
            bottomAuthorBarHeight={bottomAuthorBarHeight}
            onToggleLike={onToggleLike}
            onOpenComments={onOpenComments}
            onToggleWantToTry={onToggleWantToTry}
            useExternalBookmarkHandler={useExternalBookmarkHandler}
            savedToExternalList={
              !!item.restaurant?.id &&
              externalSavedRestaurantIds?.has(item.restaurant.id)
            }
            onOpenSharePost={onOpenSharePost}
            onOpenPostOptions={onOpenPostOptions}
            onPinchStart={() => setIsPinchingMedia(true)}
            onPinchEnd={() => setIsPinchingMedia(false)}
          />
        )}
      />
      </GestureDetector>
    </View>
  );
}
