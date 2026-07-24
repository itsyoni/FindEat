import { useAccessibilityPreferences } from "@/contexts/AccessibilityContext";
import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  View,
} from "react-native";

const COLORS = ["#F6C445", "#F97316", "#22C55E", "#38BDF8", "#EC4899", "#A78BFA"];
const PARTICLE_COUNT = 34;

type Props = {
  onComplete?: () => void;
};

export default function ConfettiBurst({ onComplete }: Props) {
  const { reduceMotion } = useAccessibilityPreferences();
  const [progress] = useState(() =>
    Array.from({ length: PARTICLE_COUNT }, () => new Animated.Value(0)),
  );
  const { width: screenWidth, height: screenHeight } =
    Dimensions.get("window");
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
        color: COLORS[index % COLORS.length],
        delay: (index % 9) * 35 + Math.floor(index / 9) * 18,
        duration: 1200 + (index % 6) * 90,
        left: ((index * 83) % 100) * (screenWidth / 100),
        size: 7 + (index % 4) * 2,
        drift: ((index % 7) - 3) * 15,
        rotation: 240 + (index % 5) * 75,
      })),
    [screenWidth],
  );

  useEffect(() => {
    if (reduceMotion) {
      onComplete?.();
      return;
    }

    progress.forEach((value) => value.setValue(0));
    const animation = Animated.parallel(
      progress.map((value, index) =>
        Animated.timing(value, {
          toValue: 1,
          duration: particles[index].duration,
          delay: particles[index].delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    );

    animation.start(({ finished }) => {
      if (finished) onComplete?.();
    });

    return () => animation.stop();
  }, [onComplete, particles, progress, reduceMotion]);

  if (reduceMotion) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              left: particle.left,
              width: particle.size,
              height: particle.size * 1.45,
              backgroundColor: particle.color,
              opacity: progress[index].interpolate({
                inputRange: [0, 0.06, 0.82, 1],
                outputRange: [0, 1, 1, 0],
              }),
              transform: [
                {
                  translateY: progress[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [-24, screenHeight + 40],
                  }),
                },
                {
                  translateX: progress[index].interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, particle.drift, particle.drift * -0.4],
                  }),
                },
                {
                  rotate: progress[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", `${particle.rotation}deg`],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    inset: 0,
    zIndex: 100,
    elevation: 100,
  },
  particle: {
    position: "absolute",
    top: 0,
    borderRadius: 2,
  },
});
