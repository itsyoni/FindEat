import { Post } from "@findeat/types/post";
import {
  memo,
  type ReactElement,
  useCallback,
  useEffect,
  useLayoutEffect,
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
import { useVideoPlayer } from "expo-video";
import ContentPost from "./ContentPost";
import EmptyPostsState from "../EmptyPostsState";
import { Skeleton, SkeletonPulse } from "@/components/common";
import { prefetchPreparedContentPosts } from "@/lib/imagePrefetch";
import { createMediaSuspensionController } from "./mediaSuspensionController";
import { FeedVideoController } from "./feedVideoController";

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
  lightweightInactivePosts?: boolean;
};

const contentViewabilityConfig = { itemVisiblePercentThreshold: 60 };

type PreparedWindow = {
  centerIndex: number;
  direction: -1 | 0 | 1;
};

type PagingMode = "ios-native-paging" | "interval-snap";

function PreparedPagePlaceholder({ height }: { height: number }) {
  return <View style={{ height, backgroundColor: "#0B0B0A" }} />;
}

function schedulePreparedWindowCommit(callback: () => void) {
  const handle = requestAnimationFrame(callback);
  return () => cancelAnimationFrame(handle);
}

function FeedVideoPlayerOwner({ controller }: { controller: FeedVideoController }) {
  const player = useVideoPlayer(null, (videoPlayer) => {
    videoPlayer.timeUpdateEventInterval = 0;
  });

  useLayoutEffect(() => {
    controller.attachPlayer(player);
    return () => controller.detachPlayer(player);
  }, [controller, player]);

  return null;
}

