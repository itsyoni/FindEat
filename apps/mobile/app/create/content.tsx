import { AppAlert as Alert } from "@/lib/appAlert";
import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import { TextInput } from "@/components/common";
import FullPageRestaurantPicker from "@/components/restaurants/FullPageRestaurantPicker";
import RestaurantBadge from "@/components/restaurants/RestaurantBadge";
import PostVisibilitySelector from "@/components/posts/PostVisibilitySelector";
import PostConnectionPicker from "@/components/posts/PostConnectionPicker";
import SaveDraftButton from "@/components/posts/SaveDraftButton";
import ReviewParticipantsStep from "@/components/review-creator/steps/ReviewParticipantsStep";
import KeyboardAwareFormScrollView from "@/components/common/layout/KeyboardAwareFormScrollView";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  createCombinedUploadProgress,
  usePostUpload,
} from "@/contexts/PostUploadContext";
import { prependPostToFeedCache } from "@/hooks/useFeed";
import { api } from "@/lib/api";
import { uploadImage, uploadVideo } from "@/lib/uploadImage";
import {
  clearPostDraft,
  type ContentMediaDraft,
  type ContentPostDraft,
  loadContentPostDraft,
  persistContentMediaUri,
  saveContentPostDraft,
} from "@/lib/postDrafts";
import type {
  PostVisibility,
  ReviewInviteeDraft,
  SelectedRestaurant,
} from "@findeat/types";
import {
  CameraView,
  useCameraPermissions,
  type CameraType,
  type FlashMode,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  ArrowCounterClockwiseIcon,
  CameraIcon,
  FilmStripIcon,
  ImagesSquareIcon,
  LightningIcon,
  LightningSlashIcon,
  LockIcon,
  StorefrontIcon,
  PlusIcon,
  UsersThreeIcon,
  XIcon,
} from "phosphor-react-native";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Linking,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import ContentVideo from "@/components/posts/content/ContentVideo";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

