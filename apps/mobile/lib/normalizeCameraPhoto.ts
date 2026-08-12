import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/**
 * Front-camera captures are returned mirrored on some iOS and Android devices
 * even when the camera preview/capture is configured not to mirror them.
 * Persist a horizontally corrected copy before the image enters editing or
 * upload state so later crops can always return to the corrected original.
 */
export async function normalizeFrontCameraPhoto(uri: string) {
  const sourceUri = uri.startsWith("/") ? `file://${uri}` : uri;
  const context = ImageManipulator.manipulate(sourceUri);
  context.flip("horizontal");
  const rendered = await context.renderAsync();

  return rendered.saveAsync({
    compress: 0.9,
    format: SaveFormat.JPEG,
  });
}
