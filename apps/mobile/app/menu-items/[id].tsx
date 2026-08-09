import { Skeleton, SkeletonPulse } from "@/components/common";
import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import type { DishDetails } from "@findeat/types";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ForkKnifeIcon, HeartIcon, StarIcon } from "phosphor-react-native";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, ScrollView, TouchableOpacity, View } from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { SafeAreaView } from "react-native-safe-area-context";
import { DishCompatibilityChips } from "@/components/restaurants/FoodCompatibility";
import { AppAlert as Alert } from "@/lib/appAlert";
import { publishDishFavoriteChange } from "@/lib/dishFavorites";
import { getMobileCompatibleImageUrl } from "@findeat/utils";

export default function MenuItemScreen() {
  const { isDark } = useAppTheme();
  const { t, i18n } = useTranslation("restaurants");
  const { id, source } = useLocalSearchParams<{
    id: string;
    source?: string;
  }>();
  const isRtl = i18n.dir() === "rtl";
  const showsRestaurantConnection =
    source === "search" || source === "favorites";
  const [dish, setDish] = useState<DishDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoritePending, setFavoritePending] = useState(false);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const displayImageUrl = getMobileCompatibleImageUrl(dish?.imageUrl);

  async function toggleFavorite() {
    if (!dish || favoritePending) return;
    const wasFavorite = dish.isFavorite === true;
    const previousFavoriteCount = dish.favoriteCount ?? 0;
    setFavoritePending(true);
    setDish({
      ...dish,
      isFavorite: !wasFavorite,
      favoriteCount: Math.max(
        0,
        (dish.favoriteCount ?? 0) + (wasFavorite ? -1 : 1),
      ),
    });
    publishDishFavoriteChange({
      dishId: dish.id,
      isFavorite: !wasFavorite,
      favoriteCount: Math.max(
        0,
        (dish.favoriteCount ?? 0) + (wasFavorite ? -1 : 1),
      ),
    });
    try {
      const result = wasFavorite
        ? await api.menu.unfavoriteDish(dish.id)
        : await api.menu.favoriteDish(dish.id);
      setDish((current) =>
        current
          ? {
              ...current,
              isFavorite: result.isFavorite,
              favoriteCount: result.favoriteCount,
            }
          : current,
      );
      publishDishFavoriteChange({
        dishId: dish.id,
        isFavorite: result.isFavorite,
        favoriteCount: result.favoriteCount,
      });
    } catch {
      setDish((current) =>
        current
          ? {
              ...current,
              isFavorite: wasFavorite,
              favoriteCount: previousFavoriteCount,
            }
          : current,
      );
      publishDishFavoriteChange({
        dishId: dish.id,
        isFavorite: wasFavorite,
        favoriteCount: previousFavoriteCount,
      });
      Alert.alert(t("favoriteDishError"));
    } finally {
      setFavoritePending(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    api.menu
      .getDish(id)
      .then((nextDish) => {
        if (!cancelled) {
          const details = nextDish;
          const createdAt = details.createdAt
            ? new Date(details.createdAt).getTime()
            : null;
          const isNew =
            details.isNew ??
            (createdAt != null &&
              Date.now() - createdAt <= 30 * 24 * 60 * 60 * 1000);

          setDish({ ...details, isNew });
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const ratingSummary = useMemo(() => {
    const ratings =
      dish?.reviewItems
        ?.map((review) => review.rating)
        .filter((rating): rating is number => typeof rating === "number") ?? [];
    if (!ratings.length) return null;
    return {
      average:
        ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length,
      count: ratings.length,
    };
  }, [dish?.reviewItems]);

  const dishReviews =
    dish?.reviewItems
      ?.filter((review) => {
        const hasUserPhoto =
          !!review.imageUrl && review.imageUrl !== dish.imageUrl;

        return !!review.text?.trim() || hasUserPhoto;
      })
      .slice(0, 3) ?? [];

  const isNewDish = dish?.isNew === true;

  if (loading) {
    return (
      <View className="flex-1 bg-white dark:bg-black">
        <Stack.Screen options={{ headerShown: false }} />
        <SkeletonPulse>
          <Skeleton height={384} radius={0} />
          <View className="-mt-8 min-h-107.5 gap-5 rounded-t-[34px] bg-white px-5 pb-16 pt-8 dark:bg-black">
            <View className="flex-row justify-between">
              <Skeleton width="62%" height={30} radius={10} />
              <Skeleton width={78} height={42} radius={21} />
            </View>
            <View className="flex-row gap-2">
              <Skeleton width={84} height={30} radius={15} />
              <Skeleton width={70} height={30} radius={15} />
            </View>
            <Skeleton height={82} radius={24} />
            <Skeleton height={132} radius={24} />
            <Skeleton width="42%" height={21} radius={8} />
            <Skeleton height={110} radius={20} />
          </View>
        </SkeletonPulse>
      </View>
    );
  }

  if (!dish) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-6 dark:bg-black">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
          <ForkKnifeIcon size={28} color={isDark ? "#FAF9F6" : "#111"} />
        </View>
        <Text className="mt-4 text-xl font-bold text-black dark:text-white">
          {t("dishNotFound")}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-5 rounded-full bg-black px-5 py-3 dark:bg-white"
        >
          <Text className="font-bold text-white dark:text-black">
            {t("goBack")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6" }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6",
        }}
      >
        {displayImageUrl && failedImageUrl !== displayImageUrl ? (
          <Image
            source={{ uri: displayImageUrl }}
            style={{ width: "100%", height: 384 }}
            resizeMode="cover"
            onError={() => setFailedImageUrl(displayImageUrl)}
          />
        ) : (
          <View className="h-96 w-full items-center justify-center bg-amber-50 dark:bg-gray-900">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-white dark:bg-gray-800">
              <ForkKnifeIcon
                size={40}
                color={isDark ? "#D1D5DB" : "#9A6B42"}
                weight="fill"
              />
            </View>
          </View>
        )}

        <View className="-mt-8 min-h-107.5 rounded-t-[34px] bg-white px-5 pb-16 pt-8 dark:bg-black">
          <View className="flex-row items-center justify-between gap-5">
            <Text className="min-w-0 flex-1 text-3xl font-bold leading-9 text-black dark:text-white">
              {dish.name}
            </Text>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t(
                  dish.isFavorite ? "removeFavoriteDish" : "favoriteDish",
                )}
                disabled={favoritePending}
                onPress={() => void toggleFavorite()}
                className={`h-11 flex-row items-center justify-center gap-1.5 rounded-full px-3 ${
                  dish.isFavorite
                    ? "bg-rose-100 dark:bg-rose-950"
                    : "bg-gray-100 dark:bg-gray-900"
                }`}
                style={{ opacity: favoritePending ? 0.55 : 1 }}
              >
                <HeartIcon
                  size={22}
                  color={
                    dish.isFavorite ? "#E11D48" : isDark ? "#D1D5DB" : "#6B7280"
                  }
                  weight={dish.isFavorite ? "fill" : "regular"}
                />
                <Text
                  className={`text-sm font-bold ${
                    dish.isFavorite
                      ? "text-rose-700 dark:text-rose-300"
                      : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {dish.favoriteCount ?? 0}
                </Text>
              </TouchableOpacity>
              {dish.price != null && (
                <View className="rounded-full bg-brand-soft px-4 py-2 dark:bg-orange-950/50">
                  <Text className="text-xl font-bold text-brand dark:text-orange-300">
                    ₪{dish.price}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View className="mt-3 flex-row flex-wrap gap-2">
            <View
              className={`rounded-full px-3 py-1.5 ${
                dish.isAvailable
                  ? "bg-emerald-100 dark:bg-emerald-950"
                  : "bg-gray-200 dark:bg-gray-800"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  dish.isAvailable
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {t(dish.isAvailable ? "available" : "unavailable")}
              </Text>
            </View>
            {dish.isFeatured && (
              <View className="rounded-full bg-amber-100 px-3 py-1.5 dark:bg-amber-950">
                <Text className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  {t("featured")}
                </Text>
              </View>
            )}
            {isNewDish && (
              <View className="rounded-full bg-blue-100 px-3 py-1.5 dark:bg-blue-950">
                <Text className="text-xs font-bold text-blue-700 dark:text-blue-300">
                  {t("newDish")}
                </Text>
              </View>
            )}
            {!!dish.category && (
              <View className="rounded-full bg-gray-100 px-3 py-1.5 dark:bg-gray-900">
                <Text className="text-xs font-bold text-gray-600 dark:text-gray-300">
                  {dish.category}
                </Text>
              </View>
            )}
          </View>

          {showsRestaurantConnection && dish.restaurant ? (
            <TouchableOpacity
              activeOpacity={0.72}
              onPress={() =>
                router.push({
                  pathname: "/restaurants/[id]",
                  params: { id: dish.restaurant!.id },
                })
              }
              className="mt-5 flex-row items-center rounded-3xl border border-line bg-soft p-4 dark:border-gray-800 dark:bg-gray-900"
              style={isRtl ? { flexDirection: "row-reverse" } : undefined}
            >
              <Avatar
                uri={dish.restaurant.logoUrl}
                username={dish.restaurant.name}
                fallbackType="restaurant"
                size={48}
                showSnapIndicator={false}
              />
              <View
                className="min-w-0 flex-1"
                style={isRtl ? { marginRight: 12 } : { marginLeft: 12 }}
              >
                <Text
                  numberOfLines={1}
                  style={
                    isRtl
                      ? { textAlign: "right", writingDirection: "rtl" }
                      : undefined
                  }
                  className="text-base font-bold text-black dark:text-white"
                >
                  {dish.restaurant.name}
                </Text>
                <Text
                  numberOfLines={1}
                  style={
                    isRtl
                      ? { textAlign: "right", writingDirection: "rtl" }
                      : undefined
                  }
                  className="mt-0.5 text-sm text-gray-500 dark:text-gray-400"
                >
                  {dish.restaurant.city || t("viewRestaurant")}
                </Text>
              </View>
              <View
                className="flex-row items-center rounded-full bg-brand-soft px-3 py-2 dark:bg-orange-950/60"
                style={isRtl ? { flexDirection: "row-reverse" } : undefined}
              >
                <Text className="text-xs font-bold text-brand dark:text-orange-300">
                  {t("viewRestaurant")}
                </Text>
                <View style={isRtl ? { marginRight: 4 } : { marginLeft: 4 }}>
                  <DirectionalIcon
                    direction="forward"
                    size={15}
                    color={isDark ? "#FDBA74" : "#FF5B35"}
                    weight="bold"
                  />
                </View>
              </View>
            </TouchableOpacity>
          ) : null}

          <DishCompatibilityChips compatibility={dish.compatibility} detailed />

          <View className="mt-6 flex-row items-center rounded-3xl border border-line bg-soft p-4 dark:border-gray-800 dark:bg-gray-900">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-soft dark:bg-orange-950/60">
              <StarIcon
                size={23}
                color={isDark ? "#FDBA74" : "#FF5B35"}
                weight="fill"
              />
            </View>
            <View className="ml-3 min-w-0 flex-1">
              <Text className="text-xl font-bold text-black dark:text-white">
                {ratingSummary ? ratingSummary.average.toFixed(1) : "—"}
              </Text>
              <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {ratingSummary
                  ? t("basedOnDishRatings", { count: ratingSummary.count })
                  : t("noDishRatings")}
              </Text>
            </View>
            {!!dish.menu?.title && (
              <View className="max-w-32 rounded-2xl bg-white px-3 py-2 dark:bg-black">
                <Text
                  numberOfLines={2}
                  className="text-right text-xs font-bold text-gray-600 dark:text-gray-300"
                >
                  {dish.menu.title}
                </Text>
              </View>
            )}
          </View>

          <View className="mt-5 rounded-3xl border border-line bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <View className="flex-row items-center">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-soft dark:bg-gray-800">
                <ForkKnifeIcon
                  size={18}
                  color={isDark ? "#E5E7EB" : "#171717"}
                  weight="fill"
                />
              </View>
              <Text className="ml-3 text-lg font-bold text-black dark:text-white">
                {t("aboutDish")}
              </Text>
            </View>
            <Text className="mt-4 text-base leading-7 text-gray-600 dark:text-gray-300">
              {dish.description || t("noDishDescription")}
            </Text>
          </View>

          {dishReviews.length > 0 && (
            <View className="mt-8">
              <Text className="text-xl font-bold text-black dark:text-white">
                {t("dishReviews")}
              </Text>
              <View className="mt-3 gap-3">
                {dishReviews.map((review) => {
                  const author = review.reviewPost?.post?.author;
                  const userDishPhoto =
                    review.imageUrl && review.imageUrl !== dish.imageUrl
                      ? getMobileCompatibleImageUrl(review.imageUrl)
                      : null;

                  return (
                    <View
                      key={review.id}
                      className="rounded-3xl border border-line bg-soft p-4 dark:border-gray-800 dark:bg-gray-900"
                    >
                      <View className="flex-row items-center">
                        <Avatar
                          uri={author?.avatarUrl}
                          username={author?.username ?? "user"}
                          size={34}
                        />
                        <Text className="ml-3 flex-1 text-sm font-bold text-black dark:text-white">
                          {author?.username ?? "user"}
                        </Text>
                        {!!review.rating && (
                          <View className="flex-row items-center rounded-full bg-white px-2.5 py-1.5 dark:bg-black">
                            <StarIcon
                              size={13}
                              color={isDark ? "#FDBA74" : "#FF5B35"}
                              weight="fill"
                            />
                            <Text className="ml-1 text-sm font-bold text-black dark:text-white">
                              {review.rating}/10
                            </Text>
                          </View>
                        )}
                      </View>
                      {userDishPhoto && (
                        <ProgressiveImage
                          source={{ uri: userDishPhoto }}
                          className="mt-4 h-52 w-full rounded-2xl bg-gray-100 dark:bg-gray-800"
                          resizeMode="cover"
                        />
                      )}
                      {!!review.text?.trim() && (
                        <Text className="mt-3 leading-6 text-gray-600 dark:text-gray-300">
                          {review.text}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <SafeAreaView
        edges={["top"]}
        pointerEvents="box-none"
        style={{ position: "absolute", top: 0, left: 0, right: 0 }}
      >
        <View className="px-4 pt-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full bg-black/45"
          >
            <DirectionalIcon
              direction="back"
              size={24}
              color="#FAF9F6"
              weight="bold"
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
