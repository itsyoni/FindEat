import ImageCropPicker from "react-native-image-crop-picker";

export type ReviewImageKind = "cover" | "dish";
export type ReviewImageSource = "camera" | "gallery";

export type PickedReviewImage = {
  uri: string;
  width: number;
  height: number;
};

function normalizeFileUri(path: string) {
  return path.startsWith("/") ? `file://${path}` : path;
}

export async function pickReviewImage(
  source: ReviewImageSource,
  kind: ReviewImageKind,
  toolbarTitle: string,
): Promise<PickedReviewImage | null> {
  const options = {
    width: kind === "dish" ? 1200 : 1200,
    height: kind === "dish" ? 900 : 1200,
    cropping: true,
    freeStyleCropEnabled: false,
    cropperCircleOverlay: false,
    mediaType: "photo" as const,
    compressImageQuality: 0.86,
    forceJpg: true,
    cropperToolbarTitle: toolbarTitle,
  };

  try {
    const image =
      source === "camera"
        ? await ImageCropPicker.openCamera(options)
        : await ImageCropPicker.openPicker(options);

    return {
      uri: normalizeFileUri(image.path),
      width: Math.max(1, Math.round(image.width)),
      height: Math.max(1, Math.round(image.height)),
    };
  } catch (error) {
    if ((error as { code?: string }).code === "E_PICKER_CANCELLED") {
      return null;
    }
    throw error;
  }
}
