import { Restaurant } from "@findeat/types";
import { Image, TouchableOpacity, View } from "react-native";
import Text from "../common/AppText";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { DishCompatibilityChips } from "./FoodCompatibility";
import { HeartIcon } from "phosphor-react-native";
import { getMobileCompatibleImageUrl } from "@findeat/utils";
import { useState } from "react";
import DishPrice from "./DishPrice";

type Props = {
  item: Restaurant["menus"][number]["items"][number];
  popular?: boolean;
  isFavorite?: boolean;
  interactive?: boolean;
  contextLabel?: string;
  variant?: "card" | "search-row";
  detailSource?: "search" | "favorites";
};

export default function DishCard({
  item,
  popular = false,
  isFavorite = item.isFavorite === true,
  interactive = true,
  contextLabel,
  variant = "card",
  detailSource,
}: Props) {
  const { t, i18n } = useTranslation("restaurants");
  const isRtl = i18n.dir() === "rtl";
  const isSearchRow = variant === "search-row";
  const rtlTextStyle = isRtl
    ? ({ textAlign: "right", writingDirection: "rtl" } as const)
    : undefined;
  const isUnavailable = item.isAvailable === false;
  const displayImageUrl = getMobileCompatibleImageUrl(item.imageUrl);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  const cardClassName = isSearchRow
    ? "relative px-4 py-3"
    : `mt-3 rounded-3xl border p-3 ${
        isFavorite
          ? "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/35"
          : "border-[#D8D3CA] bg-white dark:border-gray-700 dark:bg-gray-900"
      }`;
  const cardStyle = isSearchRow ? undefined : {
        shadowColor: isFavorite ? "#E11D48" : "#171717",
        shadowOpacity: 0.07,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      };
  const content = (
      <View
        className="flex-row gap-3"
        style={isRtl ? { flexDirection: "row-reverse" } : undefined}
      >
        <View className={`relative overflow-hidden bg-[#E9E4DC] dark:bg-gray-800 ${isSearchRow ? "h-20 w-24 rounded-xl" : "h-28 w-36 rounded-2xl"}`}>
          {displayImageUrl && failedImageUrl !== displayImageUrl ? (
            <Image
              source={{ uri: displayImageUrl }}
              style={
                isSearchRow
                  ? { width: 96, height: 80, borderRadius: 12 }
                  : { width: 144, height: 112, borderRadius: 16 }
              }
              resizeMode="cover"
              onError={() => setFailedImageUrl(displayImageUrl)}
            />
          ) : (
            <View className={isSearchRow ? "h-20 w-24 items-center justify-center" : "h-28 w-36 items-center justify-center"}>
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

        <View
          className="min-w-0 flex-1"
          style={isRtl ? { alignItems: "stretch" } : undefined}
        >
          <View
            className="flex-row justify-between gap-3"
            style={isRtl ? { flexDirection: "row-reverse" } : undefined}
          >
            <Text style={rtlTextStyle} className="flex-1 font-bold text-black dark:text-white">
              {item.name}
            </Text>

            <DishPrice dish={item} />
          </View>

          {contextLabel ? (
            <Text
              numberOfLines={1}
              style={rtlTextStyle}
              className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400"
            >
              {contextLabel}
            </Text>
          ) : null}

          {(item.reviewsCount ?? 0) > 0 && (
            <Text style={rtlTextStyle} className="mt-1.5 text-xs font-semibold text-gray-500">
              ★ {item.averageRating?.toFixed(1) ?? "—"} ·{" "}
              {t("dishReviewCount", { count: item.reviewsCount })}
            </Text>
          )}

          <DishCompatibilityChips compatibility={item.compatibility} />

          <View
            className="mt-2 flex-row flex-wrap gap-1.5"
            style={isRtl ? { flexDirection: "row-reverse" } : undefined}
          >
            {isFavorite && (
              <View className="rounded-full bg-rose-100 px-2 py-1 dark:bg-rose-950">
                <Text style={rtlTextStyle} className="text-xs font-bold text-rose-700 dark:text-rose-300">
                  {t("favorited")}
                </Text>
              </View>
            )}

            {item.isFeatured && (
              <View className="rounded-full bg-amber-100 px-2 py-1 dark:bg-amber-950">
                <Text style={rtlTextStyle} className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  {t("featured")}
                </Text>
              </View>
            )}

            {popular && (
              <View className="rounded-full bg-violet-100 px-2 py-1 dark:bg-violet-950">
                <Text style={rtlTextStyle} className="text-xs font-bold text-violet-700 dark:text-violet-300">
                  {t("popular")}
                </Text>
              </View>
            )}

            {item.isNew && (
              <View className="rounded-full bg-blue-100 px-2 py-1 dark:bg-blue-950">
                <Text style={rtlTextStyle} className="text-xs font-bold text-blue-700 dark:text-blue-300">
                  {t("newDish")}
                </Text>
              </View>
            )}

            {isUnavailable && (
              <View className="rounded-full bg-gray-200 px-2 py-1 dark:bg-gray-800">
                <Text style={rtlTextStyle} className="text-xs font-bold text-gray-600 dark:text-gray-400">
                  {t("unavailable")}
                </Text>
              </View>
            )}
          </View>

          {!!item.description && (
            <Text
              className="mt-2 text-sm leading-5 text-gray-600 dark:text-gray-300"
              style={rtlTextStyle}
              numberOfLines={isSearchRow ? 1 : 2}
              ellipsizeMode="tail"
            >
              {item.description}
            </Text>
          )}
        </View>
      </View>
  );

  if (!interactive) {
    return (
      <View className={cardClassName} style={cardStyle}>
        {content}
        {isSearchRow ? (
          <View
            pointerEvents="none"
            className="absolute bottom-0 left-4 right-4 h-px bg-gray-200/40 dark:bg-gray-700/35"
          />
        ) : null}
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() =>
        router.push({
          pathname: "/menu-items/[id]",
          params: {
            id: item.id,
            ...(detailSource ? { source: detailSource } : {}),
          },
        })
      }
      className={cardClassName}
      style={cardStyle}
    >
      {content}
      {isSearchRow ? (
        <View
          pointerEvents="none"
          className="absolute bottom-0 left-4 right-4 h-px bg-gray-200/40 dark:bg-gray-700/35"
        />
      ) : null}
    </TouchableOpacity>
  );
}
