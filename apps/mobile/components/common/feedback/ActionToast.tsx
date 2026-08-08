import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import { CheckCircleIcon, InfoIcon, WarningCircleIcon } from "phosphor-react-native";
import { TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ActionToastKind = "success" | "error" | "info";

type Props = {
  message: string;
  kind: ActionToastKind;
  actionLabel?: string;
  onAction?: () => void;
};

export default function ActionToast({ message, kind, actionLabel, onAction }: Props) {
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const color = kind === "error" ? "#EF4444" : kind === "info" ? "#3B82F6" : "#1F8A58";
  const Icon = kind === "error" ? WarningCircleIcon : kind === "info" ? InfoIcon : CheckCircleIcon;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: insets.bottom + 76,
        zIndex: 10_000,
        alignItems: "center",
      }}
    >
      <Animated.View
        entering={FadeInDown.springify().damping(18).stiffness(220)}
        exiting={FadeOutDown.duration(160)}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={{
          maxWidth: 440,
          minHeight: 52,
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 18,
          paddingHorizontal: 16,
          paddingVertical: 13,
          backgroundColor: isDark ? "#222222" : "#171717",
          shadowColor: "#0B0B0A",
          shadowOpacity: 0.2,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        }}
      >
        <Icon size={23} color={color} weight="fill" />
        <Text
          style={{ marginLeft: 11, flex: 1, color: "#FAF9F6", fontSize: 15 }}
          numberOfLines={3}
        >
          {message}
        </Text>
        {actionLabel && onAction ? (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onAction}
            hitSlop={10}
            style={{ marginLeft: 10, paddingVertical: 7, paddingHorizontal: 4 }}
          >
            <Text style={{ color, fontSize: 14, fontWeight: "800" }}>
              {actionLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
      </Animated.View>
    </View>
  );
}
