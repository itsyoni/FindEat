import { AppAlert as Alert } from "@/lib/appAlert";
import { AppButton, Skeleton, SkeletonPulse, TextInput } from "@/components/common";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { updatePostInFeedCache } from "@/hooks/useFeed";
import { api } from "@/lib/api";
import type { Post, ReviewItem } from "@findeat/types";
import { useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ImageSquareIcon } from "phosphor-react-native";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function itemName(item: ReviewItem, fallback: string) {
  return item.customDishName ?? item.menuItem?.name ?? fallback;
}

function itemImage(item: ReviewItem) {
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

export default function EditReviewDishScreen() {
  const { id, itemId } = useLocalSearchParams<{ id: string; itemId: string }>();
  const { isDark } = useAppTheme();
  const { t } = useTranslation("common");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [post, setPost] = useState<Post | null>(null);
  const [item, setItem] = useState<ReviewItem | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api.posts
      .get(id)
      .then((nextPost) => {
        if (cancelled) return;
        if (!nextPost.canDelete || nextPost.type !== "REVIEW") {
          router.back();
          return;
        }
        const nextItem = nextPost.reviewPost?.items.find(
          (candidate) => candidate.id === itemId,
        );
        if (!nextItem) throw new Error("Review dish not found");
        setPost(nextPost);
        setItem(nextItem);
        setCaption(nextItem.text ?? "");
      })
      .catch((error) => {
        console.error("Failed to open review dish editor", error);
        Alert.alert(t("error"), t("editDishLoadError"));
        router.back();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, itemId, t]);

  const isDirty = useMemo(
    () => !!item && caption.trim() !== (item.text ?? "").trim(),
    [caption, item],
  );

  async function save() {
    if (!post || !item || saving || !isDirty) return;
    try {
      setSaving(true);
      const updatedPost = await api.posts.updateReviewDish(post.id, item.id, caption);
      updatePostInFeedCache(queryClient, (cachedPost) =>
        cachedPost.id === updatedPost.id ? updatedPost : cachedPost,
      );
      void queryClient.invalidateQueries({ queryKey: ["restaurant-posts"] });
      showToast(t("dishUpdated"));
      router.back();
    } catch (error) {
      console.error("Failed to update review dish", error);
      Alert.alert(t("error"), t("editDishSaveError"));
    } finally {
      setSaving(false);
    }
  }

  const backgroundColor = isDark ? "#0B0B0A" : "#FBFAF8";

  if (loading || !item) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor }}>
        <Stack.Screen options={{ headerShown: false }} />
        <SkeletonPulse>
          <View className="flex-row items-center border-b border-line px-4 py-3 dark:border-gray-800">
            <Skeleton width={44} height={44} circle />
            <Skeleton width="42%" height={20} radius={8} style={{ marginHorizontal: "auto" }} />
            <View className="w-11" />
          </View>
          <View className="gap-5 p-5">
            <Skeleton width="100%" height={260} radius={24} />
            <Skeleton width="45%" height={24} radius={8} />
            <Skeleton width="100%" height={140} radius={18} />
          </View>
        </SkeletonPulse>
      </SafeAreaView>
    );
  }

  const imageUrl = itemImage(item);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor }}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View className="flex-row items-center border-b border-line px-4 py-3 dark:border-gray-800">
          <TouchableOpacity onPress={() => router.back()} className="h-11 w-11 items-center justify-center">
            <DirectionalIcon direction="back" size={25} color={isDark ? "#FAF9F6" : "#171717"} weight="bold" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-xl font-bold text-black dark:text-white">
            {t("editDishTitle")}
          </Text>
          <View className="w-11" />
        </View>

        <TouchableWithoutFeedback
          accessible={false}
          onPress={Keyboard.dismiss}
        >
        <View className="flex-1 px-5 pt-5">
          <View className="overflow-hidden rounded-3xl bg-gray-100 dark:bg-gray-800">
            {imageUrl ? (
              <ProgressiveImage source={{ uri: imageUrl }} style={{ width: "100%", aspectRatio: 4 / 3 }} resizeMode="cover" />
            ) : (
              <View style={{ width: "100%", aspectRatio: 4 / 3 }} className="items-center justify-center">
                <ImageSquareIcon size={34} color={isDark ? "#9CA3AF" : "#747474"} />
              </View>
            )}
          </View>

          <View className="mt-5 flex-row items-center gap-3">
            <Text numberOfLines={2} className="min-w-0 flex-1 text-2xl font-bold text-black dark:text-white">
              {itemName(item, t("dish"))}
            </Text>
            {item.rating != null ? (
              <View className="rounded-full bg-orange-100 px-3 py-1.5 dark:bg-orange-950/50">
                <Text className="font-bold text-orange-700 dark:text-orange-300">{item.rating}/10</Text>
              </View>
            ) : null}
          </View>

          <Text className="mb-2 mt-6 text-lg font-bold text-black dark:text-white">{t("dishCaption")}</Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            multiline
            placeholder={t("dishCaptionPlaceholder")}
            className="min-h-24 rounded-none border-0 bg-transparent px-0 dark:border-0 dark:bg-transparent"
            style={{ minHeight: 96, paddingTop: 8, paddingBottom: 14 }}
          />
          <View className="h-px bg-gray-200 dark:bg-gray-800" />

          <View className="mt-auto pb-3 pt-5">
            <AppButton title={t("saveChanges")} onPress={() => void save()} loading={saving} disabled={!isDirty} />
          </View>
        </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
