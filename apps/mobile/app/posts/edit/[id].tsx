import { AppAlert as Alert } from "@/lib/appAlert";
import { AppButton, Skeleton, SkeletonPulse, TextInput } from "@/components/common";
import KeyboardAwareFormScrollView from "@/components/common/layout/KeyboardAwareFormScrollView";
import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { updatePostInFeedCache } from "@/hooks/useFeed";
import { api } from "@/lib/api";
import { pickReviewImage } from "@/lib/reviewImagePicker";
import { uploadImage } from "@/lib/uploadImage";
import type { Post, ReviewItem } from "@findeat/types";
import { useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  ImageSquareIcon,
  LinkSimpleIcon,
  MinusIcon,
} from "phosphor-react-native";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { SafeAreaView } from "react-native-safe-area-context";

function dishName(item: ReviewItem) {
  return item.customDishName ?? item.menuItem?.name ?? "Dish";
}

function dishImage(item: ReviewItem) {
  return [
    item.primaryMedia?.imageUrl,
    item.imageUrl,
    item.media?.[0]?.imageUrl,
    item.menuItem?.imageUrl,
    item.primaryMedia?.thumbnailUrl,
    item.thumbnailUrl,
    item.menuItem?.thumbnailUrl,
  ].find((value): value is string => !!value?.trim());
}

