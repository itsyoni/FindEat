import { AppAlert as Alert } from "@/lib/appAlert";
import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import { TextInput } from "@/components/common";
import FullPageRestaurantPicker from "@/components/restaurants/FullPageRestaurantPicker";
import RestaurantBadge from "@/components/restaurants/RestaurantBadge";
import PostVisibilitySelector from "@/components/posts/PostVisibilitySelector";
import PostConnectionPicker from "@/components/posts/PostConnectionPicker";
import SaveDraftButton from "@/components/posts/SaveDraftButton";
import KeyboardAwareFormScrollView from "@/components/common/layout/KeyboardAwareFormScrollView";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { prependPostToFeedCache } from "@/hooks/useFeed";
import { api } from "@/lib/api";
import { uploadImage } from "@/lib/uploadImage";
import {
  clearPostDraft,
  type ContentPostDraft,
  loadContentPostDraft,
  saveContentPostDraft,
} from "@/lib/postDrafts";
import type { PostVisibility, SelectedRestaurant } from "@findeat/types";
import { getErrorMessage } from "@findeat/utils";
import {
  CameraView,
  useCameraPermissions,
  type CameraType,
  type FlashMode,
} from "expo-camera";
import ImageCropPicker from "react-native-image-crop-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  ArrowCounterClockwiseIcon,
  CameraIcon,
  ImagesSquareIcon,
  LightningIcon,
  LightningSlashIcon,
  LockIcon,
  StorefrontIcon,
  XIcon,
} from "phosphor-react-native";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, AppState, Linking, TouchableOpacity, View } from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

type Step = "CAMERA" | "DETAILS" | "RESTAURANT";

const CAMERA_CAPTURE_QUALITY = 0.72;
const TARGET_CAMERA_PIXELS = 1920 * 1080;

function selectFastPictureSize(sizes: string[]) {
  if (sizes.includes("1920x1080")) return "1920x1080";

  const numericSizes = sizes
    .map((size) => {
      const match = /^(\d+)x(\d+)$/.exec(size);
      if (!match) return null;
      const width = Number(match[1]);
      const height = Number(match[2]);
      return { size, pixels: width * height };
    })
    .filter((value): value is { size: string; pixels: number } => value !== null)
    .filter(({ pixels }) => pixels >= 1280 * 720);

  return numericSizes.sort(
    (a, b) =>
      Math.abs(a.pixels - TARGET_CAMERA_PIXELS) -
      Math.abs(b.pixels - TARGET_CAMERA_PIXELS),
  )[0]?.size;
}

