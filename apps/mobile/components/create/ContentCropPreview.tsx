import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  canvasAspectRatio?: number;
  cropShape?: "rectangle" | "circle";
  disabled?: boolean;
  onImageLoad?: () => void;
  onCropChange: (crop: ContentCropRect) => void;
};

const MAX_ZOOM = 5;
const CONTENT_ASPECT = 11 / 17;

function clamp(value: number, minimum: number, maximum: number) {
  "worklet";
  return Math.min(maximum, Math.max(minimum, value));
}

function initialCropTransform(
  frameWidth: number,
  frameHeight: number,
  sourceWidth: number,
  sourceHeight: number,
  initialCrop?: ContentCropRect,
) {
  const coverScale = Math.max(
    frameWidth / sourceWidth,
    frameHeight / sourceHeight,
  );
  if (!initialCrop?.width || !initialCrop?.height) {
    return {
      zoom: 1,
      translateX: 0,
      translateY: 0,
      normalizedCrop: undefined,
    };
  }

  const targetAspect = frameWidth / frameHeight;
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
      frameWidth / cropWidth / coverScale,
      frameHeight / cropHeight / coverScale,
    ),
    1,
    MAX_ZOOM,
  );
  const displayScale = coverScale * nextZoom;
  const unclampedX =
    (sourceWidth / 2 - (normalizedOriginX + cropWidth / 2)) * displayScale;
  const unclampedY =
    (sourceHeight / 2 - (normalizedOriginY + cropHeight / 2)) * displayScale;
  const baseWidth = sourceWidth * coverScale;
  const baseHeight = sourceHeight * coverScale;
  const maxX = Math.max(0, (baseWidth * nextZoom - frameWidth) / 2);
  const maxY = Math.max(0, (baseHeight * nextZoom - frameHeight) / 2);

  return {
    zoom: nextZoom,
    translateX: clamp(unclampedX, -maxX, maxX),
    translateY: clamp(unclampedY, -maxY, maxY),
    normalizedCrop: {
      originX: normalizedOriginX,
      originY: normalizedOriginY,
      width: cropWidth,
      height: cropHeight,
    },
  };
}

