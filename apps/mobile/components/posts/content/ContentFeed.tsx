import { Post } from "@findeat/types/post";
import {
  memo,
  Profiler,
  type ReactElement,
  type ProfilerOnRenderCallback,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Text as NativeText,
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
import {
  contentFeedDiagnosticMode,
  contentFeedDiagnosticsEnabled,
  contentFeedPerfNow,
  logContentFeedPerf,
} from "@/lib/contentFeedDiagnostics";

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
  diagnosticLabel?: string;
  lightweightInactivePosts?: boolean;
};

const contentViewabilityConfig = { itemVisiblePercentThreshold: 60 };

type DiagnosticScrollSession = {
  id: number;
  active: boolean;
  startedAt: number;
  startOffset: number;
  gestureStartIndex: number;
  rawTargetIndex: number | null;
  scrollEventCount: number;
  lastScrollEventAt: number;
  maxScrollEventGapMs: number;
  maxScrollHandlerMs: number;
  maxEventLoopStallMs: number;
  lastAnimationFrameAt: number;
  maxAnimationFrameGapMs: number;
};

function DiagnosticPlaceholderPost({
  height,
  index,
}: {
  height: number;
  index: number;
}) {
  return (
    <View
      style={{
        height,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: index % 2 === 0 ? "#171717" : "#242424",
      }}
    >
      <NativeText style={{ color: "#FAF9F6", fontSize: 18, fontWeight: "700" }}>
        Diagnostic placeholder {index + 1}
      </NativeText>
    </View>
  );
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
  diagnosticLabel,
  lightweightInactivePosts = false,
}: Props) {
  const diagnosticsEnabled =
    contentFeedDiagnosticsEnabled && Boolean(diagnosticLabel);
  const renderDiagnosticPlaceholders =
    diagnosticsEnabled && contentFeedDiagnosticMode === "placeholder";
  const [isPinchingMedia, setIsPinchingMedia] = useState(false);
  const [mediaUpdatesSuspended, setMediaUpdatesSuspended] = useState(false);
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
  const requestedNextPageAtCountRef = useRef(0);
  const onEndReachedRef = useRef(onEndReached);
  const diagnosticSessionSequenceRef = useRef(0);
  const diagnosticScrollSessionRef = useRef<DiagnosticScrollSession | null>(
    null,
  );
  const diagnosticAnimationFrameRef = useRef<number | null>(null);
  const diagnosticProfilerWindowRef = useRef({
    startedAt: contentFeedPerfNow(),
    commits: 0,
    totalDurationMs: 0,
    maxDurationMs: 0,
  });
  const diagnosticInputSnapshotRef = useRef<Record<string, unknown> | null>(
    null,
  );
  const diagnosticFeedCommitCountRef = useRef(0);
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

  useEffect(() => {
    if (!diagnosticsEnabled) return;
    diagnosticFeedCommitCountRef.current += 1;
    const nextSnapshot: Record<string, unknown> = {
      posts,
      height,
      active,
      feedScrollEnabled,
      refreshing,
      activePostId,
      visiblePostIndex,
      isPinchingMedia,
      mediaUpdatesSuspended,
      onRefresh,
      onEndReached,
      onToggleLike,
      onOpenComments,
      onDeletePost,
      onOpenSharePost,
      onOpenPostOptions,
      onToggleWantToTry,
      onPullDownAtTop,
      onScrollOffsetChange,
      lightweightInactivePosts,
    };
    const previousSnapshot = diagnosticInputSnapshotRef.current;
    const changedInputs = previousSnapshot
      ? Object.keys(nextSnapshot).filter(
          (key) => previousSnapshot[key] !== nextSnapshot[key],
        )
      : ["initial-mount"];
    diagnosticInputSnapshotRef.current = nextSnapshot;
    logContentFeedPerf("feed-react-commit", {
      feed: diagnosticLabel,
      commit: diagnosticFeedCommitCountRef.current,
      changedInputs,
      postCount: posts.length,
    });
  });

  useEffect(() => {
    if (!diagnosticsEnabled || !diagnosticLabel) return;
    logContentFeedPerf("feed-mounted", {
      feed: diagnosticLabel,
      mode: contentFeedDiagnosticMode,
      height,
      postCount: postsRef.current.length,
      initialIndex,
    });

    let expectedTickAt = contentFeedPerfNow() + 250;
    let lastProfilerFlushAt = contentFeedPerfNow();
    const timer = setInterval(() => {
      const now = contentFeedPerfNow();
      const eventLoopStallMs = Math.max(0, now - expectedTickAt);
      expectedTickAt = now + 250;
      const session = diagnosticScrollSessionRef.current;
      if (session?.active) {
        session.maxEventLoopStallMs = Math.max(
          session.maxEventLoopStallMs,
          eventLoopStallMs,
        );
      }

      if (now - lastProfilerFlushAt < 1_000) return;
      lastProfilerFlushAt = now;
      const profilerWindow = diagnosticProfilerWindowRef.current;
      if (profilerWindow.commits > 0) {
        logContentFeedPerf("react-commit-window", {
          feed: diagnosticLabel,
          windowMs: Math.round(now - profilerWindow.startedAt),
          commits: profilerWindow.commits,
          totalDurationMs: Number(profilerWindow.totalDurationMs.toFixed(1)),
          maxDurationMs: Number(profilerWindow.maxDurationMs.toFixed(1)),
          whileScrolling: Boolean(session?.active),
        });
      }
      diagnosticProfilerWindowRef.current = {
        startedAt: now,
        commits: 0,
        totalDurationMs: 0,
        maxDurationMs: 0,
      };
    }, 250);

    return () => {
      clearInterval(timer);
      if (diagnosticAnimationFrameRef.current != null) {
        cancelAnimationFrame(diagnosticAnimationFrameRef.current);
      }
      logContentFeedPerf("feed-unmounted", { feed: diagnosticLabel });
    };
  }, [diagnosticLabel, diagnosticsEnabled, height, initialIndex]);

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
      const callbackStartedAt = contentFeedPerfNow();
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
        if (!renderDiagnosticPlaceholders) {
          prefetchUpcomingPosts(postsRef.current, index);
        }
        if (diagnosticsEnabled) {
          logContentFeedPerf("viewability-change", {
            feed: diagnosticLabel,
            index,
            postId: visiblePostId,
            callbackDurationMs: Number(
              (contentFeedPerfNow() - callbackStartedAt).toFixed(2),
            ),
            viewablePostIds: viewableItems
              .filter((item) => item.isViewable)
              .map((item) => item.item.id),
            prefetchEnabled: !renderDiagnosticPlaceholders,
          });
        }
      }
    },
    [diagnosticLabel, diagnosticsEnabled, renderDiagnosticPlaceholders],
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
      const settledAt = contentFeedPerfNow();
      const settledOffset = event.nativeEvent.contentOffset.y;
      const session = diagnosticScrollSessionRef.current;
      if (diagnosticsEnabled && session?.active) {
        const rawSettledIndex = Math.round(settledOffset / height);
        const pagesAdvanced = index - session.gestureStartIndex;
        logContentFeedPerf("page-settled", {
          feed: diagnosticLabel,
          sessionId: session.id,
          index,
          gestureStartIndex: session.gestureStartIndex,
          rawTargetIndex: session.rawTargetIndex,
          rawSettledIndex,
          finalClampedIndex: index,
          pagesAdvanced,
          postId: post.id,
          totalSwipeMs: Math.round(settledAt - session.startedAt),
          scrollEventCount: session.scrollEventCount,
          maxScrollEventGapMs: Number(session.maxScrollEventGapMs.toFixed(1)),
          maxScrollHandlerMs: Number(session.maxScrollHandlerMs.toFixed(2)),
          maxEventLoopStallMs: Number(session.maxEventLoopStallMs.toFixed(1)),
          maxAnimationFrameGapMs: Number(
            session.maxAnimationFrameGapMs.toFixed(1),
          ),
          settledOffset: Number(settledOffset.toFixed(1)),
          snapErrorPx: Number(
            Math.abs(settledOffset - index * height).toFixed(2),
          ),
        });
        session.active = false;
        if (diagnosticAnimationFrameRef.current != null) {
          cancelAnimationFrame(diagnosticAnimationFrameRef.current);
          diagnosticAnimationFrameRef.current = null;
        }
      }
      setVisiblePostIndex(index);
      setActivePostId(post.id);
      setMediaUpdatesSuspended(false);

      if (
        index >= postCount - 4 &&
        requestedNextPageAtCountRef.current !== postCount
      ) {
        requestedNextPageAtCountRef.current = postCount;
        onEndReachedRef.current?.();
      }
    },
    [diagnosticLabel, diagnosticsEnabled, height],
  );

  const handlePinchStart = useCallback(() => setIsPinchingMedia(true), []);
  const handlePinchEnd = useCallback(() => setIsPinchingMedia(false), []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const handlerStartedAt = contentFeedPerfNow();
      const rawOffset = event.nativeEvent.contentOffset.y;
      scrollOffsetRef.current = Math.max(
        0,
        rawOffset,
      );
      gestureScrollOffset.set(scrollOffsetRef.current);
      onScrollOffsetChange?.(scrollOffsetRef.current);
      const session = diagnosticScrollSessionRef.current;
      if (diagnosticsEnabled && session?.active) {
        const handledAt = contentFeedPerfNow();
        if (session.lastScrollEventAt > 0) {
          session.maxScrollEventGapMs = Math.max(
            session.maxScrollEventGapMs,
            handlerStartedAt - session.lastScrollEventAt,
          );
        }
        session.lastScrollEventAt = handlerStartedAt;
        session.scrollEventCount += 1;
        session.maxScrollHandlerMs = Math.max(
          session.maxScrollHandlerMs,
          handledAt - handlerStartedAt,
        );
      }
    },
    [diagnosticsEnabled, gestureScrollOffset, onScrollOffsetChange],
  );

  const handleScrollBeginDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setMediaUpdatesSuspended(true);
      if (!diagnosticsEnabled) return;
      const startedAt = contentFeedPerfNow();
      const startOffset = event.nativeEvent.contentOffset.y;
      const postCount = postsRef.current.length;
      const gestureStartIndex = Math.max(
        0,
        Math.min(postCount - 1, Math.round(startOffset / height)),
      );
      const session: DiagnosticScrollSession = {
        id: diagnosticSessionSequenceRef.current + 1,
        active: true,
        startedAt,
        startOffset,
        gestureStartIndex,
        rawTargetIndex: null,
        scrollEventCount: 0,
        lastScrollEventAt: 0,
        maxScrollEventGapMs: 0,
        maxScrollHandlerMs: 0,
        maxEventLoopStallMs: 0,
        lastAnimationFrameAt: startedAt,
        maxAnimationFrameGapMs: 0,
      };
      diagnosticSessionSequenceRef.current = session.id;
      diagnosticScrollSessionRef.current = session;
      if (diagnosticAnimationFrameRef.current != null) {
        cancelAnimationFrame(diagnosticAnimationFrameRef.current);
      }
      const sampleAnimationFrame = (frameAt: number) => {
        const activeSession = diagnosticScrollSessionRef.current;
        if (!activeSession?.active) return;
        activeSession.maxAnimationFrameGapMs = Math.max(
          activeSession.maxAnimationFrameGapMs,
          frameAt - activeSession.lastAnimationFrameAt,
        );
        activeSession.lastAnimationFrameAt = frameAt;
        diagnosticAnimationFrameRef.current =
          requestAnimationFrame(sampleAnimationFrame);
      };
      diagnosticAnimationFrameRef.current =
        requestAnimationFrame(sampleAnimationFrame);
      logContentFeedPerf("drag-start", {
        feed: diagnosticLabel,
        sessionId: session.id,
        startOffset: Number(session.startOffset.toFixed(1)),
        gestureStartIndex: session.gestureStartIndex,
      });
    },
    [diagnosticLabel, diagnosticsEnabled, height],
  );

  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!diagnosticsEnabled) return;
      const session = diagnosticScrollSessionRef.current;
      if (!session?.active) return;
      const rawTargetOffset = event.nativeEvent.targetContentOffset?.y;
      session.rawTargetIndex =
        typeof rawTargetOffset === "number"
          ? Math.round(rawTargetOffset / height)
          : null;
      logContentFeedPerf("drag-end", {
        feed: diagnosticLabel,
        sessionId: session.id,
        gestureStartIndex: session.gestureStartIndex,
        rawTargetIndex: session.rawTargetIndex,
        elapsedMs: Math.round(contentFeedPerfNow() - session.startedAt),
        releaseOffset: Number(event.nativeEvent.contentOffset.y.toFixed(1)),
        velocityY: event.nativeEvent.velocity?.y ?? null,
      });
    },
    [diagnosticLabel, diagnosticsEnabled, height],
  );

  const handleMomentumScrollBegin = useCallback(() => {
    if (!diagnosticsEnabled) return;
    const session = diagnosticScrollSessionRef.current;
    if (!session?.active) return;
    logContentFeedPerf("momentum-start", {
      feed: diagnosticLabel,
      sessionId: session.id,
      elapsedMs: Math.round(contentFeedPerfNow() - session.startedAt),
    });
  }, [diagnosticLabel, diagnosticsEnabled]);

  const handlePostProfilerRender: ProfilerOnRenderCallback = useCallback(
    (id, phase, actualDuration) => {
      if (!diagnosticsEnabled) return;
      const profilerWindow = diagnosticProfilerWindowRef.current;
      profilerWindow.commits += 1;
      profilerWindow.totalDurationMs += actualDuration;
      profilerWindow.maxDurationMs = Math.max(
        profilerWindow.maxDurationMs,
        actualDuration,
      );
      if (phase === "mount" || actualDuration >= 12) {
        logContentFeedPerf("post-react-render", {
          feed: diagnosticLabel,
          post: id,
          phase,
          actualDurationMs: Number(actualDuration.toFixed(1)),
          whileScrolling: Boolean(diagnosticScrollSessionRef.current?.active),
        });
      }
    },
    [diagnosticLabel, diagnosticsEnabled],
  );

  useEffect(() => {
    if (!diagnosticsEnabled) return;
    logContentFeedPerf("active-post-committed", {
      feed: diagnosticLabel,
      postId: activePostId,
      visiblePostIndex,
    });
  }, [activePostId, diagnosticLabel, diagnosticsEnabled, visiblePostIndex]);

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

  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={feedGesture}>
      <FlatList
        ref={listRef}
        data={posts}
        keyExtractor={(item) => item.id}
        refreshing={nativeRefreshEnabled ? refreshing : false}
        onRefresh={nativeRefreshEnabled ? onRefresh : undefined}
        initialNumToRender={Math.max(
          2,
          Math.min(posts.length, initialIndex + 1),
        )}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={contentViewabilityConfig}
        snapToInterval={hasPosts ? height : undefined}
        snapToAlignment="start"
        disableIntervalMomentum={hasPosts}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={diagnosticsEnabled ? handleScrollEndDrag : undefined}
        onMomentumScrollBegin={
          diagnosticsEnabled ? handleMomentumScrollBegin : undefined
        }
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
          const post = renderDiagnosticPlaceholders ? (
            <DiagnosticPlaceholderPost height={height} index={index} />
          ) : (
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
            suspendMediaUpdates={
              mediaUpdatesSuspended && active && item.id === activePostId
            }
            diagnosticLabel={
              diagnosticsEnabled
                ? `${diagnosticLabel ?? "content-feed"}:${item.id}`
                : undefined
            }
          />
          );

          return diagnosticsEnabled ? (
            <Profiler
              id={`${diagnosticLabel ?? "content-feed"}:${item.id}`}
              onRender={handlePostProfilerRender}
            >
              {post}
            </Profiler>
          ) : (
            post
          );
        }}
      />
      </GestureDetector>
    </View>
  );
}

export default memo(ContentFeed);
