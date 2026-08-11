import Text from "@/components/common/AppText";
import AppBottomSheet from "@/components/common/AppBottomSheet";
import type { Profile } from "@findeat/types";
import { UserCircleIcon } from "phosphor-react-native";
import { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { getProfileTagLabel } from "./ProfileTagPickerPage";

type Props = { profile: Profile };

export default function ProfileDetails({ profile }: Props) {
  const { t } = useTranslation("profile");
  const [pronounsOpen, setPronounsOpen] = useState(false);
  if (!profile.pronouns) return null;

  const pronouns = profile.pronouns
    .split(" · ")
    .map((item) => item.trim())
    .filter(Boolean);
  const labels = pronouns.map((item) => getProfileTagLabel(t, item));
  const canExpand = labels.length > 2;
  const summary = canExpand
    ? `${labels.slice(0, 2).join(" · ")} +${labels.length - 2}`
    : labels.join(" · ");

  return (
    <>
      <TouchableOpacity
        disabled={!canExpand}
        activeOpacity={canExpand ? 0.72 : 1}
        onPress={() => setPronounsOpen(true)}
        className="max-w-48 shrink flex-row items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1.5 dark:bg-gray-900"
      >
        <UserCircleIcon size={14} color="#6B7280" />
        <Text numberOfLines={1} className="shrink text-xs text-gray-700 dark:text-gray-200">
          {summary}
        </Text>
      </TouchableOpacity>

      <AppBottomSheet
        open={pronounsOpen}
        snapPoints={["32%"]}
        onClose={() => setPronounsOpen(false)}
      >
        <View className="flex-1 px-5 pb-6 pt-2">
          <Text className="text-xl font-bold text-black dark:text-white">
            {t("pronouns")}
          </Text>
          <View className="mt-5 flex-row flex-wrap gap-2.5">
            {labels.map((label, index) => (
              <View
                key={`${pronouns[index]}-${index}`}
                className="rounded-full bg-amber-100 px-4 py-2.5 dark:bg-amber-900/50"
              >
                <Text className="text-sm text-amber-950 dark:text-amber-100">
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </AppBottomSheet>
    </>
  );
}
