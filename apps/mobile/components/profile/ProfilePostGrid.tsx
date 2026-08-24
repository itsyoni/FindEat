import { Post, PostType } from "@findeat/types/post";
import { Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import Text from "../common/AppText";
import {
  ImagesSquareIcon,
  PlayCircleIcon,
  StarIcon,
  RepeatIcon,
} from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/contexts/ThemeContext";
import { Skeleton, SkeletonPulse } from "../common";
import ProgressiveImage from "../common/ProgressiveImage";

type Props = {
  posts: Post[];
  type: PostType;
  onPressPost: (postId: string) => void;
  onCreatePost?: () => void;
  loading?: boolean;
};

function getPostImage(post: Post) {
  if (post.type === "REVIEW") {
    const review = post.reviewPost;
    return (
      review?.coverImageUrl ??
      review?.items?.find((item) => item.primaryMedia?.imageUrl)?.primaryMedia
        ?.imageUrl ??
      review?.items?.find((item) => item.imageUrl)?.imageUrl ??
      review?.items?.find((item) => item.menuItem?.imageUrl)?.menuItem
        ?.imageUrl ??
      null
    );
  }

  return (
    post.contentPost?.media?.find((item) => item.type === "IMAGE")?.imageUrl ??
    post.contentPost?.imageUrl ??
    null
  );
}

function getPostThumbnail(post: Post) {
  if (post.type === "REVIEW") {
    const review = post.reviewPost;
    return (
      review?.coverThumbnailUrl ??
      review?.items?.find((item) => item.primaryMedia?.thumbnailUrl)
        ?.primaryMedia?.thumbnailUrl ??
      review?.items?.find((item) => item.thumbnailUrl)?.thumbnailUrl ??
      review?.items?.find((item) => item.menuItem?.thumbnailUrl)?.menuItem
        ?.thumbnailUrl ??
      null
    );
  }

  return (
    post.contentPost?.media?.find((item) => item.type === "IMAGE")
      ?.thumbnailUrl ??
    post.contentPost?.thumbnailUrl ??
    null
  );
}

function getPostVideo(post: Post) {
  if (post.type !== "CONTENT") return null;

  return (
    post.contentPost?.media?.find((item) => item.type === "VIDEO")?.videoUrl ??
    post.contentPost?.videoUrl ??
    null
  );
}

function ProfileVideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri, useCaching: true }, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.muted = true;
  });

  return (
    <VideoView
      player={player}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      allowsPictureInPicture={false}
      surfaceType="textureView"
    />
  );
}

function getPostText(post: Post) {
  if (post.type === "REVIEW") {
    return post.reviewPost?.summary ?? null;
  }

  return post.contentPost?.caption ?? null;
}

export default function ProfilePostGrid({
  posts,
  type,
  onPressPost,
  onCreatePost,
  loading = false,
}: Props) {
  const { t } = useTranslation("profile");
  const { isDark } = useAppTheme();
  const profilePosts = posts.filter((post) => !post.authorRestaurantId);

  if (loading) {
    return (
      <SkeletonPulse
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6",
        }}
      >
        {Array.from({ length: 9 }, (_, index) => (
          <View key={index} className="aspect-square w-1/3 border-[0.5px] border-line dark:border-gray-900">
            <Skeleton height={160} radius={0} />
          </View>
        ))}
      </SkeletonPulse>
    );
  }

  if (profilePosts.length === 0) {
    const isReview = type === "REVIEW";
    const Icon = isReview ? StarIcon : ImagesSquareIcon;

    return (
      <View
        className="min-h-80 items-center justify-center px-10 pb-16 pt-14"
        style={{ backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6" }}
      >
        <View className="h-20 w-20 items-center justify-center rounded-full border-2 border-gray-200 dark:border-gray-700">
          <Icon size={36} color={isDark ? "#FAF9F6" : "#111"} />
        </View>
        <Text weight="bold" className="mt-5 text-xl text-black dark:text-white">
          {isReview ? t("noReviewsTitle") : t("noContentTitle")}
        </Text>
        <Text className="mt-2 text-center text-gray-500">
          {onCreatePost
            ? isReview
              ? t("noReviewsOwnBody")
              : t("noContentOwnBody")
            : isReview
              ? t("noReviewsBody")
              : t("noContentBody")}
        </Text>
        {onCreatePost ? (
          <TouchableOpacity onPress={onCreatePost} className="mt-5 rounded-xl bg-ink px-6 py-3 dark:bg-white">
            <Text weight="bold" className="text-white dark:text-black">
              {isReview ? t("createReview") : t("createPost")}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View
      className="flex-row flex-wrap"
      style={{ backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6" }}
    >
      {profilePosts.map((post) => {
        const imageUrl = getPostImage(post);
        const thumbnailUrl = getPostThumbnail(post);
        const videoUrl = getPostVideo(post);
        const text = getPostText(post);
        const contentMedia = post.contentPost?.media ?? [];

        return (
          <Pressable
            key={post.id}
            onPress={() => onPressPost(post.id)}
            className="aspect-square w-1/3 border-[0.5px] border-line dark:border-gray-900"
            style={{ backgroundColor: isDark ? "#111827" : "#E5E7EB" }}
          >
            {imageUrl ? (
              <>
                <ProgressiveImage
                  source={{ uri: imageUrl }}
                  thumbnailUrl={thumbnailUrl}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />

                {post.type === "REVIEW" && (
                  <>
                    <View className="absolute inset-0 bg-[#0000004D]" />

                    <View className="absolute right-2 top-2 flex-row items-center gap-1 rounded-full bg-[#00000099] px-3 py-1">
                      <StarIcon size={12} color="#F7D786" weight="fill" />
                      <Text className="text-xs font-bold text-white">
                        {post.reviewPost?.overallRating}
                      </Text>
                    </View>
                  </>
                )}
              </>
            ) : videoUrl ? (
              <>
                <ProfileVideoPreview uri={videoUrl} />
                <View className="absolute inset-0 items-center justify-center bg-black/15">
                  <PlayCircleIcon size={34} color="#FAF9F6" weight="fill" />
                </View>
              </>
            ) : (
              <View className="h-full w-full items-center justify-center bg-gray-900 px-2">
                <Text
                  className="text-center text-xs text-white"
                  numberOfLines={3}
                >
                  {text}
                </Text>
              </View>
            )}
            {contentMedia.length > 1 ? (
              <View className="absolute right-2 top-2 rounded-full bg-black/65 p-1.5">
                <ImagesSquareIcon size={15} color="#FAF9F6" weight="fill" />
              </View>
            ) : null}
            {post.repostedBy ? (
              <View className="absolute bottom-2 left-2 flex-row items-center gap-1 rounded-full bg-black/70 px-2 py-1">
                <RepeatIcon size={12} color="#FAF9F6" weight="bold" />
                <Text className="text-[10px] font-bold text-white">{t("reposted")}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
