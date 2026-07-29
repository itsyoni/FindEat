import { LinearGradient } from "expo-linear-gradient";
import { AppAlert as Alert } from "@/lib/appAlert";
import { CommentsBottomSheet } from "@/components/common";
import ContentFeedList from "@/components/posts/content/ContentFeed";
import ReviewFeed from "@/components/posts/review/ReviewFeed";
import SearchResultRow from "@/components/search/SearchResultRow";
import SearchResultsView from "@/components/search/SearchResultsView";
import { useAuth } from "@/contexts/AuthContext";
import {
  feedQueryKey,
  updatePostInFeedCache,
  updateRestaurantStatusInFeedCache,
  useFeed,
} from "@/hooks/useFeed";
import { api } from "@/lib/api";
import { getFreshDeviceLocation } from "@/lib/currentLocation";
import { searchGlobal } from "@/services/search";
import { PostType } from "@findeat/types/post";
import { SearchResultItem } from "@findeat/types/search";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import type { FeedPage } from "@findeat/types";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import PostOptionsBottomSheet from "@/components/chats/PostOptionsBottomSheet";
import SharePostBottomSheet from "@/components/chats/share/SharePostBottomSheet";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useNotificationUnreadCount } from "@/hooks/useNotifications";
import {
  BellIcon,
  CaretDownIcon,
  CaretUpIcon,
  MagnifyingGlassIcon,
} from "phosphor-react-native";
import SnapsTray from "@/components/snaps/SnapsTray";
import { snapsQueryKey } from "@/hooks/useSnaps";

export default function HomeScreen() {
  const { t, i18n } = useTranslation("common");
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { isDark } = useAppTheme();
  const unread = useNotificationUnreadCount(!!user && !authLoading);
  const insets = useSafeAreaInsets();

  const [activeFeed, setActiveFeed] = useState<PostType>("CONTENT");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [snapsCollapsed, setSnapsCollapsed] = useState(false);
  const [feedHeight, setFeedHeight] = useState(0);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [optionsPostId, setOptionsPostId] = useState<string | null>(null);
  const [searchLocation, setSearchLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const feed = useFeed(activeFeed, !!user && !authLoading);
  const posts = useMemo(
    () => feed.data?.pages.flatMap((page) => page.items) ?? [],
    [feed.data],
  );

  async function onRefresh() {
    queryClient.setQueryData<InfiniteData<FeedPage>>(
      feedQueryKey(activeFeed),
      (current) =>
        current
          ? {
              pages: current.pages.slice(0, 1),
              pageParams: current.pageParams.slice(0, 1),
            }
          : current,
    );

    await feed.refetch();
    await queryClient.invalidateQueries({ queryKey: snapsQueryKey });
  }

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
    setIsSearching(false);

    if (item.type === "USER") {
      router.push({
        pathname: "/(users)/[id]",
        params: { id: item.id },
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
      }),
    [i18n.language, i18n.resolvedLanguage, searchLocation],
  );

  function openSearch() {
    if (pageLoading) return;
    setIsSearching(true);
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  };
  const titleShadow = {
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  };
  const overlayInset = insets.top + (snapsCollapsed ? 72 : 150);
  const headerGradientHeight = overlayInset + 96;

  return (
    <View
      style={{ flex: 1, backgroundColor: isDark ? "#000" : "#FBFAF8" }}
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
              searchRequest={searchRequest}
              onCancel={() => setIsSearching(false)}
              onSelect={(item) => void handleSearchSelect(item)}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              renderItem={(item) => <SearchResultRow item={item} />}
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
          <View
            style={{ flex: 1 }}
            onLayout={(e) => setFeedHeight(e.nativeEvent.layout.height)}
          >
            {feedHeight > 0 &&
              (activeFeed === "CONTENT" ? (
                <ContentFeedList
                  posts={posts}
                  height={feedHeight}
                  contentTopInset={overlayInset}
                  refreshing={feed.isRefetching && !feed.isFetchingNextPage}
                  onRefresh={onRefresh}
                  onEndReached={() => {
                    if (feed.hasNextPage && !feed.isFetchingNextPage) {
                      void feed.fetchNextPage();
                    }
                  }}
                  loadingMore={feed.isFetchingNextPage}
                  loading={pageLoading}
                  onToggleLike={toggleLike}
                  onOpenComments={openComments}
                  onToggleWantToTry={toggleWantToTry}
                  onDeletePost={deletePost}
                  onOpenSharePost={setSharePostId}
                  onOpenPostOptions={setOptionsPostId}
                />
              ) : (
                <ReviewFeed
                  posts={posts}
                  contentTopInset={overlayInset}
                  refreshing={feed.isRefetching && !feed.isFetchingNextPage}
                  onRefresh={onRefresh}
                  onEndReached={() => {
                    if (feed.hasNextPage && !feed.isFetchingNextPage) {
                      void feed.fetchNextPage();
                    }
                  }}
                  loadingMore={feed.isFetchingNextPage}
                  loading={pageLoading}
                  onToggleLike={toggleLike}
                  onOpenComments={openComments}
                  onToggleWantToTry={toggleWantToTry}
                  onOpenSharePost={setSharePostId}
                  onOpenPostOptions={setOptionsPostId}
                />
              ))}
          </View>

          <View
            pointerEvents="box-none"
            className="absolute left-0 right-0 top-0 z-20"
          >
            <LinearGradient
              pointerEvents="none"
              colors={[
                "rgba(0,0,0,0.5)",
                "rgba(0,0,0,0.25)",
                "rgba(0,0,0,0.1)",
                "transparent",
              ]}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: headerGradientHeight,
              }}
            />
            <View style={{ marginTop: insets.top }}>
            <View className={snapsCollapsed ? "h-6" : ""}>
              {!snapsCollapsed ? <SnapsTray overlay /> : null}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t(
                  snapsCollapsed ? "expandSnaps" : "collapseSnaps",
                )}
                onPress={() => setSnapsCollapsed((current) => !current)}
                className={`absolute items-center justify-center ${
                  snapsCollapsed
                    ? "inset-x-0 top-0 h-6"
                    : "bottom-0 right-4 h-8 w-8"
                }`}
              >
                {snapsCollapsed ? (
                  <CaretDownIcon
                    size={22}
                    color="#FFF"
                    weight="bold"
                    style={iconShadow}
                  />
                ) : (
                  <CaretUpIcon
                    size={22}
                    color="#FFF"
                    weight="bold"
                    style={iconShadow}
                  />
                )}
              </TouchableOpacity>
            </View>

            <View className="h-14 flex-row items-center px-4">
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("search")}
                onPress={openSearch}
                className="h-12 w-12 items-center justify-center"
              >
                <MagnifyingGlassIcon
                  size={28}
                  color="#FFF"
                  weight="bold"
                  style={iconShadow}
                />
              </TouchableOpacity>

              <View className="mx-4 flex-1 flex-row justify-center gap-8">
                {(["CONTENT", "REVIEW"] as PostType[]).map((type) => {
                  const active = activeFeed === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setActiveFeed(type)}
                      className="py-3"
                    >
                      <Text
                        style={titleShadow}
                        className={`text-base font-bold ${
                          active ? "text-white" : "text-white/65"
                        }`}
                      >
                        {t(type === "CONTENT" ? "content" : "reviews")}
                      </Text>
                      {active ? (
                        <View className="mt-1 h-0.5 rounded-full bg-white" style={iconShadow} />
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
              >
                <BellIcon size={27} color="#FFF" weight="fill" style={iconShadow} />
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
            </View>
          </View>
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
