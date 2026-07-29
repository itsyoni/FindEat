import { apiClient } from '@/lib/api';
import type { MediaPurpose, MediaUploadTicket } from '@findeat/types';
import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 30 * 1024 * 1024;

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

export async function uploadImage(
  uri: string,
  purpose: MediaPurpose = 'other',
) {
  const file = new File(uri);
  if (!file.exists || file.size <= 0) throw new Error('Image file is unavailable.');
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Image must be smaller than 20 MB.');
  }

  const contentType = inferContentType(file, "image");
  const { data } = await apiClient.post<MediaUploadTicket>('/media/upload-url', {
    contentType,
    size: file.size,
    fileName: file.name,
    purpose,
  });

  const response = await expoFetch(data.uploadUrl, {
    method: 'PUT',
    headers: data.headers,
    body: file,
  });
  if (!response.ok) throw new Error('Could not upload image. Please try again.');
  return data.imageUrl;
}

export async function uploadVideo(uri: string) {
  const file = new File(uri);
  if (!file.exists || file.size <= 0) throw new Error("Video file is unavailable.");
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error("Video must be smaller than 30 MB.");
  }

  const contentType = inferContentType(file, "video");
  const { data } = await apiClient.post<MediaUploadTicket>("/media/upload-url", {
    contentType,
    size: file.size,
    fileName: file.name,
    purpose: "post",
  });
  const response = await expoFetch(data.uploadUrl, {
    method: "PUT",
    headers: data.headers,
    body: file,
  });
  if (!response.ok) throw new Error("Could not upload video. Please try again.");
  return data.mediaUrl ?? data.imageUrl;
}
