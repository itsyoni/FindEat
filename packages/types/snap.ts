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
  imageUrl: string;
  caption?: string | null;
  createdAt: string;
  expiresAt: string;
  viewedAt?: string | null;
  user: UserSummary;
  restaurant?: SnapRestaurant | null;
};

export type SnapGroup = {
  user: UserSummary;
  snaps: Snap[];
  isOwn: boolean;
  hasUnseen: boolean;
};

export type CreateSnapInput = {
  imageUrl: string;
  caption?: string;
  restaurantId?: string;
};
