import Text from "@/components/common/AppText";
import type { Profile } from "@findeat/types";
import { useTranslation } from "react-i18next";
import { getProfileTagLabel } from "./ProfileTagPickerPage";

type Props = { profile: Profile };

export default function ProfileDetails({ profile }: Props) {
  const { t } = useTranslation("profile");
  if (!profile.pronouns) return null;

  const pronouns = profile.pronouns
    .split(" · ")
    .map((item) => item.trim())
    .filter(Boolean);
  const labels = pronouns.map((item) => getProfileTagLabel(t, item));

  return (
    <Text
      numberOfLines={1}
      className="max-w-48 shrink text-sm text-gray-500 dark:text-gray-400"
    >
      {labels.join(" · ")}
    </Text>
  );
}