export default function CreateContentScreen() {
  const { restaurantId, linkedPostId: initialLinkedPostId } =
    useLocalSearchParams<{ restaurantId?: string; linkedPostId?: string }>();
  const { t } = useTranslation("create");
  const { isDark } = useAppTheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const cameraRef = useRef<CameraView>(null);
  const cameraSessionRef = useRef(0);
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>("CAMERA");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("PUBLIC");
  const [linkedPostId, setLinkedPostId] = useState<string | undefined>(
    initialLinkedPostId,
  );
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<SelectedRestaurant | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraType>("back");
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [cameraZoom, setCameraZoomState] = useState(0);
  const [autofocus, setAutofocus] = useState<"on" | "off">("off");
  const [focusPoint, setFocusPoint] = useState<{
    x: number;
    y: number;
    id: number;
  } | null>(null);
  const [pictureSize, setPictureSize] = useState<string>();
  const [capturing, setCapturing] = useState(false);
  const [showCaptureProgress, setShowCaptureProgress] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const draftSnapshotRef = useRef<Omit<ContentPostDraft, "updatedAt"> | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    void loadContentPostDraft(user.id)
      .then((savedDraft) => {
        if (cancelled) return;
        if (!savedDraft) {
          setDraftHydrated(true);
          return;
        }

        Alert.alert(t("draftFoundTitle"), t("contentDraftFoundBody"), [
          {
            text: t("discardDraft"),
            style: "destructive",
            onPress: () => {
              void clearPostDraft(user.id, "content");
              setDraftHydrated(true);
            },
          },
          {
            text: t("continueDraft"),
            onPress: () => {
              setImageUri(savedDraft.imageUri);
              setDescription(savedDraft.description);
              setVisibility(savedDraft.visibility);
              setLinkedPostId(savedDraft.linkedPostId);
              setSelectedRestaurant(savedDraft.selectedRestaurant);
              setStep(savedDraft.step === "CAMERA" ? "DETAILS" : savedDraft.step);
              setDraftHydrated(true);
            },
          },
        ]);
      })
      .catch((error) => {
        console.error("Could not restore content draft", error);
        if (!cancelled) setDraftHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [t, user?.id]);

  useEffect(() => {
    if (!draftHydrated || !user?.id || !imageUri || publishing) return;
    const timer = setTimeout(() => {
      void saveContentPostDraft(user.id, {
        step,
        imageUri,
        description,
        visibility,
        linkedPostId,
        selectedRestaurant,
      }).catch((error) => console.error("Could not save content draft", error));
    }, 500);
    return () => clearTimeout(timer);
  }, [
    description,
    draftHydrated,
    imageUri,
    linkedPostId,
    publishing,
    selectedRestaurant,
    step,
    user?.id,
    visibility,
  ]);

  useEffect(() => {
    draftSnapshotRef.current =
      draftHydrated && imageUri && !publishing
        ? {
            step,
            imageUri,
            description,
            visibility,
            linkedPostId,
            selectedRestaurant,
          }
        : null;
  }, [
    description,
    draftHydrated,
    imageUri,
    linkedPostId,
    publishing,
    selectedRestaurant,
    step,
    visibility,
  ]);

  useEffect(() => {
    if (!user?.id) return;
    const subscription = AppState.addEventListener("change", (state) => {
      const snapshot = draftSnapshotRef.current;
      if (state !== "active" && snapshot) {
        void saveContentPostDraft(user.id, snapshot);
      }
    });
    return () => subscription.remove();
  }, [user?.id]);

  useEffect(() => {
    if (!draftHydrated || !restaurantId || selectedRestaurant) return;
    let cancelled = false;

    void api.restaurants
      .get(restaurantId)
      .then((restaurant) => {
        if (!cancelled) {
          setSelectedRestaurant({ source: "FINDEAT", restaurant });
        }
      })
      .catch((error) => console.error("failed to preselect restaurant", error));

    return () => {
      cancelled = true;
    };
  }, [draftHydrated, restaurantId, selectedRestaurant]);

  function selectPhoto(uri: string) {
    setImageUri(uri);
    setStep("DETAILS");
  }

  function openCamera() {
    cameraSessionRef.current += 1;
    setCameraReady(false);
    setShowCaptureProgress(false);
    setStep("CAMERA");
  }

  const setCameraZoom = useCallback((value: number) => {
    const next = Math.max(0, Math.min(0.6, value));
    setCameraZoomState(next);
  }, []);

  const focusCamera = useCallback((x: number, y: number) => {
    const id = Date.now();
    setFocusPoint({ x, y, id });
    // Expo exposes point-independent autofocus. Toggling it performs a fresh
    // focus pass on iOS; Android continues using its native continuous focus.
    setAutofocus("on");
    setTimeout(() => {
      setAutofocus("off");
      setFocusPoint((current) => (current?.id === id ? null : current));
    }, 850);
  }, []);

  const adjustCameraZoom = useCallback((delta: number) => {
    setCameraZoomState((current) =>
      Math.max(0, Math.min(0.6, current + delta)),
    );
  }, []);

  const cameraGesture = Gesture.Simultaneous(
    Gesture.Pinch()
      .runOnJS(true)
      .onChange(({ scaleChange }) => {
        adjustCameraZoom(Math.log2(Math.max(scaleChange, 0.1)) * 0.16);
      }),
    Gesture.Tap()
      .maxDuration(250)
      .runOnJS(true)
      .onEnd(({ x, y }) => focusCamera(x, y)),
  );

  function cycleFlashMode() {
    setFlashMode((current) =>
      current === "off" ? "auto" : current === "auto" ? "on" : "off",
    );
  }

  function cycleZoom() {
    if (cameraZoom < 0.05) setCameraZoom(0.12);
    else if (cameraZoom < 0.2) setCameraZoom(0.28);
    else setCameraZoom(0);
  }

  function flipCamera() {
    cameraSessionRef.current += 1;
    setCameraReady(false);
    setPictureSize(undefined);
    setCameraFacing((current) => (current === "back" ? "front" : "back"));
    setFlashMode("off");
    setCameraZoom(0);
  }

  const zoomLabel =
    cameraZoom < 0.05 ? "1×" : cameraZoom < 0.2 ? "2×" : "3×";

  async function handleCameraReady() {
    const session = cameraSessionRef.current;

    // Capturing is safe as soon as the native camera reports that it is ready.
    // Picture-size discovery is only an optimization and may resolve slowly on
    // some front-facing cameras, so it must not keep the shutter disabled.
    setCameraReady(true);

    const camera = cameraRef.current;
    if (!camera) return;

    try {
      const sizes = await camera.getAvailablePictureSizesAsync();
      if (session === cameraSessionRef.current) {
        setPictureSize(selectFastPictureSize(sizes));
      }
    } catch (error) {
      console.warn("Could not configure camera picture size", error);
    }
  }

  async function takePhoto() {
    if (!cameraRef.current || !cameraReady || capturing) return;

    let progressTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      setCapturing(true);
      progressTimer = setTimeout(() => setShowCaptureProgress(true), 350);
      const photo = await cameraRef.current.takePictureAsync({
        quality: CAMERA_CAPTURE_QUALITY,
      });
      selectPhoto(photo.uri);
    } catch (error) {
      console.error("camera capture failed", error);
    } finally {
      if (progressTimer) clearTimeout(progressTimer);
      setShowCaptureProgress(false);
      setCapturing(false);
    }
  }

  async function openGallery() {
    try {
      const image = await ImageCropPicker.openPicker({
        width: 1200,
        height: 1500,
        cropping: true,
        freeStyleCropEnabled: false,
        mediaType: "photo",
        compressImageQuality: 0.9,
        forceJpg: true,
        cropperToolbarTitle: t("cropContentPhoto"),
      });
      selectPhoto(image.path);
    } catch (error) {
      if ((error as { code?: string }).code !== "E_PICKER_CANCELLED") {
        console.error("content image picker failed", error);
        Alert.alert(t("imageCropErrorTitle"), t("imageCropErrorBody"));
      }
    }
  }

  async function getRestaurantId() {
    if (!selectedRestaurant) return undefined;
    if (selectedRestaurant.source === "FINDEAT") {
      return selectedRestaurant.restaurant.id;
    }

    const restaurant = await api.restaurants.fromGoogle({
      name: selectedRestaurant.name,
      address: selectedRestaurant.address,
      latitude: selectedRestaurant.latitude,
      longitude: selectedRestaurant.longitude,
      googlePlaceId: selectedRestaurant.googlePlaceId,
    });
    return restaurant.id;
  }

  async function publish() {
    if (!imageUri || !selectedRestaurant || publishing) return;

    try {
      setPublishing(true);
      const restaurantId = await getRestaurantId();
      if (!restaurantId) return;
      const imageUrl = await uploadImage(imageUri, "post");
      const createdPost = await api.posts.createContent({
        imageUrl,
        restaurantId,
        description: description.trim(),
        visibility,
        linkedPostId,
      });
      draftSnapshotRef.current = null;
      if (user?.id) await clearPostDraft(user.id, "content");

      prependPostToFeedCache(queryClient, createdPost);
      const openFeed = () =>
        router.replace({
          pathname: "/(tabs)",
          params: {
            feed: createdPost.type,
            postId: createdPost.id,
            refresh: Date.now().toString(),
          },
        });

      if (linkedPostId) {
        openFeed();
      } else {
        Alert.alert(t("addReviewPromptTitle"), t("addReviewPromptBody"), [
          { text: t("maybeLater"), style: "cancel", onPress: openFeed },
          {
            text: t("writeFullReview"),
            onPress: () =>
              router.replace({
                pathname: "/create/review",
                params: { restaurantId, linkedPostId: createdPost.id },
              }),
          },
        ]);
      }
    } catch (error) {
      console.error(error);
      Alert.alert(t("publishError"), getErrorMessage(error, t("publishErrorBody")));
    } finally {
      setPublishing(false);
    }
  }

  async function handleSaveDraft() {
    if (!user?.id || !imageUri || savingDraft) return;
    try {
      setSavingDraft(true);
      await saveContentPostDraft(user.id, {
        step,
        imageUri,
        description,
        visibility,
        linkedPostId,
        selectedRestaurant,
      });
      showToast(t("draftSaved"));
      router.back();
    } catch (error) {
      console.error("Could not save content draft", error);
      showToast(t("draftSaveError"), { kind: "error" });
    } finally {
      setSavingDraft(false);
    }
  }

  const selectedPlace =
    selectedRestaurant?.source === "FINDEAT"
      ? selectedRestaurant.restaurant
      : selectedRestaurant;
  const selectedPlaceLogo =
    selectedRestaurant?.source === "FINDEAT"
      ? selectedRestaurant.restaurant.logoUrl
      : null;

  if (!draftHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="white" size="large" />
      </View>
    );
  }

  if (step === "CAMERA") {
    const permissionGranted = permission?.granted;
    const canAskForCamera = permission?.canAskAgain !== false;

    return (
      <View className="flex-1 bg-black">
        <Stack.Screen options={{ headerShown: false }} />
        {permissionGranted ? (
          <View style={{ flex: 1 }}>
            <GestureDetector gesture={cameraGesture}>
              <View style={{ position: "absolute", inset: 0 }}>
                <CameraView
                  key={cameraFacing}
                  ref={cameraRef}
                  style={{ position: "absolute", inset: 0 }}
                  facing={cameraFacing}
                  flash={
                    cameraFacing === "front" && flashMode === "on"
                      ? "screen"
                      : flashMode
                  }
                  zoom={cameraZoom}
                  autofocus={autofocus}
                  mode="picture"
                  pictureSize={pictureSize}
                  onCameraReady={() => void handleCameraReady()}
                />
                {focusPoint && (
                  <View
                    pointerEvents="none"
                    className="absolute h-16 w-16 rounded-2xl border-2 border-amber-300"
                    style={{
                      left: focusPoint.x - 32,
                      top: focusPoint.y - 32,
                    }}
                  />
                )}
              </View>
            </GestureDetector>
            <SafeAreaView
              pointerEvents="box-none"
              style={{
                flex: 1,
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingBottom: 32,
              }}
            >
              <View className="flex-row items-center justify-between">
                <TouchableOpacity
                  onPress={() => router.back()}
                  className="h-11 w-11 items-center justify-center rounded-full bg-black/45"
                >
                  <XIcon size={24} color="white" weight="bold" />
                </TouchableOpacity>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    onPress={cycleFlashMode}
                    accessibilityRole="button"
                    accessibilityLabel={t(`flash${flashMode === "off" ? "Off" : flashMode === "auto" ? "Auto" : "On"}`)}
                    className="h-11 min-w-11 flex-row items-center justify-center rounded-full bg-black/45 px-3"
                  >
                    {flashMode === "off" ? (
                      <LightningSlashIcon size={22} color="white" weight="bold" />
                    ) : (
                      <LightningIcon size={22} color="#F6C445" weight="fill" />
                    )}
                    {flashMode === "auto" && (
                      <Text className="ml-1 text-xs font-bold text-white">A</Text>
                    )}
                  </TouchableOpacity>
                  <SaveDraftButton
                    darkSurface
                    disabled={!imageUri}
                    saving={savingDraft}
                    onPress={() => void handleSaveDraft()}
                  />
                </View>
              </View>

              <View>
                <TouchableOpacity
                  onPress={cycleZoom}
                  accessibilityRole="button"
                  accessibilityLabel={t("cameraZoom", { value: zoomLabel })}
                  className="mb-4 self-center rounded-full bg-black/55 px-4 py-2"
                >
                  <Text className="font-bold text-white">{zoomLabel}</Text>
                </TouchableOpacity>
                <View className="flex-row items-center justify-between px-2">
                <TouchableOpacity
                  onPress={() => void openGallery()}
                  className="h-14 w-14 items-center justify-center rounded-2xl bg-black/50"
                >
                  <ImagesSquareIcon size={27} color="white" weight="fill" />
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={!cameraReady || capturing}
                  onPress={() => void takePhoto()}
                  className={`h-20 w-20 items-center justify-center rounded-full border-4 border-white ${
                    !cameraReady ? "opacity-50" : ""
                  }`}
                >
                  <View className="h-16 w-16 rounded-full bg-white" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={flipCamera}
                  accessibilityRole="button"
                  accessibilityLabel={t("flipCamera")}
                  className="h-14 w-14 items-center justify-center rounded-full bg-black/50"
                >
                  <ArrowCounterClockwiseIcon size={26} color="white" weight="bold" />
                </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          </View>
        ) : permission === null ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="white" size="large" />
          </View>
        ) : (
          <SafeAreaView className="flex-1 px-5 pb-4">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("cancel")}
              onPress={() => router.back()}
              className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
            >
              <XIcon size={23} color="white" weight="bold" />
            </TouchableOpacity>

            <View className="flex-1 items-center justify-center px-3">
              <View className="h-40 w-52 items-center justify-center overflow-hidden rounded-[36px] border border-white/10 bg-[#171717]">
                <View
                  className="absolute -left-6 -top-8 h-24 w-24 rounded-full"
                  style={{ backgroundColor: "rgba(247, 215, 134, 0.15)" }}
                />
                <View
                  className="absolute -bottom-10 -right-5 h-28 w-28 rounded-full"
                  style={{ backgroundColor: "rgba(255, 107, 69, 0.15)" }}
                />
                <View className="h-20 w-20 items-center justify-center rounded-[26px] bg-[#F7D786] shadow-lg">
                  <CameraIcon size={39} color="#171717" weight="fill" />
                </View>
              </View>

              <View className="mt-6 rounded-full bg-white/10 px-3 py-1.5">
                <Text className="text-xs font-bold text-[#F7D786]">
                  {t("quickPost")}
                </Text>
              </View>
              <Text className="mt-4 text-center text-[28px] font-bold leading-8 text-white">
                {t(canAskForCamera ? "cameraPermissionTitle" : "cameraPermissionDeniedTitle")}
              </Text>
              <Text className="mt-3 max-w-[330px] text-center text-[15px] leading-6 text-gray-400">
                {t(canAskForCamera ? "cameraPermissionBody" : "cameraPermissionDeniedBody")}
              </Text>

              <View className="mt-5 flex-row items-center rounded-2xl bg-white/5 px-4 py-3">
                <LockIcon size={17} color="#A3A3A3" weight="fill" />
                <Text className="ml-2 shrink text-xs leading-4 text-gray-400">
                  {t("cameraPrivacy")}
                </Text>
              </View>
            </View>

            <View className="gap-3">
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() =>
                  void (canAskForCamera
                    ? requestPermission()
                    : Linking.openSettings())
                }
                className="w-full rounded-2xl bg-white py-4"
              >
                <Text className="text-center text-base font-bold text-black">
                  {t(canAskForCamera ? "allowCamera" : "openSettings")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => void openGallery()}
                className="w-full flex-row items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-4"
              >
                <ImagesSquareIcon size={21} color="#F7D786" weight="fill" />
                <Text className="ml-2 text-center text-base font-bold text-white">
                  {t("chooseFromGallery")}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )}
        {showCaptureProgress && (
          <View className="absolute inset-0 items-center justify-center bg-black/30">
            <ActivityIndicator color="white" size="large" />
          </View>
        )}
      </View>
    );
  }

  if (step === "RESTAURANT") {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <FullPageRestaurantPicker
          selectedRestaurant={selectedRestaurant}
          onSelect={(restaurant) => {
            const previousId =
              selectedRestaurant?.source === "FINDEAT"
                ? selectedRestaurant.restaurant.id
                : undefined;
            const nextId =
              restaurant?.source === "FINDEAT"
                ? restaurant.restaurant.id
                : undefined;
            if (previousId !== nextId) setLinkedPostId(undefined);
            setSelectedRestaurant(restaurant);
            setStep("DETAILS");
          }}
          onBack={() => setStep("DETAILS")}
          headerRight={
            <SaveDraftButton
              saving={savingDraft}
              onPress={() => void handleSaveDraft()}
            />
          }
        />
      </>
    );
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: isDark ? "#000" : "#FBFAF8" }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center px-4 py-2">
          <TouchableOpacity
            onPress={openCamera}
            className="h-11 w-11 items-center justify-center rounded-full"
          >
            <DirectionalIcon direction="back" size={25} color={isDark ? "#FFF" : "#171717"} weight="bold" />
          </TouchableOpacity>
          <Text className="ml-2 flex-1 text-xl font-bold text-black dark:text-white">
            {t("quickPost")}
          </Text>
          <SaveDraftButton
            saving={savingDraft}
            onPress={() => void handleSaveDraft()}
          />
          <TouchableOpacity
            disabled={!selectedRestaurant || publishing}
            onPress={() => void publish()}
            className="min-w-14 items-end px-1 py-2"
          >
            {publishing ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text
                className={`font-bold ${
                  selectedRestaurant
                    ? "text-black dark:text-white"
                    : "text-gray-300 dark:text-gray-700"
                }`}
              >
                {t("post")}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAwareFormScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          bottomOffset={28}
        >
          {imageUri && (
            <View
              style={{ width: "72%", aspectRatio: 4 / 5, alignSelf: "center" }}
              className="my-5 overflow-hidden rounded-3xl bg-black"
            >
              <ProgressiveImage
                source={{ uri: imageUri }}
                className="h-full w-full"
                resizeMode="contain"
              />

              <TouchableOpacity
                onPress={openCamera}
                className="absolute bottom-4 right-4 flex-row items-center rounded-full border border-white/25 px-4 py-2.5"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.62)" }}
              >
                <ArrowCounterClockwiseIcon size={17} color="white" />
                <Text className="ml-2 text-sm font-bold text-white">
                  {t("retake")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View className="px-5">
            <TouchableOpacity
              onPress={() => setStep("RESTAURANT")}
              className="mt-2 flex-row items-center border-b border-gray-100 py-4 dark:border-gray-800"
            >
              {selectedPlace ? (
                <Avatar
                  uri={selectedPlaceLogo}
                  username={selectedPlace.name}
                  size={46}
                  fallbackType="restaurant"
                />
              ) : (
                <View className="h-11 w-11 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
                  <StorefrontIcon size={22} color="#9CA3AF" weight="fill" />
                </View>
              )}
              <View className="ml-3 flex-1">
                <View className="flex-row items-center">
                  <Text className="font-bold text-black dark:text-white">
                    {selectedPlace?.name ?? t("addRestaurant")}
                  </Text>
                  {selectedPlace ? (
                    <RestaurantBadge
                      size={14}
                      claimed={
                        selectedRestaurant?.source === "FINDEAT" &&
                        selectedRestaurant.restaurant.status === "CLAIMED"
                      }
                    />
                  ) : null}
                </View>
                <Text numberOfLines={1} className="mt-1 text-sm text-gray-500">
                  {selectedPlace
                    ? selectedPlace.address ?? selectedPlace.city
                    : t("restaurantRequired")}
                </Text>
              </View>
              <DirectionalIcon direction="forward" size={20} color="#9CA3AF" weight="bold" />
            </TouchableOpacity>

            <View className="mt-5">
              <Text className="mb-2 text-base font-bold text-black dark:text-white">
                {t("descriptionOptional")}
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={t("descriptionPlaceholder")}
                multiline
                maxLength={500}
                className="min-h-28 bg-gray-50 dark:bg-gray-900"
              />
            </View>

            <PostConnectionPicker
              restaurantId={
                selectedRestaurant?.source === "FINDEAT"
                  ? selectedRestaurant.restaurant.id
                  : undefined
              }
              candidateType="REVIEW"
              selectedPostId={linkedPostId}
              onSelect={setLinkedPostId}
            />

            <PostVisibilitySelector
              value={visibility}
              onChange={setVisibility}
            />
          </View>
        </KeyboardAwareFormScrollView>
      </SafeAreaView>
    </View>
  );
}
