import Text from "@/components/common/AppText";
import type { MenuSectionType } from "@findeat/types";
import { ForkKnifeIcon, MartiniIcon } from "phosphor-react-native";
import { TouchableOpacity, View } from "react-native";

export default function MenuSectionTypeSelector({
  value,
  onChange,
}: {
  value: MenuSectionType;
  onChange: (value: MenuSectionType) => void;
}) {
  return (
    <View className="mt-5">
      <Text className="mb-2 text-sm font-bold text-[#242321] dark:text-[#F4F1EB]">
        Section type
      </Text>
      <View className="flex-row gap-3">
        {([
          { value: "FOOD", label: "Food", icon: ForkKnifeIcon },
          { value: "DRINKS", label: "Drinks", icon: MartiniIcon },
        ] as const).map((option) => {
          const selected = value === option.value;
          const Icon = option.icon;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onChange(option.value)}
              className={`h-14 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border ${
                selected
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40"
                  : "border-[#D8D3CA] bg-[#F8F6F2] dark:border-gray-700 dark:bg-gray-900"
              }`}
            >
              <Icon
                size={19}
                weight={selected ? "fill" : "regular"}
                color={selected ? "#D97706" : "#77736D"}
              />
              <Text className={`font-bold ${selected ? "text-amber-700 dark:text-amber-300" : "text-[#3D3A36] dark:text-gray-300"}`}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
