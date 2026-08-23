import Text from "@/components/common/AppText";
import {
  normalizeBackCameraPhoto,
  normalizeFrontCameraPhoto,
} from "@/lib/normalizeCameraPhoto";
import type { PickedReviewImage } from "@/lib/reviewImagePicker";
import {
  CameraView,
  useCameraPermissions,
  type CameraType,
  type FlashMode,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowCounterClockwiseIcon,
  CameraIcon,
  ImagesSquareIcon,
  LightningIcon,
  LightningSlashIcon,
  LockIcon,
  XIcon,
} from "phosphor-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  type NativeSyntheticEvent,
  type NativeTouchEvent,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  onClose: () => void;
  onImage: (image: PickedReviewImage) => void;
  onError?: (error: unknown) => void;
};

type CameraZoomPreset = "0.5" | "1" | "CUSTOM";

function preferredPictureSize(sizes: string[]) {
  const parsed = sizes
    .map((size) => {
      const match = size.match(/^(\d+)x(\d+)$/i);
      if (!match) return null;
      const width = Number(match[1]);
      const height = Number(match[2]);
      return {
        size,
        area: width * height,
        longEdge: Math.max(width, height),
        aspectRatio: Math.max(width, height) / Math.min(width, height),
      };
    })
    .filter((size): size is NonNullable<typeof size> => !!size);
  if (!parsed.length) return undefined;

  const useful = parsed.filter((size) => size.area >= 1_500_000);
  const candidates = useful.length ? useful : parsed;
  return [...candidates].sort((first, second) => {
    const firstScore =
      Math.abs(first.longEdge - 2048) +
      Math.abs(first.aspectRatio - 4 / 3) * 900;
    const secondScore =
      Math.abs(second.longEdge - 2048) +
      Math.abs(second.aspectRatio - 4 / 3) * 900;
    return firstScore - secondScore;
  })[0]?.size;
}

function touchDistance(touches: NativeTouchEvent["touches"]) {
  if (touches.length < 2) return 0;
  const [first, second] = touches;
  return Math.hypot(
    second.locationX - first.locationX,
    second.locationY - first.locationY,
  );
}

