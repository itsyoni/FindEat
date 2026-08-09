import Text from "@/components/common/AppText";
import KeyboardAwareFormScrollView from "@/components/common/layout/KeyboardAwareFormScrollView";
import { AppButton, TextInput, ThemedSafeAreaView } from "@/components/common";
import SaveDraftButton from "@/components/posts/SaveDraftButton";
import { useToast } from "@/contexts/ToastContext";
import {
  pickReviewImage,
  type ReviewImageSource,
} from "@/lib/reviewImagePicker";
import { persistReviewMediaUri } from "@/lib/postDrafts";
import { useAuth } from "@/contexts/AuthContext";
import type { Dish } from "@findeat/types";
import type {
  ReviewDishDraft,
  ReviewDishFormDraft,
} from "@findeat/types/review";
import { useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import DishPhotoPickerCard from "../components/DishPhotoPickerCard";
import PriceInput from "../components/PriceInput";
import RatingPicker from "../components/RatingPicker";

type Props = {
  selectedDish: Pick<Dish, "id" | "name" | "price" | "imageUrl"> | null;
  onBack: () => void;
  onSave: (item: Omit<ReviewDishDraft, "id" | "order">) => void;
  initialDraft?: ReviewDishFormDraft | null;
  onDraftChange: (update: Partial<ReviewDishFormDraft>) => void;
  onSaveDraft?: () => void;
  savingDraft?: boolean;
  submitting?: boolean;
  editing?: boolean;
};

export default function AddDishDetailsStep({
  selectedDish,
  onBack,
  onSave,
  initialDraft,
  onDraftChange,
  onSaveDraft,
  savingDraft,
  submitting = false,
  editing = false,
}: Props) {
  const { t } = useTranslation(["create", "common"]);
  const { showToast } = useToast();
  const { user } = useAuth();
  const isFromMenu = !!selectedDish;
  const form: ReviewDishFormDraft = initialDraft ?? {
    dishName: selectedDish?.name ?? "",
    price: selectedDish?.price ?? undefined,
    imageUri: undefined,
    rating: undefined,
    text: "",
  };
  const { dishName, price, imageUri, rating, text } = form;
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [pickingSource, setPickingSource] = useState<ReviewImageSource | null>(
    null,
  );
  const imageSelectionRef = useRef(0);

  async function choosePhoto(source: ReviewImageSource) {
    if (pickingSource) return;
    const selectionId = ++imageSelectionRef.current;
    try {
      setPickingSource(source);
      const image = await pickReviewImage(source, "dish", t("cropDishPhoto"));
      if (!image || imageSelectionRef.current !== selectionId) return;

      // Use the native crop result immediately. Persistence protects drafts,
      // but never blocks the preview or the rest of the form.
      onDraftChange({ imageUri: image.uri });

      if (user?.id) {
        const persistedUri = await persistReviewMediaUri(
          user.id,
          image.uri,
          `pending-dish-${selectionId}`,
        );
        if (imageSelectionRef.current === selectionId) {
          onDraftChange({ imageUri: persistedUri });
        }
      }

    } catch (error) {
      console.error("Could not pick review dish image", error);
      showToast(t("imageCropErrorBody"), { kind: "error" });
    } finally {
      if (imageSelectionRef.current === selectionId) {
        setPickingSource(null);
      }
    }
  }

  function removePhoto() {
    imageSelectionRef.current += 1;
    onDraftChange({ imageUri: undefined });
    setPickingSource(null);
  }

  function handleSave() {
    if (submitting) return;
    setAttemptedSave(true);
    if (!isFromMenu && !dishName.trim()) return;

    onSave({
      menuItemId: selectedDish?.id,
      menuItemName: selectedDish?.name,
      menuItemPrice: selectedDish?.price,
      customDishName: isFromMenu ? undefined : dishName.trim(),
      customPrice: isFromMenu ? undefined : price,
      fallbackImageUrl: selectedDish?.imageUrl,
      imageUri,
      rating,
      text: text.trim() || undefined,
    });
  }

  return (
    <ThemedSafeAreaView edges={["top", "bottom"]}>
      <View className="flex-row items-center border-b border-gray-100 px-4 py-3 dark:border-gray-900">
        <TouchableOpacity onPress={onBack} className="px-2 py-2">
          <Text className="font-bold text-black dark:text-white">
            {t("common:back")}
          </Text>
        </TouchableOpacity>
        <Text
          numberOfLines={1}
          className="mx-3 flex-1 text-center text-lg font-bold text-black dark:text-white"
        >
          {isFromMenu
            ? selectedDish.name
            : editing
              ? t("editDish")
              : t("addCustomDish")}
        </Text>
        {onSaveDraft ? (
          <SaveDraftButton onPress={onSaveDraft} saving={savingDraft} />
        ) : (
          <View className="w-14" />
        )}
      </View>

      <KeyboardAwareFormScrollView
        bottomOffset={30}
        contentContainerStyle={{ padding: 20, paddingBottom: 44 }}
      >
        <DishPhotoPickerCard
          imageUrl={imageUri}
          fallbackImageUrl={selectedDish?.imageUrl}
          pickingSource={pickingSource}
          disabled={submitting}
          onChoose={(source) => void choosePhoto(source)}
          onRemove={removePhoto}
        />

        <View className="mt-7 gap-7">
          {!isFromMenu ? (
            <View>
              <Text className="mb-2 font-bold text-black dark:text-white">
                {t("dishName")}
              </Text>
              <TextInput
                className={`rounded-2xl border bg-white px-4 py-4 text-base text-black dark:bg-black dark:text-white ${
                  attemptedSave && !dishName.trim()
                    ? "border-red-500"
                    : "border-gray-200 dark:border-gray-700"
                }`}
                placeholder={t("dishNamePlaceholder")}
                value={dishName}
                onChangeText={(value) => onDraftChange({ dishName: value })}
              />
              {attemptedSave && !dishName.trim() ? (
                <Text className="mt-2 text-sm text-red-500">
                  {t("fieldRequired")}
                </Text>
              ) : null}
            </View>
          ) : null}

          {!isFromMenu ? (
            <PriceInput
              label={`${t("price")} · ${t("optional")}`}
              value={price}
              onChange={(value) => onDraftChange({ price: value })}
            />
          ) : null}

          <RatingPicker
            label={`${t("dishRating")} · ${t("optional")}`}
            value={rating}
            onChange={(value) => onDraftChange({ rating: value })}
          />

          <View>
            <Text className="mb-2 font-bold text-black dark:text-white">
              {t("dishNote")} · {t("optional")}
            </Text>
            <TextInput
              className="min-h-24 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-black dark:border-gray-700 dark:bg-black dark:text-white"
              placeholder={t("dishNotePlaceholder")}
              value={text}
              onChangeText={(value) => onDraftChange({ text: value })}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        <View className="mt-8">
          <AppButton
            title={editing ? t("common:saveChanges") : t("saveDish")}
            onPress={handleSave}
            loading={submitting}
            disabled={!!pickingSource}
          />
        </View>
      </KeyboardAwareFormScrollView>
    </ThemedSafeAreaView>
  );
}
