import { AppAlert as Alert } from "@/lib/appAlert";
import { CommentsBottomSheet } from "@/components/common";
import PostOptionsBottomSheet from "@/components/chats/PostOptionsBottomSheet";
import SharePostBottomSheet from "@/components/chats/share/SharePostBottomSheet";
import ContentFeedList from "@/components/posts/content/ContentFeed";
import { api } from "@/lib/api";
import { Post } from "@findeat/types/post";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useCallback, useMemo, useState } from "react";
import { Dimensions, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { removePostFromAppCache } from "@/hooks/useFeed";
import {
  cacheProfilePostsForNavigation,
  getCachedProfilePosts,
} from "@/lib/profilePostNavigationCache";
import { BOTTOM_TAB_BAR_BASE_HEIGHT } from "@/constants/layout";

const { height } = Dimensions.get("window");

export default function UserContentFeedScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { userId, postId } = useLocalSearchParams<{
    userId: string;
    postId: string;
  }>();
  const standaloneBottomBarHeight = Math.max(
    BOTTOM_TAB_BAR_BASE_HEIGHT,
    BOTTOM_TAB_BAR_BASE_HEIGHT + insets.bottom,
  );

  const cachedPosts = getCachedProfilePosts(userId, "CONTENT");
  const [posts, setPosts] = useState<Post[]>(() => cachedPosts ?? []);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(() =>
    cachedPosts ? userId : null,
  );
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [optionsPostId, setOptionsPostId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const initialIndex = useMemo(() => {
    return Math.max(
      posts.findIndex((post) => post.id === postId),
      0,
    );
  }, [posts, postId]);

  const fetchPosts = useCallback(async () => {
    if (!userId) return null;

    const user = await api.users.get(userId);

    return user.posts.filter(
      (post: Post) =>
        post.type === "CONTENT" && !post.authorRestaurantId,
    );
  }, [userId]);

  const loadPosts = useCallback(async () => {
    const nextPosts = await fetchPosts();

    if (!nextPosts || !userId) return;

    setPosts(nextPosts);
    setLoadedUserId(userId);
    cacheProfilePostsForNavigation(userId, "CONTENT", nextPosts);
  }, [fetchPosts, userId]);

  useFocusEffect(
    useCallback(() => {
      void loadPosts();
    }, [loadPosts]),
  );

  async function onRefresh() {
    try {
      setRefreshing(true);
      await loadPosts();
    } catch (error) {
      console.error("Failed to refresh posts", error);
    } finally {
      setRefreshing(false);
    }
  }

  async function toggleLike(postId: string, isLiked: boolean) {
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked: !isLiked,
              likesCount: Math.max(0, post.likesCount + (isLiked ? -1 : 1)),
            }
          : post,
      ),
    );

    try {
      await api.posts.toggleLike(postId, isLiked);
    } catch (error) {
      console.error("Failed to toggle like", error);

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                isLiked,
                likesCount: Math.max(0, post.likesCount + (isLiked ? 1 : -1)),
              }
            : post,
        ),
      );
    }
  }

  async function toggleWantToTry(
    postId: string,
    restaurantId: string,
    isWantToTry: boolean,
  ) {
    setPosts((currentPosts) =>
      currentPosts.map((post) => {
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
      }),
    );

    try {
      await api.restaurants.toggleWantToTry(restaurantId, isWantToTry, postId);
    } catch (error) {
      console.error("Failed to toggle want to try", error);
      await loadPosts();
    }
  }

  async function deletePost(postId: string) {
    try {
      await api.posts.delete(postId);
      removePostFromAppCache(queryClient, postId);
      setOptionsPostId(null);
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)");
    } catch (error) {
      console.error("Failed to delete post", error);
      Alert.alert("Error", "Could not delete post");
      return false;
    }
  }

  function handleCommentAdded(postId: string) {
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              commentsCount: post.commentsCount + 1,
            }
          : post,
      ),
    );
  }

  function handlePostShared(postId: string) {
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === postId
          ? { ...post, sharesCount: (post.sharesCount ?? 0) + 1 }
          : post,
      ),
    );
  }

  const loading = !userId || loadedUserId !== userId;

  if (loading) {
    return (
      <View className="flex-1 bg-black">
        <SafeAreaView edges={["top"]} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 50 }}><View className="ml-4 mt-2 h-11 w-11 rounded-full bg-black/50" /></SafeAreaView>
        <ContentFeedList posts={[]} loading height={height} bottomAuthorBarHeight={standaloneBottomBarHeight} contentTopInset={0} refreshing={false} onRefresh={onRefresh} onToggleLike={toggleLike} onOpenComments={setSelectedPostId} onToggleWantToTry={toggleWantToTry} onDeletePost={deletePost} onOpenSharePost={setSharePostId} onOpenPostOptions={setOptionsPostId} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView
        edges={["top"]}
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
        }}
      >
        <TouchableOpacity
          className="ml-4 mt-2 h-11 w-11 items-center justify-center rounded-full bg-black/50"
          onPress={() => router.back()}
        >
          <DirectionalIcon direction="back" size={24} color="#FAF9F6" />
        </TouchableOpacity>
      </SafeAreaView>

        <ContentFeedList
          posts={posts}
          height={height}
          bottomAuthorBarHeight={standaloneBottomBarHeight}
          contentTopInset={0}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onToggleLike={toggleLike}
          onOpenComments={setSelectedPostId}
          onToggleWantToTry={toggleWantToTry}
          onDeletePost={deletePost}
          onOpenSharePost={setSharePostId}
          onOpenPostOptions={setOptionsPostId}
          initialIndex={initialIndex}
          initialPostId={postId}
        />

      <PostOptionsBottomSheet
        postId={optionsPostId}
        onClose={() => setOptionsPostId(null)}
        onDelete={deletePost}
        onArchived={(archivedPostId) => {
          setPosts((current) => current.filter((post) => post.id !== archivedPostId));
        }}
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
    </View>
  );
}