export default function ContentPhotoCamera({
  onClose,
  onImage,
  onError,
}: Props) {
  const { t } = useTranslation(["create", "common"]);
  const cameraRef = useRef<CameraView>(null);
  const cameraZoomRef = useRef(0);
  const pinchStartZoomRef = useRef(0);
  const pinchStartDistanceRef = useRef(0);
  const cameraPinchingRef = useRef(false);
  const cameraTouchStartRef = useRef<{
    x: number;
    y: number;
    startedAt: number;
  } | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [pictureSize, setPictureSize] = useState<string>();
  const [cameraFacing, setCameraFacing] = useState<CameraType>("back");
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [cameraZoom, setCameraZoom] = useState(0);
  const [cameraZoomPreset, setCameraZoomPreset] =
    useState<CameraZoomPreset>("1");
  const [cameraAutofocus, setCameraAutofocus] = useState<"on" | "off">(
    "off",
  );
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [availableCameraLenses, setAvailableCameraLenses] = useState<string[]>(
    [],
  );
  const [selectedCameraLens, setSelectedCameraLens] = useState(
    "builtInWideAngleCamera",
  );
  const [capturing, setCapturing] = useState(false);
  const [openingGallery, setOpeningGallery] = useState(false);

  useEffect(
    () => () => {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    },
    [],
  );

  const handleCameraReady = useCallback(async () => {
    const camera = cameraRef.current;
    if (camera && !pictureSize) {
      try {
        const sizes = await camera.getAvailablePictureSizesAsync();
        setPictureSize(preferredPictureSize(sizes));
      } catch (error) {
        console.warn("Could not select review camera picture size", error);
      }
    }
    setCameraReady(true);
  }, [pictureSize]);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || !cameraReady || capturing) return;
    try {
      setCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        mirror: false,
      });
      const normalized =
        cameraFacing === "front"
          ? await normalizeFrontCameraPhoto(photo.uri)
          : await normalizeBackCameraPhoto(photo.uri);
      onImage({
        uri: normalized.uri,
        width: normalized.width,
        height: normalized.height,
      });
    } catch (error) {
      console.error("review camera capture failed", error);
      onError?.(error);
    } finally {
      setCapturing(false);
    }
  }, [cameraFacing, cameraReady, capturing, onError, onImage]);

  const openGallery = useCallback(async () => {
    if (openingGallery || capturing) return;
    try {
      setOpeningGallery(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        allowsEditing: false,
        defaultTab: "photos",
        quality: 0.92,
      });
      if (result.canceled || !result.assets[0]) return;
      const selected = result.assets[0];
      onImage({
        uri: selected.uri.startsWith("/")
          ? `file://${selected.uri}`
          : selected.uri,
        width: Math.max(1, Math.round(selected.width || 1)),
        height: Math.max(1, Math.round(selected.height || 1)),
      });
    } catch (error) {
      console.error("review gallery selection failed", error);
      onError?.(error);
    } finally {
      setOpeningGallery(false);
    }
  }, [capturing, onError, onImage, openingGallery]);

  function cycleFlashMode() {
    setFlashMode((current) =>
      current === "off" ? "auto" : current === "auto" ? "on" : "off",
    );
  }

  const setCameraZoomValue = useCallback(
    (value: number, preset: CameraZoomPreset = "CUSTOM") => {
      const nextZoom = Math.max(0, Math.min(0.6, value));
      cameraZoomRef.current = nextZoom;
      setCameraZoom(nextZoom);
      setCameraZoomPreset(preset);
    },
    [],
  );

  const focusCamera = useCallback((x: number, y: number) => {
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    setFocusPoint({ x, y });
    setCameraAutofocus("on");
    focusTimerRef.current = setTimeout(() => {
      setCameraAutofocus("off");
      setFocusPoint(null);
      focusTimerRef.current = null;
    }, 900);
  }, []);

  function handleCameraTouchStart(
    event: NativeSyntheticEvent<NativeTouchEvent>,
  ) {
    const { touches } = event.nativeEvent;
    if (touches.length >= 2) {
      cameraPinchingRef.current = true;
      pinchStartDistanceRef.current = touchDistance(touches);
      pinchStartZoomRef.current = cameraZoomRef.current;
      cameraTouchStartRef.current = null;
      return;
    }
    const touch = touches[0];
    if (!touch) return;
    cameraPinchingRef.current = false;
    cameraTouchStartRef.current = {
      x: touch.locationX,
      y: touch.locationY,
      startedAt: Date.now(),
    };
  }

  function handleCameraTouchMove(
    event: NativeSyntheticEvent<NativeTouchEvent>,
  ) {
    const { touches } = event.nativeEvent;
    if (touches.length < 2) return;
    if (!cameraPinchingRef.current) {
      cameraPinchingRef.current = true;
      pinchStartDistanceRef.current = touchDistance(touches);
      pinchStartZoomRef.current = cameraZoomRef.current;
    }
    const startDistance = pinchStartDistanceRef.current;
    if (startDistance <= 0) return;
    const scale = touchDistance(touches) / startDistance;
    setCameraZoomValue(
      pinchStartZoomRef.current + Math.log2(Math.max(scale, 0.1)) * 0.2,
    );
  }

  function handleCameraTouchEnd(
    event: NativeSyntheticEvent<NativeTouchEvent>,
  ) {
    if (cameraPinchingRef.current) {
      if (event.nativeEvent.touches.length === 0) {
        cameraPinchingRef.current = false;
        pinchStartDistanceRef.current = 0;
      }
      return;
    }
    const started = cameraTouchStartRef.current;
    const ended = event.nativeEvent.changedTouches[0];
    cameraTouchStartRef.current = null;
    if (!started || !ended || Date.now() - started.startedAt > 300) return;
    if (Math.hypot(ended.locationX - started.x, ended.locationY - started.y) > 12) {
      return;
    }
    focusCamera(ended.locationX, ended.locationY);
  }

  const ultraWideLens = availableCameraLenses.find((lens) =>
    lens.toLowerCase().includes("ultrawide"),
  );

  function selectCameraZoom(preset: "0.5" | "1") {
    setCameraReady(false);
    setPictureSize(undefined);
    setSelectedCameraLens(
      preset === "0.5" && ultraWideLens
        ? ultraWideLens
        : "builtInWideAngleCamera",
    );
    setCameraZoomValue(0, preset);
  }

  function flipCamera() {
    setCameraReady(false);
    setPictureSize(undefined);
    setCameraFacing((current) => (current === "back" ? "front" : "back"));
    setFlashMode("off");
    setSelectedCameraLens("builtInWideAngleCamera");
    setCameraZoomValue(0, "1");
    setAvailableCameraLenses([]);
  }

  const canAskForCamera = cameraPermission?.canAskAgain !== false;

  return (
    <View className="flex-1 bg-black">
      {cameraPermission?.granted ? (
        <View className="flex-1">
          <View
            style={{ position: "absolute", inset: 0 }}
            onTouchStart={handleCameraTouchStart}
            onTouchMove={handleCameraTouchMove}
            onTouchEnd={handleCameraTouchEnd}
            onTouchCancel={() => {
              cameraPinchingRef.current = false;
              cameraTouchStartRef.current = null;
              pinchStartDistanceRef.current = 0;
            }}
          >
            <CameraView
              key={cameraFacing}
              ref={cameraRef}
              style={{ position: "absolute", inset: 0 }}
              facing={cameraFacing}
              mirror={false}
              flash={flashMode}
              mode="picture"
              zoom={cameraZoom}
              autofocus={cameraAutofocus}
              pictureSize={pictureSize}
              selectedLens={
                cameraFacing === "back" ? selectedCameraLens : undefined
              }
              onAvailableLensesChanged={({ lenses }) =>
                setAvailableCameraLenses(lenses)
              }
              onCameraReady={() => void handleCameraReady()}
            />
            {focusPoint ? (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: focusPoint.x - 29,
                  top: focusPoint.y - 29,
                  width: 58,
                  height: 58,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: "#F7D786",
                }}
              />
            ) : null}
          </View>

          <SafeAreaView
            pointerEvents="box-none"
            style={{ flex: 1, justifyContent: "space-between" }}
          >
            <View className="flex-row items-center justify-between px-4 pt-2">
              <TouchableOpacity
                disabled={capturing}
                onPress={onClose}
                className="h-11 w-11 items-center justify-center rounded-full bg-black/50"
              >
                <XIcon size={23} color="#FAF9F6" weight="bold" />
              </TouchableOpacity>
              <TouchableOpacity
                disabled={capturing}
                onPress={cycleFlashMode}
                className="h-11 min-w-11 flex-row items-center justify-center rounded-full bg-black/50 px-3"
              >
                {flashMode === "off" ? (
                  <LightningSlashIcon size={21} color="#FAF9F6" weight="bold" />
                ) : (
                  <LightningIcon size={21} color="#F7D786" weight="fill" />
                )}
                {flashMode === "auto" ? (
                  <Text className="ml-1 text-xs font-bold text-white">A</Text>
                ) : null}
              </TouchableOpacity>
            </View>

            <View className="pb-8">
              {cameraFacing === "back" && ultraWideLens ? (
                <View className="mb-5 items-center">
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() =>
                      selectCameraZoom(cameraZoomPreset === "0.5" ? "1" : "0.5")
                    }
                    className="h-10 min-w-10 items-center justify-center rounded-full border border-white/20 bg-black/55 px-2.5"
                  >
                    <Text className="text-xs font-bold text-white">
                      {cameraZoomPreset === "0.5" ? "1×" : "0.5×"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <View className="flex-row items-center justify-between px-7">
                <TouchableOpacity
                  disabled={capturing || openingGallery}
                  accessibilityRole="button"
                  accessibilityLabel={t("chooseFromGallery")}
                  onPress={() => void openGallery()}
                  className="h-14 w-14 items-center justify-center rounded-2xl border border-white/25 bg-black/55"
                >
                  {openingGallery ? (
                    <ActivityIndicator color="#FAF9F6" />
                  ) : (
                    <ImagesSquareIcon size={26} color="#FAF9F6" weight="fill" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={!cameraReady || capturing}
                  onPress={() => void takePhoto()}
                  className={`h-20 w-20 items-center justify-center rounded-full border-4 border-white ${
                    !cameraReady ? "opacity-50" : ""
                  }`}
                  style={{ transform: [{ scale: capturing ? 0.9 : 1 }] }}
                >
                  <View className="h-16 w-16 rounded-full bg-white" />
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={capturing}
                  onPress={flipCamera}
                  className="h-14 w-14 items-center justify-center rounded-full bg-black/55"
                >
                  <ArrowCounterClockwiseIcon
                    size={25}
                    color="#FAF9F6"
                    weight="bold"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      ) : cameraPermission === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#FAF9F6" size="large" />
        </View>
      ) : (
        <SafeAreaView className="flex-1 bg-[#0B0B0A]">
          <View className="px-5 pt-2">
            <TouchableOpacity
              onPress={onClose}
              className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
            >
              <XIcon size={23} color="#FAF9F6" weight="bold" />
            </TouchableOpacity>
          </View>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              flexGrow: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 28,
              paddingVertical: 24,
            }}
          >
            <View className="h-20 w-20 items-center justify-center rounded-3xl bg-[#F7D786]">
              <CameraIcon size={38} color="#171717" weight="fill" />
            </View>
            <Text className="mt-6 text-center text-[26px] font-bold text-[#FAF9F6]">
              {t(
                canAskForCamera
                  ? "cameraPermissionTitle"
                  : "cameraPermissionDeniedTitle",
              )}
            </Text>
            <Text className="mt-3 max-w-sm text-center text-base text-gray-400">
              {t(
                canAskForCamera
                  ? "cameraPermissionBody"
                  : "cameraPermissionDeniedBody",
              )}
            </Text>
            <View className="mt-6 max-w-sm flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-white/10">
                <LockIcon size={16} color="#D1D5DB" weight="fill" />
              </View>
              <Text className="ml-3 flex-1 text-sm text-gray-300">
                {t("cameraPrivacy")}
              </Text>
            </View>
          </ScrollView>
          <View className="px-5 pb-3 pt-2">
            <TouchableOpacity
              onPress={() =>
                void (canAskForCamera
                  ? requestCameraPermission()
                  : Linking.openSettings())
              }
              className="rounded-2xl bg-[#F7D786] py-4"
            >
              <Text className="text-center text-base font-bold text-[#171717]">
                {t(canAskForCamera ? "allowCamera" : "openSettings")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void openGallery()}
              className="mt-3 flex-row items-center justify-center rounded-2xl border border-white/15 py-4"
            >
              <ImagesSquareIcon size={21} color="#F7D786" weight="fill" />
              <Text className="ml-2 text-base font-bold text-[#FAF9F6]">
                {t("chooseFromGallery")}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}
