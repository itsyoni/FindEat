import { useEvent, useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useFocusEffect } from "expo-router";
import {
  PlayIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
} from "phosphor-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
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
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type Props = {
  uri: string;
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
};

export default function ContentVideo({
  uri,
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
}: Props) {
  const player = useVideoPlayer(
    { uri, useCaching: true },
    (videoPlayer) => {
      videoPlayer.loop = loop;
      videoPlayer.muted = muted;
      videoPlayer.volume = volume;
      videoPlayer.timeUpdateEventInterval = 0.05;
    },
  );
  const timeUpdate = useEvent(player, "timeUpdate", {
    currentTime: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0,
  });
  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });
  const [manuallyPaused, setManuallyPaused] = useState(false);
  useEventListener(player, "playToEnd", () => onPlaybackEnd?.());
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
    onPlayingChange?.(isPlaying);
  }, [isPlaying, onPlayingChange]);

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

  const duration = player.duration;
  const progress =
    duration > 0
      ? Math.max(0, Math.min(1, timeUpdate.currentTime / duration))
      : 0;
  const displayedProgress = scrubProgress ?? progress;

  function scrubRatio(locationX: number) {
    if (!scrubberWidth) return 0;
    return Math.max(0, Math.min(1, locationX / scrubberWidth));
  }

  function beginScrub(event: GestureResponderEvent) {
    if (!scrubberWidth || player.duration <= 0) return;
    pendingScrubRatioRef.current = scrubRatio(event.nativeEvent.locationX);
    resumeAfterScrubRef.current = player.playing;
    player.pause();
    setScrubProgress(pendingScrubRatioRef.current);
  }

  function moveScrub(event: GestureResponderEvent) {
    if (!scrubberWidth || player.duration <= 0) return;
    pendingScrubRatioRef.current = scrubRatio(event.nativeEvent.locationX);
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
          onStartShouldSetResponder={() => showProgress}
          onStartShouldSetResponderCapture={() => showProgress}
          onMoveShouldSetResponder={() => showProgress}
          onMoveShouldSetResponderCapture={() => showProgress}
          onResponderTerminationRequest={() => false}
          onResponderGrant={beginScrub}
          onResponderMove={moveScrub}
          onResponderRelease={finishScrub}
          onResponderTerminate={finishScrub}
          style={styles.scrubberTouchArea}
        >
          <View pointerEvents="none" style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${displayedProgress * 100}%` },
              ]}
            >
              <View style={styles.progressHandle} />
            </View>
          </View>
        </View>
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
    right: -5,
    top: -3.5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FAF9F6",
  },
});
