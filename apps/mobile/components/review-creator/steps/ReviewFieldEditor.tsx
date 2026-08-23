import Text from "@/components/common/AppText";
import { TextInput } from "@/components/common";
import { useAppTheme } from "@/contexts/ThemeContext";
import type {
  CreateReviewDraft,
  ReviewExperienceTag,
  ReviewRecommendedFor,
} from "@findeat/types";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import {
  CalendarBlankIcon,
  SparkleIcon,
  StarIcon,
} from "phosphor-react-native";
import {
  Platform,
  Text as NativeText,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import ReviewDetailEditorShell from "../components/ReviewDetailEditorShell";

export type ReviewFieldEditorKind =
  | "SUMMARY"
  | "OCCASION"
  | "VISIT_DATE"
  | "EXPERIENCE_TAGS"
  | "ATMOSPHERE"
  | "SERVICE"
  | "VALUE";

type RatingField = "ATMOSPHERE" | "SERVICE" | "VALUE";

const occasions: ReviewRecommendedFor[] = [
  "DATE",
  "FRIENDS",
  "FAMILY",
  "SOLO",
  "BUSINESS",
  "QUICK_BITE",
  "CELEBRATION",
  "TRAVEL",
  "LATE_NIGHT",
];

const experienceTags: ReviewExperienceTag[] = [
  "ACCESSIBLE",
  "EASY_PARKING",
  "WIFI",
  "OUTDOOR_SEATING",
  "QUIET",
  "KID_FRIENDLY",
  "PET_FRIENDLY",
  "WORK_FRIENDLY",
  "GROUP_FRIENDLY",
  "ROMANTIC",
  "LATE_NIGHT",
];

const ratingKeys: Record<
  RatingField,
  "atmosphereRating" | "serviceRating" | "valueRating"
> = {
  ATMOSPHERE: "atmosphereRating",
  SERVICE: "serviceRating",
  VALUE: "valueRating",
};

const ratingTitleKeys: Record<RatingField, "atmosphere" | "service" | "value"> = {
  ATMOSPHERE: "atmosphere",
  SERVICE: "service",
  VALUE: "value",
};

function ratingMood(value?: number) {
  if (!value) return "✦";
  if (value <= 3) return "😕";
  if (value <= 5) return "🙂";
  if (value <= 7) return "😊";
  if (value <= 9) return "😍";
  return "🤩";
}

export default function ReviewFieldEditor({
  kind,
  draft,
  onChange,
  onDone,
}: {
  kind: ReviewFieldEditorKind;
  draft: CreateReviewDraft;
  onChange: (update: Partial<CreateReviewDraft>) => void;
  onDone: () => void;
}) {
  const { t, i18n } = useTranslation(["create", "common"]);
  const { isDark } = useAppTheme();
  const [androidDatePickerOpen, setAndroidDatePickerOpen] = useState(
    Platform.OS === "android",
  );
  const ratingKind = ["ATMOSPHERE", "SERVICE", "VALUE"].includes(kind)
    ? (kind as RatingField)
    : null;
  const ratingKey = ratingKind ? ratingKeys[ratingKind] : null;
  const ratingValue = ratingKey ? draft[ratingKey] : undefined;

  const title = ratingKind
    ? t(ratingTitleKeys[ratingKind])
    : kind === "SUMMARY"
      ? t("reviewNoteEditorTitle")
      : kind === "OCCASION"
        ? t("reasonForVisit")
        : kind === "VISIT_DATE"
          ? t("visitDate")
          : t("goodToKnow");

  function selectRating(value: number) {
    if (!ratingKey) return;
    void Haptics.selectionAsync();
    onChange({ [ratingKey]: value } as Partial<CreateReviewDraft>);
  }

  return (
    <ReviewDetailEditorShell title={title} onDone={onDone}>
        {ratingKind && ratingKey ? (
          <View className="flex-1">
            <Text className="text-center text-base leading-6 text-gray-500 dark:text-gray-400">
              {t("ratingEditorHint", { field: title.toLocaleLowerCase(i18n.language) })}
            </Text>

            <View className="flex-1 items-center justify-center py-10">
              <View className="h-36 w-36 items-center justify-center rounded-full bg-brand/15">
                <Text
                  className="text-6xl"
                  style={{ lineHeight: 76, paddingTop: 4 }}
                >
                  {ratingMood(ratingValue)}
                </Text>
              </View>
              <Text className="mt-6 text-5xl font-bold text-[#171717] dark:text-[#FAF9F6]">
                {ratingValue ? `${ratingValue}/10` : "—"}
              </Text>
              <Text className="mt-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                {ratingValue ? t("tapAnotherRating") : t("chooseRating")}
              </Text>
            </View>

            <View className="pb-2">
              <View className="flex-row flex-wrap justify-between gap-y-3">
                {Array.from({ length: 10 }, (_, index) => index + 1).map(
                  (value) => {
                    const selected = ratingValue === value;
                    const filled = ratingValue != null && value <= ratingValue;
                    return (
                      <TouchableOpacity
                        key={value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => selectRating(value)}
                        style={{ width: "18%" }}
                        className={`aspect-square items-center justify-center rounded-2xl border ${
                          selected
                            ? "border-brand bg-brand"
                            : filled
                              ? "border-brand/40 bg-brand/15"
                              : "border-gray-200 bg-[#FAF9F6] dark:border-gray-700 dark:bg-[#242422]"
                        }`}
                      >
                        <View
                          pointerEvents="none"
                          className="absolute inset-0 items-center justify-center"
                        >
                          <NativeText
                            style={{
                              color: selected
                                ? "#171717"
                                : filled
                                  ? "#D4A72C"
                                  : isDark
                                    ? "#FAF9F6"
                                    : "#171717",
                              fontFamily: "CabinetBold",
                              fontSize: 18,
                              lineHeight: 20,
                              includeFontPadding: false,
                              textAlign: "center",
                              transform: [{ translateY: -1 }],
                            }}
                          >
                            {value}
                          </NativeText>
                        </View>
                      </TouchableOpacity>
                    );
                  },
                )}
              </View>
            </View>

            {ratingValue ? (
              <TouchableOpacity
                onPress={() => onChange({ [ratingKey]: undefined } as Partial<CreateReviewDraft>)}
                className="mt-5 items-center py-3"
              >
                <Text className="font-semibold text-gray-500">
                  {t("removeRating")}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {kind === "SUMMARY" ? (
          <View className="flex-1">
            <View className="mb-6 h-16 w-16 items-center justify-center rounded-full bg-brand/15">
              <StarIcon size={31} color="#D4A72C" weight="duotone" />
            </View>
            <Text className="mb-3 text-base leading-6 text-gray-500 dark:text-gray-400">
              {t("reviewNoteEditorHint")}
            </Text>
            <TextInput
              autoFocus
              multiline
              textAlignVertical="top"
              value={draft.summary}
              onChangeText={(summary) => onChange({ summary })}
              placeholder={t("reviewNotePlaceholder")}
              className="min-h-52 rounded-3xl border border-gray-200 bg-[#F7F6F2] px-5 py-5 text-lg text-[#171717] dark:border-gray-700 dark:bg-[#171716] dark:text-[#FAF9F6]"
            />
          </View>
        ) : null}

        {kind === "OCCASION" ? (
          <View>
            <Text className="mb-6 text-base leading-6 text-gray-500 dark:text-gray-400">
              {t("occasionEditorHint")}
            </Text>
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {occasions.map((occasion) => {
                const selected = draft.recommendedFor === occasion;
                return (
                  <TouchableOpacity
                    key={occasion}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      onChange({ recommendedFor: selected ? undefined : occasion });
                    }}
                    style={{ width: "48.5%" }}
                    className={`min-h-20 justify-center rounded-2xl border px-4 py-3 ${
                      selected
                        ? "border-brand bg-brand/15"
                        : "border-gray-200 bg-[#F7F6F2] dark:border-gray-700 dark:bg-[#171716]"
                    }`}
                  >
                    <Text className="text-base font-bold text-[#171717] dark:text-[#FAF9F6]">
                      {t(`visitOccasions.${occasion}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {kind === "VISIT_DATE" ? (
          <View className="flex-1">
            <View className="mb-6 h-16 w-16 items-center justify-center rounded-full bg-brand/15">
              <CalendarBlankIcon size={31} color="#D4A72C" weight="duotone" />
            </View>
            <Text className="mb-6 text-base leading-6 text-gray-500 dark:text-gray-400">
              {t("visitDateEditorHint")}
            </Text>
            {draft.visitDate ? (
              <View className="mb-4 rounded-3xl bg-brand/15 px-5 py-5">
                <Text className="text-sm font-bold uppercase tracking-wider text-brand">
                  {t("selectedVisitDate")}
                </Text>
                <Text className="mt-2 text-2xl font-bold text-[#171717] dark:text-[#FAF9F6]">
                  {new Intl.DateTimeFormat(i18n.language, {
                    dateStyle: "long",
                  }).format(new Date(draft.visitDate))}
                </Text>
              </View>
            ) : null}
            {Platform.OS === "ios" || androidDatePickerOpen ? (
              <View className="overflow-hidden rounded-3xl border border-gray-200 bg-[#F7F6F2] p-3 dark:border-gray-700 dark:bg-[#171716]">
                <DateTimePicker
                  value={draft.visitDate ? new Date(draft.visitDate) : new Date()}
                  mode="date"
                  maximumDate={new Date()}
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  themeVariant={isDark ? "dark" : "light"}
                  onChange={(event, date) => {
                    if (Platform.OS === "android") setAndroidDatePickerOpen(false);
                    if (event.type === "set" && date) {
                      onChange({ visitDate: date.toISOString() });
                    }
                  }}
                />
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setAndroidDatePickerOpen(true)}
                className="items-center rounded-2xl bg-[#171717] py-4 dark:bg-[#FAF9F6]"
              >
                <Text className="font-bold text-[#FAF9F6] dark:text-[#171717]">
                  {t(draft.visitDate ? "changeVisitDate" : "chooseVisitDate")}
                </Text>
              </TouchableOpacity>
            )}
            {draft.visitDate ? (
              <TouchableOpacity
                onPress={() => onChange({ visitDate: undefined })}
                className="mt-5 items-center py-3"
              >
                <Text className="font-semibold text-gray-500">
                  {t("removeVisitDate")}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {kind === "EXPERIENCE_TAGS" ? (
          <View>
            <View className="mb-6 h-16 w-16 items-center justify-center rounded-full bg-brand/15">
              <SparkleIcon size={31} color="#D4A72C" weight="duotone" />
            </View>
            <Text className="mb-6 text-base leading-6 text-gray-500 dark:text-gray-400">
              {t("experienceTagsEditorHint")}
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {experienceTags.map((tag) => {
                const selected = draft.experienceTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      onChange({
                        experienceTags: selected
                          ? draft.experienceTags.filter((item) => item !== tag)
                          : [...draft.experienceTags, tag],
                      });
                    }}
                    className={`flex-row items-center rounded-full border px-4 py-3 ${
                      selected
                        ? "border-brand bg-brand/15"
                        : "border-gray-200 bg-[#F7F6F2] dark:border-gray-700 dark:bg-[#171716]"
                    }`}
                  >
                    <Text
                      className={`font-semibold text-[#171717] dark:text-[#FAF9F6] ${
                        selected ? "text-brand" : ""
                      }`}
                    >
                      {t(`experienceTags.${tag}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

    </ReviewDetailEditorShell>
  );
}
