import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { ThemedSafeAreaView } from "@/components/common";
import SaveDraftButton from "@/components/posts/SaveDraftButton";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useGallerySaveFeedback } from "@/hooks/useGallerySaveFeedback";
import { persistReviewMediaUri } from "@/lib/postDrafts";
import { pickReviewImage, type ReviewImageSource } from "@/lib/reviewImagePicker";
import { MediaLibraryPermissionError, saveImageToGallery } from "@/lib/saveImageToGallery";
import { useToast } from "@/contexts/ToastContext";
import type { CreateReviewDraft } from "@findeat/types/review";
import { CalendarBlankIcon, CameraIcon, ChatTextIcon, CurrencyDollarIcon, SparkleIcon, StarIcon, UsersThreeIcon } from "phosphor-react-native";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import DishPhotoPickerCard from "../components/DishPhotoPickerCard";
import ReviewFieldEditor, { type ReviewFieldEditorKind } from "./ReviewFieldEditor";

type Props = {
  draft: CreateReviewDraft;
  onChange: (update: Partial<CreateReviewDraft>) => void;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft?: () => void;
  savingDraft?: boolean;
  onChooseParticipants?: () => void;
  derivedCover?: boolean;
  compactLinkedFlow?: boolean;
};

type ActiveEditor = ReviewFieldEditorKind | "COVER" | null;

function ReviewOptionRow({ icon, title, value, onPress, imageUrl, trailing, first = false }: {
  icon: ReactNode;
  title: string;
  value: string;
  onPress: () => void;
  imageUrl?: string;
  trailing?: ReactNode;
  first?: boolean;
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
        <Text className="text-base font-bold text-[#171717] dark:text-[#FAF9F6]">{title}</Text>
        <Text numberOfLines={1} className="mt-1 text-sm text-gray-500 dark:text-gray-400">{value}</Text>
      </View>
      {trailing}
      <DirectionalIcon direction="forward" size={19} color={isDark ? "#9CA3AF" : "#6B7280"} weight="bold" />
    </TouchableOpacity>
  );
}

