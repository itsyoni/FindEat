import ImageCropPicker from "react-native-image-crop-picker";

type PostImage = {
  uri: string;
  width: number;
  height: number;
};

type CropPostImageOptions = PostImage & {
  aspect: "CONTENT" | "REVIEW";
  toolbarTitle: string;
};

export async function cropPostImage({
  uri,
  width,
  height,
  aspect,
  toolbarTitle,
}: CropPostImageOptions): Promise<PostImage> {
  const cropWidth = 1200;
  const cropHeight = aspect === "CONTENT" ? 1500 : 1200;

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

    return {
      uri: cropped.path,
      width: Math.max(1, Math.round(cropped.width)),
      height: Math.max(1, Math.round(cropped.height)),
    };
  } catch (error) {
    if ((error as { code?: string }).code === "E_PICKER_CANCELLED") {
      return {
        uri,
        width: Math.max(1, Math.round(width)),
        height: Math.max(1, Math.round(height)),
      };
    }
    throw error;
  }
}
