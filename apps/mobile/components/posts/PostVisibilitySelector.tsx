import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import type { PostVisibility } from "@findeat/types";
import {
  GlobeHemisphereWestIcon,
  LockIcon,
  UsersThreeIcon,
} from "phosphor-react-native";
import { TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

type Props = {
  value: PostVisibility;
  onChange: (visibility: PostVisibility) => void;
};

const options: {
  value: PostVisibility;
  icon: typeof GlobeHemisphereWestIcon;
}[] = [
  { value: "PUBLIC", icon: GlobeHemisphereWestIcon },
  { value: "FRIENDS", icon: UsersThreeIcon },
  { value: "PRIVATE", icon: LockIcon },
];

export default function PostVisibilitySelector({ value, onChange }: Props) {
  const { t } = useTranslation("create");
  const { isDark } = useAppTheme();

  return (
    <View className="mt-5">
      <Text className="mb-2 text-base font-bold text-black dark:text-white">
        {t("visibility")}
      </Text>
      <View className="flex-row rounded-2xl bg-gray-100 p-1 dark:bg-gray-900">
        {options.map((option) => {
          const selected = value === option.value;
          const Icon = option.icon;

          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onChange(option.value)}
              className={`flex-1 items-center rounded-xl px-2 py-3 ${
                selected ? "bg-white dark:bg-gray-700" : ""
              }`}
            >
              <Icon
                size={20}
                weight={selected ? "fill" : "regular"}
                color={selected ? (isDark ? "#FAF9F6" : "#111") : "#9CA3AF"}
              />
              <Text
                className={`mt-1 text-xs font-bold ${
                  selected
                    ? "text-black dark:text-white"
                    : "text-gray-500"
                }`}
              >
                {t(`visibility${option.value}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text className="mt-2 text-xs text-gray-500">
        {t(`visibility${value}Hint`)}
      </Text>
    </View>
  );
}
