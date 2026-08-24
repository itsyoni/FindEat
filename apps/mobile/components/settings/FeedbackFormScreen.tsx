import AppButton from "@/components/common/buttons/AppButton";
import Text from "@/components/common/AppText";
import KeyboardAwareFormScrollView from "@/components/common/layout/KeyboardAwareFormScrollView";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import SettingsHeader from "@/components/settings/SettingsHeader";
import useSettingsDirection from "@/components/settings/useSettingsDirection";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";
import { uploadImage, uploadVideo } from "@/lib/uploadImage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import {
  ImagesSquareIcon,
  TrashIcon,
  VideoCameraIcon,
} from "phosphor-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Platform,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type LocalAttachment = {
  id: string;
  uri: string;
  type: "IMAGE" | "VIDEO";
  name?: string | null;
};

export default function FeedbackFormScreen({
  kind,
}: {
  kind: "BUG" | "FEATURE_REQUEST";
}) {
  const { t } = useTranslation("settings");
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const { isRtl, textStyle } = useSettingsDirection();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [secondary, setSecondary] = useState("");
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [saving, setSaving] = useState(false);

  const colors = {
    background: isDark ? "#0B0B0A" : "#FBFAF8",
    surface: isDark ? "#181817" : "#F2EEE8",
    text: isDark ? "#FAF9F6" : "#171717",
    muted: isDark ? "#A3A3A3" : "#737373",
    border: isDark ? "#343431" : "#E2DDD5",
  };
  const isBug = kind === "BUG";
  const canSubmit = title.trim().length >= 3 && details.trim().length >= 10;

  async function pickAttachments() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.9,
    });
    if (result.canceled) return;
    const picked = result.assets.map((asset, index) => ({
      id: `${Date.now()}-${index}`,
      uri: asset.uri,
      type: asset.type === "video" ? ("VIDEO" as const) : ("IMAGE" as const),
      name: asset.fileName,
    }));
    const video = picked.find((item) => item.type === "VIDEO");
    if (video) {
      setAttachments([video]);
      if (picked.length > 1) showToast(t("bugAttachmentVideoOnly"));
      return;
    }
    setAttachments(picked.slice(0, 5));
  }

  async function submit() {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      const context = [
        `${t("feedbackAppVersion")}: ${Constants.expoConfig?.version ?? "unknown"}`,
        `${t("feedbackPlatform")}: ${Platform.OS} ${String(Platform.Version)}`,
        `${t("feedbackDevice")}: ${Device.modelName ?? "unknown"}`,
      ].join("\n");
      const message = [
        `${isBug ? t("bugWhatHappened") : t("featureIdea")}:\n${details.trim()}`,
        secondary.trim()
          ? `${isBug ? t("bugSteps") : t("featureBenefit")}:\n${secondary.trim()}`
          : null,
        `${t("feedbackTechnicalContext")}:\n${context}`,
      ]
        .filter(Boolean)
        .join("\n\n");
      const ticket = await api.support.create({
        category: kind,
        subject: title.trim(),
        message,
        platform: Platform.OS === "ios" ? "iOS" : "Android",
      });
      showToast(t(isBug ? "bugReportSent" : "featureSuggestionSent"));
      router.back();

      if (attachments.length) {
        void Promise.all(
          attachments.map(async (attachment) => ({
            type: attachment.type,
            url:
              attachment.type === "VIDEO"
                ? await uploadVideo(attachment.uri, undefined, "other")
                : await uploadImage(attachment.uri, "other"),
          })),
        )
          .then((uploaded) => api.support.updateAttachments(ticket.id, uploaded))
          .catch((error) => {
            console.warn("Could not attach media to bug report", error);
            showToast(t("bugAttachmentUploadError"), { kind: "error" });
          });
      }
    } catch {
      showToast(t("supportSubmitError"), { kind: "error" });
      setSaving(false);
    }
  }

  const inputStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    color: colors.text,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontSize: 16,
    textAlign: "auto" as const,
    writingDirection: isRtl ? ("rtl" as const) : ("ltr" as const),
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <SettingsHeader title={t(isBug ? "reportBug" : "suggestFeature")} />
      <KeyboardAwareFormScrollView
        contentContainerStyle={{ padding: 18, paddingBottom: 48 }}
        bottomOffset={28}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[textStyle, { color: colors.muted, lineHeight: 21 }]}>
          {t(isBug ? "reportBugIntro" : "suggestFeatureIntro")}
        </Text>

        <Text weight="bold" style={[textStyle, { color: colors.text, marginTop: 24, marginBottom: 8 }]}>
          {t(isBug ? "bugTitle" : "featureTitle")}
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={120}
          placeholder={t(isBug ? "bugTitlePlaceholder" : "featureTitlePlaceholder")}
          placeholderTextColor={colors.muted}
          style={[inputStyle, { minHeight: 50 }]}
        />

        <Text weight="bold" style={[textStyle, { color: colors.text, marginTop: 20, marginBottom: 8 }]}>
          {t(isBug ? "bugWhatHappened" : "featureIdea")}
        </Text>
        <TextInput
          value={details}
          onChangeText={setDetails}
          multiline
          textAlignVertical="top"
          maxLength={5000}
          placeholder={t(isBug ? "bugWhatHappenedPlaceholder" : "featureIdeaPlaceholder")}
          placeholderTextColor={colors.muted}
          style={[inputStyle, { minHeight: 140, paddingTop: 14 }]}
        />

        <Text weight="bold" style={[textStyle, { color: colors.text, marginTop: 20, marginBottom: 8 }]}>
          {t(isBug ? "bugSteps" : "featureBenefit")}
        </Text>
        <TextInput
          value={secondary}
          onChangeText={setSecondary}
          multiline
          textAlignVertical="top"
          maxLength={2500}
          placeholder={t(isBug ? "bugStepsPlaceholder" : "featureBenefitPlaceholder")}
          placeholderTextColor={colors.muted}
          style={[inputStyle, { minHeight: 110, paddingTop: 14 }]}
        />

        {isBug ? (
          <View className="mt-5">
            <Text weight="bold" style={[textStyle, { color: colors.text, marginBottom: 8 }]}>
              {t("bugAttachments")}
            </Text>
            <Text style={[textStyle, { color: colors.muted, marginBottom: 12, fontSize: 13 }]}>
              {t("bugAttachmentsHint")}
            </Text>
            {attachments.length ? (
              <View className="mb-3 flex-row flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <View key={attachment.id} className="relative h-28 w-24 overflow-hidden rounded-2xl bg-gray-200 dark:bg-gray-800">
                    {attachment.type === "IMAGE" ? (
                      <ProgressiveImage source={{ uri: attachment.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                    ) : (
                      <View className="flex-1 items-center justify-center px-2">
                        <VideoCameraIcon size={30} color="#D97706" weight="duotone" />
                        <Text numberOfLines={2} className="mt-1 text-center text-[10px] text-gray-500">{attachment.name ?? t("screenRecording")}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))}
                      className="absolute right-1 top-1 h-7 w-7 items-center justify-center rounded-full bg-black/65"
                    >
                      <TrashIcon size={15} color="#FAF9F6" weight="bold" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}
            <TouchableOpacity
              disabled={saving}
              onPress={() => void pickAttachments()}
              className="min-h-14 flex-row items-center justify-center rounded-2xl border border-dashed border-amber-500 bg-amber-50 px-4 dark:bg-amber-950/30"
            >
              <ImagesSquareIcon size={22} color="#D97706" weight="duotone" />
              <Text className="ml-2 font-bold text-amber-700 dark:text-amber-300">
                {attachments.length ? t("changeAttachments") : t("addScreenshotsOrVideo")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <AppButton
          title={t(isBug ? "submitBugReport" : "submitFeatureSuggestion")}
          loading={saving}
          disabled={!canSubmit}
          onPress={() => void submit()}
          className="mt-7"
        />
      </KeyboardAwareFormScrollView>
    </SafeAreaView>
  );
}
