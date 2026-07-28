export type MediaPurpose =
  | "avatar"
  | "cover"
  | "post"
  | "review"
  | "dish"
  | "restaurant"
  | "list"
  | "product-update"
  | "other";

export type MediaUploadTicket = {
  uploadUrl: string;
  imageUrl: string;
  thumbnailUrl: string;
  key: string;
  expiresIn: number;
  headers: Record<string, string>;
};
