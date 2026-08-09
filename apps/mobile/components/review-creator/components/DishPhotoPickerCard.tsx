import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import type { ReviewImageSource } from "@/lib/reviewImagePicker";
import { CameraIcon, ImagesIcon, TrashIcon } from "phosphor-react-native";
import { ActivityIndicator, Image, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

type Props = {
  imageUrl?: string | null;
  fallbackImageUrl?: string | null;
  pickingSource?: ReviewImageSource | null;
  disabled?: boolean;
  removing?: boolean;
  onChoose: (source: ReviewImageSource) => void;
  onRemove: () => void;
};

export default function DishPhotoPickerCard({
  imageUrl,
  fallbackImageUrl,
  pickingSource = null,
  disabled = false,
  removing = false,
  onChoose,
  onRemove,
}: Props) {
  const { t } = useTranslation(["create", "common"]);
  const { isDark } = useAppTheme();
  const iconColor = isDark ? "#FAF9F6" : "#171717";
  const buttonBackground = isDark ? "#1C1C1E" : "#ECEAE6";

  return (
    <View className="overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
      {imageUrl ? (
        <View style={{ width: "100%", aspectRatio: 4 / 3 }}>
          <Image
            source={{ uri: imageUrl }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
            onError={(event) =>
              console.error("Review dish image preview failed", {
                uri: imageUrl,
                error: event.nativeEvent.error,
              })
            }
          />
          <TouchableOpacity
            accessibilityLabel={t("common:delete")}
            disabled={disabled || removing}
            onPress={onRemove}
            className="absolute right-3 top-3 h-10 w-10 items-center justify-center rounded-full bg-black/70"
          >
            {removing ? (
              <ActivityIndicator size="small" color="#FAF9F6" />
            ) : (
              <TrashIcon size={19} color="#FAF9F6" weight="fill" />
            )}
          </TouchableOpacity>
        </View>
      ) : fallbackImageUrl ? (
        <View style={{ width: "100%", aspectRatio: 4 / 3 }}>
          <Image
            source={{ uri: fallbackImageUrl }}
            style={{ width: "100%", height: "100%", opacity: 0.62 }}
            resizeMode="cover"
          />
          <View className="absolute inset-x-0 bottom-0 bg-black/60 px-4 py-3">
            <Text className="text-center text-sm font-semibold text-white">
              {t("usingMenuDishPhoto")}
            </Text>
          </View>
        </View>
      ) : (
        <View className="items-center px-6 py-9">
          <ImagesIcon size={35} color={iconColor} weight="light" />
          <Text className="mt-3 font-bold text-black dark:text-white">
            {t("addDishPhoto")}
          </Text>
          <Text className="mt-1 text-center text-sm text-gray-500">
            {t("dishPhotoOptionalHint")}
          </Text>
        </View>
      )}

      <View className="flex-row gap-3 border-t border-gray-200 p-3 dark:border-gray-800">
        <TouchableOpacity
          disabled={disabled || !!pickingSource}
          onPress={() => onChoose("camera")}
          style={{ backgroundColor: buttonBackground }}
          className="min-h-12 flex-1 flex-row items-center justify-center rounded-2xl px-3"
        >
          {pickingSource === "camera" ? (
            <ActivityIndicator color={iconColor} />
          ) : (
            <CameraIcon size={20} color={iconColor} weight="bold" />
          )}
          <Text style={{ color: iconColor }} className="ml-2 font-bold">
            {t("takePhoto")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={disabled || !!pickingSource}
          onPress={() => onChoose("gallery")}
          style={{ backgroundColor: buttonBackground }}
          className="min-h-12 flex-1 flex-row items-center justify-center rounded-2xl px-3"
        >
          {pickingSource === "gallery" ? (
            <ActivityIndicator color={iconColor} />
          ) : (
            <ImagesIcon size={20} color={iconColor} weight="bold" />
          )}
          <Text style={{ color: iconColor }} className="ml-2 font-bold">
            {t("chooseFromGallery")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