type Step = "CAMERA" | "DETAILS" | "RESTAURANT" | "PEOPLE";

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
  const { startPostUpload } = usePostUpload();
  const { width: screenWidth } = useWindowDimensions();
  const cameraRef = useRef<CameraView>(null);
  const cameraSessionRef = useRef(0);
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>("CAMERA");
  const [media, setMedia] = useState<ContentMediaDraft[]>([]);
  const [previewMediaIndex, setPreviewMediaIndex] = useState(0);
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("PUBLIC");
  const [linkedPostId, setLinkedPostId] = useState<string | undefined>(
    initialLinkedPostId,
  );
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<SelectedRestaurant | null>(null);
  const [taggedPeople, setTaggedPeople] = useState<ReviewInviteeDraft[]>([]);
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
  const publishCompletedRef = useRef(false);

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
              setMedia(savedDraft.media);
              setDescription(savedDraft.description);
              setVisibility(savedDraft.visibility);
              setLinkedPostId(savedDraft.linkedPostId);
              setSelectedRestaurant(savedDraft.selectedRestaurant);
              setTaggedPeople(savedDraft.taggedPeople ?? []);
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
    if (
      !draftHydrated ||
      !user?.id ||
      !media.length ||
      publishing ||
      publishCompletedRef.current
    ) {
      return;
    }
    const timer = setTimeout(() => {
      if (publishCompletedRef.current) return;
      void saveContentPostDraft(user.id, {
        step,
        imageUri: media[0].uri,
        media,
        description,
        visibility,
        linkedPostId,
        selectedRestaurant,
        taggedPeople,
      }).catch((error) => console.error("Could not save content draft", error));
    }, 500);
    return () => clearTimeout(timer);
  }, [
    description,
    draftHydrated,
    media,
    linkedPostId,
    publishing,
    selectedRestaurant,
    step,
    taggedPeople,
    user?.id,
    visibility,
  ]);

  useEffect(() => {
    draftSnapshotRef.current =
      draftHydrated &&
      media.length > 0 &&
      !publishing &&
      !publishCompletedRef.current
        ? {
            step,
            imageUri: media[0].uri,
            media,
            description,
            visibility,
            linkedPostId,
            selectedRestaurant,
            taggedPeople,
          }
        : null;
  }, [
    description,
    draftHydrated,
    media,
    linkedPostId,
    publishing,
    selectedRestaurant,
    step,
    taggedPeople,
    visibility,
  ]);

  useEffect(() => {
    if (!user?.id) return;
    const subscription = AppState.addEventListener("change", (state) => {
      const snapshot = draftSnapshotRef.current;
      if (
        state !== "active" &&
        snapshot &&
        !publishCompletedRef.current
      ) {
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

  function selectPhoto(uri: string, width = 4, height = 5) {
    setMedia([
      {
        id: `${Date.now()}-camera`,
        type: "IMAGE",
        uri,
        width,
        height,
      },
    ]);
    setStep("DETAILS");
  }

  function openCamera() {
    cameraSessionRef.current += 1;
    setCameraReady(false);
    setShowCaptureProgress(false);
    setStep("CAMERA");
  }

  function removePreviewMedia() {
    const remainingMedia = media.filter(
      (_, index) => index !== previewMediaIndex,
    );
    setMedia(remainingMedia);

    if (remainingMedia.length === 0) {
      setPreviewMediaIndex(0);
      openCamera();
      return;
    }

    setPreviewMediaIndex(
      Math.min(previewMediaIndex, remainingMedia.length - 1),
    );
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
      const stableUri = user?.id
        ? await persistContentMediaUri(
            user.id,
            photo.uri,
            `camera-${Date.now()}`,
          )
        : photo.uri;
      selectPhoto(stableUri ?? photo.uri, photo.width, photo.height);
    } catch (error) {
      console.error("camera capture failed", error);
    } finally {
      if (progressTimer) clearTimeout(progressTimer);
      setShowCaptureProgress(false);
      setCapturing(false);
    }
  }

  async function openGallery(options?: { append?: boolean }) {
    try {
      const existingPhotos =
        options?.append && media.every((item) => item.type === "IMAGE")
          ? media
          : [];
      const remaining = Math.max(1, 10 - existingPhotos.length);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        orderedSelection: true,
        selectionLimit: remaining,
        quality: 0.9,
      });
      if (result.canceled) return;
      const selected = result.assets.slice(0, remaining).map((asset, index) => ({
          id: asset.assetId ?? `${Date.now()}-${index}`,
          type: "IMAGE",
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
        }) satisfies ContentMediaDraft);
      setMedia([...existingPhotos, ...selected].slice(0, 10));
      setPreviewMediaIndex(0);
      setStep("DETAILS");
    } catch (error) {
      console.error("content image picker failed", error);
      Alert.alert(t("imageCropErrorTitle"), t("imageCropErrorBody"));
    }
  }

  async function openVideo() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: true,
        videoMaxDuration: 10,
        quality: 0.8,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      // iOS reports video duration as a floating-point millisecond value,
      // while the API and database store whole milliseconds.
      const durationMs = Math.ceil(asset.duration ?? 0);
      if (!durationMs || durationMs > 10_000) {
        Alert.alert(t("videoTooLongTitle"), t("videoTooLongBody"));
        return;
      }
      setMedia([
        {
          id: asset.assetId ?? `${Date.now()}-video`,
          type: "VIDEO",
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          durationMs,
        },
      ]);
      setStep("DETAILS");
    } catch (error) {
      console.error("content video picker failed", error);
      Alert.alert(t("videoPickerErrorTitle"), t("videoPickerErrorBody"));
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

  function publish() {
    if (
      !media.length ||
      !selectedRestaurant ||
      publishing ||
      publishCompletedRef.current
    ) {
      return;
    }

    setPublishing(true);
    publishCompletedRef.current = true;
    draftSnapshotRef.current = null;

    const pendingMedia = [...media];
    const pendingDescription = description.trim();
    const pendingVisibility = visibility;
    const pendingLinkedPostId = linkedPostId;
    const pendingTaggedUserIds = taggedPeople.map((person) => person.id);
    const pendingUserId = user?.id;

    startPostUpload({
      kind: "content",
      run: async (reportProgress) => {
        reportProgress(0.04);
        const restaurantId = await getRestaurantId();
        if (!restaurantId) throw new Error(t("restaurantRequired"));

        const reportMediaProgress = createCombinedUploadProgress(
          pendingMedia.length,
          reportProgress,
        );
        const uploadedMedia = await Promise.all(
          pendingMedia.map(async (item, index) =>
            item.type === "IMAGE"
              ? {
                  type: "IMAGE" as const,
                  imageUrl: await uploadImage(
                    item.uri,
                    "post",
                    reportMediaProgress(index),
                  ),
                  width: item.width,
                  height: item.height,
                }
              : {
                  type: "VIDEO" as const,
                  videoUrl: await uploadVideo(
                    item.uri,
                    reportMediaProgress(index),
                  ),
                  width: item.width,
                  height: item.height,
                  durationMs: item.durationMs,
                },
          ),
        );
        reportProgress(0.94);
        const createdPost = await api.posts.createContent({
          restaurantId,
          description: pendingDescription,
          visibility: pendingVisibility,
          linkedPostId: pendingLinkedPostId,
          taggedUserIds: pendingTaggedUserIds,
          media: uploadedMedia,
        });
        reportProgress(0.98);

        if (pendingUserId) {
          try {
            await clearPostDraft(pendingUserId, "content");
          } catch (error) {
            console.error("Could not clear published content draft", error);
          }
        }
        prependPostToFeedCache(queryClient, createdPost);
        void queryClient.invalidateQueries({ queryKey: ["restaurant-posts"] });
        return {
          type: "post",
          postId: createdPost.id,
          afterOpen: pendingLinkedPostId
            ? undefined
            : () => {
                Alert.alert(
                  t("addReviewPromptTitle"),
                  t("addReviewPromptBody"),
                  [
                    { text: t("maybeLater"), style: "cancel" },
                    {
                      text: t("writeFullReview"),
                      onPress: () =>
                        router.push({
                          pathname: "/create/review",
                          params: {
                            restaurantId,
                            linkedPostId: createdPost.id,
                          },
                        }),
                    },
                  ],
                );
              },
        };
      },
    });

    router.dismissTo("/(tabs)");
  }

  async function handleSaveDraft() {
    if (!user?.id || !media.length || savingDraft) return;
    try {
      setSavingDraft(true);
      await saveContentPostDraft(user.id, {
        step,
        imageUri: media[0].uri,
        media,
        description,
        visibility,
        linkedPostId,
        selectedRestaurant,
        taggedPeople,
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

  function changeVisibility(nextVisibility: PostVisibility) {
    if (nextVisibility === "PRIVATE" && taggedPeople.length > 0) {
      Alert.alert(t("privateTagPeopleTitle"), t("privateTagPeopleBody"), [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("makePrivate"),
          style: "destructive",
          onPress: () => {
            setVisibility(nextVisibility);
            setTaggedPeople([]);
          },
        },
      ]);
      return;
    }
    setVisibility(nextVisibility);
  }

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
                    disabled={!media.length}
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
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={t("choosePhotos")}
                    onPress={() => void openGallery()}
                    className="h-12 w-12 items-center justify-center rounded-2xl bg-black/50"
                  >
                    <ImagesSquareIcon size={24} color="white" weight="fill" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void openVideo()}
                    className="h-12 w-12 items-center justify-center rounded-2xl bg-black/50"
                  >
                    <FilmStripIcon size={24} color="white" weight="fill" />
                  </TouchableOpacity>
                </View>

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
                onPress={() => void openVideo()}
                className="w-full flex-row items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-4"
              >
                <FilmStripIcon size={21} color="#F7D786" weight="fill" />
                <Text className="ml-2 text-center text-base font-bold text-white">
                  {t("chooseShortVideo")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("choosePhotos")}
                onPress={() => void openGallery()}
                className="w-full flex-row items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-4"
              >
                <ImagesSquareIcon size={21} color="#F7D786" weight="fill" />
                <Text className="ml-2 text-center text-base font-bold text-white">
                  {t("choosePhotos")}
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

  if (step === "PEOPLE") {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ReviewParticipantsStep
          mode="tag"
          selected={taggedPeople}
          onChange={setTaggedPeople}
          onBack={() => setStep("DETAILS")}
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
          {media.length > 0 && (
            <View
              style={{
                width: "72%",
                aspectRatio: 4 / 5,
                alignSelf: "center",
              }}
              className="my-5 overflow-hidden rounded-3xl bg-black"
            >
              <FlatList
                horizontal
                pagingEnabled
                data={media}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) =>
                  setPreviewMediaIndex(
                    Math.round(
                      event.nativeEvent.contentOffset.x /
                        (screenWidth * 0.72),
                    ),
                  )
                }
                renderItem={({ item, index }) => (
                  <View
                    style={{
                      width: screenWidth * 0.72,
                      height: "100%",
                    }}
                  >
                    {item.type === "IMAGE" ? (
                      <ProgressiveImage
                        source={{ uri: item.uri }}
                        className="h-full w-full"
                        contentFit="contain"
                      />
                    ) : (
                      <ContentVideo
                        uri={item.uri}
                        style={{ width: "100%", height: "100%" }}
                      />
                    )}
                    {media.length > 1 ? (
                      <View className="absolute right-3 top-3 rounded-full bg-black/65 px-2.5 py-1">
                        <Text className="text-xs font-bold text-white">
                          {index + 1}/{media.length}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}
              />

              <TouchableOpacity
                onPress={removePreviewMedia}
                className="absolute left-4 top-4 h-9 w-9 items-center justify-center rounded-full bg-black/65"
              >
                <XIcon size={18} color="white" weight="bold" />
              </TouchableOpacity>

              {media[0].type === "IMAGE" && media.length < 10 ? (
                <TouchableOpacity
                  onPress={() => void openGallery({ append: true })}
                  className="absolute bottom-4 left-4 flex-row items-center rounded-full border border-white/25 px-3 py-2.5"
                  style={{ backgroundColor: "rgba(0, 0, 0, 0.62)" }}
                >
                  <PlusIcon size={17} color="white" weight="bold" />
                  <Text className="ml-1.5 text-sm font-bold text-white">
                    {t("addPhotos")}
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                onPress={() =>
                  void (media[0].type === "VIDEO"
                    ? openVideo()
                    : openGallery())
                }
                className="absolute bottom-4 right-4 flex-row items-center rounded-full border border-white/25 px-4 py-2.5"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.62)" }}
              >
                <ArrowCounterClockwiseIcon size={17} color="white" />
                <Text className="ml-2 text-sm font-bold text-white">
                  {t("changeMedia")}
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

            <TouchableOpacity
              onPress={() => setStep("PEOPLE")}
              className="mt-2 flex-row items-center border-b border-gray-100 py-4 dark:border-gray-800"
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-brand/15">
                <UsersThreeIcon size={23} color="#C89C25" weight="fill" />
              </View>
              <View className="ml-3 min-w-0 flex-1">
                <Text className="font-bold text-black dark:text-white">
                  {t("tagPeopleRowTitle")}
                </Text>
                <Text numberOfLines={1} className="mt-1 text-sm text-gray-500">
                  {taggedPeople.length > 0
                    ? t("tagPeopleInPost", { count: taggedPeople.length })
                    : t("tagPeopleRowHint")}
                </Text>
              </View>
              {taggedPeople.slice(0, 3).map((person, index) => (
                <View
                  key={person.id}
                  style={{ marginLeft: index === 0 ? 0 : -10 }}
                >
                  <Avatar
                    uri={person.avatarUrl}
                    username={person.username}
                    size={32}
                  />
                </View>
              ))}
              <View className="ml-2">
                <DirectionalIcon
                  direction="forward"
                  size={20}
                  color="#9CA3AF"
                  weight="bold"
                />
              </View>
            </TouchableOpacity>

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
              onChange={changeVisibility}
            />
          </View>
        </KeyboardAwareFormScrollView>
      </SafeAreaView>
    </View>
  );
}
