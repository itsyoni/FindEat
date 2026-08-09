import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { EyeClosedIcon, EyeIcon } from "phosphor-react-native";
import { ReactNode, useState } from "react";
import {
  TextInput as RNTextInput,
  TextInputProps,
  I18nManager,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useAccessibilityPreferences } from "@/contexts/AccessibilityContext";

type Props = TextInputProps & {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isPassword?: boolean;
  useBottomSheetInput?: boolean;
};

function startsWithRtl(text?: string) {
  if (!text) return false;

  for (const char of text.trim()) {
    if (/[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/.test(char)) {
      return true;
    }

    if (/[A-Za-z0-9]/.test(char)) {
      return false;
    }
  }

  return false;
}

export default function TextInput({
  style,
  className,
  leftIcon,
  rightIcon,
  isPassword = false,
  useBottomSheetInput = false,
  value,
  onChangeText,
  placeholderTextColor,
  ...props
}: Props) {
  const { isDark } = useAppTheme();
  const { textScale, usesSystemTextSize, boldText } =
    useAccessibilityPreferences();
  const [hidden, setHidden] = useState(isPassword);
  const isRtl = value?.trim() ? startsWithRtl(value) : I18nManager.isRTL;
  const Input = useBottomSheetInput ? BottomSheetTextInput : RNTextInput;
  const isMultiline = !!props.multiline;

  return (
    <View
      className={`flex-row rounded-2xl border border-line bg-surface px-4 dark:border-gray-700 dark:bg-black ${
        isMultiline ? "items-start" : "items-center"
      } ${className ?? ""}`}
    >
      {leftIcon && (
        <View className={`${isMultiline ? "mt-4" : ""} mr-3`}>{leftIcon}</View>
      )}

      <Input
        {...props}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={isPassword && hidden}
        allowFontScaling={usesSystemTextSize}
        maxFontSizeMultiplier={
          props.maxFontSizeMultiplier ??
          (Platform.OS === "android" ? 1.15 : undefined)
        }
        placeholderTextColor={placeholderTextColor ?? (isDark ? "#9CA3AF" : "#747474")}
        textAlign={isRtl ? "right" : "left"}
        textAlignVertical={isMultiline ? "top" : "center"}
        style={[
          {
            flex: 1,
            paddingVertical: 16,
            fontSize: Math.round(
              16 * textScale * (Platform.OS === "android" ? 0.9 : 1),
            ),
            color: isDark ? "#FAF9F6" : "#171717",
            fontFamily: boldText ? "CabinetMedium" : "CabinetRegular",
            writingDirection: isRtl ? "rtl" : "ltr",
            minHeight: isMultiline ? 120 : undefined,
          },
          style,
        ]}
      />

      {isPassword ? (
        <TouchableOpacity onPress={() => setHidden((prev) => !prev)}>
          {hidden ? (
            <EyeIcon size={20} color={isDark ? "#E5E7EB" : "#171717"} />
          ) : (
            <EyeClosedIcon size={20} color={isDark ? "#E5E7EB" : "#171717"} />
          )}
        </TouchableOpacity>
      ) : (
        rightIcon && <View className="ml-3">{rightIcon}</View>
      )}
    </View>
  );
}
