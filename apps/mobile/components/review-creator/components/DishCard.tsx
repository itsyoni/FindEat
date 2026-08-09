import Text from "@/components/common/AppText";
import { ReviewDishDraft } from "@findeat/types/review";
import { TouchableOpacity, View } from "react-native";
import { MinusIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import DishPreviewImage from "./DishPreviewImage";

type Props = {
  item: ReviewDishDraft;
  onPress?: () => void;
  onRemove?: () => void;
};

export default function DishCard({ item, onPress, onRemove }: Props) {
  const { t } = useTranslation(["create", "common"]);
  const name = item.menuItemName ?? item.customDishName ?? t("create:dish");
  const price = item.customPrice ?? item.menuItemPrice;

  return (
    <TouchableOpacity
      disabled={!onPress}
      activeOpacity={0.82}
      onPress={onPress}
      className="flex-row rounded-[22px] border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
      style={{
        shadowColor: "#171717",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
      }}
    >
      {onRemove ? (
        <View
          pointerEvents="box-none"
          className="absolute bottom-0 right-2.5 top-0 z-10 justify-center"
        >
          <TouchableOpacity
            accessibilityLabel={t("common:removeDish")}
            onPress={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            className="h-8 w-8 items-center justify-center rounded-full bg-red-500"
          >
            <MinusIcon size={17} color="#FAF9F6" weight="bold" />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={{ width: 112, height: 84 }}>
        <DishPreviewImage
          pickedUri={item.imageUri}
          menuImageUrl={item.fallbackImageUrl}
          style={{ width: 112, height: 84, borderRadius: 14 }}
        />
      </View>

      <View
        className="ml-3 min-h-[84px] min-w-0 flex-1"
        style={{ marginRight: onRemove ? 34 : 0 }}
      >
        <Text
          numberOfLines={1}
          className="font-bold leading-5 text-black dark:text-white"
        >
          {name}
        </Text>

        {item.text ? (
          <Text
            numberOfLines={2}
            className="mt-1 flex-1 text-sm leading-4 text-gray-500 dark:text-gray-400"
          >
            {item.text}
          </Text>
        ) : (
          <View className="flex-1" />
        )}

        {price != null || item.rating != null ? (
          <View className="mt-1 flex-row items-center">
            {price != null ? (
              <Text className="text-sm font-bold text-brand dark:text-orange-300">
                ₪{price}
              </Text>
            ) : null}

            {price != null && item.rating != null ? (
              <Text className="mx-2 text-gray-300 dark:text-gray-600">·</Text>
            ) : null}

            {item.rating != null ? (
              <Text className="text-sm font-semibold text-[#8A6815] dark:text-[#F7D786]">
                ★ {item.rating}/10
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
