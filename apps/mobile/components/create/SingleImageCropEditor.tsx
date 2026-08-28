import ContentMediaEditor from "@/components/create/ContentMediaEditor";
import ImageMarkupEditor from "@/components/create/ImageMarkupEditor";
import { useToast } from "@/contexts/ToastContext";
import { useGallerySaveFeedback } from "@/hooks/useGallerySaveFeedback";
import type { PhotoFilterId } from "@/lib/photoFilters";
import type { ContentMediaDraft } from "@/lib/postDrafts";
import type { ContentCropRect } from "@/components/create/ContentCropPreview";
import { defaultImageCrop, renderImageCrop } from "@/lib/renderContentCrop";
import {
  MediaLibraryPermissionError,
  saveImageToGallery,
} from "@/lib/saveImageToGallery";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PencilSimpleIcon, TextAaIcon } from "phosphor-react-native";

export type EditableImage = {
  uri: string;
  width: number;
  height: number;
};

type Props = {
  image: EditableImage;
  aspectRatio: number;
  outputWidth: number;
  outputHeight: number;
  canvasAspectRatio?: number;
  cropShape?: "rectangle" | "circle";
  showEditorTools?: boolean;
  showHeaderCounter?: boolean;
  headerTitle?: string;
  primaryActionLabel?: string;
  enableTextOverlay?: boolean;
  enableDrawing?: boolean;
  initialMarkupTool?: "text" | "draw";
  initialCrop?: ContentCropRect;
  onCancel: () => void;
  onApply: (image: EditableImage) => void | Promise<void>;
};

function mediaFromImage(
  image: EditableImage,
  aspectRatio: number,
  initialCrop?: ContentCropRect,
): ContentMediaDraft {
  return {
    id: `single-photo-${Date.now()}`,
    type: "IMAGE",
    uri: image.uri,
    originalUri: image.uri,
    filterSourceUri: image.uri,
    originalWidth: image.width,
    originalHeight: image.height,
    width: image.width,
    height: image.height,
    crop:
      initialCrop ?? defaultImageCrop(image.width, image.height, aspectRatio),
  };
}

