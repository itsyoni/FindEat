import { apiClient } from '@/lib/api';
import type { MediaPurpose, MediaUploadTicket } from '@findeat/types';
import { getErrorMessage } from '@findeat/utils';
import { isAxiosError } from 'axios';
import { File } from 'expo-file-system';

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export type UploadProgressCallback = (progress: number) => void;

function inferContentType(file: File, kind: "image" | "video") {
  if (kind === "video") {
    if (file.type === "video/quicktime" || file.extension === ".mov") {
      return "video/quicktime";
    }
    return "video/mp4";
  }
  if (file.type === 'image/jpg') return 'image/jpeg';
  if (
    file.type === 'image/jpeg' ||
    file.type === 'image/png' ||
    file.type === 'image/webp' ||
    file.type === 'image/heic' ||
    file.type === 'image/heif'
  ) {
    return file.type;
  }
  const extension = file.extension.toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.heic') return 'image/heic';
  if (extension === '.heif') return 'image/heif';
  return 'image/jpeg';
}

function uploadMetadata(file: File, kind: "image" | "video", purpose: MediaPurpose) {
  const size = Math.trunc(Number(file.size));
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new Error(
      kind === "image"
        ? "Image file is unavailable."
        : "Video file is unavailable.",
    );
  }

  const fileName = typeof file.name === "string" ? file.name.trim() : "";
  return {
    contentType: inferContentType(file, kind),
    size,
    ...(fileName ? { fileName } : {}),
    purpose,
  };
}

async function createUploadTicket(
  file: File,
  kind: "image" | "video",
  purpose: MediaPurpose,
) {
  const metadata = uploadMetadata(file, kind, purpose);
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const { data } = await apiClient.post<MediaUploadTicket>(
        "/media/upload-url",
        metadata,
        { timeout: 12_000 },
      );
      return data;
    } catch (error) {
      const networkFailure = isAxiosError(error) && !error.response;
      if (networkFailure && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        continue;
      }

      const fallbackMessage = networkFailure
        ? "Could not reach the upload server. Check your connection and try again."
        : "The server rejected the media upload.";
      const detail = getErrorMessage(error, fallbackMessage);
      const endpoint = isAxiosError(error) ? error.config?.url : undefined;
      console.warn("Could not prepare media upload", {
        endpoint,
        status: isAxiosError(error) ? error.response?.status : undefined,
        attempt,
        detail,
      });
      throw new Error(
        networkFailure && detail === "Network Error" ? fallbackMessage : detail,
      );
    }
  }

  throw new Error("Could not reach the upload server. Please try again.");
}

export async function uploadImage(
  uri: string,
  purpose: MediaPurpose = 'other',
  onProgress?: UploadProgressCallback,
) {
  const file = new File(uri);
  const metadata = uploadMetadata(file, "image", purpose);
  if (!file.exists) throw new Error('Image file is unavailable.');
  if (metadata.size > MAX_IMAGE_BYTES) {
    throw new Error('Image must be smaller than 20 MB.');
  }

  const data = await createUploadTicket(file, "image", purpose);

  const task = file.createUploadTask(data.uploadUrl, {
    httpMethod: 'PUT',
    headers: data.headers,
    sessionType: 'background',
    onProgress: ({ bytesSent, totalBytes }) => {
      if (totalBytes > 0) onProgress?.(bytesSent / totalBytes);
    },
  });
  const response = await task.uploadAsync();
  if (response.status < 200 || response.status >= 300) {
    throw new Error('Could not upload image. Please try again.');
  }
  const publicUrl = [data.imageUrl, data.mediaUrl].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  if (!publicUrl) {
    throw new Error("The media server did not return an image URL.");
  }
  onProgress?.(1);
  return publicUrl;
}

export async function uploadVideo(
  uri: string,
  onProgress?: UploadProgressCallback,
) {
  const file = new File(uri);
  if (!file.exists) throw new Error("Video file is unavailable.");

  const data = await createUploadTicket(file, "video", "post");
  const task = file.createUploadTask(data.uploadUrl, {
    httpMethod: "PUT",
    headers: data.headers,
    sessionType: "background",
    onProgress: ({ bytesSent, totalBytes }) => {
      if (totalBytes > 0) onProgress?.(bytesSent / totalBytes);
    },
  });
  const response = await task.uploadAsync();
  if (response.status < 200 || response.status >= 300) {
    throw new Error("Could not upload video. Please try again.");
  }
  onProgress?.(1);
  return data.mediaUrl ?? data.imageUrl;
}