export default function EditPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useAppTheme();
  const { t } = useTranslation("common");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [post, setPost] = useState<Post | null>(null);
  const [caption, setCaption] = useState("");
  const [summary, setSummary] = useState("");
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [removedItemIds, setRemovedItemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void api.posts
      .get(id)
      .then((nextPost) => {
        if (cancelled) return;
        if (!nextPost.canDelete) {
          router.back();
          return;
        }

        setPost(nextPost);
        setCaption(nextPost.contentPost?.caption ?? "");
        setSummary(nextPost.reviewPost?.summary ?? "");
      })
      .catch((error) => {
        console.error("Failed to open post editor", error);
        Alert.alert(t("error"), t("editPostError"));
        router.back();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const isDirty = useMemo(() => {
    if (!post) return false;

    if (post.type === "CONTENT") {
      return caption !== (post.contentPost?.caption ?? "");
    }

    return (
      coverImageUri !== null ||
      summary !== (post.reviewPost?.summary ?? "") ||
      removedItemIds.length > 0
    );
  }, [caption, coverImageUri, post, removedItemIds.length, summary]);

  async function saveChanges() {
    if (!post || saving || !isDirty) return;

    try {
      setSaving(true);
      const uploadedCoverImageUrl =
        post.type === "REVIEW" && coverImageUri
          ? await uploadImage(coverImageUri, "review")
          : undefined;
      const updatedPost =
        post.type === "CONTENT"
          ? await api.posts.updateContent(post.id, { caption })
          : await api.posts.updateReview(post.id, {
              coverImageUrl: uploadedCoverImageUrl,
              summary,
              items: [],
              removedItemIds,
            });

      updatePostInFeedCache(queryClient, (cachedPost) =>
        cachedPost.id === updatedPost.id ? updatedPost : cachedPost,
      );
      void queryClient.invalidateQueries({ queryKey: ["restaurant-posts"] });
      router.back();
      showToast(t("postUpdated"));
    } catch (error) {
      console.error("Failed to update post", error);
      Alert.alert(t("error"), t("editPostError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !post) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}>
        <Stack.Screen options={{ headerShown: false }} />
        <SkeletonPulse>
          <View className="flex-row items-center border-b border-line px-4 py-3 dark:border-gray-800"><Skeleton width={44} height={44} circle /><Skeleton width="40%" height={20} radius={8} style={{ marginHorizontal: "auto" }} /><View className="w-11" /></View>
          <View className="gap-5 p-5"><Skeleton width="86%" height={13} radius={6} /><View className="overflow-hidden rounded-3xl"><Skeleton height={208} radius={0} /><Skeleton height={42} radius={0} /></View><Skeleton width="25%" height={12} radius={6} /><Skeleton height={110} radius={16} /><Skeleton height={48} radius={14} /></View>
        </SkeletonPulse>
      </SafeAreaView>
    );
  }

  const isContent = post.type === "CONTENT";
  const reviewHasCover = !!post.reviewPost?.coverImageUrl?.trim();
  const mediaUrl = isContent
    ? post.contentPost?.imageUrl
    : coverImageUri ?? post.reviewPost?.coverImageUrl;
  const reviewItems = post.reviewPost?.items ?? [];
  const visibleItems = reviewItems.filter(
    (item) => !removedItemIds.includes(item.id),
  );
  const removedItems = reviewItems.filter((item) =>
    removedItemIds.includes(item.id),
  );

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1 }}>
        <View className="flex-row items-center border-b border-line px-4 py-3 dark:border-gray-800">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center"
          >
            <DirectionalIcon
              direction="back"
              size={25}
              color={isDark ? "#FAF9F6" : "#171717"}
              weight="bold"
            />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-xl font-bold text-black dark:text-white">
            {t(isContent ? "editContentTitle" : "editReviewTitle")}
          </Text>
          <View className="w-11" />
        </View>

        <KeyboardAwareFormScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 44 }}
          bottomOffset={28}
        >
          <Text className="leading-5 text-gray-500 dark:text-gray-400">
            {t(isContent ? "editContentHint" : "editReviewHint")}
          </Text>

          {isContent ? (
            <View className="mt-6 overflow-hidden rounded-3xl border border-line bg-white dark:border-gray-800 dark:bg-gray-900">
              {mediaUrl ? (
                <ProgressiveImage
                  source={{ uri: mediaUrl }}
                  className="h-52 w-full bg-gray-100 dark:bg-gray-800"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-28 items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <ImageSquareIcon
                    size={30}
                    color={isDark ? "#9CA3AF" : "#747474"}
                  />
                </View>
              )}
              <Text className="px-4 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400">
                {t("mediaLocked")}
              </Text>
            </View>
          ) : mediaUrl ? (
            <View className="mt-6 overflow-hidden rounded-3xl bg-gray-100 dark:bg-gray-800">
              <ProgressiveImage
                source={{ uri: mediaUrl }}
                style={{ width: "100%", aspectRatio: 4 / 3 }}
                resizeMode="cover"
              />
            </View>
          ) : !reviewHasCover ? (
            <TouchableOpacity
              activeOpacity={0.86}
              disabled={saving}
              onPress={() => {
                void pickReviewImage("gallery", "cover", t("addCover"))
                  .then((asset) => {
                    if (asset?.uri) setCoverImageUri(asset.uri);
                  })
                  .catch((error) => {
                    console.error("Failed to add review cover", error);
                    Alert.alert(t("error"), t("editPostError"));
                  });
              }}
              className="mt-6 h-14 flex-row items-center justify-center rounded-2xl bg-black dark:bg-white"
            >
              <ImageSquareIcon
                size={21}
                color={isDark ? "#171717" : "#FAF9F6"}
                weight="bold"
              />
              <Text className="ml-2 font-bold text-white dark:text-black">
                {t("addCover")}
              </Text>
            </TouchableOpacity>
          ) : null}

          {isContent ? (
            <View className="mt-7">
              <Text className="mb-3 text-lg font-bold text-black dark:text-white">
                {t("caption")}
              </Text>
              <TextInput
                value={caption}
                onChangeText={setCaption}
                multiline
                placeholder={t("caption")}
                className="bg-white dark:bg-gray-900"
              />
            </View>
          ) : (
            <>
              <View className="mt-7">
                <Text className="mb-3 text-lg font-bold text-black dark:text-white">
                  {t("reviewCaption")}
                </Text>
                <TextInput
                  value={summary}
                  onChangeText={setSummary}
                  multiline
                  placeholder={t("reviewCaptionPlaceholder")}
                  className="min-h-24 rounded-none border-0 bg-transparent px-0 dark:border-0 dark:bg-transparent"
                  style={{ minHeight: 96, paddingTop: 8, paddingBottom: 14 }}
                />
                <View className="h-px bg-gray-200 dark:bg-gray-800" />
              </View>

              <View className="mt-7 overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={() =>
                    router.push({
                      pathname: "/posts/match-dishes/[id]",
                      params: { id: post.id },
                    })
                  }
                  className="flex-row items-center gap-3 px-4 py-4"
                >
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/50">
                    <LinkSimpleIcon size={22} color="#D97706" weight="bold" />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="font-bold text-black dark:text-white">
                      {t("matchDishesAction")}
                    </Text>
                    <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {t("matchDishesEditHint")}
                    </Text>
                  </View>
                  <DirectionalIcon direction="forward" size={20} color={isDark ? "#9CA3AF" : "#747474"} weight="bold" />
                </TouchableOpacity>

                {(post.reviewParticipants?.length ?? 0) > 0 ? (
                  <>
                    <View className="ml-[70px] h-px bg-gray-100 dark:bg-gray-800" />
                    <TouchableOpacity
                      activeOpacity={0.84}
                      onPress={() =>
                        router.push({
                          pathname: "/posts/contribute/[id]",
                          params: { id: post.id },
                        })
                      }
                      className="flex-row items-center gap-3 px-4 py-4"
                    >
                      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-yellow-50 dark:bg-yellow-950/40">
                        <ImageSquareIcon size={22} color="#D4A72C" weight="bold" />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="font-bold text-black dark:text-white">
                          {t("sharedReviewDetails")}
                        </Text>
                        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {t("sharedReviewDetailsHint")}
                        </Text>
                      </View>
                      <DirectionalIcon direction="forward" size={20} color={isDark ? "#9CA3AF" : "#747474"} weight="bold" />
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>

              <View className="mt-8 gap-4">
                <View className="flex-row items-end justify-between">
                  <Text className="text-xl font-bold text-black dark:text-white">
                    {t("reviewDishes")}
                  </Text>
                  <Text className="text-sm text-gray-400">{t("tapDishToEdit")}</Text>
                </View>
                {visibleItems.map((item) => {
                  const imageUrl = dishImage(item);

                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.82}
                      onPress={() =>
                        router.push({
                          pathname: "/posts/edit/[id]/dish/[itemId]",
                          params: { id: post.id, itemId: item.id },
                        })
                      }
                      className="flex-row rounded-[22px] border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
                      style={{
                        shadowColor: "#171717",
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 3 },
                        elevation: 1,
                      }}
                    >
                      <View className="flex-row flex-1 items-center gap-3">
                        {imageUrl ? (
                          <ProgressiveImage
                            source={{ uri: imageUrl }}
                            style={{ width: 112, height: 84, borderRadius: 14 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={{ width: 112, height: 84 }} className="items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                            <ImageSquareIcon
                              size={24}
                              color={isDark ? "#9CA3AF" : "#747474"}
                            />
                          </View>
                        )}
                        <View className="min-w-0 flex-1">
                          <Text
                            numberOfLines={2}
                            className="text-lg font-bold text-black dark:text-white"
                          >
                            {dishName(item)}
                          </Text>
                          {item.rating != null && (
                            <Text className="mt-1 text-sm text-gray-500">
                              {item.rating}/10
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          accessibilityLabel={t("removeDish")}
                          onPress={(event) => {
                            event.stopPropagation();
                            setRemovedItemIds((current) => [
                              ...current,
                              item.id,
                            ]);
                          }}
                          className="h-8 w-8 items-center justify-center rounded-full bg-red-500"
                        >
                          <MinusIcon size={17} color="#FAF9F6" weight="bold" />
                        </TouchableOpacity>
                        <DirectionalIcon
                          direction="forward"
                          size={18}
                          color={isDark ? "#9CA3AF" : "#747474"}
                          weight="bold"
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {removedItems.length > 0 && (
                <View className="mt-7 rounded-3xl bg-red-50 p-4 dark:bg-red-950/30">
                  <Text className="font-bold text-red-700 dark:text-red-300">
                    {t("removedDishes")}
                  </Text>
                  <View className="mt-2 gap-2">
                    {removedItems.map((item) => (
                      <View
                        key={item.id}
                        className="flex-row items-center justify-between gap-3"
                      >
                        <Text
                          numberOfLines={1}
                          className="min-w-0 flex-1 text-red-700 dark:text-red-300"
                        >
                          {dishName(item)}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            setRemovedItemIds((current) =>
                              current.filter((itemId) => itemId !== item.id),
                            )
                          }
                        >
                          <Text className="font-bold text-red-700 dark:text-red-300">
                            {t("undo")}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}

          <AppButton
            title={t("saveChanges")}
            onPress={() => void saveChanges()}
            loading={saving}
            disabled={!isDirty}
            className="mt-8"
          />
        </KeyboardAwareFormScrollView>
      </View>
    </SafeAreaView>
  );
}