export default function SingleImageCropEditor({
  image,
  aspectRatio,
  outputWidth,
  outputHeight,
  canvasAspectRatio,
  cropShape = "rectangle",
  showEditorTools = true,
  showHeaderCounter = true,
  headerTitle,
  primaryActionLabel,
  enableTextOverlay = false,
  enableDrawing = false,
  initialMarkupTool,
  initialCrop,
  onCancel,
  onApply,
}: Props) {
  const { t } = useTranslation(["create", "common", "snaps"]);
  const { showToast } = useToast();
  const [media, setMedia] = useState<ContentMediaDraft[]>(() => [
    mediaFromImage(image, aspectRatio, initialCrop),
  ]);
  const [busy, setBusy] = useState(false);
  const [markupImage, setMarkupImage] = useState<EditableImage | null>(null);
  const [markupTool, setMarkupTool] = useState<"text" | "draw" | undefined>(
    initialMarkupTool,
  );
  const openedInitialMarkup = useRef(false);
  const {
    status: gallerySaveStatus,
    isSaving: savingToGallery,
    begin: beginGallerySave,
    succeed: completeGallerySave,
    fail: failGallerySave,
  } = useGallerySaveFeedback();
  const selected = media[0];

  const updateCrop = useCallback(
    (mediaId: string, crop: NonNullable<ContentMediaDraft["crop"]>) => {
      setMedia((current) =>
        current.map((item) =>
          item.id === mediaId ? { ...item, crop } : item,
        ),
      );
    },
    [],
  );

  const rotatePhoto = useCallback(async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const sourceUri = selected.cropSourceUri ?? selected.uri;
      const context = ImageManipulator.manipulate(sourceUri);
      context.rotate(90);
      const rendered = await context.renderAsync();
      const rotated = await rendered.saveAsync({
        compress: 0.9,
        format: SaveFormat.JPEG,
      });
      setMedia([
        {
          ...selected,
          id: `${selected.id}-rotate-${Date.now()}`,
          uri: rotated.uri,
          originalUri: rotated.uri,
          originalWidth: rotated.width,
          originalHeight: rotated.height,
          width: rotated.width,
          height: rotated.height,
          cropSourceUri: undefined,
          cropSourceWidth: undefined,
          cropSourceHeight: undefined,
          crop: defaultImageCrop(rotated.width, rotated.height, aspectRatio),
          filterSourceUri: rotated.uri,
          photoFilter: "ORIGINAL",
        },
      ]);
    } catch (error) {
      console.error("single image rotation failed", error);
      showToast(t("imageEditError"), { kind: "error" });
    } finally {
      setBusy(false);
    }
  }, [aspectRatio, busy, selected, showToast, t]);

  const applyFilter = useCallback(
    async (filterId: PhotoFilterId) => {
      if (!selected || busy) return;
      setBusy(true);
      try {
        const sourceUri =
          selected.filterSourceUri ?? selected.cropSourceUri ?? selected.uri;
        const { applyPhotoFilter } = await import("@/lib/photoFilters");
        const filtered = await applyPhotoFilter(sourceUri, filterId);
        const width = filtered.width ?? selected.originalWidth ?? selected.width;
        const height =
          filtered.height ?? selected.originalHeight ?? selected.height;
        setMedia([
          {
            ...selected,
            uri: filtered.uri,
            width,
            height,
            filterSourceUri: sourceUri,
            photoFilter: filterId,
            cropSourceUri: undefined,
            cropSourceWidth: undefined,
            cropSourceHeight: undefined,
            crop: defaultImageCrop(width, height, aspectRatio),
          },
        ]);
      } catch (error) {
        console.error("single image filter failed", error);
        showToast(t("imageEditError"), { kind: "error" });
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [aspectRatio, busy, selected, showToast, t],
  );

  const saveToGallery = useCallback(async () => {
    if (!selected || busy || savingToGallery) return;
    beginGallerySave();
    try {
      await saveImageToGallery(selected.uri);
      completeGallerySave();
      showToast(t("common:savedToGallery"), { kind: "success" });
    } catch (error) {
      failGallerySave();
      showToast(
        t(
          error instanceof MediaLibraryPermissionError
            ? "common:saveToGalleryPermission"
            : "common:saveToGalleryFailed",
        ),
        { kind: "error" },
      );
    }
  }, [
    beginGallerySave,
    busy,
    completeGallerySave,
    failGallerySave,
    savingToGallery,
    selected,
    showToast,
    t,
  ]);

  const finishEditing = useCallback(async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const sourceUri = selected.cropSourceUri ?? selected.uri;
      const sourceWidth = selected.cropSourceWidth ?? selected.width;
      const sourceHeight = selected.cropSourceHeight ?? selected.height;
      const crop =
        selected.crop ?? defaultImageCrop(sourceWidth, sourceHeight, aspectRatio);
      const rendered = await renderImageCrop(
        sourceUri,
        crop,
        outputWidth,
        outputHeight,
      );
      await onApply({
        uri: rendered.uri,
        width: rendered.width,
        height: rendered.height,
      });
    } catch (error) {
      console.error("Could not prepare image", error);
      showToast(t("imageCropErrorBody"), { kind: "error" });
    } finally {
      setBusy(false);
    }
  }, [
    aspectRatio,
    busy,
    onApply,
    outputHeight,
    outputWidth,
    selected,
    showToast,
    t,
  ]);

  const openMarkup = useCallback(
    async (tool: "text" | "draw") => {
      if (!selected || busy) return;
      setBusy(true);
      try {
        const sourceUri = selected.cropSourceUri ?? selected.uri;
        const sourceWidth = selected.cropSourceWidth ?? selected.width;
        const sourceHeight = selected.cropSourceHeight ?? selected.height;
        const crop =
          selected.crop ??
          defaultImageCrop(sourceWidth, sourceHeight, aspectRatio);
        const rendered = await renderImageCrop(
          sourceUri,
          crop,
          outputWidth,
          outputHeight,
        );
        setMarkupTool(tool);
        setMarkupImage(rendered);
      } catch (error) {
        console.error("Could not open image markup", error);
        showToast(t("imageCropErrorBody"), { kind: "error" });
      } finally {
        setBusy(false);
      }
    }, [aspectRatio, busy, outputHeight, outputWidth, selected, showToast, t],
  );

  useEffect(() => {
    if (!initialMarkupTool || openedInitialMarkup.current) return;
    openedInitialMarkup.current = true;
    void openMarkup(initialMarkupTool);
  }, [initialMarkupTool, openMarkup]);

  if (markupImage) {
    return (
      <ImageMarkupEditor
        image={markupImage}
        allowText={enableTextOverlay}
        allowDrawing={enableDrawing}
        initialTool={markupTool}
        onCancel={() => setMarkupImage(null)}
        onApply={async (edited) => {
          if (initialMarkupTool) {
            await onApply(edited);
            return;
          }
          setMedia([mediaFromImage(edited, aspectRatio)]);
          setMarkupImage(null);
        }}
      />
    );
  }

  return (
    <ContentMediaEditor
      media={media}
      selectedIndex={0}
      busy={busy}
      gallerySaveStatus={gallerySaveStatus}
      aspectRatio={aspectRatio}
      canvasAspectRatio={canvasAspectRatio}
      cropShape={cropShape}
      showMediaStrip={false}
      showEditorTools={showEditorTools}
      showHeaderCounter={showHeaderCounter}
      headerTitle={headerTitle}
      primaryActionLabel={primaryActionLabel}
      additionalEditorTools={[
        ...(enableTextOverlay
          ? [
              {
                key: "text",
                label: t("snaps:textTool"),
                onPress: () => void openMarkup("text"),
                icon: (
                  <TextAaIcon
                    size={23}
                    color="#FFFFFFCC"
                    weight="bold"
                  />
                ),
              },
            ]
          : []),
        ...(enableDrawing
          ? [
              {
                key: "draw",
                label: t("common:draw"),
                onPress: () => void openMarkup("draw"),
                icon: (
                  <PencilSimpleIcon
                    size={23}
                    color="#FFFFFFCC"
                    weight="bold"
                  />
                ),
              },
            ]
          : []),
      ]}
      onSelect={() => undefined}
      onBack={onCancel}
      onNext={() => void finishEditing()}
      onAdd={() => undefined}
      onCropChange={updateCrop}
      onRotate={() => void rotatePhoto()}
      onApplyFilter={applyFilter}
      onSaveToGallery={() => void saveToGallery()}
      onDelete={onCancel}
      onReorder={() => undefined}
    />
  );
}
