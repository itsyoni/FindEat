import type { VideoPlayer, VideoSource } from "expo-video";

type VideoPlayerSubscription = { remove: () => void };

type FeedVideoActivation = {
  key: string;
  uri: string;
  postId: string;
  mediaId: string;
};

export type FeedVideoLifecycleSnapshot = Readonly<{
  revision: number;
  player: VideoPlayer | null;
  activeKey: string | null;
  activeUri: string | null;
  requestedGeneration: number;
  acceptedGeneration: number | null;
}>;

export type FeedVideoPlaybackSnapshot = Readonly<{
  revision: number;
  postId: string | null;
  mediaId: string | null;
  sourceGeneration: number;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}>;

function sourceUri(source: VideoSource | undefined): string | null {
  if (typeof source === "string") return source;
  if (source && typeof source === "object" && "uri" in source) {
    return source.uri ?? null;
  }
  return null;
}

/**
 * Owns source assignment for the single persistent player used by a feed.
 * ContentPost surfaces never replace the source directly, so a late async
 * completion from an older post cannot become the identity of a newer post.
 */
export class FeedVideoController {
  private currentPlayer: VideoPlayer | null = null;

  private activeKey: string | null = null;
  private activeUri: string | null = null;
  private activePostId: string | null = null;
  private activeMediaId: string | null = null;
  private generation = 0;
  private acceptedGeneration: number | null = null;
  private sourceSubscription: VideoPlayerSubscription | null = null;
  private sourceLoadSubscription: VideoPlayerSubscription | null = null;
  private timeUpdateSubscription: VideoPlayerSubscription | null = null;
  private playingSubscription: VideoPlayerSubscription | null = null;
  private playToEndSubscription: VideoPlayerSubscription | null = null;
  private loadedSourceUri: string | null = null;
  private loadedSourceDuration = 0;
  private disposed = false;
  private revision = 0;
  private lifecycleSnapshot: FeedVideoLifecycleSnapshot = {
    revision: 0,
    player: null,
    activeKey: null,
    activeUri: null,
    requestedGeneration: 0,
    acceptedGeneration: null,
  };
  private listeners = new Set<() => void>();
  private playbackSnapshot: FeedVideoPlaybackSnapshot = {
    revision: 0,
    postId: null,
    mediaId: null,
    sourceGeneration: 0,
    currentTime: 0,
    duration: 0,
    isPlaying: false,
  };
  private playbackListeners = new Set<() => void>();
  private replaceQueue: Promise<void> = Promise.resolve();

