import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import KeyboardAwareFormScrollView from "@/components/common/layout/KeyboardAwareFormScrollView";
import { TextInput, ThemedSafeAreaView } from "@/components/common";
import RatingPicker from "@/components/review-creator/components/RatingPicker";
import PriceInput from "@/components/review-creator/components/PriceInput";
import { useAppTheme } from "@/contexts/ThemeContext";
import type { ReviewDishMedia } from "@findeat/types";
import * as ImagePicker from "expo-image-picker";
import { ImagesIcon, XIcon } from "phosphor-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";

export type ContributionEditorValue = {
  rating?: number;
  text: string;
  imageUris: string[];
  customDishName?: string;
  customPrice?: number;
};

type Props = {
  title: string;
  imageUrl?: string | null;
  initialRating?: number;
  initialText?: string;
  existingMedia?: ReviewDishMedia[];
  customDish?: boolean;
  saving?: boolean;
  submitLabel?: string;
  onBack: () => void;
  onRemoveExistingMedia?: (mediaId: string) => void;
  onRemove?: () => void;
  onSave: (value: ContributionEditorValue) => void;
};

export default function ReviewContributionEditor({
  title,
  imageUrl,
  initialRating,
  initialText = "",
  existingMedia = [],
  customDish = false,
  saving = false,
  submitLabel,
  onBack,
  onRemoveExistingMedia,
  onRemove,
  onSave,
}: Props) {
  const { t } = useTranslation("collaborativeReview");
  const { isDark } = useAppTheme();
  const [rating, setRating] = useState(initialRating);
  const [text, setText] = useState(initialText);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [dishName, setDishName] = useState(customDish ? "" : title);
  const [price, setPrice] = useState<number>();

  async function pickPhotos() {
    const remaining = Math.max(
      0,
      6 - existingMedia.length - imageUris.length,
    );
    if (remaining === 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.82,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled) {
      setImageUris((current) => [
        ...current,
        ...result.assets.map((asset) => asset.uri),
      ]);
    }
  }

  const hasContribution =
    rating != null ||
    text.trim().length > 0 ||
    imageUris.length > 0 ||
    existingMedia.length > 0;
  const canSave = hasContribution && (!customDish || dishName.trim().length > 0);
  const iconColor = isDark ? "#FFFFFF" : "#111827";

  return (
    <ThemedSafeAreaView edges={["top", "bottom"]}>
      <View className="flex-row items-center border-b border-gray-100 px-4 py-3 dark:border-gray-900">
        <TouchableOpacity
          onPress={onBack}
          className="h-11 w-11 items-center justify-center"
        >
          <DirectionalIcon
            direction="back"
            size={25}
            color={iconColor}
            weight="bold"
          />
        </TouchableOpacity>
        <Text
          numberOfLines={1}
          className="ml-2 flex-1 text-xl font-bold text-black dark:text-white"
        >
          {customDish ? t("customDish") : title}
        </Text>
      </View>

      <KeyboardAwareFormScrollView
        bottomOffset={30}
        contentContainerStyle={{ padding: 20, paddingBottom: 44 }}
      >
        {!!imageUrl && !customDish && (
          <ProgressiveImage
            source={{ uri: imageUrl }}
            className="mb-6 h-48 w-full rounded-3xl bg-gray-100"
            resizeMode="cover"
          />
        )}

        {customDish && (
          <View className="mb-7 gap-5 rounded-3xl bg-gray-50 p-5 dark:bg-gray-900">
            <View>
              <Text className="mb-2 font-bold text-black dark:text-white">
                {t("dishName")}
              </Text>
              <TextInput
                value={dishName}
                onChangeText={setDishName}
                placeholder={t("dishNamePlaceholder")}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-black dark:border-gray-700 dark:bg-black dark:text-white"
              />
            </View>
            <PriceInput
              label={t("price")}
              value={price}
              onChange={setPrice}
            />
          </View>
        )}

        <View className="rounded-3xl bg-gray-50 p-5 dark:bg-gray-900">
          <RatingPicker
            label={t("rating")}
            value={rating}
            onChange={setRating}
          />

          <Text className="mb-2 mt-7 font-bold text-black dark:text-white">
            {t("note")}{" "}
            <Text className="font-normal text-gray-400">{t("optional")}</Text>
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t("notePlaceholder")}
            multiline
            textAlignVertical="top"
            className="min-h-24 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-black dark:border-gray-700 dark:bg-black dark:text-white"
          />
        </View>

        <View className="mt-7">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-black dark:text-white">
              {t("photos")}
            </Text>
            <Text className="text-sm text-gray-400">
              {existingMedia.length + imageUris.length}/6
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
          >
            {existingMedia.map((media) => (
              <View key={media.id}>
                <ProgressiveImage
                  source={{ uri: media.imageUrl }}
                  className="h-28 w-28 rounded-2xl bg-gray-100"
                  resizeMode="cover"
                />
                {!!onRemoveExistingMedia && (
                  <TouchableOpacity
                    onPress={() => onRemoveExistingMedia(media.id)}
                    className="absolute right-1 top-1 h-7 w-7 items-center justify-center rounded-full bg-black/70"
                  >
                    <XIcon size={14} color="#FFFFFF" weight="bold" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {imageUris.map((uri) => (
              <View key={uri}>
                <ProgressiveImage
                  source={{ uri }}
                  className="h-28 w-28 rounded-2xl bg-gray-100"
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() =>
                    setImageUris((current) =>
                      current.filter((item) => item !== uri),
                    )
                  }
                  className="absolute right-1 top-1 h-7 w-7 items-center justify-center rounded-full bg-black/70"
                >
                  <XIcon size={14} color="#FFFFFF" weight="bold" />
                </TouchableOpacity>
              </View>
            ))}
            {existingMedia.length + imageUris.length < 6 && (
              <TouchableOpacity
                onPress={() => void pickPhotos()}
                className="h-28 w-28 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
              >
                <ImagesIcon size={28} color="#9CA3AF" />
                <Text className="mt-2 text-xs font-bold text-gray-500">
                  {t("addPhotos")}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        <TouchableOpacity
          disabled={!canSave || saving}
          onPress={() =>
            onSave({
              rating,
              text,
              imageUris,
              customDishName: customDish ? dishName.trim() : undefined,
              customPrice: customDish ? price : undefined,
            })
          }
          className={`mt-8 items-center rounded-2xl py-4 ${
            canSave && !saving
              ? "bg-black dark:bg-white"
              : "bg-gray-200 dark:bg-gray-800"
          }`}
        >
          {saving ? (
            <ActivityIndicator color="#9CA3AF" />
          ) : (
            <Text
              className={`font-bold ${
                canSave
                  ? "text-white dark:text-black"
                  : "text-gray-400"
              }`}
            >
              {submitLabel || t("saveTake")}
            </Text>
          )}
        </TouchableOpacity>

        {!!onRemove && (
          <TouchableOpacity
            disabled={saving}
            onPress={onRemove}
            className="mt-3 items-center py-3"
          >
            <Text className="font-bold text-red-500">{t("removeTake")}</Text>
          </TouchableOpacity>
        )}
      </KeyboardAwareFormScrollView>
    </ThemedSafeAreaView>
  );
}
