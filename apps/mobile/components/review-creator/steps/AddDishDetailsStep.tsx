import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { AppButton, ThemedSafeAreaView } from "@/components/common";
import SaveDraftButton from "@/components/posts/SaveDraftButton";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useGallerySaveFeedback } from "@/hooks/useGallerySaveFeedback";
import { persistReviewMediaUri } from "@/lib/postDrafts";
import { pickReviewImage, type ReviewImageSource } from "@/lib/reviewImagePicker";
import { MediaLibraryPermissionError, saveImageToGallery } from "@/lib/saveImageToGallery";
import type { Dish } from "@findeat/types";
import type { ReviewDishDraft, ReviewDishFormDraft } from "@findeat/types/review";
import { ChatTextIcon, CurrencyDollarIcon, ForkKnifeIcon, ImageSquareIcon, StarIcon } from "phosphor-react-native";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import DishPhotoPickerCard from "../components/DishPhotoPickerCard";
import DishFieldEditor, { type DishFieldEditorKind } from "./DishFieldEditor";

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

type ActiveField = DishFieldEditorKind | "PHOTO" | null;

function DishOptionRow({ icon, title, value, onPress, imageUrl, first = false, error = false }: {
  icon: ReactNode;
  title: string;
  value: string;
  onPress: () => void;
  imageUrl?: string | null;
  first?: boolean;
  error?: boolean;
}) {
  const { isDark } = useAppTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.72}
      onPress={onPress}
      className={`min-h-[74px] flex-row items-center px-4 py-3 ${first ? "" : "border-t border-black/5 dark:border-white/10"}`}
    >
      {imageUrl ? (
        <ProgressiveImage source={{ uri: imageUrl }} style={{ width: 44, height: 44, borderRadius: 12 }} resizeMode="cover" />
      ) : (
        <View className="h-11 w-11 items-center justify-center">{icon}</View>
      )}
      <View className="ml-3 min-w-0 flex-1">
        <Text className={`text-base font-bold ${error ? "text-red-500" : "text-[#171717] dark:text-[#FAF9F6]"}`}>{title}</Text>
        <Text numberOfLines={1} className={`mt-1 text-sm ${error ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}>{value}</Text>
      </View>
      <DirectionalIcon direction="forward" size={19} color={error ? "#EF4444" : isDark ? "#9CA3AF" : "#6B7280"} weight="bold" />
    </TouchableOpacity>
  );
}

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
  const { isDark } = useAppTheme();
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
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [pickingSource, setPickingSource] = useState<ReviewImageSource | null>(null);
  const imageSelectionRef = useRef(0);
  const { status: gallerySaveStatus, isSaving: savingToGallery, begin: beginGallerySave, succeed: completeGallerySave, fail: failGallerySave } = useGallerySaveFeedback();

  async function choosePhoto(source: ReviewImageSource) {
    if (pickingSource) return;
    const selectionId = ++imageSelectionRef.current;
    try {
      setPickingSource(source);
      const image = await pickReviewImage(source, "dish", t("cropDishPhoto"));
      if (!image || imageSelectionRef.current !== selectionId) return;
      onDraftChange({ imageUri: image.uri });
      setPickingSource(null);
      if (user?.id) {
        void persistReviewMediaUri(user.id, image.uri, `pending-dish-${selectionId}`)
          .then((persistedUri) => {
            if (imageSelectionRef.current === selectionId) onDraftChange({ imageUri: persistedUri });
          })
          .catch((error) => console.error("Could not persist review dish image", error));
      }
    } catch (error) {
      console.error("Could not pick review dish image", error);
      showToast(t("imageCropErrorBody"), { kind: "error" });
    } finally {
      if (imageSelectionRef.current === selectionId) setPickingSource(null);
    }
  }

  function removePhoto() {
    imageSelectionRef.current += 1;
    onDraftChange({ imageUri: undefined });
    setPickingSource(null);
  }

  async function saveDishPhotoToGallery() {
    if (!imageUri || savingToGallery) return;
    beginGallerySave();
    try {
      await saveImageToGallery(imageUri);
      completeGallerySave();
      showToast(t("common:savedToGallery"), { kind: "success" });
    } catch (error) {
      failGallerySave();
      showToast(t(error instanceof MediaLibraryPermissionError ? "common:saveToGalleryPermission" : "common:saveToGalleryFailed"), { kind: "error" });
    }
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

  if (activeField && activeField !== "PHOTO") {
    return <DishFieldEditor kind={activeField} form={form} onChange={onDraftChange} onDone={() => setActiveField(null)} />;
  }

  if (activeField === "PHOTO") {
    return (
      <ThemedSafeAreaView>
        <View className="h-14 flex-row items-center border-b border-black/5 px-4 dark:border-white/10">
          <TouchableOpacity onPress={() => setActiveField(null)} className="h-10 w-10 items-center justify-center">
            <DirectionalIcon direction="back" size={24} color={isDark ? "#FAF9F6" : "#171717"} weight="bold" />
          </TouchableOpacity>
          <Text className="mx-3 flex-1 text-center text-lg font-bold text-[#171717] dark:text-[#FAF9F6]">{t("dishPhoto")}</Text>
          <TouchableOpacity onPress={() => setActiveField(null)} className="min-w-10 items-end">
            <Text className="font-bold text-brand">{t("common:done")}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
          <Text className="mb-6 text-base leading-6 text-gray-500 dark:text-gray-400">{t("dishPhotoFirstHint")}</Text>
          <DishPhotoPickerCard
            imageUrl={imageUri}
            fallbackImageUrl={selectedDish?.imageUrl}
            pickingSource={pickingSource}
            disabled={submitting}
            onChoose={(source) => void choosePhoto(source)}
            onRemove={removePhoto}
            onSaveToGallery={imageUri ? () => void saveDishPhotoToGallery() : undefined}
            gallerySaveStatus={gallerySaveStatus}
          />
        </ScrollView>
      </ThemedSafeAreaView>
    );
  }

  const previewImage = imageUri ?? selectedDish?.imageUrl;
  const missingName = attemptedSave && !isFromMenu && !dishName.trim();

  return (
    <ThemedSafeAreaView edges={["top", "bottom"]}>
      <View className="h-14 flex-row items-center border-b border-black/5 px-4 dark:border-white/10">
        <TouchableOpacity onPress={onBack} className="min-w-14 px-2 py-2">
          <Text className="font-bold text-[#171717] dark:text-[#FAF9F6]">{t("common:back")}</Text>
        </TouchableOpacity>
        <Text numberOfLines={1} className="mx-3 flex-1 text-center text-lg font-bold text-[#171717] dark:text-[#FAF9F6]">
          {isFromMenu ? selectedDish.name : editing ? t("editDish") : t("addCustomDish")}
        </Text>
        {onSaveDraft ? <SaveDraftButton onPress={onSaveDraft} saving={savingDraft} /> : <View className="w-14" />}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text className="mt-3 text-3xl font-bold text-[#171717] dark:text-[#FAF9F6]">{t("buildDishTitle")}</Text>
        <Text className="mt-2 text-base leading-6 text-gray-500 dark:text-gray-400">{t("buildDishHint")}</Text>

        <View className="mt-7 overflow-hidden rounded-3xl border border-black/5 bg-[#F7F6F2] dark:border-white/10 dark:bg-[#171716]">
          <DishOptionRow first icon={<ImageSquareIcon size={25} color="#D4A72C" weight="duotone" />} imageUrl={previewImage} title={t("dishPhoto")} value={imageUri ? t("yourDishPhotoSelected") : selectedDish?.imageUrl ? t("usingMenuDishPhoto") : t("tapToAdd")} onPress={() => setActiveField("PHOTO")} />
          {!isFromMenu ? <DishOptionRow icon={<ForkKnifeIcon size={25} color="#D4A72C" weight="duotone" />} title={t("dishName")} value={dishName.trim() || t("tapToAdd")} error={missingName} onPress={() => setActiveField("NAME")} /> : null}
          {!isFromMenu ? <DishOptionRow icon={<CurrencyDollarIcon size={25} color="#D4A72C" weight="duotone" />} title={t("price")} value={price != null ? String(price) : t("tapToAdd")} onPress={() => setActiveField("PRICE")} /> : null}
          <DishOptionRow icon={<StarIcon size={25} color="#D4A72C" weight="duotone" />} title={t("dishRating")} value={rating ? `${rating}/10` : t("tapToAdd")} onPress={() => setActiveField("RATING")} />
          <DishOptionRow icon={<ChatTextIcon size={25} color="#D4A72C" weight="duotone" />} title={t("dishNote")} value={text.trim() || t("tapToAdd")} onPress={() => setActiveField("NOTE")} />
        </View>

        {missingName ? <Text className="ml-2 mt-3 text-sm font-semibold text-red-500">{t("fieldRequired")}</Text> : null}

        <View className="mt-8">
          <AppButton title={editing ? t("common:saveChanges") : t("saveDish")} onPress={handleSave} loading={submitting} disabled={!!pickingSource} />
        </View>
      </ScrollView>
    </ThemedSafeAreaView>
  );
}
