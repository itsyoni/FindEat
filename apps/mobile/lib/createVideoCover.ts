import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { createVideoPlayer } from "expo-video";

/** Creates a local JPEG from an early, representative frame of a short video. */
export async function createVideoCover(videoUri: string) {
  const player = createVideoPlayer(null);

  try {
    await player.replaceAsync(videoUri);
    const [thumbnail] = await player.generateThumbnailsAsync(0.5, {
      maxWidth: 1_280,
      maxHeight: 1_600,
    });
    if (!thumbnail) throw new Error("Could not create a video cover.");

    const context = ImageManipulator.manipulate(thumbnail);
    const image = await context.renderAsync();
    return image.saveAsync({
      compress: 0.82,
      format: SaveFormat.JPEG,
    });
  } finally {
    player.release();
  }
}
