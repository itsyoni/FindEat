import type { GallerySaveStatus } from "@/hooks/useGallerySaveFeedback";
import { CheckCircleIcon, DownloadSimpleIcon } from "phosphor-react-native";
import { useEffect } from "react";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export default function AnimatedGallerySaveIcon({
  status,
  size = 22,
  color = "#FAF9F6",
}: {
  status: GallerySaveStatus;
  size?: number;
  color?: string;
}) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(translateY);
    cancelAnimation(scale);
    if (status === "saving") {
      scale.set(withTiming(0.94, { duration: 140 }));
      translateY.set(
        withRepeat(
          withSequence(
            withTiming(4, { duration: 330 }),
            withTiming(-1, { duration: 330 }),
          ),
          -1,
          false,
        ),
      );
      return;
    }
    translateY.set(withTiming(0, { duration: 120 }));
    scale.set(
      status === "success"
        ? withSequence(withSpring(1.28), withSpring(1))
        : withSpring(1),
    );
  }, [scale, status, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      {status === "success" ? (
        <CheckCircleIcon size={size + 1} color="#58D68D" weight="fill" />
      ) : (
        <DownloadSimpleIcon size={size} color={color} weight="bold" />
      )}
    </Animated.View>
  );
}
