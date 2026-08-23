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

export async function selectReviewImage(
  source: ReviewImageSource,
  _kind: ReviewImageKind,
): Promise<PickedReviewImage | null> {
  const result =
    source === "gallery"
      ? await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsMultipleSelection: false,
          allowsEditing: false,
          defaultTab: "photos",
          quality: 0.92,
        })
      : await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.92,
        });

  if (result.canceled || !result.assets[0]) return null;
  const selected = result.assets[0];
  const width = Number(selected.width);
  const height = Number(selected.height);
  return {
    // Keep the exact picker asset here. Creating another temporary image before
    // mounting the editor can leave iOS with a URI whose native backing file is
    // no longer available by the time the crop preview tries to decode it.
    uri: normalizeFileUri(selected.uri),
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : 1,
    height: Number.isFinite(height) && height > 0 ? Math.round(height) : 1,
  };
}

function normalizeFileUri(path: string) {
  return path.startsWith("/") ? `file://${path}` : path;
}

/**
 * Compatibility picker for review editing and collaboration screens that
 * have not moved to the in-app crop step yet.
 */
export async function pickReviewImage(
  source: ReviewImageSource,
  _kind: ReviewImageKind,
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
    await new Promise((resolve) =>
      setTimeout(resolve, Platform.OS === "ios" ? 350 : 120),
    );
    try {
      const cropped = await ImageCropPicker.openCropper({
        path: result.assets[0].uri,
        mediaType: "photo",
        width: 1200,
        height: 900,
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
      if ((error as { code?: string }).code === "E_PICKER_CANCELLED") return null;
      throw error;
    }
  }

  try {
    const image = await ImageCropPicker.openCamera({
      width: 1200,
      height: 900,
      cropping: true,
      freeStyleCropEnabled: false,
      cropperCircleOverlay: false,
      mediaType: "photo",
      compressImageQuality: 0.86,
      forceJpg: true,
      cropperToolbarTitle: toolbarTitle,
    });
    return {
      uri: normalizeFileUri(image.path),
      width: Math.max(1, Math.round(image.width)),
      height: Math.max(1, Math.round(image.height)),
    };
  } catch (error) {
    if ((error as { code?: string }).code === "E_PICKER_CANCELLED") return null;
    throw error;
  }
}
