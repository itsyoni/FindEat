import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

function normalizedSourceUri(uri: string) {
  return uri.startsWith("/") ? `file://${uri}` : uri;
}

/**
 * Camera files can retain EXIF orientation that image views understand but
 * pixel-based crop operations do not. Re-encoding the rear-camera image once
 * gives the editor and the rendered preview identical dimensions and axes.
 */
export async function normalizeBackCameraPhoto(uri: string) {
  const context = ImageManipulator.manipulate(normalizedSourceUri(uri));
  context.rotate(0);
  const rendered = await context.renderAsync();

  return rendered.saveAsync({
    compress: 0.9,
    format: SaveFormat.JPEG,
  });
}

/**
 * Front-camera captures are returned mirrored on some iOS and Android devices
 * even when the camera preview/capture is configured not to mirror them.
 * Persist a horizontally corrected copy before the image enters editing or
 * upload state so later crops can always return to the corrected original.
 */
export async function normalizeFrontCameraPhoto(uri: string) {
  const context = ImageManipulator.manipulate(normalizedSourceUri(uri));
  context.flip("horizontal");
  const rendered = await context.renderAsync();

  return rendered.saveAsync({
    compress: 0.9,
    format: SaveFormat.JPEG,
  });
}
