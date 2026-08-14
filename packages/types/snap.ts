import type { UserSummary } from "./user";
import type { Sound, SoundAttachmentInput } from "./sound";

export type SnapRestaurant = {
  id: string;
  name: string;
  logoUrl?: string | null;
  address?: string | null;
  city?: string | null;
};

export type Snap = {
  id: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  durationMs?: number | null;
  caption?: string | null;
  createdAt: string;
  expiresAt: string;
  viewedAt?: string | null;
  viewsCount?: number;
  user: UserSummary;
  restaurant?: SnapRestaurant | null;
  sound?: Sound | null;
  soundStartTimeMs?: number;
  soundVolume?: number;
  originalAudioVolume?: number;
};

export type SnapViewer = {
  viewedAt: string;
  user: UserSummary;
};

export type SnapGroup = {
  user: UserSummary;
  snaps: Snap[];
  isOwn: boolean;
  hasUnseen: boolean;
};

type CreateSnapBase = SoundAttachmentInput & {
  clientRequestId?: string;
  caption?: string;
  restaurantId?: string;
};

export type CreateSnapInput = CreateSnapBase &
  (
    | { imageUrl: string; videoUrl?: never; durationMs?: never }
    | { imageUrl?: never; videoUrl: string; durationMs: number }
  );
