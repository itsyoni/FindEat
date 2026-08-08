import { useAppTheme } from "@/contexts/ThemeContext";
import { Restaurant } from "@findeat/types";
import {
  BookOpenIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "phosphor-react-native";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import Text from "../common/AppText";
import DishCard from "./DishCard";
import { subscribeToDishFavoriteChanges } from "@/lib/dishFavorites";

type Props = {
  restaurant: Restaurant;
  featuredItems: Restaurant["menus"][number]["items"];
};

export default function RestaurantMenuSection({
  restaurant,
  featuredItems,
}: Props) {
  const { isDark } = useAppTheme();
  const { t } = useTranslation("restaurants");
  const [query, setQuery] = useState("");
  const [selectedMenuId, setSelectedMenuId] = useState("ALL");
  const [favoriteOverrides, setFavoriteOverrides] = useState<
    Record<string, boolean>
  >({});

  useEffect(
    () =>
      subscribeToDishFavoriteChanges(({ dishId, isFavorite }) => {
        setFavoriteOverrides((current) => ({
          ...current,
          [dishId]: isFavorite,
        }));
      }),
    [],
  );

  const availableCount = useMemo(
    () =>
      restaurant.menus.reduce(
        (total, menu) =>
          total +
          menu.items.filter((item) => item.isAvailable !== false).length,
        0,
      ),
    [restaurant.menus],
  );

  const popularItems = useMemo(
    () =>
      restaurant.menus
        .flatMap((menu) => menu.items)
        .filter((item) => (item.reviewsCount ?? 0) > 0)
        .sort(
          (a, b) =>
            (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0) ||
            (b.averageRating ?? 0) - (a.averageRating ?? 0),
        )
        .slice(0, 3),
    [restaurant.menus],
  );
  const popularIds = useMemo(
    () => new Set(popularItems.map((item) => item.id)),
    [popularItems],
  );

  const visibleMenus = useMemo(() => {
    const cleanQuery = query.trim().toLocaleLowerCase();

    return restaurant.menus
      .filter((menu) => selectedMenuId === "ALL" || menu.id === selectedMenuId)
      .map((menu) => ({
        ...menu,
        items: menu.items.filter((item) => {
          if (!cleanQuery) return true;
          return [
            item.name,
            item.description,
            item.category,
            ...(item.allergens ?? []),
            ...(item.dietaryTags ?? []),
            ...(item.cuisineTags ?? []),
            ...(item.dishTags ?? []),
          ]
            .filter(Boolean)
            .some((value) => value!.toLocaleLowerCase().includes(cleanQuery));
        }),
      }))
      .filter((menu) => menu.items.length > 0 || !cleanQuery);
  }, [query, restaurant.menus, selectedMenuId]);

  const visibleItemCount = visibleMenus.reduce(
    (total, menu) => total + menu.items.length,
    0,
  );

  if (restaurant.menus.length === 0) {
    return (
      <View
        className="items-center justify-center py-16"
        style={{ backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6" }}
      >
        <View className="h-16 w-16 items-center justify-center rounded-full border-2 border-gray-200 dark:border-gray-700">
          <BookOpenIcon size={28} color={isDark ? "#FAF9F6" : "#111"} />
        </View>
        <Text className="mt-4 text-center text-gray-500">
          {t("noMenu")}
        </Text>
      </View>
    );
  }

  return (
    <View className="pt-6">
      <View className="flex-row items-end justify-between">
        <View>
          <Text className="text-2xl font-bold text-black dark:text-white">
            {t("menu")}
          </Text>
          <Text className="mt-1 text-sm text-gray-500">
            {t("availableDishCount", { count: availableCount })}
          </Text>
        </View>
        {featuredItems.length > 0 && (
          <View className="rounded-full bg-amber-100 px-3 py-1.5 dark:bg-amber-950">
            <Text className="text-xs font-bold text-amber-800 dark:text-amber-300">
              {t("featuredCount", { count: featuredItems.length })}
            </Text>
          </View>
        )}
      </View>

      <View className="mt-5 flex-row items-center rounded-2xl border border-line bg-white px-4 dark:border-gray-700 dark:bg-gray-900">
        <MagnifyingGlassIcon size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("searchMenu")}
          placeholderTextColor="#9CA3AF"
          className="h-12 flex-1 px-3 text-base text-black dark:text-white"
          returnKeyType="search"
          clearButtonMode="never"
        />
        {!!query && (
          <TouchableOpacity
            accessibilityLabel={t("clearMenuSearch")}
            onPress={() => setQuery("")}
            className="h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800"
          >
            <XIcon size={14} color={isDark ? "#FAF9F6" : "#111"} weight="bold" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-6 mt-4"
        contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
      >
        <TouchableOpacity
          onPress={() => setSelectedMenuId("ALL")}
          className={`rounded-full px-4 py-2.5 ${
            selectedMenuId === "ALL"
              ? "bg-black dark:bg-white"
              : "border border-line bg-white dark:border-gray-700 dark:bg-gray-900"
          }`}
        >
          <Text
            className={`text-sm font-bold ${
              selectedMenuId === "ALL"
                ? "text-white dark:text-black"
                : "text-black dark:text-white"
            }`}
          >
            {t("allMenuSections")}
          </Text>
        </TouchableOpacity>
        {restaurant.menus.map((menu) => (
          <TouchableOpacity
            key={menu.id}
            onPress={() => setSelectedMenuId(menu.id)}
            className={`rounded-full px-4 py-2.5 ${
              selectedMenuId === menu.id
                ? "bg-black dark:bg-white"
                : "border border-line bg-white dark:border-gray-700 dark:bg-gray-900"
            }`}
          >
            <Text
              className={`text-sm font-bold ${
                selectedMenuId === menu.id
                  ? "text-white dark:text-black"
                  : "text-black dark:text-white"
              }`}
            >
              {menu.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!query.trim() &&
        selectedMenuId === "ALL" &&
        featuredItems.length > 0 && (
          <View className="mt-7">
            <Text className="text-xl font-bold text-black dark:text-white">
              {t("restaurantPicks")}
            </Text>
            <Text className="mt-1 text-sm text-gray-500">
              {t("restaurantPicksHint")}
            </Text>
            {featuredItems.slice(0, 3).map((item) => (
              <DishCard
                key={`featured-${item.id}`}
                item={item}
                popular={popularIds.has(item.id)}
                isFavorite={favoriteOverrides[item.id] ?? item.isFavorite}
              />
            ))}
          </View>
        )}

      {!query.trim() && selectedMenuId === "ALL" && popularItems.length > 0 && (
        <View className="mt-7">
          <Text className="text-xl font-bold text-black dark:text-white">
            {t("popularDishes")}
          </Text>
          <Text className="mt-1 text-sm text-gray-500">
            {t("popularDishesHint")}
          </Text>
          {popularItems.map((item) => (
            <DishCard
              key={`popular-${item.id}`}
              item={item}
              popular
              isFavorite={favoriteOverrides[item.id] ?? item.isFavorite}
            />
          ))}
        </View>
      )}

      {visibleItemCount === 0 ? (
        <View className="items-center py-14">
          <MagnifyingGlassIcon
            size={30}
            color={isDark ? "#6B7280" : "#9CA3AF"}
          />
          <Text className="mt-4 text-lg font-bold text-black dark:text-white">
            {t("noMenuResults")}
          </Text>
          <Text className="mt-1 text-center text-gray-500">
            {t("tryAnotherMenuSearch")}
          </Text>
        </View>
      ) : (
        visibleMenus.map((menu) => (
          <View key={menu.id} className="mt-7">
            <View className="flex-row items-end justify-between">
              <View className="min-w-0 flex-1">
                <Text className="text-xl font-bold text-black dark:text-white">
                  {menu.title}
                </Text>
                {!!menu.description && (
                  <Text className="mt-1 text-sm leading-5 text-gray-500">
                    {menu.description}
                  </Text>
                )}
              </View>
              <Text className="ml-4 text-xs font-semibold text-gray-400">
                {t("dishCount", { count: menu.items.length })}
              </Text>
            </View>

            {menu.items.length === 0 ? (
              <View className="mt-3 rounded-2xl bg-gray-100 px-4 py-6 dark:bg-gray-900">
                <Text className="text-center text-gray-500">
                  {t("noDishes")}
                </Text>
              </View>
            ) : (
              menu.items.map((item) => (
                <DishCard
                  key={item.id}
                  item={item}
                  popular={popularIds.has(item.id)}
                  isFavorite={favoriteOverrides[item.id] ?? item.isFavorite}
                />
              ))
            )}
          </View>
        ))
      )}
    </View>
  );
}
