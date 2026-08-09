import Text from "@/components/common/AppText";
import KeyboardAwareFormScrollView from "@/components/common/layout/KeyboardAwareFormScrollView";
import { AppButton, TextInput, ThemedSafeAreaView } from "@/components/common";
import DishPhotoPickerCard from "@/components/review-creator/components/DishPhotoPickerCard";
import RatingPicker from "@/components/review-creator/components/RatingPicker";
import { useToast } from "@/contexts/ToastContext";
import {
  pickReviewImage,
  type ReviewImageSource,
} from "@/lib/reviewImagePicker";
import type { ReviewDishMedia } from "@findeat/types";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";

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
  saving?: boolean;
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
  saving = false,
  onBack,
  onRemoveExistingMedia,
  onRemove,
  onSave,
}: Props) {
  const { t } = useTranslation("collaborativeReview");
  const { t: tCreate } = useTranslation("create");
  const { t: tCommon } = useTranslation("common");
  const { showToast } = useToast();
  const [rating, setRating] = useState(initialRating);
  const [text, setText] = useState(initialText);
  const [imageUri, setImageUri] = useState<string>();
  const [pickingSource, setPickingSource] =
    useState<ReviewImageSource | null>(null);

  const existingImage = existingMedia[0];
  const hasPersonalImage = !!imageUri || !!existingImage;
  const hasContribution =
    rating != null || text.trim().length > 0 || hasPersonalImage;

  async function choosePhoto(source: ReviewImageSource) {
    if (pickingSource || saving) return;
    try {
      setPickingSource(source);
      const image = await pickReviewImage(
        source,
        "dish",
        tCreate("cropDishPhoto"),
      );
      if (image) setImageUri(image.uri);
    } catch (error) {
      console.error("Could not pick collaborative dish image", error);
      showToast(tCreate("imageCropErrorBody"), { kind: "error" });
    } finally {
      setPickingSource(null);
    }
  }

  function removeDisplayedPhoto() {
    if (imageUri) {
      setImageUri(undefined);
      return;
    }
    if (existingImage && onRemoveExistingMedia) {
      onRemoveExistingMedia(existingImage.id);
    }
  }

  return (
    <ThemedSafeAreaView edges={["top", "bottom"]}>
      <View className="flex-row items-center border-b border-gray-100 px-4 py-3 dark:border-gray-900">
        <TouchableOpacity onPress={onBack} className="px-2 py-2">
          <Text className="font-bold text-black dark:text-white">
            {tCommon("back")}
          </Text>
        </TouchableOpacity>
        <Text
          numberOfLines={1}
          className="mx-3 flex-1 text-center text-lg font-bold text-black dark:text-white"
        >
          {title}
        </Text>
        <View className="w-14" />
      </View>

      <KeyboardAwareFormScrollView
        bottomOffset={30}
        contentContainerStyle={{ padding: 20, paddingBottom: 44 }}
      >
        <DishPhotoPickerCard
          imageUrl={imageUri ?? existingImage?.imageUrl}
          fallbackImageUrl={imageUrl}
          pickingSource={pickingSource}
          disabled={saving}
          removing={saving && !!existingImage && !imageUri}
          onChoose={(source) => void choosePhoto(source)}
          onRemove={removeDisplayedPhoto}
        />

        <View className="mt-7 gap-7">
          <RatingPicker
            label={`${t("rating")} · ${t("optional")}`}
            value={rating}
            onChange={setRating}
          />

          <View>
            <Text className="mb-2 font-bold text-black dark:text-white">
              {t("note")} · {t("optional")}
            </Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t("notePlaceholder")}
              multiline
              textAlignVertical="top"
              className="min-h-24 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-black dark:border-gray-700 dark:bg-[#151516] dark:text-white"
            />
          </View>
        </View>

        <View className="mt-8">
          <AppButton
            title={t("saveTake")}
            loading={saving}
            disabled={!hasContribution || !!pickingSource}
            onPress={() =>
              onSave({
                rating,
                text,
                imageUris: imageUri ? [imageUri] : [],
              })
            }
          />
        </View>

        {onRemove ? (
          <TouchableOpacity
            disabled={saving}
            onPress={onRemove}
            className="mt-3 items-center py-3"
          >
            <Text className="font-bold text-red-500">{t("removeTake")}</Text>
          </TouchableOpacity>
        ) : null}
      </KeyboardAwareFormScrollView>
    </ThemedSafeAreaView>
  );
}
