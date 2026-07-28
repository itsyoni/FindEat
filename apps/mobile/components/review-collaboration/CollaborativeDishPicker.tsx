import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import SearchBar from "@/components/common/inputs/SearchBar";
import { SkeletonList, ThemedSafeAreaView } from "@/components/common";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import type { Dish, Restaurant } from "@findeat/types";
import { PlusCircleIcon } from "phosphor-react-native";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, TouchableOpacity, View } from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";

type Props = {
  restaurantId: string;
  excludedMenuItemIds: string[];
  onBack: () => void;
  onSelect: (dish: Dish) => void;
  onCustom: () => void;
};

export default function CollaborativeDishPicker({
  restaurantId,
  excludedMenuItemIds,
  onBack,
  onSelect,
  onCustom,
}: Props) {
  const { t } = useTranslation("collaborativeReview");
  const { isDark } = useAppTheme();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void api.restaurants
      .get(restaurantId)
      .then((value) => {
        if (!cancelled) setRestaurant(value);
      })
      .catch((error) => console.error("Could not load restaurant menu", error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const dishes = useMemo(() => {
    const excluded = new Set(excludedMenuItemIds);
    const value = query.trim().toLocaleLowerCase();
    return (restaurant?.menus ?? [])
      .flatMap((menu) => menu.items)
      .filter((dish) => !excluded.has(dish.id))
      .filter(
        (dish) =>
          !value ||
          dish.name.toLocaleLowerCase().includes(value) ||
          dish.description?.toLocaleLowerCase().includes(value),
      );
  }, [excludedMenuItemIds, query, restaurant?.menus]);
  const iconColor = isDark ? "#FFFFFF" : "#111827";

  return (
    <ThemedSafeAreaView edges={["top", "bottom"]}>
      <View className="flex-row items-center border-b border-gray-100 px-4 py-3 dark:border-gray-900">
        <TouchableOpacity
          onPress={onBack}
          className="h-11 w-11 items-center justify-center"
        >
          <DirectionalIcon
            direction="back"
            size={25}
            color={iconColor}
            weight="bold"
          />
        </TouchableOpacity>
        <Text className="ml-2 flex-1 text-xl font-bold text-black dark:text-white">
          {t("chooseDish")}
        </Text>
      </View>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder={t("chooseFromMenu")}
      />

      <TouchableOpacity
        onPress={onCustom}
        className="mx-5 mb-2 mt-3 flex-row items-center rounded-2xl border border-dashed border-brand/50 bg-brand/10 p-4"
      >
        <PlusCircleIcon size={26} color="#C89C25" weight="fill" />
        <Text className="ml-3 font-bold text-black dark:text-white">
          {t("customDish")}
        </Text>
      </TouchableOpacity>

      {loading ? (
        <SkeletonList variant="menu" count={5} />
      ) : (
        <FlatList
          data={dishes}
          keyExtractor={(dish) => dish.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, gap: 12, flexGrow: 1 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => onSelect(item)}
              className="flex-row items-center rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
            >
              {item.imageUrl ? (
                <ProgressiveImage
                  source={{ uri: item.imageUrl }}
                  className="h-16 w-16 rounded-xl bg-gray-100"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-16 w-16 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                  <Text className="text-2xl">🍽️</Text>
                </View>
              )}
              <View className="ml-3 flex-1">
                <Text className="font-bold text-black dark:text-white">
                  {item.name}
                </Text>
                {!!item.description && (
                  <Text numberOfLines={2} className="mt-1 text-sm text-gray-500">
                    {item.description}
                  </Text>
                )}
              </View>
              {item.price != null && (
                <Text className="ml-3 font-bold text-black dark:text-white">
                  ₪{item.price}
                </Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8">
              <Text className="text-center text-gray-500">
                {t("noDishesBody")}
              </Text>
            </View>
          }
        />
      )}
    </ThemedSafeAreaView>
  );
}
