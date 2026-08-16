import ProgressiveImage from "@/components/common/ProgressiveImage";
import type { PlaceListDetail } from "@findeat/types";
import { StorefrontIcon } from "phosphor-react-native";
import { View } from "react-native";

type Props = {
  items: PlaceListDetail["items"];
};

export default function FolderRestaurantCollage({ items }: Props) {
  const restaurants = items.slice(0, 4).map((item) => item.restaurant);

  return (
    <View className="flex-1 flex-row flex-wrap">
      {Array.from({ length: 4 }, (_, index) => {
        const restaurant = restaurants[index];
        const uri = restaurant?.coverUrl ?? restaurant?.logoUrl;

        return (
          <View
            key={restaurant?.id ?? `empty-${index}`}
            className="h-1/2 w-1/2 items-center justify-center overflow-hidden bg-amber-100 dark:bg-amber-950/60"
          >
            {uri ? (
              <ProgressiveImage
                source={{ uri }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <StorefrontIcon size={28} color="#D97706" weight="duotone" />
            )}
          </View>
        );
      })}
    </View>
  );
}
