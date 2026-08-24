import { useAppTheme } from "@/contexts/ThemeContext";
import { TouchableOpacity } from "react-native";
import Text from "./AppText";

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
};

export default function SelectionPill({
  label,
  selected,
  onPress,
  disabled = false,
}: Props) {
  const { isDark } = useAppTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={{
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: selected
          ? "#D6A92D"
          : isDark
            ? "rgba(250,249,246,0.14)"
            : "rgba(23,23,21,0.12)",
        backgroundColor: selected
          ? isDark
            ? "rgba(214,169,45,0.2)"
            : "rgba(247,215,134,0.35)"
          : isDark
            ? "rgba(250,249,246,0.06)"
            : "rgba(250,249,246,0.72)",
        paddingHorizontal: 16,
        paddingVertical: 12,
        opacity: disabled ? 0.42 : 1,
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={label}
    >
      <Text style={{ color: isDark ? "#FAF9F6" : "#171715", fontSize: 16 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