export default function ContentCropPreview({
  sourceUri,
  sourceWidth,
  sourceHeight,
  crop,
  aspectRatio = CONTENT_ASPECT,
  canvasAspectRatio,
  cropShape = "rectangle",
  disabled = false,
  onImageLoad,
  onCropChange,
}: Props) {
  const [available, setAvailable] = useState({ width: 0, height: 0 });
  const canvasFrame = useMemo(() => {
    const ratio = canvasAspectRatio ?? aspectRatio;
    const width = Math.min(available.width, available.height * ratio);
    return { width, height: width / ratio };
  }, [aspectRatio, available.height, available.width, canvasAspectRatio]);
  const frame = useMemo(
    () =>
      cropShape === "circle"
        ? { width: canvasFrame.width, height: canvasFrame.width }
        : canvasFrame,
    [canvasFrame, cropShape],
  );
  const cropOffsetY =
    cropShape === "circle" ? (canvasFrame.height - frame.height) / 2 : 0;
  const zoom = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const gestureZoom = useSharedValue(1);
  const gestureTranslateX = useSharedValue(0);
  const gestureTranslateY = useSharedValue(0);
  const gridOpacity = useSharedValue(0);
  const initializedCropKey = useRef("");

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
    const nextInitializationKey = [
      sourceUri,
      sourceWidth,
      sourceHeight,
      frame.width,
      frame.height,
    ].join(":");
    if (initializedCropKey.current === nextInitializationKey) return;
    initializedCropKey.current = nextInitializationKey;
    const initialTransform = initialCropTransform(
      frame.width,
      frame.height,
      sourceWidth,
      sourceHeight,
      crop,
    );
    zoom.set(initialTransform.zoom);
    translateX.set(initialTransform.translateX);
    translateY.set(initialTransform.translateY);
    if (crop && initialTransform.normalizedCrop) {
      const normalizedCrop = initialTransform.normalizedCrop;
      const cropWasNormalized =
        Math.abs(crop.originX - normalizedCrop.originX) > 0.5 ||
        Math.abs(crop.originY - normalizedCrop.originY) > 0.5 ||
        Math.abs(crop.width - normalizedCrop.width) > 0.5 ||
        Math.abs(crop.height - normalizedCrop.height) > 0.5;
      if (cropWasNormalized) {
        cropFromTransform(
          initialTransform.translateX,
          initialTransform.translateY,
          initialTransform.zoom,
        );
      }
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
        .maxPointers(1)
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
          const focalY = event.focalY - cropOffsetY - frame.height / 2;
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
      cropOffsetY,
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
    return {
      transform: [
        { translateX: translateX.get() },
        { translateY: translateY.get() },
        { scale: zoom.get() },
      ],
    };
  });
  const blurredImageStyle = useAnimatedStyle(() => {
    if (!geometry) return {};
    return {
      transform: [
        { translateX: translateX.get() },
        { translateY: translateY.get() },
        { scale: zoom.get() },
      ],
    };
  });
  const gridStyle = useAnimatedStyle(() => ({ opacity: gridOpacity.get() }));
  const combinedGesture = useMemo(
    () => Gesture.Simultaneous(pan, pinch),
    [pan, pinch],
  );

  function handleLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    const ratio = canvasAspectRatio ?? aspectRatio;
    const nextCanvasWidth = Math.min(width, height * ratio);
    const nextCanvasHeight = nextCanvasWidth / ratio;
    const nextFrameHeight =
      cropShape === "circle" ? nextCanvasWidth : nextCanvasHeight;
    if (
      nextCanvasWidth > 0 &&
      nextFrameHeight > 0 &&
      sourceWidth > 0 &&
      sourceHeight > 0
    ) {
      const initialTransform = initialCropTransform(
        nextCanvasWidth,
        nextFrameHeight,
        sourceWidth,
        sourceHeight,
        crop,
      );
      zoom.set(initialTransform.zoom);
      translateX.set(initialTransform.translateX);
      translateY.set(initialTransform.translateY);
    }
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
          width: canvasFrame.width,
          height: canvasFrame.height,
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
              {cropShape === "circle" ? (
                <>
                  <Animated.View
                    style={[
                      {
                        position: "absolute",
                        width: geometry.baseWidth,
                        height: geometry.baseHeight,
                        left: (frame.width - geometry.baseWidth) / 2,
                        top:
                          cropOffsetY +
                          (frame.height - geometry.baseHeight) / 2,
                      },
                      blurredImageStyle,
                    ]}
                  >
                    <Image
                      source={{ uri: sourceUri }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="fill"
                      cachePolicy="memory-disk"
                      blurRadius={18}
                    />
                  </Animated.View>
                  <View
                    pointerEvents="none"
                    className="absolute inset-0 bg-black/25"
                  />
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      top: cropOffsetY,
                      left: 0,
                      width: frame.width,
                      height: frame.height,
                      overflow: "hidden",
                      borderRadius: frame.width / 2,
                    }}
                  >
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
                        cachePolicy="memory-disk"
                        onLoad={onImageLoad}
                        onError={(event) =>
                          console.error("Crop image preview failed", {
                            uri: sourceUri,
                            error: event.error,
                          })
                        }
                      />
                    </Animated.View>
                  </View>
                </>
              ) : (
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
                    cachePolicy="memory-disk"
                    onLoad={onImageLoad}
                    onError={(event) =>
                      console.error("Crop image preview failed", {
                        uri: sourceUri,
                        error: event.error,
                      })
                    }
                  />
                </Animated.View>
              )}
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: "absolute",
                    top: cropOffsetY,
                    left: 0,
                    width: frame.width,
                    height: frame.height,
                    overflow: "hidden",
                    borderRadius:
                      cropShape === "circle" ? frame.width / 2 : 0,
                  },
                  gridStyle,
                ]}
              >
                <View
                  className="absolute inset-0 border border-white/80"
                  style={{
                    borderRadius:
                      cropShape === "circle" ? frame.width / 2 : 0,
                  }}
                />
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
