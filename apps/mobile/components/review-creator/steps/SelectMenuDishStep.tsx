import { SkeletonList, TextInput , ThemedSafeAreaView } from "@/components/common";
import Text from "@/components/common/AppText";
import KeyboardAwareFormScrollView from "@/components/common/layout/KeyboardAwareFormScrollView";
import { api } from "@/lib/api";
import { Dish, Restaurant } from "@findeat/types";
import { useEffect, useMemo, useState } from "react";
import {
  TouchableOpacity,
  View,
} from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import SaveDraftButton from "@/components/posts/SaveDraftButton";
import { useTranslation } from "react-i18next";

type Props = {
  restaurant: Restaurant | null;
  onBack: () => void;
  onSelect: (dish: Dish) => void;
  onAddCustom: () => void;
  onSaveDraft: () => void;
  savingDraft?: boolean;
};

export default function SelectMenuDishStep({
  restaurant,
  onBack,
  onSelect,
  onAddCustom,
  onSaveDraft,
  savingDraft,
}: Props) {
  const { t } = useTranslation(["create", "common"]);
  const [fullRestaurant, setFullRestaurant] = useState<Restaurant | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(!!restaurant?.id);

  useEffect(() => {
    if (!restaurant?.id) return;

    let cancelled = false;

    api.restaurants
      .get(restaurant.id)
      .then((fullRestaurant) => {
        if (!cancelled) setFullRestaurant(fullRestaurant);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [restaurant?.id]);

  const filteredMenus = useMemo(() => {
    const menus = fullRestaurant?.menus ?? [];
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) return menus;

    return menus
      .map((menu) => ({
        ...menu,
        items: menu.items.filter((dish) => {
          return (
            dish.name.toLowerCase().includes(cleanQuery) ||
            dish.description?.toLowerCase().includes(cleanQuery) ||
            dish.category?.toLowerCase().includes(cleanQuery)
          );
        }),
      }))
      .filter((menu) => menu.items.length > 0);
  }, [fullRestaurant, query]);

  return (
    <ThemedSafeAreaView>
      <KeyboardAwareFormScrollView
        bottomOffset={28}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: 40,
        }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={onBack}>
            <Text className="font-bold text-black dark:text-white">
              {t("common:back")}
            </Text>
          </TouchableOpacity>
          <SaveDraftButton onPress={onSaveDraft} saving={savingDraft} />
        </View>

        <Text className="mt-6 text-3xl font-bold text-black dark:text-white">
          {t("create:chooseFromMenu")}
        </Text>

        <TextInput
          className="mt-6 rounded-2xl border border-gray-200 px-4 py-4 text-base text-black dark:border-gray-700 dark:text-white"
          placeholder={t("create:searchDishes")}
          value={query}
          onChangeText={setQuery}
        />

        {loading && (
          <SkeletonList variant="menu" count={4} />
        )}

        {!loading && filteredMenus.length === 0 && (
          <View className="mt-10 rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 dark:border-gray-700 dark:bg-gray-900">
            <Text className="text-center font-bold text-black dark:text-white">
              {query.trim()
                ? t("create:noMatchingDishes")
                : t("create:noRestaurantMenuYet")}
            </Text>
            <Text className="mt-2 text-center text-gray-500">
              {query.trim()
                ? t("create:tryAnotherDishSearch")
                : t("create:addDishManuallyHint")}
            </Text>
            <TouchableOpacity
              onPress={onAddCustom}
              className="mt-5 rounded-2xl bg-black py-3.5 dark:bg-white"
            >
              <Text className="text-center font-bold text-white dark:text-black">
                {t("create:addCustomDish")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && (
          <View className="mt-8 gap-8">
            {filteredMenus.map((menu) => (
              <View key={menu.id}>
                <Text className="mb-3 text-xl font-bold text-black dark:text-white">
                  {menu.title}
                </Text>

                <View className="gap-3">
                  {menu.items.map((dish) => (
                    <TouchableOpacity
                      key={dish.id}
                      className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
                      activeOpacity={0.85}
                      onPress={() => onSelect(dish)}
                    >
                      <View className="flex-row gap-3">
                        {dish.imageUrl ? (
                          <ProgressiveImage
                            source={{ uri: dish.imageUrl }}
                            className="h-16 w-16 rounded-xl bg-gray-100"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="h-16 w-16 items-center justify-center rounded-xl bg-gray-100">
                            <Text className="text-xl">🍽️</Text>
                          </View>
                        )}

                        <View className="flex-1">
                          <View className="flex-row justify-between gap-3">
                            <Text className="flex-1 font-bold text-black dark:text-white">
                              {dish.name}
                            </Text>

                            {dish.price != null && (
                              <Text className="font-bold text-black dark:text-white">
                                ₪{dish.price}
                              </Text>
                            )}
                          </View>

                          {!!dish.description && (
                            <Text
                              numberOfLines={2}
                              className="mt-1 text-sm text-gray-500"
                            >
                              {dish.description}
                            </Text>
                          )}

                          {!!dish.category && (
                            <Text className="mt-2 text-xs font-semibold text-gray-400">
                              {dish.category}
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </KeyboardAwareFormScrollView>
    </ThemedSafeAreaView>
  );
}
