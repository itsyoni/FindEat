import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

function useSkeletonPulse() {
  const opacity = useSharedValue(0.48);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 700 }),
        withTiming(0.48, { duration: 700 }),
      ),
      -1,
    );

    return () => cancelAnimation(opacity);
  }, [opacity]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

function Bubble({
  side,
  width,
  height = 42,
  grouped = false,
}: {
  side: "left" | "right";
  width: `${number}%`;
  height?: number;
  grouped?: boolean;
}) {
  return (
    <View
      style={{ width, height }}
      className={`${grouped ? "mt-1" : "mt-3"} rounded-[20px] ${
        side === "right"
          ? "self-end rounded-br-md bg-[#F7D9D0] dark:bg-[#4A302B]"
          : "self-start rounded-bl-md bg-gray-200 dark:bg-[#242426]"
      }`}
    />
  );
}

export function ChatHeaderSkeleton() {
  const animatedStyle = useSkeletonPulse();

  return (
    <Animated.View
      pointerEvents="none"
      style={animatedStyle}
      className="min-w-0 flex-1 flex-row items-center py-2"
    >
      <View className="h-[42px] w-[42px] rounded-full bg-gray-200 dark:bg-gray-800" />
      <View className="ml-3 flex-1">
        <View className="h-4 w-32 rounded-full bg-gray-200 dark:bg-gray-800" />
        <View className="mt-2 h-2.5 w-20 rounded-full bg-gray-100 dark:bg-gray-900" />
      </View>
    </Animated.View>
  );
}

export default function ChatSkeleton() {
  const animatedStyle = useSkeletonPulse();

  return (
    <View className="absolute inset-0 z-20 bg-canvas dark:bg-[#080808]">
      <Animated.View style={animatedStyle} className="flex-1 justify-end px-3 pb-4">
        <View className="mb-4 h-6 w-20 self-center rounded-full bg-gray-200 dark:bg-gray-800" />
        <Bubble side="left" width="62%" height={48} />
        <Bubble side="left" width="44%" grouped />
        <Bubble side="right" width="58%" height={54} />
        <Bubble side="right" width="36%" grouped />
        <Bubble side="left" width="70%" height={46} />
        <Bubble side="right" width="52%" />
        <Bubble side="right" width="65%" grouped />
      </Animated.View>

      <View className="flex-row items-center px-3 py-2">
        <View className="h-[42px] flex-1 rounded-3xl border border-line bg-soft dark:border-gray-800 dark:bg-[#1B1B1D]" />
        <View className="ml-2 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800" />
      </View>
    </View>
  );
}
