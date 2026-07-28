import { Post } from "@findeat/types/post";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, View, type ViewToken } from "react-native";
import ContentPost from "./ContentPost";
import EmptyPostsState from "../EmptyPostsState";
import { Skeleton, SkeletonPulse } from "@/components/common";
import { prefetchUpcomingPosts } from "@/lib/imagePrefetch";

type Props = {
  posts: Post[];
  height: number;
  contentTopInset?: number;
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
  initialIndex?: number;
  loading?: boolean;
};

const contentViewabilityConfig = { itemVisiblePercentThreshold: 60 };

export default function ContentFeed({
  posts,
  height,
  contentTopInset = 0,
  refreshing,
  onRefresh,
  onEndReached,
  onToggleLike,
  onOpenComments,
  onToggleWantToTry,
  onDeletePost,
  initialIndex = 0,
  onOpenSharePost,
  onOpenPostOptions,
  loading = false,
}: Props) {
  const [isPinchingMedia, setIsPinchingMedia] = useState(false);
  const postsRef = useRef(posts);
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

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      initialNumToRender={2}
      maxToRenderPerBatch={2}
      windowSize={3}
      removeClippedSubviews
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={contentViewabilityConfig}
      pagingEnabled
      scrollEnabled={!isPinchingMedia}
      showsVerticalScrollIndicator={false}
      decelerationRate="fast"
      initialScrollIndex={initialIndex}
      contentContainerStyle={{
        flexGrow: 1,
      }}
      ListEmptyComponent={<EmptyPostsState type="CONTENT" />}
      getItemLayout={(_, index) => ({
        length: height,
        offset: height * index,
        index,
      })}
      renderItem={({ item }) => (
        <ContentPost
          post={item}
          height={height}
          contentTopInset={contentTopInset}
          onToggleLike={onToggleLike}
          onOpenComments={onOpenComments}
          onToggleWantToTry={onToggleWantToTry}
          onOpenSharePost={onOpenSharePost}
          onOpenPostOptions={onOpenPostOptions}
          onPinchStart={() => setIsPinchingMedia(true)}
          onPinchEnd={() => setIsPinchingMedia(false)}
        />
      )}
    />
  );
}
