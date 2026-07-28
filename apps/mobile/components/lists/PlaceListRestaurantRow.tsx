import Text from "@/components/common/AppText";
import RestaurantBadge from "@/components/restaurants/RestaurantBadge";
import type { PlaceListDetail } from "@findeat/types";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { CaretRightIcon, StorefrontIcon } from "phosphor-react-native";
import { TouchableOpacity, View } from "react-native";

type ListItem = PlaceListDetail["items"][number];

export default function PlaceListRestaurantRow({
  item,
  onPress,
}: {
  item: ListItem;
  onPress: () => void;
}) {
  const restaurant = item.restaurant;
  const image = restaurant.coverUrl ?? restaurant.logoUrl;
  const location = restaurant.city || restaurant.address;

  return (
    <TouchableOpacity
      activeOpacity={0.76}
      onPress={onPress}
      className="mb-3 flex-row items-center rounded-[22px] bg-white p-3 dark:bg-gray-900"
    >
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
      <View className="ml-3 min-w-0 flex-1">
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
      </View>
      <CaretRightIcon size={18} color="#9CA3AF" weight="bold" />
    </TouchableOpacity>
  );
}
