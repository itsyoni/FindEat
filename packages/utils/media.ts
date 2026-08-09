const CLOUDFLARE_IMAGE_PATH = "/cdn-cgi/image/";
const CLOUDINARY_UPLOAD_PATH = "/image/upload/";

export type ThumbnailOptions = {
  width?: number;
  quality?: number;
  blur?: number;
};

/**
 * Older restaurant dashboard uploads were stored as AVIF files. Some Android
 * image decoders cannot display those originals, so ask Cloudinary for an
 * equivalent JPEG while leaving every other media URL unchanged.
 */
export function getMobileCompatibleImageUrl(
  imageUrl?: string | null,
): string | null {
  if (!imageUrl) return null;

  try {
    const source = new URL(imageUrl);
    if (
      source.hostname !== "res.cloudinary.com" ||
      !source.pathname.includes(CLOUDINARY_UPLOAD_PATH) ||
      !source.pathname.toLowerCase().endsWith(".avif")
    ) {
      return imageUrl;
    }

    source.pathname = source.pathname.replace(
      CLOUDINARY_UPLOAD_PATH,
      `${CLOUDINARY_UPLOAD_PATH}f_jpg,q_auto/`,
    );
    // Keep the extension consistent with the requested format. Android image
    // loaders can still choose the AVIF decoder from a trailing `.avif`, even
    // when Cloudinary correctly responds with JPEG bytes.
    source.pathname = source.pathname.replace(/\.avif$/i, ".jpg");
    return source.toString();
  } catch {
    return imageUrl;
  }
}

/**
 * Builds a cached Cloudflare Image Transformation URL for media served from R2.
 * Non-HTTP and already-transformed sources are intentionally left untouched.
 */
export function getThumbnailUrl(
  imageUrl?: string | null,
  options: ThumbnailOptions = {},
): string | null {
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) return null;

  try {
    const source = new URL(imageUrl);
    if (source.pathname.startsWith(CLOUDFLARE_IMAGE_PATH)) return imageUrl;
    if (
      source.hostname !== "findeat.space" &&
      !source.hostname.endsWith(".findeat.space")
    ) {
      return null;
    }

    const width = Math.max(16, Math.min(128, options.width ?? 64));
    const quality = Math.max(1, Math.min(50, options.quality ?? 22));
    const blur = Math.max(0, Math.min(50, options.blur ?? 6));
    const transforms = [
      `width=${width}`,
      `quality=${quality}`,
      "format=auto",
      "fit=scale-down",
      blur > 0 ? `blur=${blur}` : null,
    ]
      .filter(Boolean)
      .join(",");

    return `${source.origin}${CLOUDFLARE_IMAGE_PATH}${transforms}${source.pathname}${source.search}`;
  } catch {
    return null;
  }
}
