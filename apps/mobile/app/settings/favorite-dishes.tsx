import { Skeleton, SkeletonPulse } from "@/components/common";
import Text from "@/components/common/AppText";
import DishCard from "@/components/restaurants/DishCard";
import SettingsHeader from "@/components/settings/SettingsHeader";
import useSettingsDirection from "@/components/settings/useSettingsDirection";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import { subscribeToDishFavoriteChanges } from "@/lib/dishFavorites";
import type { DishSearchResult } from "@findeat/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { ForkKnifeIcon } from "phosphor-react-native";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const favoriteDishesQueryKey = ["favorite-dishes"] as const;

function FavoriteDishesSkeleton() {
  return (
    <SkeletonPulse style={{ paddingHorizontal: 16, paddingTop: 8, gap: 12 }}>
      {Array.from({ length: 5 }).map((_, index) => (
        <View
          key={index}
          className="flex-row gap-3 rounded-3xl border border-line bg-white p-3 dark:border-gray-800 dark:bg-gray-950"
        >
          <Skeleton width={144} height={112} radius={16} />
          <View className="flex-1 justify-center gap-3">
            <Skeleton width="70%" height={17} radius={8} />
            <Skeleton width="48%" height={12} radius={6} />
            <Skeleton width="82%" height={14} radius={7} />
          </View>
        </View>
      ))}
    </SkeletonPulse>
  );
}

export default function FavoriteDishesScreen() {
  const { t } = useTranslation("settings");
  const { isDark } = useAppTheme();
  const { textStyle } = useSettingsDirection();
  const queryClient = useQueryClient();
  const favorites = useQuery({
    queryKey: favoriteDishesQueryKey,
    queryFn: () => api.menu.favoriteDishes(),
  });

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: favoriteDishesQueryKey });
    }, [queryClient]),
  );

  useEffect(
    () =>
      subscribeToDishFavoriteChanges((change) => {
        queryClient.setQueryData<DishSearchResult[]>(
          favoriteDishesQueryKey,
          (current) =>
            change.isFavorite
              ? current
              : current?.filter((dish) => dish.id !== change.dishId),
        );
      }),
    [queryClient],
  );

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8",
      }}
    >
      <SettingsHeader title={t("favoriteDishes")} />
      {favorites.isLoading ? (
        <FavoriteDishesSkeleton />
      ) : favorites.isError ? (
        <View className="flex-1 items-center justify-center px-8 pb-20">
          <Text className="text-center text-gray-500" style={textStyle}>
            {t("favoriteDishesLoadError")}
          </Text>
          <TouchableOpacity
            onPress={() => void favorites.refetch()}
            className="mt-4 rounded-2xl bg-black px-5 py-3 dark:bg-white"
          >
            <Text weight="bold" className="text-white dark:text-black">
              {t("archiveRetry")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : !favorites.data?.length ? (
        <View className="flex-1 items-center justify-center px-8 pb-20">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950">
            <ForkKnifeIcon size={38} color="#E11D48" weight="fill" />
          </View>
          <Text
            weight="bold"
            className="mt-5 text-xl text-black dark:text-white"
            style={textStyle}
          >
            {t("favoriteDishesEmpty")}
          </Text>
          <Text
            className="mt-2 text-center leading-5 text-gray-500"
            style={textStyle}
          >
            {t("favoriteDishesEmptySubtitle")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={favorites.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 36 }}
          renderItem={({ item }) => (
            <DishCard
              item={item}
              isFavorite
              detailSource="favorites"
              contextLabel={`${item.restaurant.name}${
                item.restaurant.city ? ` · ${item.restaurant.city}` : ""
              }`}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
