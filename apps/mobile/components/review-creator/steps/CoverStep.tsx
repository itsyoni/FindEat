import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { ThemedSafeAreaView } from "@/components/common";
import SaveDraftButton from "@/components/posts/SaveDraftButton";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { persistReviewMediaUri } from "@/lib/postDrafts";
import type { PickedReviewImage } from "@/lib/reviewImagePicker";
import { useToast } from "@/contexts/ToastContext";
import ContentPhotoCamera from "@/components/create/ContentPhotoCamera";
import type { CreateReviewDraft } from "@findeat/types/review";
import { CalendarBlankIcon, CameraIcon, ChatTextIcon, SparkleIcon, StarIcon, UsersThreeIcon } from "phosphor-react-native";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import ReviewImageCropEditor from "../components/ReviewImageCropEditor";
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

type ActiveEditor = ReviewFieldEditorKind | null;

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
  compactLinkedFlow = false,
}: Props) {
  const { t, i18n } = useTranslation(["create", "common"]);
  const { showToast } = useToast();
  const { user } = useAuth();
  const [activeEditor, setActiveEditor] = useState<ActiveEditor>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [pendingCropImage, setPendingCropImage] =
    useState<PickedReviewImage | null>(null);
  const coverSelectionRef = useRef(0);
  const restaurantName = draft.restaurant?.source === "FINDEAT" ? draft.restaurant.restaurant.name : draft.restaurant?.name;
  const coverImage = draft.coverImageUri ?? draft.coverImageUrl;

  function openCoverCamera() {
    coverSelectionRef.current += 1;
    setCameraOpen(true);
  }

  function handleCoverCameraImage(image: PickedReviewImage) {
    setCameraOpen(false);
    setPendingCropImage(image);
  }

  function applyCoverImage(image: PickedReviewImage) {
    const selectionId = coverSelectionRef.current;
    setPendingCropImage(null);
    onChange({ coverImageUri: image.uri, coverImageUrl: undefined });
    if (user?.id) {
      void persistReviewMediaUri(user.id, image.uri, `review-cover-${selectionId}`)
          .then((persistedUri) => {
            if (coverSelectionRef.current === selectionId) onChange({ coverImageUri: persistedUri, coverImageUrl: undefined });
          })
          .catch((error) => console.error("review cover draft persistence failed", error));
    }
  }

  if (cameraOpen) {
    return (
      <ContentPhotoCamera
        onClose={() => setCameraOpen(false)}
        onImage={handleCoverCameraImage}
        onError={() => showToast(t("imageCropErrorBody"), { kind: "error" })}
      />
    );
  }

  if (activeEditor) {
    return <ReviewFieldEditor kind={activeEditor} draft={draft} onChange={onChange} onDone={() => setActiveEditor(null)} />;
  }

  if (pendingCropImage) {
    return (
      <ReviewImageCropEditor
        image={pendingCropImage}
        kind="cover"
        onCancel={() => {
          setPendingCropImage(null);
          setCameraOpen(true);
        }}
        onApply={applyCoverImage}
      />
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
              onPress={openCoverCamera}
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
