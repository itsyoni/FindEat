import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import { CheckCircleIcon, InfoIcon, WarningCircleIcon } from "phosphor-react-native";
import { TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeInDown,
  FadeOutDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ActionToastKind = "success" | "error" | "info";

type Props = {
  message: string;
  kind: ActionToastKind;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
};

export default function ActionToast({ message, kind, actionLabel, onAction, onDismiss }: Props) {
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const color = kind === "error" ? "#EF4444" : kind === "info" ? "#3B82F6" : "#1F8A58";
  const Icon = kind === "error" ? WarningCircleIcon : kind === "info" ? InfoIcon : CheckCircleIcon;
  const dismissGesture = Gesture.Pan()
    .activeOffsetY(6)
    .failOffsetX([-24, 24])
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (translateY.value > 34 || event.velocityY > 550) {
        translateY.value = withTiming(140, { duration: 150 }, (finished) => {
          if (finished) runOnJS(onDismiss)();
        });
        return;
      }
      translateY.value = withSpring(0, { damping: 18, stiffness: 240 });
    });
  const dismissStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: 1 - Math.min(0.7, translateY.value / 160),
  }));

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
      <GestureDetector gesture={dismissGesture}>
        <Animated.View
          entering={FadeInDown.springify().damping(18).stiffness(220)}
          exiting={FadeOutDown.duration(160)}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[
            {
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
            },
            dismissStyle,
          ]}
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
      </GestureDetector>
    </View>
  );
}
