import type { Sound } from "@findeat/types";
import { useActiveCountry } from "@/contexts/ActiveCountryContext";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useState } from "react";

type Props = {
  sound?: Sound | null;
  startTimeMs?: number;
  volume?: number;
  playing: boolean;
};

export default function SoundPlayback({
  sound,
  startTimeMs = 0,
  volume = 1,
  playing,
}: Props) {
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

  useEffect(() => {
    // expo-audio exposes volume as an imperative player property.
    // eslint-disable-next-line react-hooks/immutability
    player.volume = Math.max(0, Math.min(1, volume));
  }, [player, volume]);

  useEffect(() => {
    if (!source || !playing) {
      player.pause();
      return;
    }
    void player.seekTo(startTimeMs / 1000).then(() => player.play());
    return () => player.pause();
  }, [player, playing, source, startTimeMs]);

  useEffect(() => {
    if (!playing || !status.didJustFinish) return;
    void player.seekTo(startTimeMs / 1000).then(() => player.play());
  }, [player, playing, startTimeMs, status.didJustFinish]);

  return null;
}
