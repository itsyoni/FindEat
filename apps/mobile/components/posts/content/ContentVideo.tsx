import { useEventListener } from "expo";
import { Image as ExpoImage } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useFocusEffect } from "expo-router";
import {
  PlayIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
} from "phosphor-react-native";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  StyleSheet,
  View,
  AppState,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Text from "@/components/common/AppText";
import {
  contentFeedPerfNow,
  logContentFeedPerf,
} from "@/lib/contentFeedDiagnostics";

type Props = {
  uri: string;
  overlayUri?: string;
  style?: StyleProp<ViewStyle>;
  contentFit?: "contain" | "cover" | "fill";
  autoPlay?: boolean;
  nativeControls?: boolean;
  muted?: boolean;
  volume?: number;
  loop?: boolean;
  tapToToggle?: boolean;
  showProgress?: boolean;
  paused?: boolean;
  restartOnActivate?: boolean;
  mediaOnly?: boolean;
  pinchToZoom?: boolean;
  onPinchStart?: () => void;
  onPinchEnd?: () => void;
  onLongPress?: () => void;
  onPressOut?: () => void;
  onMutedChange?: (muted: boolean) => void;
  onDoubleTap?: (x: number, y: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  onPlaybackEnd?: () => void;
  onSeek?: (seconds: number) => void;
  diagnosticLabel?: string;
  updatesSuspended?: boolean;
};

function formatVideoTime(seconds: number, roundUp = false) {
  const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
  const wholeSeconds = Math.max(
    0,
    roundUp ? Math.ceil(safeSeconds) : Math.floor(safeSeconds),
  );
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export default function ContentVideo({
  uri,
  overlayUri,
  style,
  contentFit = "contain",
  autoPlay = false,
  nativeControls = false,
  muted = false,
  volume = 1,
  loop = true,
  tapToToggle = false,
  showProgress = false,
  paused = false,
  restartOnActivate = true,
  mediaOnly = false,
  pinchToZoom = false,
  onPinchStart,
  onPinchEnd,
  onLongPress,
  onPressOut,
  onMutedChange,
  onDoubleTap,
  onPlayingChange,
  onPlaybackEnd,
  onSeek,
  diagnosticLabel,
  updatesSuspended = false,
}: Props) {
  const videoMountedAtRef = useRef(contentFeedPerfNow());
  const videoLoadStartedAtRef = useRef(contentFeedPerfNow());
  const acceptsUpdatesRef = useRef(!updatesSuspended);
  const player = useVideoPlayer(
    { uri, useCaching: true },
    (videoPlayer) => {
      if (diagnosticLabel) {
        logContentFeedPerf("video-player-created", {
          media: diagnosticLabel,
          createDelayMs: Math.round(
            contentFeedPerfNow() - videoMountedAtRef.current,
          ),
        });
      }
      videoPlayer.loop = loop;
      videoPlayer.muted = muted;
      videoPlayer.volume = volume;
      // Progress does not need to drive React at 20 Hz. Four updates per
      // second keeps the scrubber readable without competing with paging.
      videoPlayer.timeUpdateEventInterval = showProgress ? 0.25 : 0;
    },
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(player.playing);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [localMuted, setLocalMuted] = useState(muted);
  const isMuted = onMutedChange ? muted : localMuted;
  const [scrubberWidth, setScrubberWidth] = useState(0);
  const [scrubProgress, setScrubProgress] = useState<number | null>(null);
  const [appIsActive, setAppIsActive] = useState(
    AppState.currentState === "active",
  );
  const [isScreenFocused, setIsScreenFocused] = useState(false);
  const pendingScrubRatioRef = useRef(0);
  const resumeAfterScrubRef = useRef(false);
  const wasAutoPlayingRef = useRef(false);
  const longPressActiveRef = useRef(false);
  const lastTapAtRef = useRef(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const videoWidth = useSharedValue(0);
  const videoHeight = useSharedValue(0);
  const scrubTouchStartX = useSharedValue(0);
  const scrubTouchStartY = useSharedValue(0);
  const scrubberExpansion = useSharedValue(0);

  useEffect(() => {
    if (!diagnosticLabel) return;
    const mountedAt = videoMountedAtRef.current;
    logContentFeedPerf("video-mounted", { media: diagnosticLabel });
    return () => {
      logContentFeedPerf("video-unmounted", {
        media: diagnosticLabel,
        lifetimeMs: Math.round(contentFeedPerfNow() - mountedAt),
      });
    };
  }, [diagnosticLabel]);

  useEffect(() => {
    if (!diagnosticLabel) return;
    logContentFeedPerf("video-react-updates", {
      media: diagnosticLabel,
      suspended: updatesSuspended,
    });
  }, [diagnosticLabel, updatesSuspended]);

  useEventListener(player, "statusChange", ({ status, oldStatus, error }) => {
    if (!acceptsUpdatesRef.current) return;
    if (!diagnosticLabel) return;
    logContentFeedPerf("video-status-change", {
      media: diagnosticLabel,
      status,
      oldStatus: oldStatus ?? null,
      elapsedSinceMountMs: Math.round(
        contentFeedPerfNow() - videoMountedAtRef.current,
      ),
      error: error?.message ?? null,
    });
  });

  useEventListener(player, "sourceLoad", ({ duration, availableVideoTracks }) => {
    if (!acceptsUpdatesRef.current) return;
    setDuration(duration);
    if (!diagnosticLabel) return;
    logContentFeedPerf("video-source-loaded", {
      media: diagnosticLabel,
      loadMs: Math.round(
        contentFeedPerfNow() - videoLoadStartedAtRef.current,
      ),
      durationSeconds: duration,
      dimensions: availableVideoTracks[0]?.size
          ? `${availableVideoTracks[0].size.width}x${availableVideoTracks[0].size.height}`
          : null,
    });
  });

  useEventListener(player, "timeUpdate", (event) => {
    if (!acceptsUpdatesRef.current) return;
    setCurrentTime(event.currentTime);
  });

  useEventListener(player, "playingChange", (event) => {
    if (!acceptsUpdatesRef.current) return;
    setIsPlaying(event.isPlaying);
  });

  // expo-video exposes the update interval as an imperative player property.
  // eslint-disable-next-line react-hooks/immutability
  useLayoutEffect(() => {
    acceptsUpdatesRef.current = !updatesSuspended;
    try {
      // Disable native progress events while a vertical page gesture is active.
      // eslint-disable-next-line react-hooks/immutability
      player.timeUpdateEventInterval =
        showProgress && !updatesSuspended ? 0.25 : 0;
    } catch {
      // A stale player may already have been released after page settlement.
    }
  }, [player, showProgress, updatesSuspended]);

  useEffect(() => {
    // Keep every mounted feed player aligned with the shared audio choice.
    // eslint-disable-next-line react-hooks/immutability
    player.muted = isMuted;
  }, [isMuted, player]);

  useEffect(() => {
    // expo-video exposes volume as an imperative player property.
    // eslint-disable-next-line react-hooks/immutability
    player.volume = Math.max(0, Math.min(1, volume));
  }, [player, volume]);

  useEffect(() => {
    // Let the native player own looping. Manual replay calls race native end
    // events on both AVPlayer and ExoPlayer.
    // eslint-disable-next-line react-hooks/immutability
    player.loop = loop;
  }, [loop, player]);

  useEffect(() => {
    if (!updatesSuspended) onPlayingChange?.(isPlaying);
  }, [isPlaying, onPlayingChange, updatesSuspended]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setAppIsActive(state === "active");
    });
    return () => subscription.remove();
  }, []);

  useEffect(
    () => () => {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => setIsScreenFocused(false);
    }, []),
  );

  const shouldAutoPlay = autoPlay && isScreenFocused && appIsActive && !paused;

  useEventListener(player, "playToEnd", () => {
    if (!acceptsUpdatesRef.current) return;
    onPlaybackEnd?.();
  });

  useEffect(() => {
    if (shouldAutoPlay) {
      if (restartOnActivate && !wasAutoPlayingRef.current && player.currentTime > 0) {
        player.seekBy(-player.currentTime);
      }
      player.play();
    } else {
      player.pause();
    }
    wasAutoPlayingRef.current = shouldAutoPlay;
  }, [player, restartOnActivate, shouldAutoPlay]);

  const progress =
    duration > 0
      ? Math.max(0, Math.min(1, currentTime / duration))
      : 0;
  const displayedProgress = scrubProgress ?? progress;
  const displayedTime = displayedProgress * Math.max(0, duration);

  useEffect(() => {
    scrubberExpansion.value = withTiming(scrubProgress === null ? 0 : 1, {
      duration: 140,
      easing: Easing.out(Easing.quad),
    });
  }, [scrubProgress, scrubberExpansion]);

  function scrubRatio(locationX: number) {
    if (!scrubberWidth) return 0;
    return Math.max(0, Math.min(1, locationX / scrubberWidth));
  }

  function beginScrub(locationX: number) {
    if (!scrubberWidth || player.duration <= 0) return;
    pendingScrubRatioRef.current = scrubRatio(locationX);
    resumeAfterScrubRef.current = player.playing;
    player.pause();
    setScrubProgress(pendingScrubRatioRef.current);
  }

  function moveScrub(locationX: number) {
    if (!scrubberWidth || player.duration <= 0) return;
    pendingScrubRatioRef.current = scrubRatio(locationX);
    setScrubProgress(pendingScrubRatioRef.current);
  }

  function finishScrub() {
    if (scrubberWidth && player.duration > 0) {
      const targetTime = pendingScrubRatioRef.current * player.duration;
      player.seekBy(targetTime - player.currentTime);
      onSeek?.(targetTime);
    }
    setScrubProgress(null);
    if (resumeAfterScrubRef.current && shouldAutoPlay) player.play();
  }

  function togglePlayback() {
    if (!tapToToggle) return;
    if (player.playing) {
      player.pause();
      setManuallyPaused(true);
    } else {
      player.play();
      setManuallyPaused(false);
    }
  }

  function handlePress(event: GestureResponderEvent) {
    if (!onDoubleTap) {
      togglePlayback();
      return;
    }

    const now = Date.now();
    const isDoubleTap = now - lastTapAtRef.current < 280;
    lastTapAtRef.current = now;

    if (isDoubleTap) {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapAtRef.current = 0;
      onDoubleTap(event.nativeEvent.locationX, event.nativeEvent.locationY);
      return;
    }

    singleTapTimerRef.current = setTimeout(() => {
      singleTapTimerRef.current = null;
      togglePlayback();
    }, 280);
  }

  function toggleMuted(event: GestureResponderEvent) {
    event.stopPropagation();
    const nextMuted = !isMuted;
    // expo-video exposes mute as an imperative player property.
    // eslint-disable-next-line react-hooks/immutability
    player.muted = nextMuted;
    if (onMutedChange) {
      onMutedChange(nextMuted);
    } else {
      setLocalMuted(nextMuted);
    }
  }

  // These callbacks run only after a native gesture event. Reading playback
  // refs there is intentional and does not happen during React rendering.
  /* eslint-disable react-hooks/refs */
  const scrubberPanGesture = Gesture.Pan()
    .enabled(showProgress)
    .manualActivation(true)
    .onTouchesDown((event) => {
      const touch = event.allTouches[0] ?? event.changedTouches[0];
      if (!touch) return;
      scrubTouchStartX.set(touch.absoluteX);
      scrubTouchStartY.set(touch.absoluteY);
    })
    .onTouchesMove((event, manager) => {
      const touch = event.allTouches[0] ?? event.changedTouches[0];
      if (!touch) return;
      const deltaX = touch.absoluteX - scrubTouchStartX.get();
      const deltaY = touch.absoluteY - scrubTouchStartY.get();
      if (Math.abs(deltaX) < 7 && Math.abs(deltaY) < 7) return;
      if (Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
        manager.activate();
      } else {
        manager.fail();
      }
    })
    .onStart((event) => runOnJS(beginScrub)(event.x))
    .onUpdate((event) => runOnJS(moveScrub)(event.x))
    .onEnd(() => runOnJS(finishScrub)());
  const scrubberTapGesture = Gesture.Tap()
    .enabled(showProgress)
    .onEnd((event) => {
      runOnJS(beginScrub)(event.x);
      runOnJS(finishScrub)();
    });
  const scrubberGesture = Gesture.Race(
    scrubberPanGesture,
    scrubberTapGesture,
  );
  /* eslint-enable react-hooks/refs */

  const pinchGesture = Gesture.Pinch()
    .enabled(pinchToZoom)
    .onStart(() => {
      if (onPinchStart) onPinchStart();
    })
    .onUpdate((event) => {
      const nextScale = Math.min(Math.max(event.scale, 1), 4);
      scale.value = nextScale;
      translateX.value =
        (videoWidth.value / 2 - event.focalX) * (nextScale - 1);
      translateY.value =
        (videoHeight.value / 2 - event.focalY) * (nextScale - 1);
    })
    .onFinalize(() => {
      if (onPinchEnd) onPinchEnd();
      const resetTiming = { duration: 120, easing: Easing.out(Easing.quad) };
      scale.value = withTiming(1, resetTiming);
      translateX.value = withTiming(0, resetTiming);
      translateY.value = withTiming(0, resetTiming);
    })
    .runOnJS(true);

  const videoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));
  const progressTrackAnimatedStyle = useAnimatedStyle(() => ({
    height: 3 + scrubberExpansion.value * 5,
  }));
  const progressHandleAnimatedStyle = useAnimatedStyle(() => {
    const size = 10 + scrubberExpansion.value * 6;
    const trackHeight = 3 + scrubberExpansion.value * 5;

    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      right: -size / 2,
      top: (trackHeight - size) / 2,
    };
  });
  const scrubberTimeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: scrubberExpansion.value,
    transform: [{ translateY: (1 - scrubberExpansion.value) * 5 }],
  }));

  return (
    <GestureDetector gesture={pinchGesture}>
      <Pressable
        disabled={!tapToToggle && !onLongPress}
        accessibilityRole={tapToToggle ? "button" : undefined}
        delayLongPress={220}
        onPress={handlePress}
        onLongPress={() => {
          longPressActiveRef.current = true;
          onLongPress?.();
        }}
        onPressOut={() => {
          if (!longPressActiveRef.current) return;
          longPressActiveRef.current = false;
          onPressOut?.();
        }}
        onLayout={(event) => {
          videoWidth.value = event.nativeEvent.layout.width;
          videoHeight.value = event.nativeEvent.layout.height;
        }}
        style={style}
      >
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, videoStyle]}>
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit={contentFit}
            nativeControls={nativeControls && !tapToToggle}
            allowsPictureInPicture={false}
            surfaceType="textureView"
          />
          {overlayUri ? (
            <ExpoImage
              pointerEvents="none"
              source={{ uri: overlayUri }}
              contentFit="fill"
              cachePolicy="memory-disk"
              style={StyleSheet.absoluteFill}
            />
          ) : null}
        </Animated.View>
      {tapToToggle && manuallyPaused && !isPlaying && !mediaOnly ? (
        <View pointerEvents="box-none" style={styles.pausedControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isMuted ? "Unmute video" : "Mute video"}
            onPress={toggleMuted}
            style={styles.muteButton}
          >
            {isMuted ? (
              <SpeakerSlashIcon size={24} color="#FAF9F6" weight="fill" />
            ) : (
              <SpeakerHighIcon size={24} color="#FAF9F6" weight="fill" />
            )}
          </Pressable>
          <View pointerEvents="none" style={styles.pausedIndicator}>
            <PlayIcon size={42} color="#FAF9F6" weight="fill" />
          </View>
        </View>
      ) : null}
      {showProgress && !mediaOnly ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.scrubberTimeOverlay, scrubberTimeAnimatedStyle]}
        >
          <View style={styles.scrubberTimePill}>
            <Text style={styles.scrubberTimeText}>
              {formatVideoTime(displayedTime)}/{formatVideoTime(duration, true)}
            </Text>
          </View>
        </Animated.View>
      ) : null}
      {showProgress && !mediaOnly ? (
        <GestureDetector gesture={scrubberGesture}>
        <View
          accessibilityRole="adjustable"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(displayedProgress * 100),
          }}
          onLayout={(event) => {
            setScrubberWidth(event.nativeEvent.layout.width);
          }}
          style={styles.scrubberTouchArea}
        >
          <Animated.View
            pointerEvents="none"
            style={[styles.progressTrack, progressTrackAnimatedStyle]}
          >
            <View
              style={[
                styles.progressFill,
                { width: `${displayedProgress * 100}%` },
              ]}
            >
              <Animated.View
                style={[styles.progressHandle, progressHandleAnimatedStyle]}
              />
            </View>
          </Animated.View>
        </View>
        </GestureDetector>
      ) : null}
      </Pressable>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  pausedControls: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 72,
    height: 128,
    marginLeft: -36,
    marginTop: -76,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  muteButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  pausedIndicator: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 36,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  scrubberTouchArea: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
    justifyContent: "flex-end",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FAF9F6",
  },
  progressHandle: {
    position: "absolute",
    backgroundColor: "#FAF9F6",
  },
  scrubberTimeOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  scrubberTimePill: {
    minWidth: 142,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(11,11,10,0.68)",
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  scrubberTimeText: {
    color: "#FAF9F6",
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
