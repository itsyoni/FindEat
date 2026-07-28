import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import type { Post, PostType } from "@findeat/types";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircleIcon,
  NotePencilIcon,
  PlayIcon,
} from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";

type Props = {
  restaurantId?: string;
  candidateType: PostType;
  selectedPostId?: string;
  onSelect: (postId?: string) => void;
};

export default function PostConnectionPicker({
  restaurantId,
  candidateType,
  selectedPostId,
  onSelect,
}: Props) {
  const { t } = useTranslation("create");
  const { isDark } = useAppTheme();
  const { data: posts = [], isLoading: loading } = useQuery<Post[]>({
    queryKey: ["post-link-candidates", restaurantId, candidateType],
    queryFn: () => api.posts.linkCandidates(restaurantId!, candidateType),
    enabled: !!restaurantId,
  });

  if (!restaurantId || (!loading && posts.length === 0)) return null;

  const isReview = candidateType === "REVIEW";

  return (
    <View className="mt-6 border-t border-gray-100 pt-5 dark:border-gray-800">
      <Text className="text-base font-bold text-black dark:text-white">
        {t(isReview ? "connectReviewTitle" : "connectContentTitle")}
      </Text>
      <Text className="mt-1 text-sm leading-5 text-gray-500">
        {t(isReview ? "connectReviewHint" : "connectContentHint")}
      </Text>

      {loading ? (
        <ActivityIndicator className="mt-5 self-start" />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingTop: 14, paddingRight: 20 }}
        >
          {posts.map((post) => {
            const selected = selectedPostId === post.id;
            const imageUrl = isReview
              ? post.reviewPost?.coverImageUrl
              : post.contentPost?.imageUrl;
            const text = isReview
              ? post.reviewPost?.summary
              : post.contentPost?.description;
            const rating = post.reviewPost?.overallRating;

            return (
              <TouchableOpacity
                key={post.id}
                activeOpacity={0.85}
                onPress={() => onSelect(selected ? undefined : post.id)}
                className={`w-52 overflow-hidden rounded-2xl border bg-gray-50 dark:bg-gray-900 ${
                  selected
                    ? "border-[#E2B84B]"
                    : "border-gray-200 dark:border-gray-800"
                }`}
              >
                <View className="h-24 bg-gray-200 dark:bg-gray-800">
                  {imageUrl ? (
                    <ProgressiveImage
                      source={{ uri: imageUrl }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-full items-center justify-center">
                      {isReview ? (
                        <NotePencilIcon
                          size={28}
                          color={isDark ? "#D1D5DB" : "#6B7280"}
                          weight="fill"
                        />
                      ) : (
                        <PlayIcon
                          size={28}
                          color={isDark ? "#D1D5DB" : "#6B7280"}
                          weight="fill"
                        />
                      )}
                    </View>
                  )}
                  {selected ? (
                    <View className="absolute right-2 top-2 rounded-full bg-black/70 p-0.5">
                      <CheckCircleIcon size={23} color="#F7D786" weight="fill" />
                    </View>
                  ) : null}
                </View>

                <View className="p-3">
                  <Text className="font-bold text-black dark:text-white">
                    {isReview
                      ? t("writtenReview")
                      : post.contentPost?.videoUrl
                        ? t("videoPost")
                        : t("quickPost")}
                    {rating != null ? ` · ${rating}/10` : ""}
                  </Text>
                  <Text
                    numberOfLines={2}
                    className="mt-1 min-h-10 text-sm leading-5 text-gray-500"
                  >
                    {text || t("connectedPostFallback")}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