export default function CoverStep({
  draft,
  onChange,
  onBack,
  onNext,
  onSaveDraft,
  savingDraft,
  onChooseParticipants,
  derivedCover = false,
  compactLinkedFlow = false,
}: Props) {
  const { t, i18n } = useTranslation(["create", "common"]);
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [activeEditor, setActiveEditor] = useState<ActiveEditor>(null);
  const [pickingSource, setPickingSource] = useState<ReviewImageSource | null>(null);
  const { status: gallerySaveStatus, isSaving: savingToGallery, begin: beginGallerySave, succeed: completeGallerySave, fail: failGallerySave } = useGallerySaveFeedback();
  const coverSelectionRef = useRef(0);
  const restaurantName = draft.restaurant?.source === "FINDEAT" ? draft.restaurant.restaurant.name : draft.restaurant?.name;
  const coverImage = draft.coverImageUri ?? draft.coverImageUrl;

  async function chooseCoverImage(source: ReviewImageSource) {
    if (pickingSource) return;
    const selectionId = ++coverSelectionRef.current;
    try {
      setPickingSource(source);
      const croppedImage = await pickReviewImage(source, "cover", t("cropReviewPhoto"));
      if (!croppedImage || coverSelectionRef.current !== selectionId) return;
      onChange({ coverImageUri: croppedImage.uri, coverImageUrl: undefined });
      setPickingSource(null);
      if (user?.id) {
        void persistReviewMediaUri(user.id, croppedImage.uri, `review-cover-${selectionId}`)
          .then((persistedUri) => {
            if (coverSelectionRef.current === selectionId) onChange({ coverImageUri: persistedUri, coverImageUrl: undefined });
          })
          .catch((error) => console.error("review cover draft persistence failed", error));
      }
    } catch (error) {
      console.error("review cover image crop failed", error);
      showToast(t("imageCropErrorBody"), { kind: "error" });
    } finally {
      if (coverSelectionRef.current === selectionId) setPickingSource(null);
    }
  }

  function removeCoverImage() {
    coverSelectionRef.current += 1;
    setPickingSource(null);
    onChange({ coverImageUri: undefined, coverImageUrl: undefined });
  }

  async function saveCoverToGallery() {
    if (!coverImage || savingToGallery) return;
    beginGallerySave();
    try {
      await saveImageToGallery(coverImage);
      completeGallerySave();
      showToast(t("common:savedToGallery"), { kind: "success" });
    } catch (error) {
      failGallerySave();
      showToast(t(error instanceof MediaLibraryPermissionError ? "common:saveToGalleryPermission" : "common:saveToGalleryFailed"), { kind: "error" });
    }
  }

  if (activeEditor && activeEditor !== "COVER") {
    return <ReviewFieldEditor kind={activeEditor} draft={draft} onChange={onChange} onDone={() => setActiveEditor(null)} />;
  }

  if (activeEditor === "COVER") {
    return (
      <ThemedSafeAreaView>
        <View className="h-14 flex-row items-center border-b border-black/5 px-4 dark:border-white/10">
          <TouchableOpacity onPress={() => setActiveEditor(null)} className="h-10 w-10 items-center justify-center">
            <DirectionalIcon direction="back" size={24} color={isDark ? "#FAF9F6" : "#171717"} weight="bold" />
          </TouchableOpacity>
          <Text className="mx-3 flex-1 text-center text-lg font-bold text-[#171717] dark:text-[#FAF9F6]">{t("placePhoto")}</Text>
          <TouchableOpacity onPress={() => setActiveEditor(null)} className="min-w-10 items-end">
            <Text className="font-bold text-brand">{t("common:done")}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
          <Text className="mb-6 text-base leading-6 text-gray-500 dark:text-gray-400">{t("placePhotoHint")}</Text>
          {derivedCover && coverImage ? (
            <View className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800">
              <ProgressiveImage source={{ uri: coverImage }} style={{ width: "100%", aspectRatio: 1 }} resizeMode="cover" />
              <View className="absolute bottom-3 right-3 rounded-full bg-[#0B0B0ACC] px-4 py-2">
                <Text className="text-sm font-bold text-[#FAF9F6]">{t("coverFromPost")}</Text>
              </View>
            </View>
          ) : (
            <DishPhotoPickerCard
              imageUrl={coverImage}
              pickingSource={pickingSource}
              emptyTitle={t("addPlacePhoto")}
              emptyHint={t("takePhotoOrChooseGallery")}
              aspectRatio={1}
              onChoose={(source) => void chooseCoverImage(source)}
              onRemove={removeCoverImage}
              onSaveToGallery={draft.coverImageUri ? () => void saveCoverToGallery() : undefined}
              gallerySaveStatus={gallerySaveStatus}
            />
          )}
        </ScrollView>
      </ThemedSafeAreaView>
    );
  }

  const occasionValue = draft.recommendedFor ? t(`visitOccasions.${draft.recommendedFor}`) : t("tapToAdd");
  const visitDateValue = draft.visitDate
    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(draft.visitDate))
    : t("tapToAdd");
  const tagsValue = draft.experienceTags.length ? t("detailsSelected", { count: draft.experienceTags.length }) : t("tapToAdd");

  return (
    <ThemedSafeAreaView>
      <View className="h-14 flex-row items-center justify-between px-5">
        <TouchableOpacity onPress={onBack} className="min-w-14">
          <Text className="font-bold text-[#171717] dark:text-[#FAF9F6]">{t("common:back")}</Text>
        </TouchableOpacity>
        <Text className="text-sm font-semibold text-gray-400">{t("create:stepOf", { current: 2, total: 4 })}</Text>
        <View className="min-w-14 items-end">
          {onSaveDraft ? <SaveDraftButton onPress={onSaveDraft} saving={savingDraft} /> : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Text className="mt-4 text-3xl font-bold text-[#171717] dark:text-[#FAF9F6]">
          {restaurantName ? t("reviewExperienceTitle", { restaurantName }) : t("reviewExperienceTitleFallback")}
        </Text>
        <Text className="mt-2 text-base leading-6 text-gray-500 dark:text-gray-400">{t("reviewBuildHint")}</Text>

        {!compactLinkedFlow ? (
          <View className="mt-7 overflow-hidden rounded-3xl border border-black/5 bg-[#F7F6F2] dark:border-white/10 dark:bg-[#171716]">
            <ReviewOptionRow
              first
              icon={<CameraIcon size={25} color="#D4A72C" weight="duotone" />}
              imageUrl={coverImage}
              title={t("placePhoto")}
              value={coverImage ? t("added") : t("tapToAdd")}
              onPress={() => setActiveEditor("COVER")}
            />
            {onChooseParticipants ? (
              <ReviewOptionRow
                icon={<UsersThreeIcon size={25} color="#D4A72C" weight="duotone" />}
                title={t("reviewTogetherRowTitle")}
                value={draft.participants.length ? t("reviewTogetherPeopleSelected", { count: draft.participants.length }) : t("tapToAdd")}
                onPress={onChooseParticipants}
                trailing={draft.participants.length ? (
                  <View className="mr-3 flex-row">
                    {draft.participants.slice(0, 2).map((participant, index) => (
                      <View key={participant.id} style={{ marginLeft: index ? -7 : 0 }}>
                        <Avatar uri={participant.avatarUrl} username={participant.username} size={28} showSnapIndicator={false} />
                      </View>
                    ))}
                  </View>
                ) : undefined}
              />
            ) : null}
          </View>
        ) : null}

        <Text className="mb-3 ml-1 mt-8 text-sm font-bold uppercase tracking-wider text-gray-500">{t("yourVisit")}</Text>
        <View className="overflow-hidden rounded-3xl border border-black/5 bg-[#F7F6F2] dark:border-white/10 dark:bg-[#171716]">
          <ReviewOptionRow first icon={<ChatTextIcon size={25} color="#D4A72C" weight="duotone" />} title={t("reviewNoteShort")} value={draft.summary.trim() || t("tapToAdd")} onPress={() => setActiveEditor("SUMMARY")} />
          <ReviewOptionRow icon={<UsersThreeIcon size={25} color="#D4A72C" weight="duotone" />} title={t("reasonForVisit")} value={occasionValue} onPress={() => setActiveEditor("OCCASION")} />
          <ReviewOptionRow icon={<CalendarBlankIcon size={25} color="#D4A72C" weight="duotone" />} title={t("visitDate")} value={visitDateValue} onPress={() => setActiveEditor("VISIT_DATE")} />
          <ReviewOptionRow icon={<SparkleIcon size={25} color="#D4A72C" weight="duotone" />} title={t("goodToKnow")} value={tagsValue} onPress={() => setActiveEditor("EXPERIENCE_TAGS")} />
          <ReviewOptionRow icon={<CurrencyDollarIcon size={25} color="#D4A72C" weight="duotone" />} title={t("bill")} value={draft.totalPrice != null ? String(draft.totalPrice) : t("tapToAdd")} onPress={() => setActiveEditor("TOTAL_PRICE")} />
        </View>

        <Text className="mb-3 ml-1 mt-8 text-sm font-bold uppercase tracking-wider text-gray-500">{t("ratings")}</Text>
        <View className="overflow-hidden rounded-3xl border border-black/5 bg-[#F7F6F2] dark:border-white/10 dark:bg-[#171716]">
          <ReviewOptionRow first icon={<StarIcon size={25} color="#D4A72C" weight="duotone" />} title={t("atmosphere")} value={draft.atmosphereRating ? `${draft.atmosphereRating}/10` : t("tapToAdd")} onPress={() => setActiveEditor("ATMOSPHERE")} />
          <ReviewOptionRow icon={<StarIcon size={25} color="#D4A72C" weight="duotone" />} title={t("service")} value={draft.serviceRating ? `${draft.serviceRating}/10` : t("tapToAdd")} onPress={() => setActiveEditor("SERVICE")} />
          <ReviewOptionRow icon={<StarIcon size={25} color="#D4A72C" weight="duotone" />} title={t("value")} value={draft.valueRating ? `${draft.valueRating}/10` : t("tapToAdd")} onPress={() => setActiveEditor("VALUE")} />
        </View>

        <TouchableOpacity className="mt-8 rounded-2xl bg-[#171717] py-4 dark:bg-[#FAF9F6]" onPress={onNext}>
          <Text className="text-center font-bold text-[#FAF9F6] dark:text-[#171717]">{t("continue")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </ThemedSafeAreaView>
  );
}
