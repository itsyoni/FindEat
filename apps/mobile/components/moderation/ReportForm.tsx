import Text from "@/components/common/AppText";
import { TextInput } from "@/components/common";
import { api } from "@/lib/api";
import type {
  ReportReason,
  ReportTargetType,
} from "@findeat/types";
import { CheckCircleIcon, FlagIcon } from "phosphor-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";

const reasons: ReportReason[] = [
  "WRONG_RESTAURANT",
  "COPYRIGHT_INFRINGEMENT",
  "HATE_SPEECH",
  "HARASSMENT",
  "SPAM",
  "FALSE_INFORMATION",
  "INAPPROPRIATE_CONTENT",
  "OTHER",
];

type Props = {
  targetType: ReportTargetType;
  targetId: string;
  onCancel: () => void;
  onDone: () => void;
  doneLabel?: string;
  fixedReason?: ReportReason;
  reportingRestaurantId?: string;
};

export default function ReportForm({
  targetType,
  targetId,
  onCancel,
  onDone,
  doneLabel,
  fixedReason,
  reportingRestaurantId,
}: Props) {
  const { t } = useTranslation("common");
  const [reason, setReason] = useState<ReportReason | null>(fixedReason ?? null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!reason || submitting) return;
    try {
      setSubmitting(true);
      setError("");
      await api.reports.create({
        targetType,
        targetId,
        reason,
        details: details.trim() || undefined,
        ...(reportingRestaurantId
          ? {
              source: "RESTAURANT_REPORT" as const,
              reportingRestaurantId,
            }
          : {}),
      });
      setSubmitted(true);
    } catch {
      setError(t("reportError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <View className="flex-1 items-center justify-center px-5">
        <CheckCircleIcon size={54} color="#16A34A" weight="fill" />
        <Text className="mt-4 text-center text-xl font-bold text-black dark:text-white">
          {t("reportReceived")}
        </Text>
        <Text className="mt-2 text-center text-sm leading-5 text-gray-500 dark:text-gray-400">
          {t("reportReceivedHint")}
        </Text>
        <TouchableOpacity
          className="mt-6 w-full items-center rounded-2xl bg-black py-4 dark:bg-white"
          onPress={onDone}
        >
          <Text className="font-bold text-white dark:text-black">
            {doneLabel ?? t("done")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 px-5 pb-5">
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40">
          <FlagIcon size={22} color="#EF4444" weight="fill" />
        </View>
        <View className="flex-1">
          <Text className="text-xl font-bold text-black dark:text-white">
            {t("reportTitle")}
          </Text>
          <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {t("reportSubtitle")}
          </Text>
        </View>
      </View>

      {!fixedReason ? <View className="mt-5 flex-row flex-wrap gap-2">
        {reasons.map((item) => {
          const selected = reason === item;
          return (
            <TouchableOpacity
              key={item}
              onPress={() => setReason(item)}
              className={`rounded-full border px-4 py-2.5 ${selected ? "border-red-500 bg-red-50 dark:bg-red-950/40" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"}`}
            >
              <Text className={selected ? "font-bold text-red-600" : "font-semibold text-gray-700 dark:text-gray-200"}>
                {t(`reportReasons.${item}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View> : null}

      <TextInput
        useBottomSheetInput
        multiline
        maxLength={500}
        value={details}
        onChangeText={setDetails}
        placeholder={t("reportDetails")}
        className="mt-4 min-h-24 border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
      />

      {error ? <Text className="mt-2 text-sm text-red-500">{error}</Text> : null}

      <View className="mt-auto flex-row gap-3 pt-5">
        <TouchableOpacity
          disabled={submitting}
          onPress={onCancel}
          className="flex-1 items-center rounded-2xl bg-gray-100 py-4 dark:bg-gray-800"
        >
          <Text className="font-bold text-black dark:text-white">{t("cancel")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={!reason || submitting}
          onPress={() => void submit()}
          className="flex-1 items-center rounded-2xl bg-red-500 py-4"
          style={{ opacity: !reason || submitting ? 0.45 : 1 }}
        >
          {submitting ? (
            <ActivityIndicator color="#FAF9F6" />
          ) : (
            <Text className="font-bold text-white">{t("submitReport")}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
