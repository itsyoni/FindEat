import FullPageRestaurantPicker from "@/components/restaurants/FullPageRestaurantPicker";
import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import { snapsQueryKey } from "@/hooks/useSnaps";
import { api } from "@/lib/api";
import { AppAlert as Alert } from "@/lib/appAlert";
import { uploadImage, uploadVideo } from "@/lib/uploadImage";
import { getVideoDurationMs } from "@/lib/videoDuration";
import { cropPostImage } from "@/lib/cropPostImage";
import {
  MediaLibraryPermissionError,
  saveImageToGallery,
} from "@/lib/saveImageToGallery";
import ContentVideo from "@/components/posts/content/ContentVideo";
import SoundPickerModal from "@/components/sounds/SoundPickerModal";
import SoundPlayback from "@/components/sounds/SoundPlayback";
import ReviewParticipantsStep from "@/components/review-creator/steps/ReviewParticipantsStep";
import AnimatedGallerySaveIcon from "@/components/common/AnimatedGallerySaveIcon";
import { useGallerySaveFeedback } from "@/hooks/useGallerySaveFeedback";
import type { PhotoFilterId } from "@/lib/photoFilters";
import {
  SNAP_TEXT_COLORS,
  SNAP_TEXT_FONTS,
  snapTextFontFamily,
  snapTextStyle,
} from "@/lib/snapTextStyle";
import type {
  SelectedRestaurant,
  SnapGroup,
  SnapTextOverlay,
  SoundSelection,
  ReviewInviteeDraft,
} from "@findeat/types";
import { useQueryClient } from "@tanstack/react-query";
import { usePostUpload } from "@/contexts/PostUploadContext";
import { Image } from "expo-image";
import {
  CameraView,
  type CameraType,
  type FlashMode,
  useCameraPermissions,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { router, Stack } from "expo-router";
import {
  ArrowsClockwiseIcon,
  AtIcon,
  CaretDownIcon,
  CameraIcon,
  CropIcon,
  FadersHorizontalIcon,
  FlipHorizontalIcon,
  ImagesIcon,
  LightningIcon,
  LightningSlashIcon,
  MapPinPlusIcon,
  PaperPlaneTiltIcon,
  TextAaIcon,
  XIcon,
  LockIcon,
  MusicNoteIcon,
} from "phosphor-react-native";
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SNAP_TEXT_MIN_WIDTH = 112;
const SNAP_TEXT_MAX_WIDTH_RATIO = 0.8;

function snapTextOverlayWidth(
  text: string,
  canvasWidth: number,
  fontSize = 32,
) {
  return Math.max(
    SNAP_TEXT_MIN_WIDTH,
    Math.min(
      canvasWidth * SNAP_TEXT_MAX_WIDTH_RATIO,
      text.length * fontSize * 0.55 + 44,
    ),
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export default function CreateSnapScreen() {
  const { t } = useTranslation(["snaps", "common"]);
  const { t: tSound } = useTranslation("sound");
  const queryClient = useQueryClient();
  const { startPostUpload } = usePostUpload();
  const cameraRef = useRef<CameraView>(null);
  const captionInputRef = useRef<TextInput>(null);
  const overlayTextInputRef = useRef<TextInput>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageFilterSourceUri, setImageFilterSourceUri] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [photoFilter, setPhotoFilter] = useState<PhotoFilterId>("ORIGINAL");
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);
  const [FilterPicker, setFilterPicker] = useState<ComponentType<{
    visible: boolean;
    imageUri: string;
    value?: PhotoFilterId;
    onClose: () => void;
    onApply: (filterId: PhotoFilterId) => Promise<void>;
  }> | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDurationMs, setVideoDurationMs] = useState<number | null>(null);
  const [cameraFacing, setCameraFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<FlashMode>("off");
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [caption, setCaption] = useState("");
  const [textOverlay, setTextOverlay] = useState<SnapTextOverlay | null>(null);
  const textOverlayRef = useRef<SnapTextOverlay | null>(null);
  const [editingOverlayText, setEditingOverlayText] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });
  const canvasSizeRef = useRef({ width: 1, height: 1 });
  const overlayDragStartRef = useRef({ x: 0, y: 0 });
  const overlaySizeStartRef = useRef(32);
  const [overlayGesture, setOverlayGesture] = useState<ReturnType<
    typeof Gesture.Simultaneous
  > | null>(null);
  const [soundSelection, setSoundSelection] = useState<SoundSelection | null>(null);
  const [soundPickerOpen, setSoundPickerOpen] = useState(false);
  const [restaurant, setRestaurant] = useState<SelectedRestaurant | null>(null);
  const [choosingRestaurant, setChoosingRestaurant] = useState(false);
  const [mentionPeople, setMentionPeople] = useState<ReviewInviteeDraft[]>([]);
  const [choosingMention, setChoosingMention] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(true);
  const {
    status: gallerySaveStatus,
    isSaving: savingToGallery,
    begin: beginGallerySave,
    succeed: completeGallerySave,
    fail: failGallerySave,
  } = useGallerySaveFeedback();
  const publishStartedRef = useRef(false);

  function updateTextOverlay(next: SnapTextOverlay | null) {
    textOverlayRef.current = next;
    setTextOverlay(next);
  }

  function editTextOverlay() {
    if (!textOverlayRef.current) {
      updateTextOverlay({
        text: "",
        x: 0.28,
        y: 0.35,
        font: "MODERN",
        fontSize: 32,
        color: "#FAF9F6",
        bold: false,
        italic: false,
      });
    }
    setEditingOverlayText(true);
    requestAnimationFrame(() => overlayTextInputRef.current?.focus());
  }

  function patchTextOverlay(patch: Partial<SnapTextOverlay>) {
    const current = textOverlayRef.current;
    if (!current) return;
    const next = { ...current, ...patch };
    const width = snapTextOverlayWidth(
      next.text,
      canvasSizeRef.current.width,
      next.fontSize,
    );
    next.x = clamp(
      next.x,
      0,
      Math.max(0, 1 - width / canvasSizeRef.current.width),
    );
    updateTextOverlay(next);
  }

  function finishTextOverlayEditing() {
    const current = textOverlayRef.current;
    if (!current?.text.trim()) {
      updateTextOverlay(null);
    } else {
      updateTextOverlay({ ...current, text: current.text.trim() });
    }
    overlayTextInputRef.current?.blur();
    Keyboard.dismiss();
    setEditingOverlayText(false);
  }

  function applyMention() {
    const mention = mentionPeople[0];
    if (!mention) {
      setChoosingMention(false);
      return;
    }
    const mentionText = `@${mention.username.replace(/^@/, "")}`;
    const current = textOverlayRef.current;
    if (current) {
      patchTextOverlay({
        text: current.text.trim()
          ? `${current.text.trim()}\n${mentionText}`
          : mentionText,
      });
    } else {
      updateTextOverlay({
        text: mentionText,
        x: 0.28,
        y: 0.35,
        font: "MODERN",
        fontSize: 32,
        color: "#FAF9F6",
        bold: true,
        italic: false,
      });
    }
    setChoosingMention(false);
    setEditingOverlayText(true);
    requestAnimationFrame(() => overlayTextInputRef.current?.focus());
  }

  function cycleTextColor() {
    const current = textOverlayRef.current;
    if (!current) return;
    const index = SNAP_TEXT_COLORS.indexOf(
      current.color as (typeof SNAP_TEXT_COLORS)[number],
    );
    patchTextOverlay({
      color: SNAP_TEXT_COLORS[(index + 1) % SNAP_TEXT_COLORS.length],
    });
  }

  useEffect(() => {
    const pan = Gesture.Pan()
      .minDistance(3)
      .runOnJS(true)
      .onBegin(() => {
        const current = textOverlayRef.current;
        if (!current) return;
        overlayDragStartRef.current = { x: current.x, y: current.y };
        Keyboard.dismiss();
      })
      .onUpdate((gesture) => {
        const current = textOverlayRef.current;
        const size = canvasSizeRef.current;
        if (!current || size.width <= 1 || size.height <= 1) return;
        const width = snapTextOverlayWidth(
          current.text,
          size.width,
          current.fontSize,
        );
        const next = {
          ...current,
          x: clamp(
            overlayDragStartRef.current.x + gesture.translationX / size.width,
            0,
            Math.max(0, 1 - width / size.width),
          ),
          y: clamp(
            overlayDragStartRef.current.y + gesture.translationY / size.height,
            0.12,
            0.82,
          ),
        };
        textOverlayRef.current = next;
        setTextOverlay(next);
      });
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onBegin(() => {
        overlaySizeStartRef.current =
          textOverlayRef.current?.fontSize ?? overlaySizeStartRef.current;
        Keyboard.dismiss();
      })
      .onUpdate((gesture) => {
        const current = textOverlayRef.current;
        if (!current) return;
        const next = {
          ...current,
          fontSize: clamp(
            Math.round(overlaySizeStartRef.current * gesture.scale),
            18,
            56,
          ),
        };
        const width = snapTextOverlayWidth(
          next.text,
          canvasSizeRef.current.width,
          next.fontSize,
        );
        next.x = clamp(
          next.x,
          0,
          Math.max(0, 1 - width / canvasSizeRef.current.width),
        );
        textOverlayRef.current = next;
        setTextOverlay(next);
      });
    setOverlayGesture(Gesture.Simultaneous(pan, pinch));
  }, []);

  async function saveSnapPhotoToGallery() {
    if (!imageUri || savingToGallery) return;
    beginGallerySave();
    try {
      await saveImageToGallery(imageUri);
      completeGallerySave();
    } catch (error) {
      failGallerySave();
      Alert.alert(
        t(
          error instanceof MediaLibraryPermissionError
            ? "common:saveToGalleryPermission"
            : "common:saveToGalleryFailed",
        ),
      );
    }
  }

  async function applySnapPhotoFilter(filterId: PhotoFilterId) {
    const sourceUri = imageFilterSourceUri ?? imageUri;
    if (!sourceUri) return;
    try {
      const { applyPhotoFilter } = await import("@/lib/photoFilters");
      const filtered = await applyPhotoFilter(sourceUri, filterId);
      setImageFilterSourceUri(sourceUri);
      setImageUri(filtered.uri);
      if (filtered.width && filtered.height) {
        setImageSize({ width: filtered.width, height: filtered.height });
      }
      setPhotoFilter(filterId);
    } catch (error) {
      console.error("snap filter failed", error);
      Alert.alert(t("common:error"), t("common:photoFilterFailed"));
      throw error;
    }
  }

  async function cropSnapPhoto() {
    if (!imageUri || editingPhoto) return;
    setEditingPhoto(true);
    try {
      const cropped = await cropPostImage({
        uri: imageUri,
        width: imageSize?.width ?? 1080,
        height: imageSize?.height ?? 1920,
        aspect: "SNAP",
        toolbarTitle: t("snaps:cropPhoto"),
      });
      if (!cropped) return;
      setImageUri(cropped.uri);
      setImageFilterSourceUri(cropped.uri);
      setImageSize({ width: cropped.width, height: cropped.height });
      setPhotoFilter("ORIGINAL");
    } catch (error) {
      console.error("snap crop failed", error);
      Alert.alert(t("common:error"), t("snaps:editPhotoError"));
    } finally {
      setEditingPhoto(false);
    }
  }

  async function transformSnapPhoto(
    operation: "rotate" | "flip",
  ) {
    if (!imageUri || editingPhoto) return;
    setEditingPhoto(true);
    try {
      const context = ImageManipulator.manipulate(imageUri);
      if (operation === "rotate") context.rotate(90);
      else context.flip("horizontal");
      const rendered = await context.renderAsync();
      const transformed = await rendered.saveAsync({
        compress: 0.92,
        format: SaveFormat.JPEG,
      });
      setImageUri(transformed.uri);
      setImageFilterSourceUri(transformed.uri);
      setImageSize({
        width: transformed.width,
        height: transformed.height,
      });
      setPhotoFilter("ORIGINAL");
    } catch (error) {
      console.error(`snap ${operation} failed`, error);
      Alert.alert(t("common:error"), t("snaps:editPhotoError"));
    } finally {
      setEditingPhoto(false);
    }
  }

  async function openSnapFilters() {
    try {
      const module = await import("@/components/create/PhotoFilterPickerModal");
      setFilterPicker(() => module.default);
      setFilterPickerOpen(true);
    } catch (error) {
      console.warn("Photo filters are unavailable in this native build", error);
      Alert.alert(
        t("common:photoFiltersUnavailableTitle"),
        t("common:photoFiltersUnavailableBody"),
      );
    }
  }

  useEffect(() => {
    if (
      cameraPermission &&
      !cameraPermission.granted &&
      cameraPermission.canAskAgain
    ) {
      void requestCameraPermission();
    }
  }, [cameraPermission, requestCameraPermission]);

  async function takePhoto() {
    if (!cameraRef.current || !cameraReady || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        mirror: false,
      });
      if (photo?.uri) {
        if (cameraFacing === "front") {
          const context = ImageManipulator.manipulate(photo.uri);
          context.flip("horizontal");
          const rendered = await context.renderAsync();
          const corrected = await rendered.saveAsync({
            compress: 0.9,
            format: SaveFormat.JPEG,
          });
          setImageUri(corrected.uri);
          setImageFilterSourceUri(corrected.uri);
          setImageSize({ width: corrected.width, height: corrected.height });
        } else {
          setImageUri(photo.uri);
          setImageFilterSourceUri(photo.uri);
          setImageSize({ width: photo.width, height: photo.height });
        }
        setPhotoFilter("ORIGINAL");
        updateTextOverlay(null);
      }
    } catch {
      Alert.alert(t("common:error"), t("snaps:captureError"));
    } finally {
      setCapturing(false);
    }
  }

  async function chooseMedia() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t("snaps:photosPermissionTitle"),
        t("snaps:photosPermissionBody"),
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.9,
      allowsEditing: true,
      videoMaxDuration: 10,
      videoExportPreset: ImagePicker.VideoExportPreset.HighestQuality,
      selectionLimit: 1,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      const asset = result.assets[0];
      if (asset.type === "video") {
        const duration = await getVideoDurationMs(asset.uri);
        if (duration > 10_250) {
          Alert.alert(
            t("snaps:videoTooLongTitle"),
            t("snaps:videoTooLongBody"),
          );
          return;
        }
        setImageUri(null);
        setImageFilterSourceUri(null);
        setImageSize(null);
        setPhotoFilter("ORIGINAL");
        updateTextOverlay(null);
        setVideoUri(asset.uri);
        setVideoDurationMs(Math.min(10_000, duration));
      } else {
        setVideoUri(null);
        setVideoDurationMs(null);
        setImageUri(asset.uri);
        setImageFilterSourceUri(asset.uri);
        setImageSize({ width: asset.width, height: asset.height });
        setPhotoFilter("ORIGINAL");
        updateTextOverlay(null);
      }
    }
  }

  function publish() {
    if ((!imageUri && !videoUri) || publishing || publishStartedRef.current)
      return;

    setPublishing(true);
    publishStartedRef.current = true;
    const pendingImageUri = imageUri;
    const pendingVideoUri = videoUri;
    const pendingVideoDurationMs = videoDurationMs;
    const pendingCaption = caption.trim() || undefined;
    const pendingTextOverlay = textOverlay?.text.trim()
      ? { ...textOverlay, text: textOverlay.text.trim() }
      : undefined;
    const pendingSoundSelection = soundSelection;
    const pendingRestaurant = restaurant;
    const clientRequestId = `snap-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 12)}`;
    let uploadedImageUrl: string | null = null;
    let uploadedVideoUrl: string | null = null;
    let resolvedRestaurantId: string | undefined;
    let restaurantResolved = false;

    startPostUpload({
      kind: "snap",
      run: async (reportProgress) => {
        reportProgress(0.04);
        if (pendingVideoUri && !uploadedVideoUrl) {
          uploadedVideoUrl = await uploadVideo(
            pendingVideoUri,
            (progress) => reportProgress(0.08 + progress * 0.78),
            "snap",
          );
        } else if (pendingImageUri && !uploadedImageUrl) {
          uploadedImageUrl = await uploadImage(
            pendingImageUri,
            "snap",
            (progress) => reportProgress(0.08 + progress * 0.78),
          );
        } else {
          reportProgress(0.86);
        }
        reportProgress(0.88);
        if (!restaurantResolved) {
          resolvedRestaurantId =
            pendingRestaurant?.source === "FINDEAT"
              ? pendingRestaurant.restaurant.id
              : pendingRestaurant?.source === "GOOGLE"
                ? (
                    await api.restaurants.fromGoogle({
                      name: pendingRestaurant.name,
                      address: pendingRestaurant.address,
                      latitude: pendingRestaurant.latitude,
                      longitude: pendingRestaurant.longitude,
                      googlePlaceId: pendingRestaurant.googlePlaceId,
                    })
                  ).id
                : undefined;
          restaurantResolved = true;
        }

        reportProgress(0.94);
        const shared = {
          clientRequestId,
          caption: pendingCaption,
          textOverlay: pendingTextOverlay,
          restaurantId: resolvedRestaurantId,
          soundId: pendingSoundSelection?.sound.id,
          soundStartTimeMs: pendingSoundSelection?.soundStartTimeMs,
          soundVolume: pendingSoundSelection?.soundVolume,
          originalAudioVolume: pendingSoundSelection?.originalAudioVolume,
        };
        const createdSnap = await api.snaps.create(
          uploadedVideoUrl && pendingVideoDurationMs
            ? {
                ...shared,
                videoUrl: uploadedVideoUrl,
                durationMs: pendingVideoDurationMs,
              }
            : { ...shared, imageUrl: uploadedImageUrl! },
        );
        queryClient.setQueryData<SnapGroup[]>(snapsQueryKey, (current) => {
          if (!current) {
            return [
              {
                user: createdSnap.user,
                snaps: [createdSnap],
                isOwn: true,
                hasUnseen: false,
              },
            ];
          }
          const ownGroup = current.find(
            (group) => group.isOwn || group.user.id === createdSnap.user.id,
          );
          if (!ownGroup) {
            return [
              {
                user: createdSnap.user,
                snaps: [createdSnap],
                isOwn: true,
                hasUnseen: false,
              },
              ...current,
            ];
          }
          return current.map((group) =>
            group === ownGroup
              ? group.snaps.some((snap) => snap.id === createdSnap.id)
                ? group
                : { ...group, snaps: [...group.snaps, createdSnap] }
              : group,
          );
        });
        return {
          type: "snap",
          userId: createdSnap.user.id,
          snap: createdSnap,
        };
      },
    });
    router.dismissTo("/(tabs)");
  }

  if (choosingRestaurant) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <FullPageRestaurantPicker
          selectedRestaurant={restaurant}
          onSelect={(selected) => {
            setRestaurant(selected);
            setChoosingRestaurant(false);
          }}
          onBack={() => setChoosingRestaurant(false)}
        />
      </>
    );
  }

  if (choosingMention) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ReviewParticipantsStep
          mode="tag"
          selected={mentionPeople}
          onChange={(people) => setMentionPeople(people.slice(-1))}
          onBack={() => setChoosingMention(false)}
          onDone={applyMention}
        />
      </>
    );
  }

  const restaurantName =
    restaurant?.source === "FINDEAT"
      ? restaurant.restaurant.name
      : restaurant?.name;
  const restaurantLogoUrl =
    restaurant?.source === "FINDEAT" ? restaurant.restaurant.logoUrl : null;
  const textOverlayWidth = textOverlay
    ? snapTextOverlayWidth(
        textOverlay.text,
        canvasSize.width,
        textOverlay.fontSize,
      )
    : 0;
  return (
    <View
      style={styles.screen}
      onLayout={({ nativeEvent }) => {
        const nextSize = {
          width: nativeEvent.layout.width,
          height: nativeEvent.layout.height,
        };
        canvasSizeRef.current = nextSize;
        setCanvasSize(nextSize);
      }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      {imageUri || videoUri ? (
        <>
          {videoUri ? (
            <ContentVideo
              uri={videoUri}
              autoPlay
              loop
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              volume={soundSelection?.originalAudioVolume ?? 1}
            />
          ) : (
            <Image
              source={{ uri: imageUri! }}
              contentFit="cover"
              style={StyleSheet.absoluteFill}
            />
          )}
          <SoundPlayback
            sound={soundSelection?.sound}
            startTimeMs={soundSelection?.soundStartTimeMs}
            volume={soundSelection?.soundVolume}
            playing={!soundPickerOpen}
          />
          <View style={[StyleSheet.absoluteFill, styles.previewScrim]} />
          {textOverlay && overlayGesture ? (
            <GestureDetector gesture={overlayGesture}>
              <View
                collapsable={false}
                style={[
                  styles.textOverlay,
                  {
                    left: textOverlay.x * canvasSize.width,
                    top: textOverlay.y * canvasSize.height,
                    width: textOverlayWidth,
                  },
                ]}
              >
                <TextInput
                  ref={overlayTextInputRef}
                  value={textOverlay.text}
                  onChangeText={(text) => patchTextOverlay({ text })}
                  onFocus={() => setEditingOverlayText(true)}
                  onBlur={() => {
                    const current = textOverlayRef.current;
                    if (current?.text.trim()) {
                      updateTextOverlay({
                        ...current,
                        text: current.text.trim(),
                      });
                    }
                  }}
                  placeholder={t("snaps:textPlaceholder")}
                  placeholderTextColor="rgba(250,249,246,0.75)"
                  maxLength={120}
                  multiline
                  selectTextOnFocus={false}
                  style={[
                    styles.textOverlayInput,
                    snapTextStyle(textOverlay),
                    editingOverlayText && styles.textOverlayInputEditing,
                  ]}
                />
              </View>
            </GestureDetector>
          ) : null}
          {!editingOverlayText ? (
            <SafeAreaView edges={["top"]} style={styles.previewHeader}>
            <TouchableOpacity
              onPress={() => {
                setImageUri(null);
                setImageFilterSourceUri(null);
                setImageSize(null);
                setPhotoFilter("ORIGINAL");
                updateTextOverlay(null);
                setVideoUri(null);
                setVideoDurationMs(null);
              }}
              className="min-h-11 w-20 items-start justify-center"
            >
              <Text className="text-base font-bold text-[#FAF9F6]">
                {t("common:cancel")}
              </Text>
            </TouchableOpacity>
            <View className="flex-1 items-center">
              <Text className="text-lg font-bold text-[#FAF9F6]">
                {t("snaps:newSnap")}
              </Text>
              <Text className="mt-0.5 text-xs font-semibold text-white/70">
                {t("snaps:preview")}
              </Text>
            </View>
            <View className="w-20" />
            </SafeAreaView>
          ) : (
            <SafeAreaView edges={["top"]} style={styles.textEditingHeader}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("common:done")}
                onPress={finishTextOverlayEditing}
                className="min-h-11 min-w-16 items-end justify-center"
              >
                <Text
                  className="text-lg font-bold text-[#F7D786]"
                  style={styles.toolShadow}
                >
                  {t("common:done")}
                </Text>
              </TouchableOpacity>
            </SafeAreaView>
          )}

          <SafeAreaView
            edges={["top"]}
            style={[
              styles.previewToolRail,
              editingOverlayText && styles.textEditingToolRail,
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.previewToolRailContent}
            >
              {editingOverlayText && textOverlay ? (
                <>
                  {SNAP_TEXT_FONTS.map((font) => {
                    const selected = textOverlay.font === font.id;
                    const fontFamily = snapTextFontFamily(
                      font.id,
                      textOverlay.bold,
                      textOverlay.italic,
                    );
                    return (
                      <SnapEditorTool
                        key={font.id}
                        label={t(font.labelKey)}
                        labelFontFamily={fontFamily}
                        onPress={() => patchTextOverlay({ font: font.id })}
                        icon={
                          <NativeText
                            style={{
                              color: selected ? "#F7D786" : "#FAF9F6",
                              fontFamily,
                              fontSize: 26,
                              textShadowColor: "#0B0B0A",
                              textShadowOffset: { width: 0, height: 2 },
                              textShadowRadius: 5,
                            }}
                          >
                            Aa
                          </NativeText>
                        }
                      />
                    );
                  })}
                  <SnapEditorTool
                    label={t("snaps:textColor")}
                    onPress={cycleTextColor}
                    icon={
                      <View
                        style={{
                          width: 25,
                          height: 25,
                          borderRadius: 13,
                          borderWidth: 2,
                          borderColor: "#FAF9F6",
                          backgroundColor: textOverlay.color,
                        }}
                      />
                    }
                  />
                  <SnapEditorTool
                    label={t("snaps:textBold")}
                    onPress={() => patchTextOverlay({ bold: !textOverlay.bold })}
                    icon={
                      <NativeText
                        style={{
                          color: textOverlay.bold ? "#F7D786" : "#FAF9F6",
                          fontFamily: snapTextFontFamily(
                            textOverlay.font,
                            true,
                            textOverlay.italic,
                          ),
                          fontSize: 25,
                        }}
                      >
                        B
                      </NativeText>
                    }
                  />
                  <SnapEditorTool
                    label={t("snaps:textItalic")}
                    onPress={() =>
                      patchTextOverlay({ italic: !textOverlay.italic })
                    }
                    icon={
                      <NativeText
                        style={{
                          color: textOverlay.italic ? "#F7D786" : "#FAF9F6",
                          fontFamily: snapTextFontFamily(
                            textOverlay.font,
                            textOverlay.bold,
                            true,
                          ),
                          fontSize: 25,
                          fontStyle:
                            textOverlay.font === "HANDWRITTEN"
                              ? "italic"
                              : "normal",
                        }}
                      >
                        I
                      </NativeText>
                    }
                  />
                </>
              ) : toolsExpanded ? (
                <>
                  <SnapEditorTool
                    label={t("snaps:textTool")}
                    onPress={editTextOverlay}
                    icon={
                      <TextAaIcon
                        size={25}
                        color="#FAF9F6"
                        weight="bold"
                      />
                    }
                  />
                  <SnapEditorTool
                    label={t("snaps:mention")}
                    onPress={() => setChoosingMention(true)}
                    icon={
                      <AtIcon size={25} color="#FAF9F6" weight="bold" />
                    }
                  />
                  <SnapEditorTool
                    label={tSound("sound")}
                    onPress={() => setSoundPickerOpen(true)}
                    icon={
                      <MusicNoteIcon
                        size={25}
                        color={soundSelection ? "#F7D786" : "#FAF9F6"}
                        weight={soundSelection ? "fill" : "bold"}
                      />
                    }
                  />
                  <SnapEditorTool
                    label={restaurantName ?? t("snaps:tagRestaurant")}
                    onPress={() => setChoosingRestaurant(true)}
                    icon={
                      restaurant ? (
                        <Avatar
                          uri={restaurantLogoUrl}
                          username={restaurantName}
                          fallbackType="restaurant"
                          showSnapIndicator={false}
                          size={27}
                        />
                      ) : (
                        <MapPinPlusIcon
                          size={25}
                          color="#FAF9F6"
                          weight="bold"
                        />
                      )
                    }
                  />
                  {imageUri ? (
                    <>
                      <SnapEditorTool
                        label={t("snaps:effects")}
                        disabled={editingPhoto}
                        onPress={() => void openSnapFilters()}
                        icon={
                          <FadersHorizontalIcon
                            size={25}
                            color={photoFilter === "ORIGINAL" ? "#FAF9F6" : "#F7D786"}
                            weight="bold"
                          />
                        }
                      />
                      <SnapEditorTool
                        label={t("snaps:crop")}
                        disabled={editingPhoto}
                        onPress={() => void cropSnapPhoto()}
                        icon={<CropIcon size={25} color="#FAF9F6" weight="bold" />}
                      />
                      <SnapEditorTool
                        label={t("snaps:rotate")}
                        disabled={editingPhoto}
                        onPress={() => void transformSnapPhoto("rotate")}
                        icon={<ArrowsClockwiseIcon size={25} color="#FAF9F6" weight="bold" />}
                      />
                      <SnapEditorTool
                        label={t("snaps:flip")}
                        disabled={editingPhoto}
                        onPress={() => void transformSnapPhoto("flip")}
                        icon={<FlipHorizontalIcon size={25} color="#FAF9F6" weight="bold" />}
                      />
                      <SnapEditorTool
                        label={t("common:save")}
                        disabled={savingToGallery || editingPhoto}
                        onPress={() => void saveSnapPhotoToGallery()}
                        icon={
                          <AnimatedGallerySaveIcon
                            status={gallerySaveStatus}
                            size={25}
                          />
                        }
                      />
                    </>
                  ) : null}
                </>
              ) : null}
              {!editingOverlayText ? (
                <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t(
                  toolsExpanded
                    ? "snaps:collapseTools"
                    : "snaps:expandTools",
                )}
                onPress={() => setToolsExpanded((current) => !current)}
                className="mt-1 h-11 w-11 items-center justify-center"
                style={styles.toolShadow}
              >
                <CaretDownIcon
                  size={23}
                  color="#FAF9F6"
                  weight="bold"
                  style={{
                    transform: [{ rotate: toolsExpanded ? "0deg" : "180deg" }],
                  }}
                />
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          </SafeAreaView>

          {!editingOverlayText ? (
            <KeyboardAvoidingView
            behavior="padding"
            automaticOffset
            style={styles.previewKeyboardArea}
          >
            <SafeAreaView edges={["bottom"]} style={styles.previewComposer}>
              <View className="flex-row items-end gap-3">
                <TextInput
                  ref={captionInputRef}
                  value={caption}
                  onChangeText={setCaption}
                  placeholder={t("snaps:captionPlaceholder")}
                  placeholderTextColor="#D1D5DB"
                  maxLength={280}
                  multiline={false}
                  returnKeyType="done"
                  style={{
                    height: 56,
                    flex: 1,
                    borderRadius: 28,
                    backgroundColor: "rgba(20,20,19,0.66)",
                    paddingHorizontal: 16,
                    paddingVertical: 0,
                    color: "#FAF9F6",
                    fontSize: 16,
                    fontFamily: "CabinetRegular",
                    includeFontPadding: false,
                    textAlign: "auto",
                  }}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t("snaps:share")}
                  disabled={publishing}
                  onPress={() => void publish()}
                  className="h-14 w-14 items-center justify-center rounded-full bg-[#F7D786]"
                  style={{ opacity: publishing ? 0.65 : 1 }}
                >
                  {publishing ? (
                    <ActivityIndicator color="#171717" />
                  ) : (
                    <PaperPlaneTiltIcon
                      size={25}
                      color="#171717"
                      weight="fill"
                    />
                  )}
                </TouchableOpacity>
              </View>
            </SafeAreaView>
            </KeyboardAvoidingView>
          ) : null}
          {editingPhoto ? (
            <View
              pointerEvents="auto"
              className="absolute inset-0 z-50 items-center justify-center bg-black/30"
            >
              <View className="h-14 w-14 items-center justify-center rounded-full bg-[#171717CC]">
                <ActivityIndicator color="#F7D786" />
              </View>
            </View>
          ) : null}
        </>
      ) : !cameraPermission ? (
        <ActivityIndicator
          style={styles.cameraLoader}
          color="#FAF9F6"
          size="large"
        />
      ) : !cameraPermission.granted ? (
        <SafeAreaView style={styles.permissionState}>
          <View className="px-5 pt-2">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("common:cancel")}
              onPress={() => router.back()}
              className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
            >
              <XIcon size={23} color="#FAF9F6" weight="bold" />
            </TouchableOpacity>
          </View>
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.permissionContent}
          >
            <View className="h-20 w-20 items-center justify-center rounded-3xl bg-[#F7D786]">
              <CameraIcon size={38} color="#171717" weight="fill" />
            </View>
            <Text className="mt-6 text-center text-[26px] font-bold leading-8 text-[#FAF9F6]">
              {t("snaps:cameraPermissionTitle")}
            </Text>
            <Text className="mt-3 max-w-sm text-center text-base leading-6 text-gray-400">
              {t("snaps:cameraPermissionBody")}
            </Text>
            <View className="mt-6 max-w-sm flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-white/10">
                <LockIcon size={16} color="#D1D5DB" weight="fill" />
              </View>
              <Text className="ml-3 flex-1 text-sm leading-5 text-gray-300">
                {t("snaps:cameraPrivacy")}
              </Text>
            </View>
          </ScrollView>
          <View className="px-5 pb-3 pt-2">
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() =>
                void (cameraPermission.canAskAgain
                  ? requestCameraPermission()
                  : Linking.openSettings())
              }
              className="rounded-2xl bg-[#F7D786] py-4"
            >
              <Text className="text-center text-base font-bold text-[#171717]">
                {t(
                  cameraPermission.canAskAgain
                    ? "snaps:allowCamera"
                    : "snaps:openSettings",
                )}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void chooseMedia()}
              className="mt-3 flex-row items-center justify-center rounded-2xl border border-white/15 py-4"
            >
              <ImagesIcon size={21} color="#F7D786" weight="fill" />
              <Text className="ml-2 text-base font-bold text-[#FAF9F6]">
                {t("snaps:choosePhoto")}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      ) : (
        <View style={styles.cameraStage}>
          <CameraView
            ref={cameraRef}
            active={!imageUri && !videoUri}
            facing={cameraFacing}
            mirror={false}
            flash={flash}
            mode="picture"
            onCameraReady={() => setCameraReady(true)}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={["top", "bottom"]} style={styles.cameraControls}>
            <View className="flex-row items-center justify-between px-5">
              <TouchableOpacity
                accessibilityLabel={t("common:close")}
                onPress={() => router.back()}
                className="h-11 w-11 items-center justify-center"
              >
                <XIcon size={29} color="#FAF9F6" weight="bold" />
              </TouchableOpacity>
              <Text className="text-lg font-bold text-white">
                {t("snaps:newSnap")}
              </Text>
              <TouchableOpacity
                accessibilityLabel={t("snaps:toggleFlash")}
                onPress={() =>
                  setFlash((current) => (current === "off" ? "on" : "off"))
                }
                className="h-11 w-11 items-center justify-center"
              >
                {flash === "off" ? (
                  <LightningSlashIcon size={26} color="#FAF9F6" weight="bold" />
                ) : (
                  <LightningIcon size={26} color="#FAF9F6" weight="fill" />
                )}
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center justify-between px-8 pb-5">
              <TouchableOpacity
                accessibilityLabel={t("snaps:choosePhoto")}
                onPress={() => void chooseMedia()}
                className="h-12 w-12 items-center justify-center"
              >
                <ImagesIcon size={30} color="#FAF9F6" weight="fill" />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel={t("snaps:takePhoto")}
                disabled={!cameraReady || capturing}
                onPress={() => void takePhoto()}
                className="h-20 w-20 items-center justify-center rounded-full border-4 border-white"
                style={{ opacity: cameraReady && !capturing ? 1 : 0.55 }}
              >
                <View className="h-16 w-16 rounded-full bg-white" />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel={t("snaps:flipCamera")}
                onPress={() =>
                  setCameraFacing((current) =>
                    current === "back" ? "front" : "back",
                  )
                }
                className="h-12 w-12 items-center justify-center"
              >
                <ArrowsClockwiseIcon size={30} color="#FAF9F6" weight="bold" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      )}
      <SoundPickerModal
        visible={soundPickerOpen}
        value={soundSelection}
        hasOriginalAudio={Boolean(videoUri)}
        onClose={() => setSoundPickerOpen(false)}
        onChange={setSoundSelection}
        surface="snap"
      />
      {imageUri && FilterPicker && filterPickerOpen ? (
        <FilterPicker
          visible={filterPickerOpen}
          imageUri={imageFilterSourceUri ?? imageUri}
          value={photoFilter}
          onClose={() => setFilterPickerOpen(false)}
          onApply={applySnapPhotoFilter}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0B0B0A",
  },
  previewScrim: {
    backgroundColor: "rgba(11, 11, 10, 0.12)",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 14,
    zIndex: 30,
  },
  textEditingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    alignItems: "flex-end",
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  textOverlay: {
    position: "absolute",
    zIndex: 18,
  },
  textOverlayInput: {
    minHeight: 50,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: "#FAF9F6",
    fontFamily: "CabinetBold",
    fontSize: 28,
    lineHeight: 34,
    textAlign: "center",
    textShadowColor: "rgba(11,11,10,0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  textOverlayInputEditing: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(250,249,246,0.82)",
    backgroundColor: "transparent",
  },
  previewToolRail: {
    position: "absolute",
    right: 8,
    top: 42,
    bottom: 154,
    zIndex: 20,
  },
  textEditingToolRail: {
    bottom: 16,
  },
  previewToolRailContent: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
    gap: 5,
  },
  toolShadow: {
    shadowColor: "#0B0B0A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 5,
    elevation: 7,
  },
  previewKeyboardArea: {
    flex: 1,
    justifyContent: "flex-end",
  },
  previewComposer: {
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  cameraLoader: {
    flex: 1,
  },
  cameraStage: {
    flex: 1,
    overflow: "hidden",
  },
  cameraControls: {
    flex: 1,
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  permissionState: {
    flex: 1,
    backgroundColor: "#0B0B0A",
  },
  permissionContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
});

function SnapEditorTool({
  label,
  labelFontFamily,
  icon,
  disabled = false,
  onPress,
}: {
  label: string;
  labelFontFamily?: string;
  icon: ReactNode;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      className="w-36 flex-row items-center justify-end py-1.5"
      style={{ opacity: disabled ? 0.55 : 1 }}
    >
      {labelFontFamily ? (
        <NativeText
          numberOfLines={1}
          style={{
            marginRight: 8,
            maxWidth: 88,
            color: "#FAF9F6",
            fontFamily: labelFontFamily,
            fontSize: 12,
            textAlign: "right",
            textShadowColor: "#0B0B0A",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 5,
          }}
        >
          {label}
        </NativeText>
      ) : (
        <Text
          numberOfLines={1}
          className="mr-2 max-w-22 text-right text-xs font-semibold text-[#FAF9F6]"
          style={{
            textShadowColor: "#0B0B0A",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 5,
          }}
        >
          {label}
        </Text>
      )}
      <View
        className="h-11 w-11 items-center justify-center"
        style={styles.toolShadow}
      >
        {icon}
      </View>
    </TouchableOpacity>
  );
}