  get player() {
    return this.currentPlayer;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.lifecycleSnapshot;

  subscribePlayback = (listener: () => void) => {
    this.playbackListeners.add(listener);
    return () => this.playbackListeners.delete(listener);
  };

  getPlaybackSnapshot = () => this.playbackSnapshot;

  private emit() {
    this.revision += 1;
    this.lifecycleSnapshot = {
      revision: this.revision,
      player: this.currentPlayer,
      activeKey: this.activeKey,
      activeUri: this.activeUri,
      requestedGeneration: this.generation,
      acceptedGeneration: this.acceptedGeneration,
    };
    this.listeners.forEach((listener) => listener());
  }

  private publishPlayback(
    next: Omit<FeedVideoPlaybackSnapshot, "revision">,
  ) {
    const current = this.playbackSnapshot;
    if (
      current.postId === next.postId &&
      current.mediaId === next.mediaId &&
      current.sourceGeneration === next.sourceGeneration &&
      current.currentTime === next.currentTime &&
      current.duration === next.duration &&
      current.isPlaying === next.isPlaying
    ) {
      return;
    }
    this.playbackSnapshot = {
      ...next,
      revision: current.revision + 1,
    };
    this.playbackListeners.forEach((listener) => listener());
  }

  private resetPlayback(
    postId: string | null,
    mediaId: string | null,
    sourceGeneration: number,
  ) {
    this.publishPlayback({
      postId,
      mediaId,
      sourceGeneration,
      currentTime: 0,
      duration: 0,
      isPlaying: false,
    });
  }

  private ensureSourceSubscription() {
    const player = this.currentPlayer;
    if (!player || this.sourceSubscription || this.disposed) return;
    this.sourceSubscription = player.addListener(
      "sourceChange",
      ({ source }) => {
        if (sourceUri(source) !== this.activeUri) {
          this.acceptedGeneration = null;
          this.emit();
        }
      },
    );
  }

  private ensurePlaybackSubscriptions() {
    const player = this.currentPlayer;
    if (!player || this.sourceLoadSubscription || this.disposed) return;

    this.sourceLoadSubscription = player.addListener(
      "sourceLoad",
      ({ videoSource, duration }) => {
        const loadedUri = sourceUri(videoSource ?? undefined);
        if (!loadedUri || loadedUri !== this.activeUri) return;
        this.loadedSourceUri = loadedUri;
        this.loadedSourceDuration = Number.isFinite(duration)
          ? Math.max(0, duration)
          : 0;
        if (this.acceptedGeneration !== this.generation) return;
        this.publishCurrentPlayback({ duration: this.loadedSourceDuration });
      },
    );
    this.timeUpdateSubscription = player.addListener("timeUpdate", () => {
      if (this.acceptedGeneration !== this.generation) return;
      const currentTime = Number.isFinite(player.currentTime)
        ? Math.max(0, player.currentTime)
        : 0;
      this.publishCurrentPlayback({ currentTime });
    });
    this.playingSubscription = player.addListener(
      "playingChange",
      ({ isPlaying }) => {
        if (this.acceptedGeneration !== this.generation) return;
        this.publishCurrentPlayback({ isPlaying });
      },
    );
    this.playToEndSubscription = player.addListener("playToEnd", () => {
      if (this.acceptedGeneration !== this.generation) return;
      const duration = this.playbackSnapshot.duration;
      this.publishCurrentPlayback({ currentTime: duration });
    });
  }

  private publishCurrentPlayback(
    patch: Partial<
      Pick<FeedVideoPlaybackSnapshot, "currentTime" | "duration" | "isPlaying">
    >,
  ) {
    if (
      !this.activePostId ||
      !this.activeMediaId ||
      this.acceptedGeneration !== this.generation
    ) {
      return;
    }
    this.publishPlayback({
      postId: this.activePostId,
      mediaId: this.activeMediaId,
      sourceGeneration: this.generation,
      currentTime: patch.currentTime ?? this.playbackSnapshot.currentTime,
      duration: patch.duration ?? this.playbackSnapshot.duration,
      isPlaying: patch.isPlaying ?? this.playbackSnapshot.isPlaying,
    });
  }

  activate({ key, uri, postId, mediaId }: FeedVideoActivation) {
    this.ensureSourceSubscription();
    this.ensurePlaybackSubscriptions();

    const sameSource = this.activeKey === key && this.activeUri === uri;
    if (sameSource) {
      return this.generation;
    }

    const generation = this.generation + 1;
    this.generation = generation;
    this.activeKey = key;
    this.activeUri = uri;
    this.activePostId = postId;
    this.activeMediaId = mediaId;
    this.acceptedGeneration = null;
    this.loadedSourceUri = null;
    this.loadedSourceDuration = 0;
    this.resetPlayback(postId, mediaId, generation);

    this.currentPlayer?.pause();
    if (this.currentPlayer) this.currentPlayer.timeUpdateEventInterval = 0;
    this.emit();

    this.queueSourceReplace(key, uri, generation);

    return generation;
  }

  private queueSourceReplace(
    key: string,
    uri: string,
    generation: number,
  ) {
    const player = this.currentPlayer;
    if (!player) return;

    this.replaceQueue = this.replaceQueue
      .catch(() => undefined)
      .then(async () => {
        if (
          this.currentPlayer !== player ||
          !this.isCurrent(key, generation) ||
          this.activeUri !== uri
        ) {
          return;
        }
        await player.replaceAsync({ uri, useCaching: true });
        if (
          this.currentPlayer !== player ||
          !this.isCurrent(key, generation) ||
          this.activeUri !== uri
        ) {
          return;
        }
        // Acceptance is published only after replacement for this exact
        // generation succeeds. ContentVideo observes the immutable lifecycle
        // snapshot below and can now mount the shared player's VideoView.
        this.acceptedGeneration = generation;
        const duration =
          this.loadedSourceUri === uri
            ? this.loadedSourceDuration
            : Number.isFinite(player.duration)
              ? Math.max(0, player.duration)
              : 0;
        this.publishPlayback({
          postId: this.activePostId,
          mediaId: this.activeMediaId,
          sourceGeneration: generation,
          currentTime: 0,
          duration,
          isPlaying: player.playing,
        });
        this.emit();
      })
      .catch(() => {
        // statusChange carries the player error to the mounted surface. Keep
        // the generation unaccepted so a stale/failed frame is never revealed.
      });
  }

  attachPlayer(player: VideoPlayer) {
    if (this.currentPlayer === player) return;
    this.sourceSubscription?.remove();
    this.sourceSubscription = null;
    this.removePlaybackSubscriptions();
    this.currentPlayer = player;
    this.disposed = false;
    player.timeUpdateEventInterval = 0;
    this.ensureSourceSubscription();
    this.ensurePlaybackSubscriptions();
    this.emit();
    if (this.activeKey && this.activeUri) {
      this.queueSourceReplace(this.activeKey, this.activeUri, this.generation);
    }
  }

  detachPlayer(player: VideoPlayer) {
    if (this.currentPlayer !== player) return;
    player.pause();
    player.timeUpdateEventInterval = 0;
    this.sourceSubscription?.remove();
    this.sourceSubscription = null;
    this.removePlaybackSubscriptions();
    this.currentPlayer = null;
    this.generation += 1;
    this.activeKey = null;
    this.activeUri = null;
    this.activePostId = null;
    this.activeMediaId = null;
    this.acceptedGeneration = null;
    this.loadedSourceUri = null;
    this.loadedSourceDuration = 0;
    this.resetPlayback(null, null, this.generation);
    this.emit();
  }

  private removePlaybackSubscriptions() {
    this.sourceLoadSubscription?.remove();
    this.sourceLoadSubscription = null;
    this.timeUpdateSubscription?.remove();
    this.timeUpdateSubscription = null;
    this.playingSubscription?.remove();
    this.playingSubscription = null;
    this.playToEndSubscription?.remove();
    this.playToEndSubscription = null;
  }

  deactivate(key: string, generation: number) {
    if (!this.isCurrent(key, generation)) return;
    this.currentPlayer?.pause();
    if (this.currentPlayer) this.currentPlayer.timeUpdateEventInterval = 0;
    this.publishCurrentPlayback({ currentTime: 0, isPlaying: false });
  }

  setProgressUpdatesEnabled(
    key: string,
    generation: number,
    enabled: boolean,
  ) {
    if (!this.isCurrent(key, generation) || !this.currentPlayer) return;
    this.currentPlayer.timeUpdateEventInterval = enabled ? 0.25 : 0;
  }

  seekTo(key: string, generation: number, seconds: number) {
    if (
      !this.isCurrent(key, generation) ||
      this.acceptedGeneration !== generation ||
      !this.currentPlayer
    ) {
      return false;
    }
    const playerDuration = this.currentPlayer.duration;
    const duration =
      this.playbackSnapshot.duration > 0
        ? this.playbackSnapshot.duration
        : Number.isFinite(playerDuration)
          ? Math.max(0, playerDuration)
          : 0;
    if (duration <= 0) return false;
    const targetTime = Math.max(0, Math.min(duration, seconds));
    this.currentPlayer.seekBy(targetTime - this.currentPlayer.currentTime);
    this.publishCurrentPlayback({ currentTime: targetTime });
    return true;
  }

  isCurrent(key: string, generation: number) {
    return (
      !this.disposed &&
      this.activeKey === key &&
      this.generation === generation
    );
  }

  acceptsEvents(key: string, generation: number) {
    return (
      this.isCurrent(key, generation) &&
      this.acceptedGeneration === generation
    );
  }

  generationFor(key: string, uri: string) {
    return this.activeKey === key && this.activeUri === uri
      ? this.generation
      : -1;
  }

  resume() {
    this.disposed = false;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.generation += 1;
    this.activeKey = null;
    this.activeUri = null;
    this.activePostId = null;
    this.activeMediaId = null;
    this.acceptedGeneration = null;
    this.loadedSourceUri = null;
    this.loadedSourceDuration = 0;
    this.resetPlayback(null, null, this.generation);
    const player = this.currentPlayer;
    if (player) this.detachPlayer(player);
    this.emit();
  }
}
