import type { UserSummary } from "./user";

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

type CreateSnapBase = {
  clientRequestId?: string;
  caption?: string;
  restaurantId?: string;
};

export type CreateSnapInput = CreateSnapBase &
  (
    | { imageUrl: string; videoUrl?: never; durationMs?: never }
    | { imageUrl?: never; videoUrl: string; durationMs: number }
  );
