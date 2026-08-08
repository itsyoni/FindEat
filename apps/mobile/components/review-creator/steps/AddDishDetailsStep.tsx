import Text from "@/components/common/AppText";
import KeyboardAwareFormScrollView from "@/components/common/layout/KeyboardAwareFormScrollView";
import { AppButton, TextInput, ThemedSafeAreaView } from "@/components/common";
import SaveDraftButton from "@/components/posts/SaveDraftButton";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import {
  pickReviewImage,
  type ReviewImageSource,
} from "@/lib/reviewImagePicker";
import type { Dish } from "@findeat/types";
import type {
  ReviewDishDraft,
  ReviewDishFormDraft,
} from "@findeat/types/review";
import {
  CameraIcon,
  ImagesIcon,
  TrashIcon,
} from "phosphor-react-native";
import { useRef, useState } from "react";
import { ActivityIndicator, Image, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
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
  editing = false,
}: Props) {
  const { t } = useTranslation(["create", "common"]);
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
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
      setPickingSource(null);

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

  const iconColor = isDark ? "#FAF9F6" : "#171717";

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
        <View className="overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
          {imageUri ? (
            <View style={{ width: "100%", aspectRatio: 4 / 3 }}>
              <Image
                source={{ uri: imageUri }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
                onError={(event) =>
                  console.error("Review dish image preview failed", {
                    uri: imageUri,
                    error: event.nativeEvent.error,
                  })
                }
              />
              <TouchableOpacity
                accessibilityLabel={t("delete")}
                onPress={removePhoto}
                className="absolute right-3 top-3 h-10 w-10 items-center justify-center rounded-full bg-black/70"
              >
                <TrashIcon size={19} color="#FAF9F6" weight="fill" />
              </TouchableOpacity>
            </View>
          ) : selectedDish?.imageUrl ? (
            <View style={{ width: "100%", aspectRatio: 4 / 3 }}>
              <Image
                source={{ uri: selectedDish.imageUrl }}
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
              disabled={!!pickingSource}
              onPress={() => void choosePhoto("camera")}
              className="min-h-12 flex-1 flex-row items-center justify-center rounded-2xl bg-white px-3 dark:bg-black"
            >
              {pickingSource === "camera" ? (
                <ActivityIndicator color={iconColor} />
              ) : (
                <CameraIcon size={20} color={iconColor} weight="bold" />
              )}
              <Text className="ml-2 font-bold text-black dark:text-white">
                {t("takePhoto")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!!pickingSource}
              onPress={() => void choosePhoto("gallery")}
              className="min-h-12 flex-1 flex-row items-center justify-center rounded-2xl bg-white px-3 dark:bg-black"
            >
              {pickingSource === "gallery" ? (
                <ActivityIndicator color={iconColor} />
              ) : (
                <ImagesIcon size={20} color={iconColor} weight="bold" />
              )}
              <Text className="ml-2 font-bold text-black dark:text-white">
                {t("chooseFromGallery")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

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
          />
        </View>
      </KeyboardAwareFormScrollView>
    </ThemedSafeAreaView>
  );
}
