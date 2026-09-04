import type { Sound } from "@findeat/types";
import { useActiveCountry } from "@/contexts/ActiveCountryContext";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useIsFocused } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  contentFeedPerfNow,
  logContentFeedPerf,
} from "@/lib/contentFeedDiagnostics";

type Props = {
  sound?: Sound | null;
  startTimeMs?: number;
  volume?: number;
  playing: boolean;
  diagnosticLabel?: string;
};

export default function SoundPlayback({
  sound,
  startTimeMs = 0,
  volume = 1,
  playing,
  diagnosticLabel,
}: Props) {
  const diagnosticMountedAtRef = useRef(contentFeedPerfNow());
  const [mountedAt] = useState(() => Date.now());
  const { activeCountry } = useActiveCountry();
  const territoryAllowed =
    !sound?.territories.length ||
    Boolean(activeCountry?.code && sound.territories.includes(activeCountry.code));
  const available =
    sound?.isAvailable !== false &&
    sound?.status === "ACTIVE" &&
    territoryAllowed &&
    (!sound.availableFrom || new Date(sound.availableFrom).getTime() <= mountedAt) &&
    (!sound.availableUntil || new Date(sound.availableUntil).getTime() > mountedAt);
  const source = available ? sound?.audioUrl ?? null : null;
  const player = useAudioPlayer(source, { updateInterval: 250, downloadFirst: false });
  const status = useAudioPlayerStatus(player);
  const playbackRequestRef = useRef(0);
  const screenFocused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const shouldPlay = playing && screenFocused && appActive;

  useEffect(() => {
    if (!diagnosticLabel) return;
    const mountedAt = diagnosticMountedAtRef.current;
    logContentFeedPerf("sound-player-mounted", {
      media: diagnosticLabel,
      hasSource: Boolean(source),
    });
    return () => {
      logContentFeedPerf("sound-player-unmounted", {
        media: diagnosticLabel,
        hasSource: Boolean(source),
        lifetimeMs: Math.round(contentFeedPerfNow() - mountedAt),
      });
    };
  }, [diagnosticLabel, source]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setAppActive(state === "active");
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    try {
      // expo-audio exposes volume as an imperative player property.
      // eslint-disable-next-line react-hooks/immutability
      player.volume = Math.max(0, Math.min(1, volume));
    } catch {
      // The native player can be released during a fast feed transition.
    }
  }, [player, volume]);

  useEffect(() => {
    const requestId = playbackRequestRef.current + 1;
    playbackRequestRef.current = requestId;
    if (!source || !shouldPlay) {
      try {
        player.pause();
      } catch {
        // The hook already released the underlying native object.
      }
      return;
    }
    void player
      .seekTo(startTimeMs / 1000)
      .then(() => {
        if (playbackRequestRef.current !== requestId) return;
        try {
          player.play();
        } catch {
          // Ignore a stale play request after the post left the screen.
        }
      })
      .catch(() => undefined);
    return () => {
      playbackRequestRef.current += 1;
      try {
        player.pause();
      } catch {
        // useAudioPlayer may have disposed the native object first.
      }
    };
  }, [player, shouldPlay, source, startTimeMs]);

  useEffect(() => {
    if (!shouldPlay || !status.didJustFinish) return;
    const requestId = playbackRequestRef.current;
    void player
      .seekTo(startTimeMs / 1000)
      .then(() => {
        if (playbackRequestRef.current !== requestId) return;
        try {
          player.play();
        } catch {
          // Ignore a loop request for a player that has just been released.
        }
      })
      .catch(() => undefined);
  }, [player, shouldPlay, startTimeMs, status.didJustFinish]);

  return null;
}
