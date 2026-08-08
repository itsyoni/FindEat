import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useFocusEffect } from "expo-router";
import { PlayIcon } from "phosphor-react-native";
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

type Props = {
  uri: string;
  style?: StyleProp<ViewStyle>;
  contentFit?: "contain" | "cover" | "fill";
  autoPlay?: boolean;
  nativeControls?: boolean;
  muted?: boolean;
  loop?: boolean;
  tapToToggle?: boolean;
  showProgress?: boolean;
};

export default function ContentVideo({
  uri,
  style,
  contentFit = "contain",
  autoPlay = false,
  nativeControls = false,
  muted = false,
  loop = true,
  tapToToggle = false,
  showProgress = false,
}: Props) {
  const player = useVideoPlayer(
    { uri, useCaching: true },
    (videoPlayer) => {
      videoPlayer.loop = loop;
      videoPlayer.muted = muted;
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
  const [scrubberWidth, setScrubberWidth] = useState(0);
  const [scrubProgress, setScrubProgress] = useState<number | null>(null);
  const [appIsActive, setAppIsActive] = useState(
    AppState.currentState === "active",
  );
  const [isScreenFocused, setIsScreenFocused] = useState(false);
  const pendingScrubRatioRef = useRef(0);
  const resumeAfterScrubRef = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setAppIsActive(state === "active");
    });
    return () => subscription.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => setIsScreenFocused(false);
    }, []),
  );

  const shouldAutoPlay = autoPlay && isScreenFocused && appIsActive;

  useEffect(() => {
    if (shouldAutoPlay) {
      if (player.currentTime > 0) {
        player.seekBy(-player.currentTime);
      }
      player.play();
    } else {
      player.pause();
    }
  }, [player, shouldAutoPlay]);

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
      player.seekBy(
        pendingScrubRatioRef.current * player.duration - player.currentTime,
      );
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

  return (
    <Pressable
      disabled={!tapToToggle}
      accessibilityRole={tapToToggle ? "button" : undefined}
      onPress={togglePlayback}
      style={style}
    >
      <VideoView
        pointerEvents="none"
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        nativeControls={nativeControls && !tapToToggle}
        allowsPictureInPicture={false}
        surfaceType="textureView"
      />
      {tapToToggle && manuallyPaused && !isPlaying ? (
        <View pointerEvents="none" style={styles.pausedIndicator}>
          <PlayIcon size={42} color="#FAF9F6" weight="fill" />
        </View>
      ) : null}
      {showProgress ? (
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
  );
}

const styles = StyleSheet.create({
  pausedIndicator: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 72,
    height: 72,
    marginLeft: -36,
    marginTop: -36,
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
