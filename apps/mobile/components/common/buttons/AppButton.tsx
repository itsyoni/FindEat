import Text from "@/components/common/AppText";
import type { IconProps } from "phosphor-react-native";
import type { ComponentType } from "react";
import { ActivityIndicator, TouchableOpacity } from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";

type Variant = "primary" | "secondary" | "outline" | "danger";

type Props = {
  title: string;
  onPress?: () => void;
  icon?: ComponentType<IconProps>;
  rightIcon?: ComponentType<IconProps>;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
};

const variantClasses: Record<Variant, string> = {
  primary: "bg-ink dark:bg-white",
  secondary: "bg-soft dark:bg-gray-800",
  outline: "border border-line bg-surface dark:border-gray-700 dark:bg-black",
  danger: "bg-red-500",
};

const textClasses: Record<Variant, string> = {
  primary: "text-white dark:text-black",
  secondary: "text-black dark:text-white",
  outline: "text-black dark:text-white",
  danger: "text-white",
};

export default function AppButton({
  title,
  onPress,
  icon: Icon,
  rightIcon: RightIcon,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
}: Props) {
  const { isDark } = useAppTheme();
  const isDisabled = disabled || loading;
  const textColor =
    variant === "danger"
      ? "#FAF9F6"
      : variant === "primary"
        ? isDark
          ? "#0B0B0A"
          : "#FAF9F6"
        : isDark
          ? "#FAF9F6"
          : "#171717";

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      className={`flex-row items-center justify-center gap-2 rounded-2xl px-5 py-4 ${
        variantClasses[variant]
      } ${isDisabled ? "opacity-50" : ""} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {!!Icon && <Icon size={20} color={textColor} weight="bold" />}

          <Text className={`text-center font-bold ${textClasses[variant]}`}>
            {title}
          </Text>

          {!!RightIcon && (
            <RightIcon size={20} color={textColor} weight="bold" />
          )}
        </>
      )}
    </TouchableOpacity>
  );
}