function ContentFeed({
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
  lightweightInactivePosts = false,
}: Props) {
  const [isPinchingMedia, setIsPinchingMedia] = useState(false);
  const [visiblePostIndex, setVisiblePostIndex] = useState(initialIndex);
  const [activePostId, setActivePostId] = useState<string | null>(
    initialPostId ?? posts[initialIndex]?.id ?? null,
  );
  const [preparedWindow, setPreparedWindow] = useState<PreparedWindow>({
    centerIndex: initialIndex,
    direction: 0,
  });
  const listRef = useRef<FlatList<Post>>(null);
  const mediaSuspensionController = useMemo(
    () => createMediaSuspensionController(),
    [],
  );
  const feedVideoController = useMemo(
    () => new FeedVideoController(),
    [],
  );
  const appliedInitialPostIdRef = useRef<string | null>(null);
  const pendingInitialPostIdRef = useRef<string | null>(
    initialPostId ?? posts[initialIndex]?.id ?? null,
  );
  const scrollOffsetRef = useRef(initialIndex * height);
  const requestedNextPageAtCountRef = useRef(0);
  const onEndReachedRef = useRef(onEndReached);
  const cancelPendingPreparationRef = useRef<(() => void) | null>(null);
  const preparationGenerationRef = useRef(0);
  const verticalGestureActiveRef = useRef(false);
  const gestureStartIndexRef = useRef(initialIndex);
  const preparedDirectionRef = useRef<-1 | 0 | 1>(0);
  const gestureScrollOffset = useSharedValue(initialIndex * height);
  const topPullStartX = useSharedValue(0);
  const topPullStartY = useSharedValue(0);
  const topPullStartedAtTop = useSharedValue(false);
  const postsRef = useRef(posts);
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);
  useEffect(() => {
    onEndReachedRef.current = onEndReached;
  }, [onEndReached]);

  const prepareWindowAround = useCallback(
    (index: number, direction: -1 | 0 | 1) => {
      const postCount = postsRef.current.length;
      if (postCount === 0) return;
      const nextCenter = Math.max(0, Math.min(postCount - 1, index));
      prefetchPreparedContentPosts(postsRef.current, nextCenter, direction);
      cancelPendingPreparationRef.current?.();
      const generation = preparationGenerationRef.current + 1;
      preparationGenerationRef.current = generation;
      // Commit on the first frame after native momentum ends instead of waiting
      // for an idle period that a rapid reverse gesture can outrun.
      cancelPendingPreparationRef.current = schedulePreparedWindowCommit(() => {
        cancelPendingPreparationRef.current = null;
        if (
          generation !== preparationGenerationRef.current ||
          verticalGestureActiveRef.current
        ) {
          return;
        }
        setPreparedWindow((current) => {
          if (
            generation !== preparationGenerationRef.current ||
            verticalGestureActiveRef.current
          ) {
            return current;
          }
          if (
            current.centerIndex === nextCenter &&
            current.direction === direction
          ) {
            return current;
          }
          preparedDirectionRef.current = direction;
          return { centerIndex: nextCenter, direction };
        });
      });
    },
    [],
  );

  useEffect(
    () => () => {
      preparationGenerationRef.current += 1;
      cancelPendingPreparationRef.current?.();
      cancelPendingPreparationRef.current = null;
    },
    [],
  );

  useEffect(() => {
    feedVideoController.resume();
    return () => {
      // useVideoPlayer releases the native player after this component
      // unmounts; the controller first removes its persistent subscription.
      feedVideoController.dispose();
    };
  }, [feedVideoController]);

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
    cancelPendingPreparationRef.current?.();
    cancelPendingPreparationRef.current = null;
    preparationGenerationRef.current += 1;
    preparedDirectionRef.current = 0;
    setPreparedWindow({ centerIndex: selectedIndex, direction: 0 });
    prefetchPreparedContentPosts(posts, selectedIndex);

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
      }
    },
    [],
  );

  const handlePageSettled = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const postCount = postsRef.current.length;
      if (postCount === 0) return;
      const index = Math.max(
        0,
        Math.min(
          postCount - 1,
          Math.round(event.nativeEvent.contentOffset.y / height),
        ),
      );
      const post = postsRef.current[index];
      if (!post) return;
      verticalGestureActiveRef.current = false;
      const movement = Math.sign(index - gestureStartIndexRef.current);
      const direction: -1 | 0 | 1 =
        movement === -1 || movement === 1
          ? movement
          : preparedDirectionRef.current;
      setVisiblePostIndex(index);
      setActivePostId(post.id);
      mediaSuspensionController.setSuspended(false);
      prepareWindowAround(index, direction);

      if (
        index >= postCount - 4 &&
        requestedNextPageAtCountRef.current !== postCount
      ) {
        requestedNextPageAtCountRef.current = postCount;
        onEndReachedRef.current?.();
      }
    },
    [
      height,
      mediaSuspensionController,
      prepareWindowAround,
    ],
  );

  const handlePinchStart = useCallback(() => setIsPinchingMedia(true), []);
  const handlePinchEnd = useCallback(() => setIsPinchingMedia(false), []);

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

  const handleScrollBeginDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      verticalGestureActiveRef.current = true;
      preparationGenerationRef.current += 1;
      cancelPendingPreparationRef.current?.();
      cancelPendingPreparationRef.current = null;
      mediaSuspensionController.setSuspended(true);
      const startOffset = event.nativeEvent.contentOffset.y;
      const postCount = postsRef.current.length;
      const gestureStartIndex = Math.max(
        0,
        Math.min(postCount - 1, Math.round(startOffset / height)),
      );
      gestureStartIndexRef.current = gestureStartIndex;
    },
    [height, mediaSuspensionController],
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
    // The pull-down shortcut must not make the native list wait for it to fail.
    // Running both simultaneously keeps one-finger paging attached to the user's
    // finger while still allowing the shortcut to activate at the top.
    () => Gesture.Simultaneous(topPullGesture, Gesture.Native()),
    [topPullGesture],
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
  const pagingMode: PagingMode =
    Platform.OS === "ios" ? "ios-native-paging" : "interval-snap";
  const usesIosNativePaging = hasPosts && pagingMode === "ios-native-paging";

  return (
    <View style={{ flex: 1 }}>
      {active ? (
        <FeedVideoPlayerOwner controller={feedVideoController} />
      ) : null}
      <GestureDetector gesture={feedGesture}>
      <FlatList
        ref={listRef}
        data={posts}
        keyExtractor={(item) => item.id}
        refreshing={nativeRefreshEnabled ? refreshing : false}
        onRefresh={nativeRefreshEnabled ? onRefresh : undefined}
        initialNumToRender={Math.min(posts.length, 3)}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={16}
        windowSize={5}
        removeClippedSubviews={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={contentViewabilityConfig}
        pagingEnabled={usesIosNativePaging}
        snapToInterval={
          hasPosts && !usesIosNativePaging ? height : undefined
        }
        snapToAlignment={usesIosNativePaging ? undefined : "start"}
        disableIntervalMomentum={
          hasPosts && !usesIosNativePaging ? true : undefined
        }
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={hasPosts ? handlePageSettled : undefined}
        onScroll={handleScroll}
        scrollEventThrottle={32}
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
        renderItem={({ item, index }) => {
          const distanceFromPreparedCenter =
            index - preparedWindow.centerIndex;
          const isDirectionalCandidate =
            preparedWindow.direction !== 0 &&
            distanceFromPreparedCenter === preparedWindow.direction * 2;
          if (
            Math.abs(distanceFromPreparedCenter) > 1 &&
            !isDirectionalCandidate
          ) {
            return <PreparedPagePlaceholder height={height} />;
          }

          return (
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
              onPinchStart={handlePinchStart}
              onPinchEnd={handlePinchEnd}
              deferMediaWhenInactive={lightweightInactivePosts}
              enablePreparedCarouselInteraction={
                active && !isDirectionalCandidate
              }
              prepareSoundPlayback={
                active && Math.abs(distanceFromPreparedCenter) <= 1
              }
              mediaSuspensionController={mediaSuspensionController}
              feedVideoController={feedVideoController}
            />
          );
        }}
      />
      </GestureDetector>
    </View>
  );
}

export default memo(ContentFeed);
