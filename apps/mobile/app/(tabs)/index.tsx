import { AppAlert as Alert } from "@/lib/appAlert";
import { CommentsBottomSheet } from "@/components/common";
import Text from "@/components/common/AppText";
import ContentFeedList from "@/components/posts/content/ContentFeed";
import SearchResultRow from "@/components/search/SearchResultRow";
import SearchResultsView from "@/components/search/SearchResultsView";
import Tabs from "@/components/common/Tabs";
import { useAuth } from "@/contexts/AuthContext";
import {
  homeFeedQueryKey,
  updatePostInFeedCache,
  updateRestaurantStatusInFeedCache,
  useHomeFeed,
} from "@/hooks/useFeed";
import { api } from "@/lib/api";
import { getFreshDeviceLocation } from "@/lib/currentLocation";
import { refreshRecentSearchItems, searchGlobal } from "@/services/search";
import type { FeedScope } from "@findeat/types/post";
import { SearchEntityType, SearchResultItem } from "@findeat/types/search";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import type { FeedPage, RecentSearchItem } from "@findeat/types";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import PostOptionsBottomSheet from "@/components/chats/PostOptionsBottomSheet";
import SharePostBottomSheet from "@/components/chats/share/SharePostBottomSheet";
import { useNotificationUnreadCount } from "@/hooks/useNotifications";
import {
  BellIcon,
  CaretDownIcon,
  MagnifyingGlassIcon,
} from "phosphor-react-native";
import SnapsTray from "@/components/snaps/SnapsTray";
import { snapsQueryKey } from "@/hooks/useSnaps";
import {
  addRecentSearch,
  getRecentSearches,
  saveRecentSearches,
} from "@/lib/recentSearches";
import { useAppTheme } from "@/contexts/ThemeContext";
import FollowingSuggestions from "@/components/feed/FollowingSuggestions";
import DishCard from "@/components/restaurants/DishCard";

const homeGestureThreshold = 12;
const homeVerticalGestureThreshold = 22;
const homeVerticalGestureDominance = 1.25;
const homeRefreshThreshold = 64;
const closeSnapsAction = 1;
const refreshFeedAction = 3;
const snapsTrayHeight = 104;

