import { Skeleton, SkeletonPulse } from "@/components/common";
import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import SettingsHeader from "@/components/settings/SettingsHeader";
import useSettingsDirection from "@/components/settings/useSettingsDirection";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import type { Post, SavedPostAttribution } from "@findeat/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { router, useFocusEffect } from "expo-router";
import { BookmarkSimpleIcon, MapPinIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function postImage(post: Post) {
  return post.type === "REVIEW"
    ? post.reviewPost?.coverImageUrl
    : post.contentPost?.imageUrl;
}

function postCaption(post: Post) {
  return post.type === "REVIEW"
    ? post.reviewPost?.summary
    : post.contentPost?.caption;
}

function SavedPostsSkeleton() {
  return (
    <SkeletonPulse style={{ padding: 16, gap: 14 }}>
      {Array.from({ length: 5 }).map((_, index) => (
        <View key={index} className="overflow-hidden rounded-3xl border border-line bg-white dark:border-gray-800 dark:bg-gray-950">
          <View className="flex-row items-center gap-3 p-3">
            <Skeleton width={38} height={38} radius={19} />
            <View className="flex-1 gap-2">
              <Skeleton width="45%" height={14} radius={7} />
              <Skeleton width="30%" height={11} radius={6} />
            </View>
          </View>
          <View className="flex-row gap-3 border-t border-line p-3 dark:border-gray-800">
            <Skeleton width={92} height={116} radius={17} />
            <View className="flex-1 justify-center gap-3">
              <Skeleton width="35%" height={12} radius={6} />
              <Skeleton width="90%" height={16} radius={8} />
              <Skeleton width="62%" height={12} radius={6} />
            </View>
          </View>
        </View>
      ))}
    </SkeletonPulse>
  );
}

export function SavedPostCard({ item }: { item: SavedPostAttribution }) {
  const { t } = useTranslation("settings");
  const { rowStyle, textStyle } = useSettingsDirection();
  const image = postImage(item.post);
  const caption = postCaption(item.post);
  const creator =
    item.post.author?.username ||
    item.post.authorRestaurant?.name;

  return (
    <View className="overflow-hidden rounded-3xl border border-line bg-white dark:border-gray-800 dark:bg-gray-950">
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/restaurants/${item.restaurant.id}`)}
        className="flex-row items-center p-3"
        style={rowStyle}
      >
        <Avatar uri={item.restaurant.logoUrl} username={item.restaurant.name} size={38} />
        <View className="min-w-0 flex-1" style={{ marginStart: 11 }}>
          <Text numberOfLines={1} weight="bold" className="text-base text-black dark:text-white" style={textStyle}>
            {item.restaurant.name}
          </Text>
          {item.restaurant.city ? (
            <View className="mt-0.5 flex-row items-center" style={rowStyle}>
              <MapPinIcon size={12} color="#9CA3AF" weight="fill" />
              <Text numberOfLines={1} className="text-xs text-gray-500" style={[textStyle, { marginStart: 4 }]}>
                {item.restaurant.city}
              </Text>
            </View>
          ) : null}
        </View>
        <View className="rounded-full bg-amber-100 px-2.5 py-1 dark:bg-amber-950">
          <Text className="text-[10px] font-black text-amber-700 dark:text-amber-300">
            {t(item.favorite ? "favoritePlace" : item.visited ? "visitedPlace" : "savedPlace")}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() =>
          router.push({ pathname: "/(posts)/[id]", params: { id: item.post.id } })
        }
        className="flex-row border-t border-line p-3 dark:border-gray-800"
        style={rowStyle}
      >
        {image ? (
          <ProgressiveImage source={{ uri: image }} style={{ width: 92, height: 116, borderRadius: 17 }} contentFit="cover" transition={150} />
        ) : (
          <View className="h-[116px] w-[92px] items-center justify-center rounded-[17px] bg-gray-100 dark:bg-gray-900">
            <BookmarkSimpleIcon size={27} color="#D1A928" weight="fill" />
          </View>
        )}
        <View className="min-w-0 flex-1 justify-center" style={{ marginStart: 12 }}>
          <Text weight="bold" className="text-xs uppercase tracking-wide text-amber-600" style={textStyle}>
            {t(item.post.type === "REVIEW" ? "savedReview" : "savedContentPost")}
          </Text>
          <Text numberOfLines={2} weight="bold" className="mt-1 text-[15px] leading-5 text-black dark:text-white" style={textStyle}>
            {caption || t("savedPostFallback")}
          </Text>
          {creator ? (
            <Text numberOfLines={1} className="mt-2 text-xs text-gray-500" style={textStyle}>
              {t("savedBecauseOfCreator", { name: creator })}
            </Text>
          ) : null}
          <Text className="mt-2 text-xs font-bold text-blue-500" style={textStyle}>
            {t("openSavedPost")}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default function SavedPostsScreen() {
  const { t } = useTranslation("settings");
  const { isDark } = useAppTheme();
  const { textStyle } = useSettingsDirection();
  const queryClient = useQueryClient();
  const savedPosts = useQuery({
    queryKey: ["saved-post-attributions"],
    queryFn: () => api.restaurants.savedPostsMine(),
  });

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ["saved-post-attributions"] });
    }, [queryClient]),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}>
      <SettingsHeader title={t("savedPosts")} />
      {savedPosts.isLoading ? (
        <SavedPostsSkeleton />
      ) : savedPosts.isError ? (
        <View className="flex-1 items-center justify-center px-8 pb-20">
          <Text className="text-center text-gray-500" style={textStyle}>{t("savedPostsLoadError")}</Text>
          <TouchableOpacity onPress={() => void savedPosts.refetch()} className="mt-4 rounded-2xl bg-black px-5 py-3 dark:bg-white">
            <Text weight="bold" className="text-white dark:text-black">{t("archiveRetry")}</Text>
          </TouchableOpacity>
        </View>
      ) : !savedPosts.data?.length ? (
        <View className="flex-1 items-center justify-center px-8 pb-20">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
            <BookmarkSimpleIcon size={38} color="#D1A928" weight="fill" />
          </View>
          <Text weight="bold" className="mt-5 text-center text-xl text-black dark:text-white" style={[textStyle, { textAlign: "center" }]}>{t("savedPostsEmpty")}</Text>
          <Text className="mt-2 text-center leading-5 text-gray-500" style={[textStyle, { textAlign: "center" }]}>{t("savedPostsEmptySubtitle")}</Text>
        </View>
      ) : (
        <FlatList
          data={savedPosts.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 36 }}
          renderItem={({ item }) => <SavedPostCard item={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
