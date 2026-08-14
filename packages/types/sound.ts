export type SoundProvider = "FINDEAT" | "INDEPENDENT" | "COMMERCIAL";
export type SoundStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export type Sound = {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string | null;
  audioUrl?: string | null;
  durationMs: number;
  provider: SoundProvider;
  externalSoundId?: string | null;
  categories: string[];
  territories: string[];
  status: SoundStatus;
  availableFrom?: string | null;
  availableUntil?: string | null;
  usageCount?: number;
  isAvailable?: boolean;
};

export type SoundSelection = {
  sound: Sound;
  soundStartTimeMs: number;
  soundVolume: number;
  originalAudioVolume: number;
};

export type SoundAttachmentInput = {
  soundId?: string;
  soundStartTimeMs?: number;
  soundVolume?: number;
  originalAudioVolume?: number;
};
