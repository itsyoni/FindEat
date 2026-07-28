import { Post, PostType } from "@findeat/types/post";
import { Pressable, TouchableOpacity, View } from "react-native";
import Text from "../common/AppText";
import { ImagesSquareIcon, StarIcon } from "phosphor-react-native";
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
    return post.reviewPost?.coverImageUrl ?? null;
  }

  return post.contentPost?.imageUrl ?? null;
}

function getPostThumbnail(post: Post) {
  return post.type === "REVIEW"
    ? post.reviewPost?.coverThumbnailUrl
    : post.contentPost?.thumbnailUrl;
}

function getPostText(post: Post) {
  if (post.type === "REVIEW") {
    return post.reviewPost?.summary ?? null;
  }

  return post.contentPost?.description ?? null;
}

export default function ProfilePostGrid({ posts, type, onPressPost, onCreatePost, loading = false }: Props) {
  const { t } = useTranslation("profile");
  const { isDark } = useAppTheme();

  if (loading) {
    return (
      <SkeletonPulse
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          backgroundColor: isDark ? "#000" : "#FFF",
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

  if (posts.length === 0) {
    const isReview = type === "REVIEW";
    const Icon = isReview ? StarIcon : ImagesSquareIcon;

    return (
      <View
        className="min-h-80 items-center justify-center px-10 pb-16 pt-14"
        style={{ backgroundColor: isDark ? "#000" : "#FFF" }}
      >
        <View className="h-20 w-20 items-center justify-center rounded-full border-2 border-gray-200 dark:border-gray-700">
          <Icon size={36} color={isDark ? "#FFF" : "#111"} />
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
      style={{ backgroundColor: isDark ? "#000" : "#FFF" }}
    >
      {posts.map((post) => {
        const imageUrl = getPostImage(post);
        const thumbnailUrl = getPostThumbnail(post);
        const text = getPostText(post);

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
                  className="h-full w-full"
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
          </Pressable>
        );
      })}
    </View>
  );
}
