import { AppAlert as Alert } from "@/lib/appAlert";
import { CommentsBottomSheet } from "@/components/common";
import PostOptionsBottomSheet from "@/components/chats/PostOptionsBottomSheet";
import SharePostBottomSheet from "@/components/chats/share/SharePostBottomSheet";
import ReviewFeed from "@/components/posts/review/ReviewFeed";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { api } from "@/lib/api";
import { Post } from "@findeat/types/post";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { SafeAreaView } from "react-native-safe-area-context";
import { TouchableOpacity, View } from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useQueryClient } from "@tanstack/react-query";
import { removePostFromAppCache } from "@/hooks/useFeed";

export default function UserReviewsFeedScreen() {
  const queryClient = useQueryClient();
  const { isDark } = useAppTheme();
  const { userId, postId } = useLocalSearchParams<{
    userId: string;
    postId?: string;
  }>();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [optionsPostId, setOptionsPostId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const initialIndex = useMemo(
    () => Math.max(posts.findIndex((post) => post.id === postId), 0),
    [postId, posts],
  );

  const fetchPosts = useCallback(async () => {
    if (!userId) return null;

    const user = await api.users.get(userId);

    return user.posts.filter((post: Post) => post.type === "REVIEW");
  }, [userId]);

  const loadPosts = useCallback(async () => {
    const nextPosts = await fetchPosts();

    if (!nextPosts || !userId) return;

    setPosts(nextPosts);
    setLoadedUserId(userId);
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

  useEffect(() => {
    let cancelled = false;

    async function fetchInitialPosts() {
      try {
        const nextPosts = await fetchPosts();

        if (!nextPosts || cancelled || !userId) return;

        setPosts(nextPosts);
        setLoadedUserId(userId);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load posts", error);
        }
      }
    }

    void fetchInitialPosts();

    return () => {
      cancelled = true;
    };
  }, [fetchPosts, userId]);

  const loading = !userId || loadedUserId !== userId;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? "#000" : "#FBFAF8" }}>
        <UserReviewBackButton />
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <ReviewFeed posts={[]} loading contentTopInset={56} refreshing={false} onRefresh={onRefresh} onToggleLike={toggleLike} onOpenComments={setSelectedPostId} onToggleWantToTry={toggleWantToTry} onOpenSharePost={setSharePostId} onOpenPostOptions={setOptionsPostId} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#000" : "#FBFAF8" }}>
      <UserReviewBackButton />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ReviewFeed
          posts={posts}
          initialIndex={initialIndex}
          contentTopInset={56}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onToggleLike={toggleLike}
          onOpenComments={setSelectedPostId}
          onToggleWantToTry={toggleWantToTry}
          onOpenSharePost={setSharePostId}
          onOpenPostOptions={setOptionsPostId}
        />
      </SafeAreaView>

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

function UserReviewBackButton() {
  return (
    <SafeAreaView
      edges={["top"]}
      pointerEvents="box-none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 50 }}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => router.back()}
        className="ml-4 mt-2 h-11 w-11 items-center justify-center rounded-full bg-black/50"
      >
        <DirectionalIcon direction="back" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
