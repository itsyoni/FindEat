import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { ContentCropRect } from "@/components/create/ContentCropPreview";

export function defaultContentCrop(
  sourceWidth: number,
  sourceHeight: number,
): ContentCropRect {
  return defaultImageCrop(sourceWidth, sourceHeight, 11 / 17);
}

export function defaultImageCrop(
  sourceWidth: number,
  sourceHeight: number,
  targetAspect: number,
): ContentCropRect {
  const sourceAspect = sourceWidth / sourceHeight;
  if (sourceAspect > targetAspect) {
    const width = sourceHeight * targetAspect;
    return {
      originX: (sourceWidth - width) / 2,
      originY: 0,
      width,
      height: sourceHeight,
    };
  }
  const height = sourceWidth / targetAspect;
  return {
    originX: 0,
    originY: (sourceHeight - height) / 2,
    width: sourceWidth,
    height,
  };
}

export async function renderContentCrop(uri: string, crop: ContentCropRect) {
  return renderImageCrop(uri, crop, 1100, 1700);
}

export async function renderImageCrop(
  uri: string,
  crop: ContentCropRect,
  targetWidth: number,
  targetHeight: number,
) {
  const width = Math.max(1, Math.floor(crop.width));
  const height = Math.max(1, Math.floor(crop.height));
  const context = ImageManipulator.manipulate(uri);
  context.crop({
    originX: Math.max(0, Math.floor(crop.originX)),
    originY: Math.max(0, Math.floor(crop.originY)),
    width,
    height,
  });
  context.resize({ width: targetWidth, height: targetHeight });
  const rendered = await context.renderAsync();
  return rendered.saveAsync({ compress: 0.92, format: SaveFormat.JPEG });
}
