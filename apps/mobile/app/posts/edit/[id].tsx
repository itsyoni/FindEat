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
  TrashIcon,
} from "phosphor-react-native";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { SafeAreaView } from "react-native-safe-area-context";

function dishName(item: ReviewItem) {
  return item.menuItem?.name ?? item.customDishName ?? "Dish";
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
  const [itemTexts, setItemTexts] = useState<Record<string, string>>({});
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
        setItemTexts(
          Object.fromEntries(
            (nextPost.reviewPost?.items ?? []).map((item) => [
              item.id,
              item.text ?? "",
            ]),
          ),
        );
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
      removedItemIds.length > 0 ||
      (post.reviewPost?.items ?? []).some(
        (item) => itemTexts[item.id] !== (item.text ?? ""),
      )
    );
  }, [caption, coverImageUri, itemTexts, post, removedItemIds.length, summary]);

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
              items: (post.reviewPost?.items ?? [])
                .filter((item) => !removedItemIds.includes(item.id))
                .map((item) => ({
                  id: item.id,
                  text: itemTexts[item.id] ?? "",
                })),
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
                  {t("reviewText")}
                </Text>
                <TextInput
                  value={summary}
                  onChangeText={setSummary}
                  multiline
                  placeholder={t("reviewText")}
                  className="bg-white dark:bg-gray-900"
                />
              </View>

              <View className="mt-8 gap-4">
                {visibleItems.map((item) => {
                  const imageUrl = dishImage(item);

                  return (
                    <View
                      key={item.id}
                      className="overflow-hidden rounded-3xl border border-line bg-white dark:border-gray-800 dark:bg-gray-900"
                    >
                      <View className="flex-row items-center gap-3 p-4">
                        {imageUrl ? (
                          <ProgressiveImage
                            source={{ uri: imageUrl }}
                            style={{ width: 92, aspectRatio: 4 / 3, borderRadius: 14 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={{ width: 92, aspectRatio: 4 / 3 }} className="items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
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
                          onPress={() =>
                            setRemovedItemIds((current) => [
                              ...current,
                              item.id,
                            ])
                          }
                          className="h-10 w-10 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40"
                        >
                          <TrashIcon size={19} color="#EF4444" weight="fill" />
                        </TouchableOpacity>
                      </View>

                      <View className="px-4 pb-4">
                        <TextInput
                          value={itemTexts[item.id] ?? ""}
                          onChangeText={(text) =>
                            setItemTexts((current) => ({
                              ...current,
                              [item.id]: text,
                            }))
                          }
                          multiline
                          placeholder={t("dishNote")}
                          className="bg-gray-50 dark:bg-black"
                        />
                      </View>
                    </View>
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
