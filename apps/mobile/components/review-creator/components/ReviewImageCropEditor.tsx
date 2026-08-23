import ContentMediaEditor from "@/components/create/ContentMediaEditor";
import { useToast } from "@/contexts/ToastContext";
import { useGallerySaveFeedback } from "@/hooks/useGallerySaveFeedback";
import type { PhotoFilterId } from "@/lib/photoFilters";
import type { ContentMediaDraft } from "@/lib/postDrafts";
import { defaultImageCrop, renderImageCrop } from "@/lib/renderContentCrop";
import type { PickedReviewImage, ReviewImageKind } from "@/lib/reviewImagePicker";
import { MediaLibraryPermissionError, saveImageToGallery } from "@/lib/saveImageToGallery";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  image: PickedReviewImage;
  kind: ReviewImageKind;
  onCancel: () => void;
  onApply: (image: PickedReviewImage) => void;
};

const ASPECT_RATIO = 4 / 3;
const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 900;

function mediaFromImage(image: PickedReviewImage): ContentMediaDraft {
  return {
    id: `review-photo-${Date.now()}`,
    type: "IMAGE",
    uri: image.uri,
    originalUri: image.uri,
    filterSourceUri: image.uri,
    originalWidth: image.width,
    originalHeight: image.height,
    width: image.width,
    height: image.height,
    crop: defaultImageCrop(image.width, image.height, ASPECT_RATIO),
  };
}

export default function ReviewImageCropEditor({ image, onCancel, onApply }: Props) {
  const { t } = useTranslation(["create", "common"]);
  const { showToast } = useToast();
  const [media, setMedia] = useState<ContentMediaDraft[]>(() => [mediaFromImage(image)]);
  const [busy, setBusy] = useState(false);
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
      setMedia((current) => current.map((item) => item.id === mediaId ? { ...item, crop } : item));
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
      const rotated = await rendered.saveAsync({ compress: 0.9, format: SaveFormat.JPEG });
      setMedia([{
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
        crop: defaultImageCrop(rotated.width, rotated.height, ASPECT_RATIO),
        filterSourceUri: rotated.uri,
        photoFilter: "ORIGINAL",
      }]);
    } catch (error) {
      console.error("review image rotation failed", error);
      showToast(t("imageEditError"), { kind: "error" });
    } finally {
      setBusy(false);
    }
  }, [busy, selected, showToast, t]);

  const applyFilter = useCallback(async (filterId: PhotoFilterId) => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const sourceUri = selected.filterSourceUri ?? selected.cropSourceUri ?? selected.uri;
      const { applyPhotoFilter } = await import("@/lib/photoFilters");
      const filtered = await applyPhotoFilter(sourceUri, filterId);
      const width = filtered.width ?? selected.originalWidth ?? selected.width;
      const height = filtered.height ?? selected.originalHeight ?? selected.height;
      setMedia([{
        ...selected,
        uri: filtered.uri,
        width,
        height,
        filterSourceUri: sourceUri,
        photoFilter: filterId,
        cropSourceUri: undefined,
        cropSourceWidth: undefined,
        cropSourceHeight: undefined,
        crop: defaultImageCrop(width, height, ASPECT_RATIO),
      }]);
    } catch (error) {
      console.error("review image filter failed", error);
      showToast(t("imageEditError"), { kind: "error" });
      throw error;
    } finally {
      setBusy(false);
    }
  }, [busy, selected, showToast, t]);

  const saveToGallery = useCallback(async () => {
    if (!selected || busy || savingToGallery) return;
    beginGallerySave();
    try {
      await saveImageToGallery(selected.uri);
      completeGallerySave();
      showToast(t("common:savedToGallery"), { kind: "success" });
    } catch (error) {
      failGallerySave();
      showToast(t(error instanceof MediaLibraryPermissionError ? "common:saveToGalleryPermission" : "common:saveToGalleryFailed"), { kind: "error" });
    }
  }, [beginGallerySave, busy, completeGallerySave, failGallerySave, savingToGallery, selected, showToast, t]);

  const finishEditing = useCallback(async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const sourceUri = selected.cropSourceUri ?? selected.uri;
      const sourceWidth = selected.cropSourceWidth ?? selected.width;
      const sourceHeight = selected.cropSourceHeight ?? selected.height;
      const crop = selected.crop ?? defaultImageCrop(sourceWidth, sourceHeight, ASPECT_RATIO);
      const rendered = await renderImageCrop(sourceUri, crop, OUTPUT_WIDTH, OUTPUT_HEIGHT);
      onApply({ uri: rendered.uri, width: rendered.width, height: rendered.height });
    } catch (error) {
      console.error("Could not prepare review image", error);
      showToast(t("imageCropErrorBody"), { kind: "error" });
    } finally {
      setBusy(false);
    }
  }, [busy, onApply, selected, showToast, t]);

  return (
    <ContentMediaEditor
      media={media}
      selectedIndex={0}
      busy={busy}
      gallerySaveStatus={gallerySaveStatus}
      aspectRatio={ASPECT_RATIO}
      showMediaStrip={false}
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
