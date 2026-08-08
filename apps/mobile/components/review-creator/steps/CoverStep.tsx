import Text from "@/components/common/AppText";
import KeyboardAwareFormScrollView from "@/components/common/layout/KeyboardAwareFormScrollView";
import { CreateReviewDraft } from "@findeat/types/review";
import { TouchableOpacity, View } from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { ThemedSafeAreaView, TextInput } from "@/components/common";
import RatingPicker from "../components/RatingPicker";
import { useTranslation } from "react-i18next";
import SaveDraftButton from "@/components/posts/SaveDraftButton";
import Avatar from "@/components/common/Avatar";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { UsersThreeIcon } from "phosphor-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { pickReviewImage } from "@/lib/reviewImagePicker";
import { useToast } from "@/contexts/ToastContext";

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

export default function CoverStep({ draft, onChange, onBack, onNext, onSaveDraft, savingDraft, onChooseParticipants, derivedCover = false, compactLinkedFlow = false }: Props) {
  const { t } = useTranslation(["create", "common"]);
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const restaurantName =
    draft.restaurant?.source === "FINDEAT"
      ? draft.restaurant.restaurant.name
      : draft.restaurant?.name;

  async function pickCoverImage() {
    try {
      const croppedImage = await pickReviewImage(
        "gallery",
        "cover",
        t("cropReviewPhoto"),
      );
      if (!croppedImage) return;
      onChange({ coverImageUri: croppedImage.uri });
    } catch (error) {
      console.error("review cover image crop failed", error);
      showToast(t("imageCropErrorBody"), { kind: "error" });
    }
  }

  return (
    <ThemedSafeAreaView>
      <KeyboardAwareFormScrollView
        bottomOffset={28}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: 40,
        }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={onBack}>
            <Text className="font-bold text-black dark:text-white">
              {t("common:back")}
            </Text>
          </TouchableOpacity>
          <View className="flex-row items-center gap-2">
            {onSaveDraft ? (
              <SaveDraftButton onPress={onSaveDraft} saving={savingDraft} />
            ) : null}
            <Text className="text-sm font-semibold text-gray-400">
              {t("create:stepOf", { current: 2, total: 4 })}
            </Text>
          </View>
        </View>

        <Text className="mt-6 text-3xl font-bold text-black dark:text-white">
          {restaurantName
            ? t("reviewExperienceTitle", { restaurantName })
            : t("reviewExperienceTitleFallback")}
        </Text>

        <Text className="mt-2 leading-5 text-gray-500 dark:text-gray-400">
          {t("reviewEverythingOptional")}
        </Text>

        {onChooseParticipants ? <TouchableOpacity
          onPress={onChooseParticipants}
          className="mt-7 flex-row items-center rounded-3xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
        >
          <View className="h-11 w-11 items-center justify-center rounded-full bg-brand/15">
            <UsersThreeIcon size={23} color="#D4A72C" weight="fill" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-bold text-black dark:text-white">
              {t("reviewTogetherRowTitle")}
            </Text>
            <Text className="mt-1 text-sm text-gray-500">
              {draft.participants.length > 0
                ? t("reviewTogetherPeopleSelected", {
                    count: draft.participants.length,
                  })
                : t("reviewTogetherRowHint")}
            </Text>
          </View>
          {draft.participants.slice(0, 3).map((participant, index) => (
            <View
              key={participant.id}
              style={{ marginLeft: index === 0 ? 0 : -9, zIndex: 3 - index }}
            >
              <Avatar
                uri={participant.avatarUrl}
                username={participant.username}
                size={32}
              />
            </View>
          ))}
          <View className="ml-2">
            <DirectionalIcon
              direction="forward"
              size={18}
              color={isDark ? "#9CA3AF" : "#6B7280"}
              weight="bold"
            />
          </View>
        </TouchableOpacity> : null}

        {!compactLinkedFlow ? <View className="mt-7">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-black dark:text-white">
              {t("placePhoto")}
            </Text>
            <Text className="text-sm font-semibold text-gray-400">
              {t("optional")}
            </Text>
          </View>
          <Text className="mb-4 text-sm leading-5 text-gray-500 dark:text-gray-400">
            {t("placePhotoHint")}
          </Text>
          <TouchableOpacity
            disabled={derivedCover}
            className="items-center justify-center overflow-hidden rounded-3xl border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
            onPress={pickCoverImage}
          >
            {draft.coverImageUri || draft.coverImageUrl ? (
              <View className="w-full">
                <ProgressiveImage
                  source={{ uri: draft.coverImageUri ?? draft.coverImageUrl }}
                  className="aspect-square w-full"
                  resizeMode="cover"
                />
                <View className="absolute bottom-3 right-3 rounded-full bg-black/65 px-4 py-2">
                  <Text className="text-sm font-bold text-white">
                    {derivedCover ? t("coverFromPost") : t("changePhoto")}
                  </Text>
                </View>
              </View>
            ) : (
              <View className="items-center px-6 py-10">
                <Text className="text-2xl">＋</Text>
                <Text className="mt-2 font-bold text-black dark:text-white">
                  {t("addPlacePhoto")}
                </Text>
                <Text className="mt-1 text-center text-sm text-gray-500">
                  {t("chooseFromGallery")}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View> : null}

        <View className="mt-8 border-t border-gray-200 pt-7 dark:border-gray-800">
          <View className="mb-5 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-black dark:text-white">
              {t("overallExperience")}
            </Text>
            <Text className="text-sm font-semibold text-gray-400">
              {t("optional")}
            </Text>
          </View>
          <RatingPicker
            label={t("overallRating")}
            value={draft.overallRating}
            onChange={(overallRating) => onChange({ overallRating })}
          />

          <Text className="mb-3 mt-8 font-bold text-black dark:text-white">
            {t("reviewNote")}
          </Text>
          <TextInput
            className="min-h-24 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-black dark:border-gray-700 dark:bg-black dark:text-white"
            placeholder={t("reviewNotePlaceholder")}
            value={draft.summary}
            onChangeText={(summary) => onChange({ summary })}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View className="mt-8 border-t border-gray-200 pt-7 dark:border-gray-800">
          <Text className="mb-1 text-lg font-bold text-black dark:text-white">
            {t("moreDetail")}
          </Text>
          <Text className="mb-6 text-sm text-gray-500">
            {t("moreDetailHint")}
          </Text>
          <View className="gap-8">
            <RatingPicker
              label={t("atmosphere")}
              value={draft.atmosphereRating}
              onChange={(atmosphereRating) => onChange({ atmosphereRating })}
            />

            <RatingPicker
              label={t("service")}
              value={draft.serviceRating}
              onChange={(serviceRating) => onChange({ serviceRating })}
            />

            <RatingPicker
              label={t("value")}
              value={draft.valueRating}
              onChange={(valueRating) => onChange({ valueRating })}
            />

          </View>
        </View>

        <TouchableOpacity
          className="mt-8 rounded-2xl bg-black py-4 dark:bg-white"
          onPress={onNext}
        >
          <Text className="text-center font-bold text-white dark:text-black">
            {t("continue")}
          </Text>
        </TouchableOpacity>
      </KeyboardAwareFormScrollView>
    </ThemedSafeAreaView>
  );
}
