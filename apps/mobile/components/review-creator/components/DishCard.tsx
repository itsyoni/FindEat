import Text from "@/components/common/AppText";
import { ReviewDishDraft } from "@findeat/types/review";
import { TouchableOpacity, View } from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { XIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";

type Props = {
  item: ReviewDishDraft;
  onPress?: () => void;
  onRemove?: () => void;
};

export default function DishCard({ item, onPress, onRemove }: Props) {
  const { t } = useTranslation(["create", "common"]);
  const name = item.menuItemName ?? item.customDishName ?? t("create:dish");
  const price = item.customPrice;

  return (
    <TouchableOpacity
      disabled={!onPress}
      activeOpacity={0.82}
      onPress={onPress}
      className="rounded-3xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
    >
      {(item.imageUri || item.fallbackImageUrl) && (
        <ProgressiveImage
          source={{ uri: item.imageUri ?? item.fallbackImageUrl ?? undefined }}
          className="mb-4 h-48 w-full rounded-2xl bg-gray-100"
          resizeMode="cover"
        />
      )}

      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text className="text-lg font-bold text-black dark:text-white">
            {name}
          </Text>

          {!!item.rating && (
            <Text className="mt-1 text-gray-500">⭐ {item.rating}/10</Text>
          )}

          {!!item.text && (
            <Text className="mt-3 text-gray-700 dark:text-gray-300">
              {item.text}
            </Text>
          )}
        </View>

        {price != null && (
          <Text className="font-bold text-black dark:text-white">₪{price}</Text>
        )}

        {onRemove && (
          <TouchableOpacity
            accessibilityLabel={t("common:removeDish")}
            onPress={onRemove}
            className="h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
          >
            <XIcon size={14} color="#9CA3AF" weight="bold" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}
