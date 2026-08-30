import FullPageRestaurantPicker from "@/components/restaurants/FullPageRestaurantPicker";
import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import { snapsQueryKey } from "@/hooks/useSnaps";
import { api } from "@/lib/api";
import { AppAlert as Alert } from "@/lib/appAlert";
import { uploadImage, uploadVideo } from "@/lib/uploadImage";
import { getVideoDurationMs } from "@/lib/videoDuration";
import {
  MediaLibraryPermissionError,
  saveImageToGallery,
} from "@/lib/saveImageToGallery";
import ContentVideo from "@/components/posts/content/ContentVideo";
import SoundPickerModal from "@/components/sounds/SoundPickerModal";
import SoundPlayback from "@/components/sounds/SoundPlayback";
import ReviewParticipantsStep from "@/components/review-creator/steps/ReviewParticipantsStep";
import AnimatedGallerySaveIcon from "@/components/common/AnimatedGallerySaveIcon";
import ImageMarkupEditor, {
  type ImageMarkupState,
} from "@/components/create/ImageMarkupEditor";
import type { EditableImage } from "@/components/create/SingleImageCropEditor";
import ContentCropPreview, {
  type ContentCropRect,
} from "@/components/create/ContentCropPreview";
import CustomColorPicker from "@/components/create/CustomColorPicker";
import ImageEyedropper from "@/components/create/ImageEyedropper";
import {
  defaultImageCrop,
} from "@/lib/renderContentCrop";
import { renderImageMarkup } from "@/lib/renderImageMarkup";
import { sampleImageColor } from "@/lib/sampleImageColor";
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
  type FocusMode,
  type FlashMode,
  useCameraPermissions,
} from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { router, Stack } from "expo-router";
import {
  ArrowsClockwiseIcon,
  AtIcon,
  CaretDownIcon,
  CameraIcon,
  EyedropperIcon,
  FadersHorizontalIcon,
  ImagesIcon,
  LightningIcon,
  LightningSlashIcon,
  MapPinPlusIcon,
  PaperPlaneTiltIcon,
  PaletteIcon,
  PencilSimpleIcon,
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
  type NativeSyntheticEvent,
  type NativeTouchEvent,
  Pressable,
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
const SNAP_TEXT_MIN_SIZE = 4;
const SNAP_TEXT_MAX_SIZE = 240;

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

function readableColorForeground(color: string) {
  const normalized = color.replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return "#171717";
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const brightness = red * 0.299 + green * 0.587 + blue * 0.114;
  return brightness > 155 ? "#171717" : "#FAF9F6";
}

function preferredSnapPictureSize(sizes: string[]) {
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
    .filter((size): size is NonNullable<typeof size> => Boolean(size));
  if (!parsed.length) return undefined;

  const useful = parsed.filter((size) => size.area >= 1_500_000);
  const candidates = useful.length ? useful : parsed;
  return [...candidates].sort((first, second) => {
    const firstScore =
      Math.abs(first.longEdge - 1920) +
      Math.abs(first.aspectRatio - 16 / 9) * 700;
    const secondScore =
      Math.abs(second.longEdge - 1920) +
      Math.abs(second.aspectRatio - 16 / 9) * 700;
    return firstScore - secondScore;
  })[0]?.size;
}

function snapRenderDimensions(crop: ContentCropRect) {
  const width = 1080;
  const aspect =
    crop.width > 0 && crop.height > 0 ? crop.width / crop.height : 9 / 16;
  return {
    width,
    height: Math.max(1920, Math.round(width / aspect)),
  };
}

function renderSnapImageCrop(
  uri: string,
  sourceWidth: number,
  sourceHeight: number,
  crop: ContentCropRect,
) {
  const target = snapRenderDimensions(crop);
  return renderImageMarkup(
    uri,
    target.width,
    target.height,
    [],
    null,
    null,
    { ...crop, sourceWidth, sourceHeight },
  );
}

function cropsMatch(
  first: ContentCropRect | null,
  second: ContentCropRect,
) {
  if (!first) return false;
  // Allow the tiny sub-pixel normalization performed when the rendered image
  // is fitted back into a device whose screen ratio does not divide evenly.
  const tolerance = Math.max(4, second.width * 0.004);
  return (
    Math.abs(first.originX - second.originX) < tolerance &&
    Math.abs(first.originY - second.originY) < tolerance &&
    Math.abs(first.width - second.width) < tolerance &&
    Math.abs(first.height - second.height) < tolerance
  );
}

type SnapDrawingDraft = {
  baseImage: EditableImage;
  crop: ContentCropRect;
  markup: ImageMarkupState;
  renderedUri: string;
  renderedCrop: ContentCropRect;
};

type EditableSnapTextOverlay = SnapTextOverlay & { editorId: string };

function newTextOverlayId() {
  return `snap-text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function CreateSnapScreen() {
  const { t } = useTranslation(["snaps", "common"]);
  const { t: tSound } = useTranslation("sound");
  const queryClient = useQueryClient();
  const { startPostUpload } = usePostUpload();
  const cameraRef = useRef<CameraView>(null);
  const cameraZoomRef = useRef(0);
  const pinchStartZoomRef = useRef(0);
  const pinchStartDistanceRef = useRef(0);
  const cameraTouchStartRef = useRef<{
    x: number;
    y: number;
    startedAt: number;
  } | null>(null);
  const cameraPinchingRef = useRef(false);
  const captionInputRef = useRef<TextInput>(null);
  const overlayTextInputRef = useRef<TextInput>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageFilterSourceUri, setImageFilterSourceUri] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [imageCrop, setImageCrop] = useState<ContentCropRect | null>(null);
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
  const [cameraZoom, setCameraZoom] = useState(0);
  const [cameraPictureSize, setCameraPictureSize] = useState<
    string | undefined
  >(undefined);
  const [flash, setFlash] = useState<FlashMode>("off");
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [cameraAutofocus, setCameraAutofocus] =
    useState<FocusMode>("off");
  const [cameraFocusPoint, setCameraFocusPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const focusStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [caption, setCaption] = useState("");
  const [textOverlays, setTextOverlays] = useState<EditableSnapTextOverlay[]>([]);
  const [textOverlay, setTextOverlay] = useState<EditableSnapTextOverlay | null>(null);
  const textOverlayRef = useRef<EditableSnapTextOverlay | null>(null);
  const [editingOverlayText, setEditingOverlayText] = useState(false);
  const [textColorOptionsOpen, setTextColorOptionsOpen] = useState(false);
  const [textCustomColorOpen, setTextCustomColorOpen] = useState(false);
  const [textEyedropperActive, setTextEyedropperActive] = useState(false);
  const [movingOverlayText, setMovingOverlayText] = useState(false);
  const [resizingOverlayText, setResizingOverlayText] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });
  const canvasSizeRef = useRef({ width: 1, height: 1 });
  const overlayDragStartRef = useRef({ x: 0, y: 0 });
  const overlaySizeStartRef = useRef(32);
  const overlayTextFrameRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const overlayPanTouchRef = useRef<{
    id: number;
    x: number;
    y: number;
    startedOnText: boolean;
  } | null>(null);
  const overlayPinchAnchorIdRef = useRef<number | null>(null);
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
  const [snapDrawingImage, setSnapDrawingImage] =
    useState<EditableImage | null>(null);
  const [snapDrawingDraft, setSnapDrawingDraft] =
    useState<SnapDrawingDraft | null>(null);
  const [snapDrawingEditorReady, setSnapDrawingEditorReady] = useState(false);
  const [pendingDrawingCloseUri, setPendingDrawingCloseUri] = useState<
    string | null
  >(null);
  const [toolsExpanded, setToolsExpanded] = useState(true);
  const {
    status: gallerySaveStatus,
    isSaving: savingToGallery,
    begin: beginGallerySave,
    succeed: completeGallerySave,
    fail: failGallerySave,
  } = useGallerySaveFeedback();
  const publishStartedRef = useRef(false);

  function updateTextOverlay(next: EditableSnapTextOverlay | null) {
    textOverlayRef.current = next;
    setTextOverlay(next);
  }

  function commitActiveTextOverlay() {
    const current = textOverlayRef.current;
    if (current?.text.trim()) {
      const committed = { ...current, text: current.text.trim() };
      setTextOverlays((items) => [
        ...items.filter((item) => item.editorId !== committed.editorId),
        committed,
      ]);
    }
    updateTextOverlay(null);
  }

  function createTextOverlay() {
    commitActiveTextOverlay();
    const canvasWidth = canvasSizeRef.current.width;
    const initialWidth = Math.min(
      Math.max(SNAP_TEXT_MIN_WIDTH, canvasWidth * 0.8),
      canvasWidth,
    );
    updateTextOverlay({
      editorId: newTextOverlayId(),
      text: "",
      x:
        canvasWidth > 1
          ? Math.max(0, (canvasWidth - initialWidth) / 2 / canvasWidth)
          : 0.1,
      y: 0.35,
      font: "MODERN",
      fontSize: 32,
      color: "#FAF9F6",
      bold: false,
      italic: false,
    });
    setEditingOverlayText(true);
    requestAnimationFrame(() => overlayTextInputRef.current?.focus());
  }

  function editTextOverlay(editorId: string) {
    const selected = textOverlays.find((item) => item.editorId === editorId);
    if (!selected) return;
    commitActiveTextOverlay();
    setTextOverlays((items) =>
      items.filter((item) => item.editorId !== editorId),
    );
    updateTextOverlay(selected);
    setEditingOverlayText(true);
    requestAnimationFrame(() => overlayTextInputRef.current?.focus());
  }

  function patchTextOverlay(patch: Partial<SnapTextOverlay>) {
    const current = textOverlayRef.current;
    if (!current) return;
    const canvasWidth = canvasSizeRef.current.width;
    const currentWidth = snapTextOverlayWidth(
      current.text,
      canvasWidth,
      current.fontSize,
    );
    const currentCenterX = current.x + currentWidth / canvasWidth / 2;
    const next = { ...current, ...patch };
    const width = snapTextOverlayWidth(
      next.text,
      canvasWidth,
      next.fontSize,
    );
    next.x = clamp(
      "text" in patch || "fontSize" in patch
        ? currentCenterX - width / canvasWidth / 2
        : next.x,
      0,
      Math.max(0, 1 - width / canvasWidth),
    );
    updateTextOverlay(next);
  }

  function finishTextOverlayEditing() {
    overlayTextInputRef.current?.blur();
    Keyboard.dismiss();
    commitActiveTextOverlay();
    setEditingOverlayText(false);
    setTextColorOptionsOpen(false);
    setTextCustomColorOpen(false);
    setTextEyedropperActive(false);
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
        editorId: newTextOverlayId(),
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

  function applyTextColor(color: string) {
    patchTextOverlay({ color });
  }

  async function sampleTextColorFromImage(
    normalizedX: number,
    normalizedY: number,
  ) {
    if (!imageUri || !imageSize) {
      throw new Error("No snap image is available for color sampling.");
    }
    try {
      return await sampleImageColor({
        uri: imageUri,
        normalizedX,
        normalizedY,
        sourceWidth: imageSize.width,
        sourceHeight: imageSize.height,
        crop: imageCrop,
      });
    } catch (error) {
      console.warn("Could not sample snap text color", error);
      Alert.alert(
        t("common:error"),
        t("common:colorSampleError", {
          defaultValue: "Could not pick that color. Try another point.",
        }),
      );
      throw error;
    }
  }

  useEffect(() => {
    function touchStartedOnText(x: number, y: number) {
      const frame = overlayTextFrameRef.current;
      const padding = 14;
      return (
        x >= frame.x - padding &&
        x <= frame.x + frame.width + padding &&
        y >= frame.y - padding &&
        y <= frame.y + frame.height + padding
      );
    }

    const pan = Gesture.Pan()
      .manualActivation(true)
      .minDistance(3)
      .runOnJS(true)
      .onTouchesDown((event) => {
        if (event.numberOfTouches !== 1) return;
        const touch = event.changedTouches[0] ?? event.allTouches[0];
        if (!touch) return;
        const startedOnText = touchStartedOnText(touch.x, touch.y);
        overlayPanTouchRef.current = {
          id: touch.id,
          x: touch.x,
          y: touch.y,
          startedOnText,
        };
        if (startedOnText && overlayPinchAnchorIdRef.current === null) {
          overlayPinchAnchorIdRef.current = touch.id;
        }
      })
      .onTouchesMove((event, manager) => {
        const start = overlayPanTouchRef.current;
        if (!start) return;
        if (event.numberOfTouches > 1) {
          manager.fail();
          return;
        }
        const touch =
          event.allTouches.find((item) => item.id === start.id) ??
          event.changedTouches[0];
        if (!touch) return;
        const distance = Math.hypot(touch.x - start.x, touch.y - start.y);
        if (distance < 3) return;
        if (start.startedOnText) manager.activate();
        else manager.fail();
      })
      .onStart(() => {
        const current = textOverlayRef.current;
        if (!current) return;
        setMovingOverlayText(true);
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
      })
      .onFinalize(() => {
        overlayPanTouchRef.current = null;
        setMovingOverlayText(false);
      });
    const pinch = Gesture.Pinch()
      .manualActivation(true)
      .runOnJS(true)
      .onTouchesDown((event) => {
        for (const touch of event.changedTouches) {
          if (touchStartedOnText(touch.x, touch.y)) {
            overlayPinchAnchorIdRef.current = touch.id;
            break;
          }
        }
      })
      .onTouchesMove((event, manager) => {
        if (event.numberOfTouches < 2) return;
        const anchorId = overlayPinchAnchorIdRef.current;
        if (
          anchorId !== null &&
          event.allTouches.some((touch) => touch.id === anchorId)
        ) {
          manager.activate();
        } else {
          manager.fail();
        }
      })
      .onStart(() => {
        setResizingOverlayText(true);
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
            SNAP_TEXT_MIN_SIZE,
            SNAP_TEXT_MAX_SIZE,
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
      })
      .onFinalize(() => {
        overlayPinchAnchorIdRef.current = null;
        setResizingOverlayText(false);
      });
    setOverlayGesture(Gesture.Simultaneous(pan, pinch));
  }, []);

  async function saveSnapPhotoToGallery() {
    if (!imageUri || savingToGallery) return;
    beginGallerySave();
    try {
      const savedImage =
        imageSize
          ? await (() => {
              const crop = imageCrop ??
                defaultImageCrop(imageSize.width, imageSize.height, 9 / 16);
              return renderSnapImageCrop(
                imageUri,
                imageSize.width,
                imageSize.height,
                crop,
              );
            })()
          : { uri: imageUri };
      await saveImageToGallery(savedImage.uri);
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
      setSnapDrawingDraft(null);
    } catch (error) {
      console.error("snap filter failed", error);
      Alert.alert(t("common:error"), t("common:photoFilterFailed"));
      throw error;
    }
  }

  function openSnapDrawing() {
    if (!imageUri || !imageSize) return;
    setSnapDrawingEditorReady(false);
    setPendingDrawingCloseUri(null);
    const canResume =
      snapDrawingDraft?.renderedUri === imageUri &&
      cropsMatch(imageCrop, snapDrawingDraft.renderedCrop);
    if (canResume && snapDrawingDraft) {
      setSnapDrawingImage(snapDrawingDraft.baseImage);
      return;
    }
    setSnapDrawingDraft(null);
    setSnapDrawingImage({
      uri: imageUri,
      width: imageSize.width,
      height: imageSize.height,
    });
  }

  async function openSnapFilters() {
    try {
      if (!FilterPicker) {
        const module = await import("@/components/create/PhotoFilterPickerModal");
        setFilterPicker(() => module.default);
      }
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
    if (imageUri || videoUri || !cameraReady) return;
    const frame = requestAnimationFrame(() => {
      void cameraRef.current?.resumePreview().catch(() => undefined);
    });
    return () => cancelAnimationFrame(frame);
  }, [cameraReady, imageUri, videoUri]);

  useEffect(() => {
    let mounted = true;
    void import("@/components/create/PhotoFilterPickerModal")
      .then((module) => {
        if (mounted) setFilterPicker(() => module.default);
      })
      .catch(() => {
        // The action still shows the rebuild explanation on unsupported builds.
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (
      cameraPermission &&
      !cameraPermission.granted &&
      cameraPermission.canAskAgain
    ) {
      void requestCameraPermission();
    }
  }, [cameraPermission, requestCameraPermission]);

  useEffect(
    () => () => {
      if (focusStartTimerRef.current) {
        clearTimeout(focusStartTimerRef.current);
      }
      if (focusResetTimerRef.current) {
        clearTimeout(focusResetTimerRef.current);
      }
    },
    [],
  );

  function focusCamera(x: number, y: number) {
    if (!cameraReady || capturing || imageUri || videoUri) return;
    setCameraFocusPoint({ x, y });
    void Haptics.selectionAsync();

    if (focusStartTimerRef.current) {
      clearTimeout(focusStartTimerRef.current);
    }
    if (focusResetTimerRef.current) {
      clearTimeout(focusResetTimerRef.current);
    }

    // Expo Camera exposes a one-shot autofocus mode, but not a coordinate
    // focus method. Resetting the mode first ensures every tap starts a fresh
    // autofocus pass rather than reusing the previous lock.
    setCameraAutofocus("off");
    focusStartTimerRef.current = setTimeout(() => {
      setCameraAutofocus("on");
      focusStartTimerRef.current = null;
      focusResetTimerRef.current = setTimeout(() => {
        setCameraAutofocus("off");
        setCameraFocusPoint(null);
        focusResetTimerRef.current = null;
      }, 900);
    }, 35);
  }

  function setCameraZoomValue(value: number) {
    const nextZoom = clamp(value, 0, 0.8);
    cameraZoomRef.current = nextZoom;
    setCameraZoom(nextZoom);
  }

  function cameraTouchDistance(touches: NativeTouchEvent["touches"]) {
    if (touches.length < 2) return 0;
    const [first, second] = touches;
    return Math.hypot(
      second.locationX - first.locationX,
      second.locationY - first.locationY,
    );
  }

  function handleCameraTouchStart(
    event: NativeSyntheticEvent<NativeTouchEvent>,
  ) {
    const { touches } = event.nativeEvent;
    if (touches.length >= 2) {
      cameraPinchingRef.current = true;
      pinchStartDistanceRef.current = cameraTouchDistance(touches);
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
      pinchStartDistanceRef.current = cameraTouchDistance(touches);
      pinchStartZoomRef.current = cameraZoomRef.current;
      cameraTouchStartRef.current = null;
    }

    const startDistance = pinchStartDistanceRef.current;
    if (startDistance <= 0) return;
    const scale = cameraTouchDistance(touches) / startDistance;
    setCameraZoomValue(
      pinchStartZoomRef.current + Math.log2(Math.max(scale, 0.1)) * 0.24,
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
    if (
      Math.hypot(ended.locationX - started.x, ended.locationY - started.y) > 12
    ) {
      return;
    }

    focusCamera(ended.locationX, ended.locationY);
  }

  async function handleCameraReady() {
    const camera = cameraRef.current;
    if (camera && !cameraPictureSize) {
      try {
        const sizes = await camera.getAvailablePictureSizesAsync();
        setCameraPictureSize(preferredSnapPictureSize(sizes));
      } catch (error) {
        console.warn("Could not select snap camera picture size", error);
      }
    }
    setCameraReady(true);
  }

  async function takePhoto() {
    if (!cameraRef.current || !cameraReady || capturing) return;
    setCapturing(true);
    const camera = cameraRef.current;
    let previewPaused = false;
    try {
      const previewSize = canvasSizeRef.current;
      const previewAspect =
        previewSize.width > 1 && previewSize.height > 1
          ? previewSize.width / previewSize.height
          : 9 / 16;
      const photoPromise = camera.takePictureAsync({
        quality: 0.82,
        mirror: false,
      });
      try {
        await camera.pausePreview();
        previewPaused = true;
      } catch {
        // Some Android cameras finish the capture before the preview can pause.
      }
      const photo = await photoPromise;
      if (photo?.uri) {
        setSnapDrawingDraft(null);
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
          setImageCrop(
            defaultImageCrop(
              corrected.width,
              corrected.height,
              previewAspect,
            ),
          );
        } else {
          setImageUri(photo.uri);
          setImageFilterSourceUri(photo.uri);
          setImageSize({ width: photo.width, height: photo.height });
          setImageCrop(
            defaultImageCrop(photo.width, photo.height, previewAspect),
          );
        }
        setPhotoFilter("ORIGINAL");
        setTextOverlays([]);
        updateTextOverlay(null);
      }
    } catch {
      if (previewPaused) {
        await camera.resumePreview().catch(() => undefined);
      }
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
      allowsEditing: false,
      videoMaxDuration: 10,
      videoExportPreset: ImagePicker.VideoExportPreset.HighestQuality,
      selectionLimit: 1,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      const asset = result.assets[0];
      setSnapDrawingDraft(null);
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
        setImageCrop(null);
        setPhotoFilter("ORIGINAL");
        setTextOverlays([]);
        updateTextOverlay(null);
        setVideoUri(asset.uri);
        setVideoDurationMs(Math.min(10_000, duration));
      } else {
        setVideoUri(null);
        setVideoDurationMs(null);
        setImageUri(asset.uri);
        setImageFilterSourceUri(asset.uri);
        setImageSize({ width: asset.width, height: asset.height });
        setImageCrop(defaultImageCrop(asset.width, asset.height, 9 / 16));
        setPhotoFilter("ORIGINAL");
        setTextOverlays([]);
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
    const pendingImageSize = imageSize;
    const pendingImageCrop = imageCrop;
    const pendingVideoUri = videoUri;
    const pendingVideoDurationMs = videoDurationMs;
    const pendingCaption = caption.trim() || undefined;
    const pendingTextOverlays = [...textOverlays, ...(textOverlay ? [textOverlay] : [])]
      .filter((item) => item.text.trim())
      .map(({ editorId: _editorId, ...item }) => ({
        ...item,
        text: item.text.trim(),
      }));
    const pendingSoundSelection = soundSelection;
    const pendingRestaurant = restaurant;
    const clientRequestId = `snap-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 12)}`;
    let uploadedImageUrl: string | null = null;
    let uploadedVideoUrl: string | null = null;
    let preparedImageUri: string | null = null;
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
          if (!preparedImageUri) {
            preparedImageUri = pendingImageSize
              ? await (async () => {
                  const crop =
                    pendingImageCrop ??
                    defaultImageCrop(
                      pendingImageSize.width,
                      pendingImageSize.height,
                      9 / 16,
                    );
                  return (
                    await renderSnapImageCrop(
                      pendingImageUri,
                      pendingImageSize.width,
                      pendingImageSize.height,
                      crop,
                    )
                  ).uri;
                })()
              : pendingImageUri;
          }
          uploadedImageUrl = await uploadImage(
            preparedImageUri,
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
          textOverlay: pendingTextOverlays[0],
          textOverlays: pendingTextOverlays,
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
  const textColorIsCustom = Boolean(
    textOverlay &&
      !SNAP_TEXT_COLORS.some(
        (item) => item.toUpperCase() === textOverlay.color.toUpperCase(),
      ),
  );
  const textOverlayWidth = textOverlay
    ? snapTextOverlayWidth(
        textOverlay.text,
        canvasSize.width,
        textOverlay.fontSize,
      )
    : 0;
  const displayedTextOverlayWidth =
    editingOverlayText && canvasSize.width > 1
      ? Math.max(textOverlayWidth, canvasSize.width * 0.82)
      : textOverlayWidth;
  const displayedTextOverlayLeft = textOverlay
    ? clamp(
        textOverlay.x * canvasSize.width -
          (displayedTextOverlayWidth - textOverlayWidth) / 2,
        0,
        Math.max(0, canvasSize.width - displayedTextOverlayWidth),
      )
    : 0;
  const drawingCrop = snapDrawingImage
    ? (snapDrawingDraft?.crop ??
      imageCrop ??
      defaultImageCrop(
        snapDrawingImage.width,
        snapDrawingImage.height,
        canvasSize.width > 1 && canvasSize.height > 1
          ? canvasSize.width / canvasSize.height
          : 9 / 16,
      ))
    : null;
  const drawingTarget = drawingCrop
    ? snapRenderDimensions(drawingCrop)
    : null;

  function handleSnapPreviewImageLoad() {
    if (!pendingDrawingCloseUri || imageUri !== pendingDrawingCloseUri) return;
    setPendingDrawingCloseUri(null);
    setSnapDrawingEditorReady(false);
    setSnapDrawingImage(null);
  }

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
            <View style={StyleSheet.absoluteFill}>
              <ContentCropPreview
                sourceUri={imageUri!}
                sourceWidth={imageSize?.width ?? 1080}
                sourceHeight={imageSize?.height ?? 1920}
                crop={imageCrop ?? undefined}
                aspectRatio={9 / 16}
                canvasAspectRatio={
                  canvasSize.width > 0 && canvasSize.height > 0
                    ? canvasSize.width / canvasSize.height
                    : 9 / 16
                }
                disabled={
                  editingOverlayText ||
                  movingOverlayText ||
                  resizingOverlayText
                }
                onImageLoad={handleSnapPreviewImageLoad}
                onCropChange={setImageCrop}
              />
            </View>
          )}
          <SoundPlayback
            sound={soundSelection?.sound}
            startTimeMs={soundSelection?.soundStartTimeMs}
            volume={soundSelection?.soundVolume}
            playing={!soundPickerOpen}
          />
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.previewScrim]}
          />
          {textOverlays.map((item) => (
            <Pressable
              key={item.editorId}
              accessibilityRole="button"
              accessibilityLabel={item.text}
              onPress={() => editTextOverlay(item.editorId)}
              style={[
                styles.savedTextOverlay,
                {
                  left: item.x * canvasSize.width,
                  top: item.y * canvasSize.height,
                  width: snapTextOverlayWidth(
                    item.text,
                    canvasSize.width,
                    item.fontSize,
                  ),
                },
              ]}
            >
              <NativeText
                style={[styles.textOverlayInput, snapTextStyle(item)]}
              >
                {item.text}
              </NativeText>
            </Pressable>
          ))}
          {textOverlay && overlayGesture ? (
            <GestureDetector gesture={overlayGesture}>
              <View
                collapsable={false}
                pointerEvents={editingOverlayText ? "auto" : "box-none"}
                style={styles.textGestureCanvas}
              >
                <View
                  onLayout={({ nativeEvent }) => {
                    overlayTextFrameRef.current = nativeEvent.layout;
                  }}
                  style={[
                    styles.textOverlay,
                    {
                      left: displayedTextOverlayLeft,
                      top: textOverlay.y * canvasSize.height,
                      width: displayedTextOverlayWidth,
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
                    ]}
                  />
                </View>
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
                setImageCrop(null);
                setSnapDrawingDraft(null);
                setPhotoFilter("ORIGINAL");
                setTextOverlays([]);
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
                    onPress={() => {
                      Keyboard.dismiss();
                      setTextColorOptionsOpen((current) => !current);
                    }}
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
                          fontFamily: "CabinetBold",
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
                          fontFamily: "CabinetBold",
                          fontSize: 25,
                          fontStyle: "italic",
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
                    onPress={createTextOverlay}
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
                    label={soundSelection?.sound.title ?? tSound("sound")}
                    onPress={() => setSoundPickerOpen(true)}
                    icon={
                      soundSelection?.sound.artworkUrl ? (
                        <Image
                          source={{ uri: soundSelection.sound.artworkUrl }}
                          style={{ width: 27, height: 27, borderRadius: 13.5 }}
                          contentFit="cover"
                        />
                      ) : (
                        <MusicNoteIcon
                          size={25}
                          color={soundSelection ? "#F7D786" : "#FAF9F6"}
                          weight={soundSelection ? "fill" : "bold"}
                        />
                      )
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
                        label={t("common:draw")}
                        onPress={openSnapDrawing}
                        icon={<PencilSimpleIcon size={25} color="#FAF9F6" weight="bold" />}
                      />
                      <SnapEditorTool
                        label={t("common:save")}
                        disabled={savingToGallery}
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
                style={[styles.toolShadow, styles.toolRailEndButton]}
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

          {editingOverlayText && textColorOptionsOpen ? (
            <SafeAreaView edges={["bottom"]} style={styles.textColorTray}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.textColorTrayContent}
              >
                {SNAP_TEXT_COLORS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    accessibilityRole="button"
                    accessibilityLabel={item}
                    onPress={() => applyTextColor(item)}
                    style={[
                      styles.textColorSwatch,
                      { backgroundColor: item },
                      textOverlay?.color === item && styles.textColorSwatchSelected,
                    ]}
                  />
                ))}
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t("common:customColor")}
                  onPress={() => setTextCustomColorOpen(true)}
                  style={[
                    styles.textColorAction,
                    textColorIsCustom && {
                      backgroundColor: textOverlay?.color,
                    },
                    textColorIsCustom && styles.textColorSwatchSelected,
                  ]}
                >
                  <PaletteIcon
                    size={19}
                    color={
                      textColorIsCustom && textOverlay
                        ? readableColorForeground(textOverlay.color)
                        : "#171717"
                    }
                    weight="bold"
                  />
                </TouchableOpacity>
                {imageUri ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={t("common:eyedropper", {
                      defaultValue: "Eyedropper",
                    })}
                    onPress={() => {
                      setTextColorOptionsOpen(false);
                      setTextEyedropperActive(true);
                    }}
                    style={styles.textColorEyedropperAction}
                  >
                    <EyedropperIcon size={19} color="#FAF9F6" weight="bold" />
                  </TouchableOpacity>
                ) : null}
              </ScrollView>
            </SafeAreaView>
          ) : null}

          {textEyedropperActive ? (
            <ImageEyedropper
              value={textOverlay?.color ?? "#FAF9F6"}
              onSample={sampleTextColorFromImage}
              onChange={applyTextColor}
              onComplete={(picked) => {
                applyTextColor(picked);
                setTextEyedropperActive(false);
                void Haptics.selectionAsync();
              }}
            />
          ) : null}

          {textCustomColorOpen && textOverlay ? (
            <CustomColorPicker
              value={textOverlay.color}
              onChange={applyTextColor}
              onClose={() => setTextCustomColorOpen(false)}
            />
          ) : null}

          {!editingOverlayText ? (
            <KeyboardAvoidingView
              pointerEvents="box-none"
              behavior="padding"
              automaticOffset
              style={styles.previewKeyboardArea}
            >
              <SafeAreaView
                pointerEvents="box-none"
                edges={["bottom"]}
                style={styles.previewComposer}
              >
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
            autofocus={cameraAutofocus}
            facing={cameraFacing}
            mirror={false}
            flash={flash}
            mode="picture"
            pictureSize={cameraPictureSize}
            zoom={cameraZoom}
            onCameraReady={() => void handleCameraReady()}
            style={StyleSheet.absoluteFill}
          />
          <View
            accessible={false}
            onTouchStart={handleCameraTouchStart}
            onTouchMove={handleCameraTouchMove}
            onTouchEnd={handleCameraTouchEnd}
            onTouchCancel={() => {
              cameraPinchingRef.current = false;
              cameraTouchStartRef.current = null;
              pinchStartDistanceRef.current = 0;
            }}
            style={StyleSheet.absoluteFill}
          />
          {cameraFocusPoint ? (
            <View
              pointerEvents="none"
              style={[
                styles.cameraFocusReticle,
                {
                  left: cameraFocusPoint.x - 32,
                  top: cameraFocusPoint.y - 32,
                },
              ]}
            >
              <View style={styles.cameraFocusCenter} />
            </View>
          ) : null}
          <SafeAreaView
            edges={["top", "bottom"]}
            pointerEvents="box-none"
            style={styles.cameraControls}
          >
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
                  setCameraFacing((current) => {
                    setCameraZoomValue(0);
                    return current === "back" ? "front" : "back";
                  })
                }
                className="h-12 w-12 items-center justify-center"
              >
                <ArrowsClockwiseIcon size={30} color="#FAF9F6" weight="bold" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      )}
      {snapDrawingImage && drawingCrop && drawingTarget ? (
        <View
          pointerEvents={snapDrawingEditorReady ? "auto" : "none"}
          style={[
            StyleSheet.absoluteFill,
            styles.drawingEditorOverlay,
            { opacity: snapDrawingEditorReady ? 1 : 0 },
          ]}
        >
          <ImageMarkupEditor
            key={snapDrawingImage.uri}
            image={snapDrawingImage}
            allowText={false}
            allowDrawing
            immersive
            crop={drawingCrop}
            outputWidth={drawingTarget.width}
            outputHeight={drawingTarget.height}
            initialStrokes={snapDrawingDraft?.markup.strokes}
            initialTextMarkup={snapDrawingDraft?.markup.textMarkup}
            initialFillColor={snapDrawingDraft?.markup.fillColor}
            initialFillAfterStrokeIndex={
              snapDrawingDraft?.markup.fillAfterStrokeIndex
            }
            initialTool="draw"
            onImageReady={() => setSnapDrawingEditorReady(true)}
            onCancel={() => {
              setSnapDrawingEditorReady(false);
              setPendingDrawingCloseUri(null);
              setSnapDrawingImage(null);
            }}
            onApply={async (edited, markup) => {
              await Image.prefetch(edited.uri, {
                cachePolicy: "memory-disk",
              }).catch(() => false);
              const renderedCrop = defaultImageCrop(
                edited.width,
                edited.height,
                edited.width / edited.height,
              );
              setPendingDrawingCloseUri(edited.uri);
              setImageUri(edited.uri);
              setImageFilterSourceUri(edited.uri);
              setImageSize({ width: edited.width, height: edited.height });
              setImageCrop(renderedCrop);
              setSnapDrawingDraft({
                baseImage: snapDrawingImage,
                crop: drawingCrop,
                markup,
                renderedUri: edited.uri,
                renderedCrop,
              });
              setPhotoFilter("ORIGINAL");
            }}
          />
        </View>
      ) : null}
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
  drawingEditorOverlay: {
    zIndex: 100,
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
  },
  savedTextOverlay: {
    position: "absolute",
    zIndex: 17,
  },
  textGestureCanvas: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
  textColorTray: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 8,
    zIndex: 45,
  },
  textColorTrayContent: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 29,
    paddingHorizontal: 12,
    backgroundColor: "rgba(20,20,19,0.82)",
  },
  textColorSwatch: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: "rgba(250,249,246,0.45)",
    borderRadius: 14,
  },
  textColorSwatchSelected: {
    borderWidth: 3,
    borderColor: "#F7D786",
  },
  textColorAction: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#FAF9F6",
  },
  textColorEyedropperAction: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(250,249,246,0.32)",
    borderRadius: 15,
    backgroundColor: "rgba(11,11,10,0.55)",
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
  toolRailEndButton: {
    alignSelf: "flex-end",
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
  cameraFocusReticle: {
    position: "absolute",
    width: 64,
    height: 64,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#F7D786",
    borderRadius: 8,
    shadowColor: "#0B0B0A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 4,
  },
  cameraFocusCenter: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#F7D786",
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
