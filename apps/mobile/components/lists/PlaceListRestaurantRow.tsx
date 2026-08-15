import Text from "@/components/common/AppText";
import RestaurantBadge from "@/components/restaurants/RestaurantBadge";
import type { PlaceListDetail } from "@findeat/types";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import {
  CaretRightIcon,
  ImagesSquareIcon,
  PlayIcon,
  StorefrontIcon,
} from "phosphor-react-native";
import { Pressable, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

type ListItem = PlaceListDetail["items"][number];

export default function PlaceListRestaurantRow({
  item,
  onPress,
  onPressSourcePost,
}: {
  item: ListItem;
  onPress: () => void;
  onPressSourcePost?: () => void;
}) {
  const { t } = useTranslation("settings");
  const restaurant = item.restaurant;
  const image = restaurant.coverUrl ?? restaurant.logoUrl;
  const location = restaurant.city || restaurant.address;
  const sourceImage =
    item.sourcePost?.contentPost?.media?.[0]?.imageUrl ??
    item.sourcePost?.contentPost?.imageUrl ??
    item.sourcePost?.reviewPost?.coverImageUrl ??
    null;
  const sourceVideo =
    item.sourcePost?.contentPost?.media?.[0]?.videoUrl ??
    item.sourcePost?.contentPost?.videoUrl ??
    null;
  const sourceCaption =
    item.sourcePost?.contentPost?.caption ??
    item.sourcePost?.reviewPost?.summary ??
    item.sourcePost?.reviewPost?.title ??
    null;

  return (
    <TouchableOpacity
      activeOpacity={0.76}
      onPress={onPress}
      className="mb-3 rounded-[22px] bg-white p-3 dark:bg-gray-900"
    >
      <View className="flex-row items-center gap-3">
        <View className="h-[74px] w-[74px] overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
          {image ? (
            <ProgressiveImage
              source={{ uri: image }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <StorefrontIcon size={28} color="#D97706" weight="duotone" />
            </View>
          )}
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center">
            <Text
              numberOfLines={1}
              className="min-w-0 shrink text-base font-bold text-black dark:text-white"
            >
              {restaurant.name}
            </Text>
            <RestaurantBadge size={17} status={restaurant.status} />
          </View>
          {location ? (
            <Text
              numberOfLines={2}
              className="mt-1 text-sm text-gray-500 dark:text-gray-400"
            >
              {location}
            </Text>
          ) : null}
          {item.distanceFromStayKm != null ? (
            <Text className="mt-1 text-xs font-bold text-amber-600">
              {item.distanceFromStayKm < 1
                ? `${Math.round(item.distanceFromStayKm * 1000)} m from your stay`
                : `${item.distanceFromStayKm.toFixed(1)} km from your stay`}
            </Text>
          ) : null}
        </View>
        <CaretRightIcon size={18} color="#9CA3AF" weight="bold" />
      </View>

      {item.sourcePost ? (
        <View className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
          <Text className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {item.sourcePost.type === "REVIEW"
              ? t("savedReview")
              : t("savedContentPost")}
          </Text>
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onPressSourcePost?.();
            }}
            className="flex-row items-center gap-3 overflow-hidden rounded-2xl bg-gray-100 p-2 dark:bg-gray-800"
          >
            <View className="h-[72px] w-[58px] overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-700">
              {sourceImage ? (
                <ProgressiveImage
                  source={{ uri: sourceImage }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  {sourceVideo ? (
                    <PlayIcon size={24} color="#F59E0B" weight="fill" />
                  ) : (
                    <ImagesSquareIcon
                      size={24}
                      color="#D97706"
                      weight="duotone"
                    />
                  )}
                </View>
              )}
              {sourceVideo ? (
                <View className="absolute inset-0 items-center justify-center bg-black/20">
                  <PlayIcon size={20} color="#FAF9F6" weight="fill" />
                </View>
              ) : null}
            </View>
            <View className="min-w-0 flex-1">
              <Text
                numberOfLines={2}
                className="text-sm font-semibold text-gray-800 dark:text-gray-100"
              >
                {sourceCaption ||
                  (item.sourcePost.type === "REVIEW"
                    ? t("savedReview")
                    : t("savedContentPost"))}
              </Text>
              <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("openSavedPost")}
              </Text>
            </View>
            <CaretRightIcon size={16} color="#9CA3AF" weight="bold" />
          </Pressable>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
