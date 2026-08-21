import Text from "@/components/common/AppText";
import type { KnownIssue } from "@findeat/types";
import { CheckIcon, UsersThreeIcon } from "phosphor-react-native";
import { TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

export default function KnownIssueSuggestionCard({
  issue,
  affected,
  working,
  onToggleAffected,
}: {
  issue: KnownIssue;
  affected: boolean;
  working: boolean;
  onToggleAffected: () => void;
}) {
  const { t } = useTranslation("settings");
  return (
    <View className="rounded-2xl border border-gray-200 bg-[#F5F1EB] p-4 dark:border-gray-700 dark:bg-[#181817]">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            {t(`knownIssueStatus.${issue.status}`)}
          </Text>
          <Text className="mt-1 text-base font-bold text-ink dark:text-white">
            {issue.title}
          </Text>
          {issue.description ? (
            <Text numberOfLines={3} className="mt-1.5 text-sm leading-5 text-gray-600 dark:text-gray-300">
              {issue.description}
            </Text>
          ) : null}
        </View>
      </View>
      <View className="mt-3 flex-row items-center justify-between gap-3">
        <View className="flex-row items-center">
          <UsersThreeIcon size={16} color="#737373" weight="duotone" />
          <Text className="ml-1.5 text-xs text-gray-500">
            {t("knownIssueAffectedCount", { count: issue.affectedCount })}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          disabled={working}
          onPress={onToggleAffected}
          className={`min-h-10 flex-row items-center justify-center rounded-full px-3.5 ${
            affected ? "bg-emerald-100 dark:bg-emerald-950/60" : "bg-amber-100 dark:bg-amber-950/60"
          } ${working ? "opacity-50" : ""}`}
        >
          {affected ? <CheckIcon size={15} color="#16834B" weight="bold" /> : null}
          <Text className={`text-xs font-bold ${affected ? "ml-1 text-emerald-700 dark:text-emerald-300" : "text-amber-800 dark:text-amber-200"}`}>
            {t(affected ? "knownIssueAffected" : "knownIssueAffectedToo")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
