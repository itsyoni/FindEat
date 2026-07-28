import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import type { Restaurant } from "@findeat/types";
import {
  BookmarkSimpleIcon,
  CheckCircleIcon,
  HeartIcon,
  MapTrifoldIcon,
  StarIcon,
} from "phosphor-react-native";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import RestaurantBadge from "./RestaurantBadge";

type Props = {
  restaurant: Restaurant;
  onOpen: () => void;
  onShowOnMap: () => void;
};

function formatRating(rating?: number | null) {
  if (rating == null) return null;
  const rounded = rating.toFixed(1);
  return rounded === "10.0" ? "10" : rounded;
}

function formatDistance(distanceKm?: number) {
  if (distanceKm == null) return null;
  if (distanceKm < 1) return `${Math.max(1, Math.round(distanceKm * 1000))} m`;
  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
}

export default function MapRestaurantListCard({
  restaurant,
  onOpen,
  onShowOnMap,
}: Props) {
  const { t } = useTranslation(["map", "restaurants"]);
  const { isDark } = useAppTheme();
  const rating = formatRating(restaurant.averageRating);
  const distance = formatDistance(restaurant.distanceKm);
  const location = [restaurant.address, restaurant.city]
    .filter(Boolean)
    .join(", ");
  const userStatus = restaurant.userRestaurant;

  const status = userStatus?.favorite
    ? {
        label: t("restaurants:favorite"),
        color: "#EF4444",
        background: isDark ? "#3F151B" : "#FEE2E2",
        icon: HeartIcon,
      }
    : userStatus?.visited
      ? {
          label: t("restaurants:visited"),
          color: "#16A34A",
          background: isDark ? "#102F1D" : "#DCFCE7",
          icon: CheckCircleIcon,
        }
      : userStatus?.wantToTry
        ? {
            label: t("restaurants:wantToTry"),
            color: "#A16207",
            background: isDark ? "#3A2D12" : "#FEF3C7",
            icon: BookmarkSimpleIcon,
          }
        : null;
  const StatusIcon = status?.icon;

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onOpen}
      className="mx-4 mb-4 rounded-[26px] border border-black/5 bg-white dark:border-white/10 dark:bg-[#111113]"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: isDark ? 0.22 : 0.08,
        shadowRadius: 14,
        elevation: 3,
      }}
    >
      <View className="flex-row p-3">
        <View className="relative h-28 w-28 overflow-hidden rounded-[20px] bg-[#F1EEE8] dark:bg-gray-900">
          {restaurant.coverUrl ? (
            <ProgressiveImage
              source={{ uri: restaurant.coverUrl }}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Avatar
                uri={restaurant.logoUrl}
                username={restaurant.name}
                size={72}
                fallbackType="restaurant"
              />
            </View>
          )}

          {restaurant.coverUrl ? (
            <View className="absolute bottom-2 left-2 rounded-full bg-white p-0.5 dark:bg-black">
              <Avatar
                uri={restaurant.logoUrl}
                username={restaurant.name}
                size={38}
                fallbackType="restaurant"
              />
            </View>
          ) : null}
        </View>

        <View className="ml-3 min-w-0 flex-1 py-1">
          <View className="flex-row items-start">
            <View className="min-w-0 flex-1 flex-row items-center">
              <Text
                numberOfLines={1}
                className="shrink text-lg font-bold text-black dark:text-white"
              >
                {restaurant.name}
              </Text>
              <RestaurantBadge status={restaurant.status} />
            </View>
            <DirectionalIcon
              direction="forward"
              size={18}
              color={isDark ? "#9CA3AF" : "#6B7280"}
              weight="bold"
            />
          </View>

          {location ? (
            <Text numberOfLines={2} className="mt-1 text-sm leading-5 text-gray-500">
              {location}
            </Text>
          ) : null}

          <View className="mt-auto flex-row flex-wrap items-center gap-x-3 gap-y-2 pt-2">
            {rating ? (
              <View className="flex-row items-center">
                <StarIcon size={16} color="#F3C969" weight="fill" />
                <Text className="ml-1 font-bold text-black dark:text-white">
                  {rating}
                </Text>
                <Text className="ml-1 text-xs text-gray-500">
                  ({restaurant.reviewsCount ?? 0})
                </Text>
              </View>
            ) : null}

            {distance ? (
              <View className="flex-row items-center">
                <MapTrifoldIcon size={15} color="#6B7280" weight="fill" />
                <Text className="ml-1 text-sm font-medium text-gray-500">
                  {distance}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View className="flex-row items-center border-t border-black/5 px-3 py-2.5 dark:border-white/10">
        <View className="min-w-0 flex-1">
          {status && StatusIcon ? (
            <View
              className="self-start flex-row items-center rounded-full px-2.5 py-1.5"
              style={{ backgroundColor: status.background }}
            >
              <StatusIcon size={15} color={status.color} weight="fill" />
              <Text className="ml-1.5 text-xs font-bold" style={{ color: status.color }}>
                {status.label}
              </Text>
            </View>
          ) : (
            <Text className="text-xs font-medium text-gray-400">
              {t("map:openForDetails")}
            </Text>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={(event) => {
            event.stopPropagation();
            onShowOnMap();
          }}
          className="flex-row items-center rounded-xl bg-black px-3 py-2 dark:bg-white"
        >
          <MapTrifoldIcon
            size={16}
            color={isDark ? "#000" : "#FFF"}
            weight="fill"
          />
          <Text className="ml-1.5 text-xs font-bold text-white dark:text-black">
            {t("map:showOnMap")}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
