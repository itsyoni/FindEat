import { AppAlert as Alert } from "@/lib/appAlert";
import { CommentsBottomSheet } from "@/components/common";
import { useMyProfile } from "@/hooks/useMyProfile";
import { api } from "@/lib/api";
import { filterPostsByType } from "@findeat/utils";
import PostOptionsBottomSheet from "@/components/chats/PostOptionsBottomSheet";
import SharePostBottomSheet from "@/components/chats/share/SharePostBottomSheet";
import { useCallback, useMemo, useState } from "react";

import ReviewFeed from "@/components/posts/review/ReviewFeed";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useAppTheme } from "@/contexts/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { removePostFromAppCache } from "@/hooks/useFeed";
import { TouchableOpacity, View } from "react-native";

export default function ProfileReviewsFeedScreen() {
  const queryClient = useQueryClient();
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const { isDark } = useAppTheme();
  const { profile, loading, refresh } = useMyProfile();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [optionsPostId, setOptionsPostId] = useState<string | null>(null);

  const posts = useMemo(
    () => filterPostsByType(profile?.posts, "REVIEW"),
    [profile?.posts],
  );
  const initialIndex = useMemo(
    () => Math.max(posts.findIndex((post) => post.id === postId), 0),
    [postId, posts],
  );

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function toggleLike(postId: string, isLiked: boolean) {
    await api.posts.toggleLike(postId, isLiked);
    await refresh();
  }

  async function toggleWantToTry(
    postId: string,
    restaurantId: string,
    isWantToTry: boolean,
  ) {
    await api.restaurants.toggleWantToTry(restaurantId, isWantToTry, postId);

    await refresh();
  }

  function openComments(postId: string) {
    setSelectedPostId(postId);
  }

  async function deletePost(postId: string) {
    try {
      await api.posts.delete(postId);
      removePostFromAppCache(queryClient, postId);
      void refresh();
      setOptionsPostId(null);
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/profile");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not delete post");
      return false;
    }
  }

  if (loading || !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}>
        <ProfileReviewBackButton />
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <ReviewFeed posts={[]} loading contentTopInset={56} refreshing={false} onRefresh={refresh} onToggleLike={toggleLike} onOpenComments={openComments} onToggleWantToTry={toggleWantToTry} onOpenSharePost={setSharePostId} onOpenPostOptions={setOptionsPostId} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}>
      <ProfileReviewBackButton />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ReviewFeed
          posts={posts}
          preferredPerspectiveUserId={profile.id}
          initialIndex={initialIndex}
          contentTopInset={56}
          refreshing={false}
          onRefresh={refresh}
          onToggleLike={toggleLike}
          onOpenComments={openComments}
          onToggleWantToTry={toggleWantToTry}
          onOpenSharePost={setSharePostId}
          onOpenPostOptions={setOptionsPostId}
        />
      </SafeAreaView>

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
        postId={selectedPostId}
        onClose={() => setSelectedPostId(null)}
      />
    </View>
  );
}

function ProfileReviewBackButton() {
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
        <DirectionalIcon direction="back" size={24} color="#FAF9F6" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
