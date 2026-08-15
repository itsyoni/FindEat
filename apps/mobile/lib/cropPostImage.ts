import ImageCropPicker from "react-native-image-crop-picker";

type PostImage = {
  uri: string;
  width: number;
  height: number;
};

type CropPostImageOptions = PostImage & {
  aspect: "CONTENT" | "REVIEW" | "DISH" | "SNAP";
  toolbarTitle: string;
};

export async function cropPostImage({
  uri,
  width,
  height,
  aspect,
  toolbarTitle,
}: CropPostImageOptions): Promise<PostImage | null> {
  const cropWidth = aspect === "SNAP" ? 1080 : 1200;
  const cropHeight =
    aspect === "SNAP"
      ? 1920
      : aspect === "CONTENT"
        ? 1500
        : aspect === "DISH"
          ? 900
          : 1200;

  try {
    const cropped = await ImageCropPicker.openCropper({
      path: uri,
      mediaType: "photo",
      width: cropWidth,
      height: cropHeight,
      cropping: true,
      freeStyleCropEnabled: false,
      cropperCircleOverlay: false,
      cropperToolbarTitle: toolbarTitle,
      compressImageQuality: 0.9,
      forceJpg: true,
    });

    const normalizedPath = cropped.path.startsWith('/')
      ? `file://${cropped.path}`
      : cropped.path;

    return {
      uri: normalizedPath,
      width: Math.max(1, Math.round(cropped.width)),
      height: Math.max(1, Math.round(cropped.height)),
    };
  } catch (error) {
    if ((error as { code?: string }).code === "E_PICKER_CANCELLED") {
      return null;
    }
    throw error;
  }
}
