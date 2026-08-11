import * as ImagePicker from "expo-image-picker";
import ImageCropPicker from "react-native-image-crop-picker";
import { Platform } from "react-native";

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
  if (source === "gallery") {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      allowsEditing: false,
      defaultTab: "photos",
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return null;

    const image = result.assets[0];
    try {
      // Let the system gallery finish dismissing before presenting another
      // native controller. Opening the cropper in the same frame can leave
      // its promise pending indefinitely, especially on iOS.
      await new Promise((resolve) =>
        setTimeout(resolve, Platform.OS === "ios" ? 350 : 120),
      );
      const cropped = await ImageCropPicker.openCropper({
        path: image.uri,
        mediaType: "photo",
        width: 1200,
        height: kind === "dish" ? 900 : 1200,
        cropping: true,
        freeStyleCropEnabled: false,
        cropperCircleOverlay: false,
        compressImageQuality: 0.86,
        forceJpg: true,
        cropperToolbarTitle: toolbarTitle,
      });
      return {
        uri: normalizeFileUri(cropped.path),
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

  const options = {
    width: 1200,
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
    const image = await ImageCropPicker.openCamera(options);

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
