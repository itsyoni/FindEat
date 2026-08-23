import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

export type ContentCropRect = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

type Props = {
  sourceUri: string;
  sourceWidth: number;
  sourceHeight: number;
  crop?: ContentCropRect;
  aspectRatio?: number;
  disabled?: boolean;
  onCropChange: (crop: ContentCropRect) => void;
};

const MAX_ZOOM = 5;
const CONTENT_ASPECT = 11 / 17;

function clamp(value: number, minimum: number, maximum: number) {
  "worklet";
  return Math.min(maximum, Math.max(minimum, value));
}

export default function ContentCropPreview({
  sourceUri,
  sourceWidth,
  sourceHeight,
  crop,
  aspectRatio = CONTENT_ASPECT,
  disabled = false,
  onCropChange,
}: Props) {
  const [available, setAvailable] = useState({ width: 0, height: 0 });
  const frame = useMemo(() => {
    const width = Math.min(available.width, available.height * aspectRatio);
    return { width, height: width / aspectRatio };
  }, [aspectRatio, available.height, available.width]);
  const zoom = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const gestureZoom = useSharedValue(1);
  const gestureTranslateX = useSharedValue(0);
  const gestureTranslateY = useSharedValue(0);
  const gridOpacity = useSharedValue(0);

  const geometry = useMemo(() => {
    if (!frame.width || !frame.height || !sourceWidth || !sourceHeight) {
      return null;
    }
    const coverScale = Math.max(
      frame.width / sourceWidth,
      frame.height / sourceHeight,
    );
    return {
      coverScale,
      baseWidth: sourceWidth * coverScale,
      baseHeight: sourceHeight * coverScale,
    };
  }, [frame.height, frame.width, sourceHeight, sourceWidth]);

  const cropFromTransform = useCallback(
    (nextX: number, nextY: number, nextZoom: number) => {
      if (!geometry || !frame.width || !frame.height) return;
      const displayScale = geometry.coverScale * nextZoom;
      const displayedWidth = sourceWidth * displayScale;
      const displayedHeight = sourceHeight * displayScale;
      const imageLeft = (frame.width - displayedWidth) / 2 + nextX;
      const imageTop = (frame.height - displayedHeight) / 2 + nextY;
      const cropWidth = Math.min(sourceWidth, frame.width / displayScale);
      const cropHeight = Math.min(sourceHeight, frame.height / displayScale);
      onCropChange({
        originX: clamp(-imageLeft / displayScale, 0, sourceWidth - cropWidth),
        originY: clamp(-imageTop / displayScale, 0, sourceHeight - cropHeight),
        width: cropWidth,
        height: cropHeight,
      });
    },
    [
      frame.height,
      frame.width,
      geometry,
      onCropChange,
      sourceHeight,
      sourceWidth,
    ],
  );

  useEffect(() => {
    if (!geometry || !frame.width || !frame.height) return;
    const initialCrop = crop;
    if (initialCrop?.width && initialCrop?.height) {
      const targetAspect = frame.width / frame.height;
      const cropCenterX = initialCrop.originX + initialCrop.width / 2;
      const cropCenterY = initialCrop.originY + initialCrop.height / 2;
      let cropWidth = clamp(initialCrop.width, 1, sourceWidth);
      let cropHeight = clamp(initialCrop.height, 1, sourceHeight);

      if (cropWidth / cropHeight > targetAspect) {
        cropWidth = cropHeight * targetAspect;
      } else {
        cropHeight = cropWidth / targetAspect;
      }
      if (cropHeight > sourceHeight) {
        cropHeight = sourceHeight;
        cropWidth = cropHeight * targetAspect;
      }
      if (cropWidth > sourceWidth) {
        cropWidth = sourceWidth;
        cropHeight = cropWidth / targetAspect;
      }

      const normalizedOriginX = clamp(
        cropCenterX - cropWidth / 2,
        0,
        sourceWidth - cropWidth,
      );
      const normalizedOriginY = clamp(
        cropCenterY - cropHeight / 2,
        0,
        sourceHeight - cropHeight,
      );
      const nextZoom = clamp(
        Math.max(
          frame.width / cropWidth / geometry.coverScale,
          frame.height / cropHeight / geometry.coverScale,
        ),
        1,
        MAX_ZOOM,
      );
      const displayScale = geometry.coverScale * nextZoom;
      const unclampedX =
        (sourceWidth / 2 - (normalizedOriginX + cropWidth / 2)) *
        displayScale;
      const unclampedY =
        (sourceHeight / 2 - (normalizedOriginY + cropHeight / 2)) *
        displayScale;
      const maxX = Math.max(
        0,
        (geometry.baseWidth * nextZoom - frame.width) / 2,
      );
      const maxY = Math.max(
        0,
        (geometry.baseHeight * nextZoom - frame.height) / 2,
      );
      const nextX = clamp(unclampedX, -maxX, maxX);
      const nextY = clamp(unclampedY, -maxY, maxY);
      zoom.set(nextZoom);
      translateX.set(nextX);
      translateY.set(nextY);
      const cropWasNormalized =
        Math.abs(initialCrop.originX - normalizedOriginX) > 0.5 ||
        Math.abs(initialCrop.originY - normalizedOriginY) > 0.5 ||
        Math.abs(initialCrop.width - cropWidth) > 0.5 ||
        Math.abs(initialCrop.height - cropHeight) > 0.5;
      if (cropWasNormalized) {
        cropFromTransform(nextX, nextY, nextZoom);
      }
    } else {
      zoom.set(1);
      translateX.set(0);
      translateY.set(0);
    }
    gridOpacity.set(1);
    gridOpacity.set(withDelay(650, withTiming(0, { duration: 180 })));
  }, [
    cropFromTransform,
    crop,
    frame.height,
    frame.width,
    geometry,
    gridOpacity,
    sourceHeight,
    sourceUri,
    sourceWidth,
    translateX,
    translateY,
    zoom,
  ]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!disabled && !!geometry)
        .onBegin(() => {
          gestureTranslateX.set(translateX.get());
          gestureTranslateY.set(translateY.get());
          gridOpacity.set(withTiming(1, { duration: 90 }));
        })
        .onUpdate((event) => {
          if (!geometry) return;
          const currentZoom = zoom.get();
          const maxX = Math.max(
            0,
            (geometry.baseWidth * currentZoom - frame.width) / 2,
          );
          const maxY = Math.max(
            0,
            (geometry.baseHeight * currentZoom - frame.height) / 2,
          );
          translateX.set(
            clamp(gestureTranslateX.get() + event.translationX, -maxX, maxX),
          );
          translateY.set(
            clamp(gestureTranslateY.get() + event.translationY, -maxY, maxY),
          );
        })
        .onFinalize(() => {
          gridOpacity.set(withDelay(450, withTiming(0, { duration: 180 })));
          runOnJS(cropFromTransform)(
            translateX.get(),
            translateY.get(),
            zoom.get(),
          );
        }),
    [
      cropFromTransform,
      disabled,
      frame.height,
      frame.width,
      geometry,
      gestureTranslateX,
      gestureTranslateY,
      gridOpacity,
      translateX,
      translateY,
      zoom,
    ],
  );

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .enabled(!disabled && !!geometry)
        .onBegin(() => {
          gestureZoom.set(zoom.get());
          gestureTranslateX.set(translateX.get());
          gestureTranslateY.set(translateY.get());
          gridOpacity.set(withTiming(1, { duration: 90 }));
        })
        .onUpdate((event) => {
          if (!geometry) return;
          const nextZoom = clamp(
            gestureZoom.get() * event.scale,
            1,
            MAX_ZOOM,
          );
          const ratio = nextZoom / gestureZoom.get();
          const focalX = event.focalX - frame.width / 2;
          const focalY = event.focalY - frame.height / 2;
          const focalTranslateX =
            focalX - (focalX - gestureTranslateX.get()) * ratio;
          const focalTranslateY =
            focalY - (focalY - gestureTranslateY.get()) * ratio;
          const maxX = Math.max(
            0,
            (geometry.baseWidth * nextZoom - frame.width) / 2,
          );
          const maxY = Math.max(
            0,
            (geometry.baseHeight * nextZoom - frame.height) / 2,
          );
          zoom.set(nextZoom);
          translateX.set(clamp(focalTranslateX, -maxX, maxX));
          translateY.set(clamp(focalTranslateY, -maxY, maxY));
        })
        .onFinalize(() => {
          gridOpacity.set(withDelay(450, withTiming(0, { duration: 180 })));
          runOnJS(cropFromTransform)(
            translateX.get(),
            translateY.get(),
            zoom.get(),
          );
        }),
    [
      cropFromTransform,
      disabled,
      frame.height,
      frame.width,
      geometry,
      gestureTranslateX,
      gestureTranslateY,
      gestureZoom,
      gridOpacity,
      translateX,
      translateY,
      zoom,
    ],
  );

  const imageStyle = useAnimatedStyle(() => {
    if (!geometry) return {};
    const displayedWidth = geometry.baseWidth * zoom.get();
    const displayedHeight = geometry.baseHeight * zoom.get();
    return {
      width: displayedWidth,
      height: displayedHeight,
      left: (frame.width - displayedWidth) / 2 + translateX.get(),
      top: (frame.height - displayedHeight) / 2 + translateY.get(),
    };
  });
  const gridStyle = useAnimatedStyle(() => ({ opacity: gridOpacity.get() }));
  const combinedGesture = useMemo(
    () => Gesture.Simultaneous(pan, pinch),
    [pan, pinch],
  );

  function handleLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setAvailable((current) =>
      current.width === width && current.height === height
        ? current
        : { width, height },
    );
  }

  return (
    <View
      onLayout={handleLayout}
      style={{
        flex: 1,
        minHeight: 0,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#11110f",
      }}
    >
      <View
        style={{
          width: frame.width,
          height: frame.height,
          overflow: "hidden",
          shadowColor: "#0B0B0A",
          shadowOpacity: 0.38,
          shadowRadius: 14,
          elevation: 8,
        }}
      >
        {geometry ? (
          <GestureDetector gesture={combinedGesture}>
            <View className="flex-1 overflow-hidden">
              <Animated.View
                style={[
                  {
                    position: "absolute",
                    width: geometry.baseWidth,
                    height: geometry.baseHeight,
                    left: (frame.width - geometry.baseWidth) / 2,
                    top: (frame.height - geometry.baseHeight) / 2,
                  },
                  imageStyle,
                ]}
              >
                <Image
                  source={{ uri: sourceUri }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="fill"
                  cachePolicy="none"
                  onError={(event) =>
                    console.error("Crop image preview failed", {
                      uri: sourceUri,
                      error: event.error,
                    })
                  }
                />
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={[{ position: "absolute", inset: 0 }, gridStyle]}
              >
                <View className="absolute inset-0 border border-white/80" />
                <View className="absolute bottom-0 left-1/3 top-0 w-px bg-white/65" />
                <View className="absolute bottom-0 left-2/3 top-0 w-px bg-white/65" />
                <View className="absolute left-0 right-0 top-1/3 h-px bg-white/65" />
                <View className="absolute left-0 right-0 top-2/3 h-px bg-white/65" />
              </Animated.View>
            </View>
          </GestureDetector>
        ) : null}
      </View>
    </View>
  );
}