export default function HomeScreen() {
  const { t, i18n } = useTranslation("common");
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const unread = useNotificationUnreadCount(!!user && !authLoading);
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();

  const [activeFeed, setActiveFeed] = useState<FeedScope>("EXPLORE");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const [searchType, setSearchType] = useState<SearchEntityType>("USER");
  const [searchQuery, setSearchQuery] = useState("");
  const [snapsCollapsed, setSnapsCollapsed] = useState(false);
  const [feedHeight, setFeedHeight] = useState(0);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [optionsPostId, setOptionsPostId] = useState<string | null>(null);
  const [searchLocation, setSearchLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const followingScrollOffset = useSharedValue(0);
  const exploreScrollOffset = useSharedValue(0);
  const gestureStartedAtTop = useSharedValue(true);
  const gestureStartX = useSharedValue(0);
  const gestureStartY = useSharedValue(0);
  const gestureAction = useSharedValue(0);
  const snapsProgress = useSharedValue(1);
  const feedsEnabled = !!user && !authLoading;
  const followingFeed = useHomeFeed("FOLLOWING", feedsEnabled);
  const exploreFeed = useHomeFeed("EXPLORE", feedsEnabled);
  const feed = activeFeed === "FOLLOWING" ? followingFeed : exploreFeed;
  const followingPosts = useMemo(
    () => followingFeed.data?.pages.flatMap((page) => page.items) ?? [],
    [followingFeed.data],
  );
  const explorePosts = useMemo(
    () => exploreFeed.data?.pages.flatMap((page) => page.items) ?? [],
    [exploreFeed.data],
  );

  const onRefresh = useCallback(
    async (scope: FeedScope) => {
      queryClient.setQueryData<InfiniteData<FeedPage>>(
        homeFeedQueryKey(scope),
        (current) =>
          current
            ? {
                pages: current.pages.slice(0, 1),
                pageParams: current.pageParams.slice(0, 1),
              }
            : current,
      );

      if (scope === "FOLLOWING") await followingFeed.refetch();
      else await exploreFeed.refetch();
      await queryClient.invalidateQueries({ queryKey: snapsQueryKey });
    },
    [exploreFeed, followingFeed, queryClient],
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
    } catch (error) {
      console.error("toggle like failed", error);

      updatePostInFeedCache(queryClient, (post) =>
        post.id === postId
          ? {
              ...post,
              isLiked,
              likesCount: Math.max(0, post.likesCount + (isLiked ? 1 : -1)),
            }
          : post,
      );
    }
  }

  async function toggleWantToTry(
    postId: string,
    restaurantId: string,
    isWantToTry: boolean,
  ) {
    updatePostInFeedCache(queryClient, (post) => {
      if (post.restaurant?.id !== restaurantId) return post;

      return {
        ...post,
        restaurantSavesCount: Math.max(
          0,
          (post.restaurantSavesCount ?? 0) + (isWantToTry ? -1 : 1),
        ),
        restaurant: {
          ...post.restaurant,
          userSaves: isWantToTry
            ? []
            : [
                {
                  id: "",
                  wantToTry: true,
                  visited: false,
                  favorite: false,
                },
              ],
        },
      };
    });

    try {
      if (isWantToTry) {
        await api.restaurants.removeWantToTry(restaurantId);
      } else {
        const status = await api.restaurants.wantToTry(restaurantId, postId);
        updateRestaurantStatusInFeedCache(queryClient, restaurantId, status);
      }
    } catch (error) {
      console.error("toggle want to try failed", error);
      await feed.refetch();
      Alert.alert("Could not save post", "Please try again.");
    }
  }

  async function deletePost(postId: string) {
    try {
      await api.posts.delete(postId);
      updatePostInFeedCache(queryClient, (post) =>
        post.id === postId ? null : post,
      );
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not delete post");
      return false;
    }
  }

  function handleCommentAdded(postId: string) {
    updatePostInFeedCache(queryClient, (post) =>
      post.id === postId
        ? { ...post, commentsCount: post.commentsCount + 1 }
        : post,
    );
  }

  function handlePostShared(postId: string) {
    updatePostInFeedCache(queryClient, (post) =>
      post.id === postId
        ? { ...post, sharesCount: (post.sharesCount ?? 0) + 1 }
        : post,
    );
  }

  function openComments(postId: string) {
    setSelectedPostId(postId);
  }

  async function handleSearchSelect(item: SearchResultItem) {
    if (user?.id) {
      const updated = await addRecentSearch(user.id, item);
      setRecentSearches(updated);
    }
    setIsSearching(false);

    if (item.type === "USER") {
      router.push({
        pathname: "/(users)/[id]",
        params: { id: item.id },
      });
      return;
    }

    if (item.type === "DISH") {
      router.push({
        pathname: "/menu-items/[id]",
        params: { id: item.id, source: "search" },
      });
      return;
    }

    try {
      const restaurantId = item.restaurantSuggestion
        ? (
            await api.restaurants.fromGoogle({
              name: item.restaurantSuggestion.name,
              address: item.restaurantSuggestion.address,
              latitude: item.restaurantSuggestion.latitude,
              longitude: item.restaurantSuggestion.longitude,
              googlePlaceId: item.restaurantSuggestion.googlePlaceId,
            })
          ).id
        : item.id;

      router.push({
        pathname: "/restaurants/[id]",
        params: { id: restaurantId },
      });
    } catch (error) {
      console.error("Could not open restaurant search result", error);
      Alert.alert(t("error"), t("somethingWentWrong"));
    }
  }

  const searchRequest = useCallback(
    (query: string) =>
      searchGlobal(query, {
        ...(searchLocation ?? {}),
        languageCode: i18n.resolvedLanguage ?? i18n.language,
        type: searchType,
      }),
    [i18n.language, i18n.resolvedLanguage, searchLocation, searchType],
  );

  function openSearch() {
    if (pageLoading) return;
    setSearchType("USER");
    setSearchQuery("");
    setIsSearching(true);
    if (user?.id) {
      const userId = user.id;
      void getRecentSearches(userId).then(async (savedItems) => {
        // Show the local history immediately, then replace stale profile and
        // restaurant snapshots without delaying the search screen.
        setRecentSearches(savedItems);
        const refreshedItems = await refreshRecentSearchItems(savedItems);
        setRecentSearches(refreshedItems);
        await saveRecentSearches(userId, refreshedItems);
      });
    }
    void getFreshDeviceLocation()
      .then((location) => {
        if (!location) return;
        setSearchLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      })
      .catch((error) =>
        console.error("Could not get location for global search", error),
      );
  }

  const pageLoading = authLoading || feed.isPending;
  const iconShadow = {
    shadowColor: "#0B0B0A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
  };
  const titleShadow = {
    textShadowColor: "rgba(0,0,0,0.42)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  };
  const topBarInset = insets.top + 56;
  const contentCardTopInset = snapsCollapsed ? 0 : insets.top + 150;
  const contentControlsTopInset = snapsCollapsed ? topBarInset : 0;
  const followingEmptyTopInset = snapsCollapsed
    ? contentControlsTopInset + 48
    : contentCardTopInset;
  const activeFeedRefreshing =
    activeFeed === "FOLLOWING"
      ? followingFeed.isRefetching
      : exploreFeed.isRefetching;
  const closeSnaps = useCallback(() => setSnapsCollapsed(true), []);
  const openSnaps = useCallback(() => setSnapsCollapsed(false), []);
  const refreshActiveFeed = useCallback(() => {
    void onRefresh(activeFeed);
  }, [activeFeed, onRefresh]);

  useEffect(() => {
    snapsProgress.set(
      withTiming(snapsCollapsed ? 0 : 1, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [snapsCollapsed, snapsProgress]);

  const snapsTrayAnimatedStyle = useAnimatedStyle(() => ({
    height: snapsTrayHeight * snapsProgress.value,
    opacity: Math.max(0, (snapsProgress.value - 0.7) / 0.3),
    overflow: "hidden",
  }));

  const homeFeedGesture = useMemo(
    () =>
      Gesture.Pan()
        .manualActivation(true)
        .maxPointers(1)
        .onTouchesDown((event) => {
          const touch = event.allTouches[0] ?? event.changedTouches[0];
          if (!touch) return;
          gestureStartX.set(touch.absoluteX);
          gestureStartY.set(touch.absoluteY);
          gestureAction.set(0);
          const offset =
            activeFeed === "FOLLOWING"
              ? followingScrollOffset.get()
              : exploreScrollOffset.get();
          gestureStartedAtTop.set(offset <= 2);
        })
        .onTouchesMove((event, manager) => {
          const touch = event.allTouches[0] ?? event.changedTouches[0];
          if (!touch) return;
          const distanceX = touch.absoluteX - gestureStartX.get();
          const distanceY = touch.absoluteY - gestureStartY.get();
          const absoluteX = Math.abs(distanceX);
          const absoluteY = Math.abs(distanceY);
          if (
            absoluteY < homeGestureThreshold &&
            absoluteX < homeGestureThreshold
          ) {
            return;
          }

          // Release horizontal media carousels as soon as the user's intent is
          // clear. Only a deliberate, predominantly vertical gesture may
          // collapse Snaps or refresh the feed.
          if (absoluteX >= homeGestureThreshold && absoluteX >= absoluteY) {
            manager.fail();
            return;
          }
          if (absoluteY < homeVerticalGestureThreshold) return;
          if (absoluteY < absoluteX * homeVerticalGestureDominance) {
            manager.fail();
            return;
          }
          if (!snapsCollapsed && distanceY < 0) {
            gestureAction.set(closeSnapsAction);
            manager.activate();
            return;
          }
          if (gestureStartedAtTop.get() && distanceY > 0) {
            if (snapsCollapsed) {
              manager.fail();
              return;
            }
            gestureAction.set(refreshFeedAction);
            manager.activate();
            return;
          }
          manager.fail();
        })
        .onEnd((event) => {
          const action = gestureAction.get();
          if (
            action === closeSnapsAction &&
            event.translationY <= -homeGestureThreshold
          ) {
            runOnJS(closeSnaps)();
          } else if (
            action === refreshFeedAction &&
            event.translationY >= homeRefreshThreshold &&
            !activeFeedRefreshing
          ) {
            runOnJS(refreshActiveFeed)();
          }
        })
        .onFinalize(() => gestureAction.set(0)),
    [
      activeFeed,
      activeFeedRefreshing,
      closeSnaps,
      exploreScrollOffset,
      followingScrollOffset,
      gestureAction,
      gestureStartedAtTop,
      gestureStartX,
      gestureStartY,
      refreshActiveFeed,
      snapsCollapsed,
    ],
  );
  function selectFeed(scope: FeedScope) {
    setActiveFeed(scope);
    if (
      scope === "EXPLORE" &&
      queryClient.getQueryState(homeFeedQueryKey("EXPLORE"))?.isInvalidated
    ) {
      void exploreFeed.refetch();
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8",
      }}
    >
      {isSearching ? (
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <Animated.View
            key="search"
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(120)}
            className="flex-1"
          >
            <SearchResultsView
              key={searchType}
              initialQuery={searchQuery}
              onQueryChange={setSearchQuery}
              idleData={recentSearches.filter(
                (item) => item.type === searchType,
              )}
              searchRequest={searchRequest}
              onCancel={() => setIsSearching(false)}
              onSelect={(item) => void handleSearchSelect(item)}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              headerContent={
                <Tabs
                  activeTab={searchType}
                  onChange={setSearchType}
                  tabs={[
                    { value: "USER", label: t("users") },
                    { value: "RESTAURANT", label: t("places") },
                    { value: "DISH", label: t("dishes") },
                  ]}
                />
              }
              renderItem={(item) =>
                item.type === "DISH" && item.dish ? (
                  <DishCard
                    item={item.dish}
                    interactive={false}
                    variant="search-row"
                    contextLabel={`${item.dish.restaurant.name}${
                      item.dish.distanceKm == null
                        ? ""
                        : ` · ${item.dish.distanceKm.toFixed(1)} km`
                    }`}
                  />
                ) : (
                  <SearchResultRow item={item} />
                )
              }
            />
          </Animated.View>
        </SafeAreaView>
      ) : (
        <Animated.View
          key="normal"
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          className="flex-1"
        >
          <GestureDetector gesture={homeFeedGesture}>
            <View
              style={{ flex: 1 }}
              onLayout={(event) => {
                const nextHeight = event.nativeEvent.layout.height;
                setFeedHeight((currentHeight) =>
                  selectedPostId && currentHeight > 0
                    ? currentHeight
                    : nextHeight,
                );
              }}
            >
              {feedHeight > 0 ? (
                <>
                <View
                  pointerEvents={activeFeed === "FOLLOWING" ? "auto" : "none"}
                  accessibilityElementsHidden={activeFeed !== "FOLLOWING"}
                  importantForAccessibility={
                    activeFeed === "FOLLOWING" ? "auto" : "no-hide-descendants"
                  }
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: activeFeed === "FOLLOWING" ? 1 : 0,
                    zIndex: activeFeed === "FOLLOWING" ? 1 : 0,
                  }}
                >
                <ContentFeedList
                  active={activeFeed === "FOLLOWING"}
                  posts={followingPosts}
                  height={feedHeight}
                  contentTopInset={contentCardTopInset}
                  controlsTopInset={contentControlsTopInset}
                  refreshing={
                    followingFeed.isRefetching &&
                    !followingFeed.isFetchingNextPage
                  }
                  onRefresh={() => onRefresh("FOLLOWING")}
                  onEndReached={() => {
                    if (
                      followingFeed.hasNextPage &&
                      !followingFeed.isFetchingNextPage
                    ) {
                      void followingFeed.fetchNextPage();
                    }
                  }}
                  loadingMore={followingFeed.isFetchingNextPage}
                  loading={authLoading || followingFeed.isPending}
                  emptyComponent={
                    <FollowingSuggestions topInset={followingEmptyTopInset} />
                  }
                  onToggleLike={toggleLike}
                  onOpenComments={openComments}
                  onToggleWantToTry={toggleWantToTry}
                  onDeletePost={deletePost}
                  onOpenSharePost={setSharePostId}
                  onOpenPostOptions={setOptionsPostId}
                  preventTopOverscroll={snapsCollapsed}
                  feedScrollEnabled={snapsCollapsed}
                  nativeRefreshEnabled={false}
                  onPullDownAtTop={openSnaps}
                  onScrollOffsetChange={(offset) => {
                    followingScrollOffset.set(offset);
                  }}
                />
                </View>
                <View
                  pointerEvents={activeFeed === "EXPLORE" ? "auto" : "none"}
                  accessibilityElementsHidden={activeFeed !== "EXPLORE"}
                  importantForAccessibility={
                    activeFeed === "EXPLORE" ? "auto" : "no-hide-descendants"
                  }
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: activeFeed === "EXPLORE" ? 1 : 0,
                    zIndex: activeFeed === "EXPLORE" ? 1 : 0,
                  }}
                >
                <ContentFeedList
                  active={activeFeed === "EXPLORE"}
                  posts={explorePosts}
                  height={feedHeight}
                  contentTopInset={contentCardTopInset}
                  controlsTopInset={contentControlsTopInset}
                  refreshing={
                    exploreFeed.isRefetching && !exploreFeed.isFetchingNextPage
                  }
                  onRefresh={() => onRefresh("EXPLORE")}
                  onEndReached={() => {
                    if (
                      exploreFeed.hasNextPage &&
                      !exploreFeed.isFetchingNextPage
                    ) {
                      void exploreFeed.fetchNextPage();
                    }
                  }}
                  loadingMore={exploreFeed.isFetchingNextPage}
                  loading={authLoading || exploreFeed.isPending}
                  onToggleLike={toggleLike}
                  onOpenComments={openComments}
                  onToggleWantToTry={toggleWantToTry}
                  onDeletePost={deletePost}
                  onOpenSharePost={setSharePostId}
                  onOpenPostOptions={setOptionsPostId}
                  preventTopOverscroll={snapsCollapsed}
                  feedScrollEnabled={snapsCollapsed}
                  nativeRefreshEnabled={false}
                  onPullDownAtTop={openSnaps}
                  onScrollOffsetChange={(offset) => {
                    exploreScrollOffset.set(offset);
                  }}
                />
                </View>
                </>
              ) : null}
            </View>
          </GestureDetector>

          <Animated.View
            pointerEvents="box-none"
            className="absolute left-0 right-0 z-20"
            style={{ top: insets.top }}
          >
            <View className="h-14 flex-row items-center px-4">
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("search")}
                onPress={openSearch}
                className="h-12 w-12 items-center justify-center"
                style={iconShadow}
              >
                <MagnifyingGlassIcon
                  size={28}
                  color={!isDark && !snapsCollapsed ? "#171717" : "#FAF9F6"}
                  weight="bold"
                  style={iconShadow}
                />
              </TouchableOpacity>

              <View className="mx-4 flex-1 flex-row justify-center gap-8">
                {(["EXPLORE", "FOLLOWING"] as FeedScope[]).map((scope) => {
                  const active = activeFeed === scope;
                  return (
                    <TouchableOpacity
                      key={scope}
                      onPressIn={() => selectFeed(scope)}
                      onPress={() => selectFeed(scope)}
                      className="py-3"
                    >
                      <Text
                        className="text-base font-bold"
                        style={[
                          titleShadow,
                          {
                            color: active
                              ? isDark
                                ? "#FAF9F6"
                                : !snapsCollapsed
                                  ? "#171717"
                                  : "#FAF9F6"
                              : isDark
                                ? "rgba(255,255,255,0.65)"
                                : !snapsCollapsed
                                  ? "rgba(23,23,23,0.55)"
                                  : "rgba(255,255,255,0.68)",
                          },
                        ]}
                      >
                        {t(scope === "FOLLOWING" ? "following" : "explore")}
                      </Text>
                      {active ? (
                        <View
                          className="mt-1 h-0.5 rounded-full"
                          style={{
                            backgroundColor:
                              isDark || snapsCollapsed ? "#FAF9F6" : "#171717",
                          }}
                        />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("notifications")}
                className="relative h-12 w-12 items-center justify-center"
                onPress={() => router.push("/notifications")}
                style={iconShadow}
              >
                <BellIcon
                  size={27}
                  color={!isDark && !snapsCollapsed ? "#171717" : "#FAF9F6"}
                  weight="fill"
                  style={iconShadow}
                />
                {(unread.data?.count ?? 0) > 0 ? (
                  <View
                    className="absolute right-0 top-0 h-5 min-w-5 items-center justify-center rounded-full border border-white bg-red-500 px-1"
                    style={{ zIndex: 10 }}
                  >
                    <Text className="text-[10px] font-bold text-white">
                      {(unread.data?.count ?? 0) > 99 ? '99+' : unread.data?.count}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>

            </View>
            <View
              pointerEvents="box-none"
            >
              <Animated.View
                pointerEvents={snapsCollapsed ? "none" : "auto"}
                style={snapsTrayAnimatedStyle}
              >
                <SnapsTray overlay />
              </Animated.View>
              {snapsCollapsed ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t("expandSnaps")}
                  onPress={() => setSnapsCollapsed(false)}
                  className="h-9 flex-row items-center justify-center gap-1.5 self-center rounded-full border px-3.5"
                  style={[
                    iconShadow,
                    {
                      borderColor: "rgba(255,255,255,0.08)",
                      backgroundColor: "rgba(0,0,0,0.12)",
                    },
                  ]}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{
                      color: "rgba(255,255,255,0.62)",
                    }}
                  >
                    {t("expandSnaps")}
                  </Text>
                  <CaretDownIcon
                    size={18}
                    color="rgba(255,255,255,0.62)"
                    weight="regular"
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          </Animated.View>
          <PostOptionsBottomSheet
            postId={optionsPostId}
            onClose={() => setOptionsPostId(null)}
            onDelete={deletePost}
          />

          <SharePostBottomSheet
            postId={sharePostId}
            onClose={() => setSharePostId(null)}
            onShared={handlePostShared}
          />
          <CommentsBottomSheet
            postId={selectedPostId}
            onClose={() => setSelectedPostId(null)}
            onCommentAdded={handleCommentAdded}
          />
        </Animated.View>
      )}
    </View>
  );
}
