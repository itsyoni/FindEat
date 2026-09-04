import { Portal } from "@gorhom/portal";
import { useState } from "react";
import {
  Dimensions,
  I18nManager,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import type { ImageContentFit } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { FullWindowOverlay } from "react-native-screens";
import Animated, {
  Extrapolation,
  interpolate,
  measure,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  withSpring,
} from "react-native-reanimated";
import ProgressiveImage from "./ProgressiveImage";

type Props = {
  uri: string;
  thumbnailUrl?: string | null;
  style?: StyleProp<ViewStyle>;
  resizeMode?: ImageContentFit;
  maxScale?: number;
  onDoubleTap?: (x: number, y: number) => void;
  onPinchStart?: () => void;
  onPinchEnd?: () => void;
};

const resetSpring = {
  damping: 18,
  stiffness: 220,
  mass: 0.7,
};

export default function PinchZoomImage({
  uri,
  thumbnailUrl,
  style,
  resizeMode = "cover",
  maxScale = 4,
  onDoubleTap,
  onPinchStart,
  onPinchEnd,
}: Props) {
  const [overlayMounted, setOverlayMounted] = useState(false);
  const imageRef = useAnimatedRef<View>();
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const overlayActive = useSharedValue(0);

  const pinch = Gesture.Pinch()
    // Wait until a real two-finger pinch activates. `onBegin` also runs for a
    // normal finger-down on Android, which would incorrectly cover the post UI.
    // eslint-disable-next-line react-hooks/refs
    .onStart(() => {
      const measurement = measure(imageRef);
      if (!measurement) return;

      runOnJS(setOverlayMounted)(true);
      originX.value = I18nManager.isRTL
        ? Dimensions.get("window").width -
          measurement.pageX -
          measurement.width
        : measurement.pageX;
      originY.value = measurement.pageY;
      width.value = measurement.width;
      height.value = measurement.height;
      scale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      overlayActive.value = 1;
      if (onPinchStart) runOnJS(onPinchStart)();
    })
    .onUpdate((event) => {
      if (!overlayActive.value) return;

      const nextScale = Math.min(Math.max(event.scale, 1), maxScale);
      scale.value = nextScale;
      translateX.value =
        (width.value / 2 - event.focalX) * (nextScale - 1);
      translateY.value =
        (height.value / 2 - event.focalY) * (nextScale - 1);
    })
    .onFinalize(() => {
      if (!overlayActive.value) return;

      if (onPinchEnd) runOnJS(onPinchEnd)();
      scale.value = withSpring(1, resetSpring, (finished) => {
        if (finished) {
          overlayActive.value = 0;
          runOnJS(setOverlayMounted)(false);
        }
      });
      translateX.value = withSpring(0, resetSpring);
      translateY.value = withSpring(0, resetSpring);
    });

  const doubleTap = Gesture.Tap()
    .enabled(!!onDoubleTap)
    .numberOfTaps(2)
    .runOnJS(true)
    .onEnd((event, success) => {
      if (success && onDoubleTap) {
        onDoubleTap(
          I18nManager.isRTL ? width.get() - event.x : event.x,
          event.y,
        );
      }
    });

  const mediaGesture = onDoubleTap
    ? Gesture.Simultaneous(pinch, doubleTap)
    : pinch;

  const sourceStyle = useAnimatedStyle(() => ({
    opacity: overlayMounted && overlayActive.value ? 0 : 1,
  }), [overlayMounted]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity:
      overlayActive.value *
      interpolate(scale.value, [1, 2], [0, 0.62], Extrapolation.CLAMP),
  }));

  const overlayImageStyle = useAnimatedStyle(() => ({
    left: originX.value,
    top: originY.value,
    width: width.value,
    height: height.value,
    opacity: overlayActive.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const overlay = overlayMounted ? (
    <View pointerEvents="none" style={styles.overlayRoot}>
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <Animated.View style={[styles.overlayImage, overlayImageStyle]}>
        <ProgressiveImage
          source={{ uri }}
          thumbnailUrl={thumbnailUrl}
          style={StyleSheet.absoluteFill}
          contentFit={resizeMode}
          priority="high"
        />
      </Animated.View>
    </View>
  ) : null;

  return (
    <>
      <GestureDetector gesture={mediaGesture}>
        <Animated.View
          ref={imageRef}
          onLayout={(event) => {
            width.set(event.nativeEvent.layout.width);
          }}
          style={[style, sourceStyle]}
        >
          <ProgressiveImage
            source={{ uri }}
            thumbnailUrl={thumbnailUrl}
            style={StyleSheet.absoluteFill}
            contentFit={resizeMode}
            priority="normal"
          />
        </Animated.View>
      </GestureDetector>

      {overlayMounted ? (
        <Portal hostName="pinch-zoom">
          {Platform.OS === "ios" ? (
            <FullWindowOverlay>{overlay}</FullWindowOverlay>
          ) : (
            overlay
          )}
        </Portal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10000,
    elevation: 10000,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#0B0B0A",
  },
  overlayImage: {
    position: "absolute",
    shadowColor: "#0B0B0A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 24,
  },
});
