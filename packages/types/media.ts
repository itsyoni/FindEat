export type MediaPurpose =
  | "avatar"
  | "cover"
  | "post"
  | "review"
  | "dish"
  | "restaurant"
  | "list"
  | "product-update"
  | "snap"
  | "sound"
  | "other";

export type MediaUploadTicket = {
  uploadUrl: string;
  imageUrl: string;
  mediaUrl?: string;
  thumbnailUrl: string;
  key: string;
  expiresIn: number;
  headers: Record<string, string>;
};
