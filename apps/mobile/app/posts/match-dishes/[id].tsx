import Text from "@/components/common/AppText";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { Skeleton, SkeletonPulse } from "@/components/common";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { updatePostInFeedCache } from "@/hooks/useFeed";
import { api } from "@/lib/api";
import type { Dish, Post, ReviewItem } from "@findeat/types";
import { useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  CheckCircleIcon,
  ForkKnifeIcon,
  LinkSimpleIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "phosphor-react-native";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type OfficialDish = Dish & {
  sectionTitle: string;
};

function normalizeDishName(value?: string | null) {
  return (value ?? "")
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function reviewDishName(item: ReviewItem) {
  return item.customDishName?.trim() || item.menuItem?.name?.trim() || "Dish";
}

function reviewDishImage(item: ReviewItem) {
  return [
    item.primaryMedia?.imageUrl,
    item.imageUrl,
    item.media?.[0]?.imageUrl,
    item.primaryMedia?.thumbnailUrl,
    item.thumbnailUrl,
    item.menuItem?.imageUrl,
    item.menuItem?.thumbnailUrl,
  ].find((value): value is string => !!value?.trim());
}

function dishImage(item: Dish) {
  return item.imageUrl?.trim() || item.thumbnailUrl?.trim() || null;
}

function matchScore(reviewName: string, candidateName: string) {
  const source = normalizeDishName(reviewName);
  const candidate = normalizeDishName(candidateName);
  if (!source || !candidate) return 0;
  if (source === candidate) return 100;
  if (source.includes(candidate) || candidate.includes(source)) return 70;

  const sourceWords = new Set(source.split(" "));
  const candidateWords = new Set(candidate.split(" "));
  const shared = [...sourceWords].filter((word) => candidateWords.has(word));
  return (shared.length / Math.max(sourceWords.size, candidateWords.size)) * 60;
}

function formatPrice(value?: number | null) {
  if (value == null) return null;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export default function MatchReviewDishesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useAppTheme();
  const { t } = useTranslation("common");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [post, setPost] = useState<Post | null>(null);
  const [officialDishes, setOfficialDishes] = useState<OfficialDish[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const muted = isDark ? "#9CA3AF" : "#747474";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const nextPost = await api.posts.get(id);
        if (nextPost.type !== "REVIEW" || !nextPost.restaurantId) {
          router.back();
          return;
        }

        const restaurant = await api.restaurants.get(nextPost.restaurantId);
        if (cancelled) return;

        const seen = new Set<string>();
        const dishes = (restaurant.menus ?? []).flatMap((section) =>
          (section.items ?? []).flatMap((dish) => {
            if (seen.has(dish.id)) return [];
            seen.add(dish.id);
            return [{ ...dish, sectionTitle: section.title }];
          }),
        );
        setPost(nextPost);
        setOfficialDishes(dishes);
      } catch (error) {
        console.error("Failed to open dish matching", error);
        showToast(t("matchDishesLoadError"));
        router.back();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, showToast, t]);

  const reviewItems = post?.reviewPost?.items ?? [];
  const selectedItem = reviewItems.find((item) => item.id === selectedItemId);
  const candidateDishes = useMemo(() => {
    if (!selectedItem) return [];
    const search = normalizeDishName(query);
    const reviewName = reviewDishName(selectedItem);
    return officialDishes
      .filter((dish) => !search || normalizeDishName(dish.name).includes(search))
      .map((dish) => ({ dish, score: matchScore(reviewName, dish.name) }))
      .sort((a, b) => b.score - a.score || a.dish.name.localeCompare(b.dish.name));
  }, [officialDishes, query, selectedItem]);

  async function saveLink(menuItemId: string | null) {
    if (!post || !selectedItem || saving) return;
    try {
      setSaving(true);
      const updated = await api.posts.linkReviewDishToMenu(
        post.id,
        selectedItem.id,
        menuItemId,
      );
      setPost(updated);
      updatePostInFeedCache(queryClient, (cached) =>
        cached.id === updated.id ? updated : cached,
      );
      void queryClient.invalidateQueries({ queryKey: ["restaurant-posts"] });
      setSelectedItemId(null);
      setQuery("");
      showToast(t(menuItemId ? "matchDishSaved" : "matchDishUnlinked"));
    } catch (error) {
      console.error("Failed to match review dish", error);
      showToast(t("matchDishSaveError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !post) {
    return (
      <SafeAreaView
        edges={["top", "bottom"]}
        style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <SkeletonPulse>
          <View className="flex-row items-center px-4 py-3">
            <Skeleton width={44} height={44} circle />
            <Skeleton width="44%" height={22} radius={8} style={{ marginHorizontal: "auto" }} />
            <View className="w-11" />
          </View>
          <View className="gap-4 p-5">
            <Skeleton width="88%" height={16} radius={7} />
            {[0, 1, 2].map((value) => <Skeleton key={value} height={104} radius={20} />)}
          </View>
        </SkeletonPulse>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center border-b border-line px-4 py-3 dark:border-gray-800">
        <TouchableOpacity
          onPress={() => selectedItemId ? (setSelectedItemId(null), setQuery("")) : router.back()}
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
          {selectedItem ? t("matchDishChoose") : t("matchDishesTitle")}
        </Text>
        <View className="w-11" />
      </View>

      {selectedItem ? (
        <View className="flex-1">
          <View className="border-b border-line px-5 py-4 dark:border-gray-800">
            <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("yourReviewDish")}
            </Text>
            <Text className="mt-1 text-lg font-bold text-black dark:text-white">
              {reviewDishName(selectedItem)}
            </Text>
            <View className="mt-4 flex-row items-center rounded-2xl bg-gray-100 px-4 dark:bg-gray-900">
              <MagnifyingGlassIcon size={20} color={muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t("matchDishSearch")}
                placeholderTextColor={muted}
                className="h-13 min-w-0 flex-1 px-3 text-base text-black dark:text-white"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {!!query && (
                <TouchableOpacity onPress={() => setQuery("")} className="p-2">
                  <XIcon size={18} color={muted} weight="bold" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          >
            {candidateDishes.map(({ dish, score }) => {
              const imageUrl = dishImage(dish);
              const linked = selectedItem.menuItemId === dish.id;
              const price = formatPrice(dish.price);
              return (
                <TouchableOpacity
                  key={dish.id}
                  disabled={saving}
                  activeOpacity={0.82}
                  onPress={() => void saveLink(dish.id)}
                  className={`mb-3 flex-row items-center gap-3 rounded-3xl border p-3 ${
                    linked
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/25"
                      : "border-line bg-white dark:border-gray-800 dark:bg-gray-900"
                  }`}
                >
                  {imageUrl ? (
                    <ProgressiveImage
                      source={{ uri: imageUrl }}
                      style={{ width: 82, aspectRatio: 4 / 3, borderRadius: 15 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{ width: 82, aspectRatio: 4 / 3 }} className="items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                      <ForkKnifeIcon size={25} color={muted} weight="duotone" />
                    </View>
                  )}
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={2} className="font-bold text-black dark:text-white">
                      {dish.name}
                    </Text>
                    <Text numberOfLines={1} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {[dish.sectionTitle, price ? `${price} ${post.reviewPost?.currency ?? ""}`.trim() : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                    {!query && score >= 50 && (
                      <Text className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {t("likelyMatch")}
                      </Text>
                    )}
                  </View>
                  {saving && linked ? (
                    <ActivityIndicator color="#D97706" />
                  ) : linked ? (
                    <CheckCircleIcon size={25} color="#D97706" weight="fill" />
                  ) : (
                    <LinkSimpleIcon size={22} color={muted} weight="bold" />
                  )}
                </TouchableOpacity>
              );
            })}

            {candidateDishes.length === 0 && (
              <View className="items-center px-8 py-12">
                <ForkKnifeIcon size={48} color={muted} weight="duotone" />
                <Text className="mt-4 text-center text-base font-bold text-black dark:text-white">
                  {t("noMatchingDishes")}
                </Text>
              </View>
            )}

            <TouchableOpacity
              disabled={saving}
              onPress={() => void saveLink(null)}
              className="mt-3 items-center rounded-2xl border border-line px-5 py-4 dark:border-gray-700"
            >
              <Text className="font-bold text-black dark:text-white">
                {t("matchDishNotOnMenu")}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 44 }}
        >
          <Text className="leading-6 text-gray-600 dark:text-gray-300">
            {t("matchDishesIntro", { restaurant: post.restaurant?.name ?? "" })}
          </Text>

          {officialDishes.length === 0 ? (
            <View className="items-center px-8 py-16">
              <ForkKnifeIcon size={52} color={muted} weight="duotone" />
              <Text className="mt-4 text-center text-lg font-bold text-black dark:text-white">
                {t("matchDishesNoMenu")}
              </Text>
            </View>
          ) : (
            <View className="mt-6 gap-3">
              {reviewItems.map((item) => {
                const imageUrl = reviewDishImage(item);
                const linked = !!item.menuItemId;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.84}
                    onPress={() => {
                      setSelectedItemId(item.id);
                      setQuery("");
                    }}
                    className="flex-row items-center gap-3 rounded-3xl border border-line bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
                  >
                    {imageUrl ? (
                      <ProgressiveImage
                        source={{ uri: imageUrl }}
                        style={{ width: 84, aspectRatio: 4 / 3, borderRadius: 15 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ width: 84, aspectRatio: 4 / 3 }} className="items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                        <ForkKnifeIcon size={25} color={muted} weight="duotone" />
                      </View>
                    )}
                    <View className="min-w-0 flex-1">
                      <Text numberOfLines={2} className="font-bold text-black dark:text-white">
                        {reviewDishName(item)}
                      </Text>
                      <Text numberOfLines={1} className={`mt-1 text-sm ${linked ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                        {linked
                          ? t("matchDishesLinked", { dish: item.menuItem?.name ?? "" })
                          : t("matchDishesNotLinked")}
                      </Text>
                    </View>
                    {linked ? (
                      <CheckCircleIcon size={25} color="#16A34A" weight="fill" />
                    ) : (
                      <LinkSimpleIcon size={23} color={muted} weight="bold" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
