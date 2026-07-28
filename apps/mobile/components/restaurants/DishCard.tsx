import { Restaurant } from "@findeat/types";
import { TouchableOpacity, View } from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import Text from "../common/AppText";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { DishCompatibilityChips } from "./FoodCompatibility";
import { HeartIcon } from "phosphor-react-native";

type Props = {
  item: Restaurant["menus"][number]["items"][number];
  popular?: boolean;
  isFavorite?: boolean;
};

export default function DishCard({
  item,
  popular = false,
  isFavorite = item.isFavorite === true,
}: Props) {
  const { t } = useTranslation("restaurants");
  const isUnavailable = item.isAvailable === false;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() =>
        router.push({ pathname: "/menu-items/[id]", params: { id: item.id } })
      }
      className={`mt-3 rounded-3xl border p-3 ${
        isFavorite
          ? "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/35"
          : "border-[#D8D3CA] bg-white dark:border-gray-700 dark:bg-gray-900"
      }`}
      style={{
        shadowColor: isFavorite ? "#E11D48" : "#171717",
        shadowOpacity: 0.07,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      <View className="flex-row gap-3">
        <View className="relative h-28 w-36">
          {item.imageUrl ? (
            <ProgressiveImage
              source={{ uri: item.imageUrl }}
              className="h-28 w-36 rounded-2xl bg-gray-100 dark:bg-gray-800"
              resizeMode="cover"
            />
          ) : (
            <View className="h-28 w-36 items-center justify-center rounded-2xl bg-[#E9E4DC] dark:bg-gray-800">
              <Text className="text-2xl">🍽️</Text>
            </View>
          )}
          {isFavorite && (
            <View
              pointerEvents="none"
              className="absolute inset-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "rgba(225, 29, 72, 0.24)" }}
            >
              <HeartIcon
                size={42}
                color="rgba(225, 29, 72, 0.78)"
                weight="fill"
              />
            </View>
          )}
        </View>

        <View className="min-w-0 flex-1">
          <View className="flex-row justify-between gap-3">
            <Text className="flex-1 font-bold text-black dark:text-white">
              {item.name}
            </Text>

            {item.price != null && (
              <View className="rounded-full bg-brand-soft px-2.5 py-1 dark:bg-orange-950/50">
                <Text className="font-bold text-brand dark:text-orange-300">
                  ₪{item.price}
                </Text>
              </View>
            )}
          </View>

          {(item.reviewsCount ?? 0) > 0 && (
            <Text className="mt-1.5 text-xs font-semibold text-gray-500">
              ★ {item.averageRating?.toFixed(1) ?? "—"} ·{" "}
              {t("dishReviewCount", { count: item.reviewsCount })}
            </Text>
          )}

          <DishCompatibilityChips compatibility={item.compatibility} />

          <View className="mt-2 flex-row flex-wrap gap-1.5">
            {item.isFeatured && (
              <Text className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {t("featured")}
              </Text>
            )}

            {popular && (
              <Text className="rounded-full bg-violet-100 px-2 py-1 text-xs font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                {t("popular")}
              </Text>
            )}

            {item.isNew && (
              <Text className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {t("newDish")}
              </Text>
            )}

            {isUnavailable && (
              <Text className="rounded-full bg-gray-200 px-2 py-1 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {t("unavailable")}
              </Text>
            )}
          </View>

          {!!item.description && (
            <Text
              className="mt-2 text-sm leading-5 text-gray-600 dark:text-gray-300"
              numberOfLines={2}
            >
              {item.description}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
