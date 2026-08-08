import { useAppTheme } from "@/contexts/ThemeContext";
import { StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

export const PROFILE_COVER_HEIGHT = 240;

type Props = {
  uri?: string | null;
  scrollY: SharedValue<number>;
};

export default function ParallaxProfileCover({ uri, scrollY }: Props) {
  const { isDark } = useAppTheme();
  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [-PROFILE_COVER_HEIGHT, 0, PROFILE_COVER_HEIGHT],
      [-PROFILE_COVER_HEIGHT / 2, 0, PROFILE_COVER_HEIGHT * 0.55],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollY.value,
      [-PROFILE_COVER_HEIGHT, 0, PROFILE_COVER_HEIGHT],
      [2, 1, 1],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateY }, { scale }] };
  });

  return (
    <View
      style={[
        styles.frame,
        { backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6" },
      ]}
    >
      {uri ? (
        <Animated.Image
          source={{ uri }}
          resizeMode="cover"
          style={[
            styles.cover,
            { backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6" },
            animatedStyle,
          ]}
        />
      ) : (
        <Animated.View
          style={[
            styles.cover,
            { backgroundColor: isDark ? "#1F2937" : "#E5E7EB" },
            animatedStyle,
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: PROFILE_COVER_HEIGHT,
    width: "100%",
    overflow: "visible",
  },
  cover: {
    height: PROFILE_COVER_HEIGHT,
    width: "100%",
  },
});
