import { createVideoPlayer } from "expo-video";

const VIDEO_METADATA_TIMEOUT_MS = 8_000;

/** Reads duration from the actual exported video instead of picker metadata. */
export async function getVideoDurationMs(uri: string) {
  const player = createVideoPlayer(null);

  try {
    return await new Promise<number>((resolve, reject) => {
      let settled = false;
      const finish = (durationMs?: number, error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        sourceSubscription.remove();
        statusSubscription.remove();
        if (error) reject(error);
        else resolve(Math.max(1, Math.round(durationMs ?? 0)));
      };
      const sourceSubscription = player.addListener(
        "sourceLoad",
        ({ duration }) => finish(duration * 1_000),
      );
      const statusSubscription = player.addListener(
        "statusChange",
        ({ status, error }) => {
          if (status === "error") {
            finish(undefined, new Error(error?.message ?? "Video failed to load"));
          }
        },
      );
      const timeout = setTimeout(() => {
        const durationMs = player.duration * 1_000;
        if (Number.isFinite(durationMs) && durationMs > 0) finish(durationMs);
        else finish(undefined, new Error("Video metadata timed out"));
      }, VIDEO_METADATA_TIMEOUT_MS);

      void player.replaceAsync(uri).catch((error: unknown) =>
        finish(
          undefined,
          error instanceof Error ? error : new Error("Video failed to load"),
        ),
      );
    });
  } finally {
    player.release();
  }
}
