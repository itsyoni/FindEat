import { AppAlert as Alert } from "@/lib/appAlert";
import PostOptionsBottomSheet from "@/components/chats/PostOptionsBottomSheet";
import SharePostBottomSheet from "@/components/chats/share/SharePostBottomSheet";
import { CommentsBottomSheet } from "@/components/common";
import ContentFeedList from "@/components/posts/content/ContentFeed";
import { useMyProfile } from "@/hooks/useMyProfile";
import { api } from "@/lib/api";
import { filterPostsByType } from "@findeat/utils";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useCallback, useMemo, useState } from "react";
import { Dimensions, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { removePostFromAppCache } from "@/hooks/useFeed";

const { height } = Dimensions.get("window");

export default function ProfileContentFeedScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { postId } = useLocalSearchParams<{ postId: string }>();

  const { profile, loading, refresh } = useMyProfile();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [optionsPostId, setOptionsPostId] = useState<string | null>(null);

  const posts = useMemo(
    () => filterPostsByType(profile?.posts, "CONTENT"),
    [profile?.posts],
  );

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const initialIndex = useMemo(() => {
    return Math.max(
      posts.findIndex((post) => post.id === postId),
      0,
    );
  }, [posts, postId]);

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
      <View className="flex-1 bg-black">
        <SafeAreaView edges={["top"]} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 50 }}>
          <View className="ml-4 mt-2 h-11 w-11 rounded-full bg-black/50" />
        </SafeAreaView>
        <ContentFeedList posts={[]} loading height={height} contentTopInset={insets.top} refreshing={false} onRefresh={refresh} onToggleLike={toggleLike} onOpenComments={openComments} onToggleWantToTry={toggleWantToTry} onDeletePost={deletePost} onOpenSharePost={setSharePostId} onOpenPostOptions={setOptionsPostId} />
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
        contentTopInset={insets.top}
        refreshing={false}
        onRefresh={refresh}
        onToggleLike={toggleLike}
        onOpenComments={openComments}
        initialIndex={initialIndex}
        onToggleWantToTry={toggleWantToTry}
        onDeletePost={deletePost}
        onOpenSharePost={setSharePostId}
        onOpenPostOptions={setOptionsPostId}
      />

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
