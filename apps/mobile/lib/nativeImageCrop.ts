import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import ImageCropPicker from "react-native-image-crop-picker";
import { AppState, Platform } from "react-native";

type CropperOptions = Parameters<typeof ImageCropPicker.openCropper>[0];

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function waitForIdle() {
  return new Promise<void>((resolve) => {
    if (typeof globalThis.requestIdleCallback === "function") {
      globalThis.requestIdleCallback(() => resolve(), { timeout: 500 });
      return;
    }

    setTimeout(resolve, 0);
  });
}

async function waitUntilAppIsActive() {
  if (AppState.currentState === "active") return;

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(finish, 1500);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") finish();
    });

    function finish() {
      clearTimeout(timeout);
      subscription.remove();
      resolve();
    }
  });
}

/**
 * Wait for a system camera/gallery controller to fully leave the screen before
 * presenting another native controller. Some iOS devices resolve the picker
 * promise while its dismissal animation is still in progress.
 */
export async function waitForNativeImagePickerDismissal() {
  await waitUntilAppIsActive();
  await waitForIdle();
  await wait(Platform.OS === "ios" ? 240 : 80);
}

/**
 * Copies the selected asset into the app cache as a regular JPEG. This makes
 * iCloud/Photos-provider and content-provider assets readable by the native
 * cropper after the picker releases its temporary access.
 */
export async function prepareImageForNativeCrop(
  uri: string,
  width?: number,
  height?: number,
) {
  const manipulator = ImageManipulator.manipulate(uri);
  const longestEdge = Math.max(width ?? 0, height ?? 0);
  if (longestEdge > 4096 && width && height) {
    const scale = 4096 / longestEdge;
    manipulator.resize({
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    });
  }
  const rendered = await manipulator.renderAsync();
  return (
    await rendered.saveAsync({
      compress: 0.94,
      format: SaveFormat.JPEG,
    })
  ).uri;
}

export async function openNativeImageCropper(options: CropperOptions) {
  await waitForNativeImagePickerDismissal();
  return ImageCropPicker.openCropper(options);
}
