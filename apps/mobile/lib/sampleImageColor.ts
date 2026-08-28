import type { ContentCropRect } from "@/components/create/ContentCropPreview";
import { File } from "expo-file-system";
import {
  AlphaType,
  ColorType,
  Skia,
} from "@shopify/react-native-skia";

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function componentToHex(value: number) {
  return Math.round(value).toString(16).padStart(2, "0").toUpperCase();
}

export async function sampleImageColor({
  uri,
  normalizedX,
  normalizedY,
  sourceWidth,
  sourceHeight,
  crop,
}: {
  uri: string;
  normalizedX: number;
  normalizedY: number;
  sourceWidth: number;
  sourceHeight: number;
  crop?: ContentCropRect | null;
}) {
  const source = new File(uri);
  if (!source.exists) throw new Error("The photo is unavailable.");

  const data = Skia.Data.fromBytes(await source.bytes());
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) {
    data.dispose();
    throw new Error("The photo could not be decoded.");
  }

  try {
    const xInSource = crop
      ? crop.originX + clamp(normalizedX, 0, 1) * crop.width
      : clamp(normalizedX, 0, 1) * sourceWidth;
    const yInSource = crop
      ? crop.originY + clamp(normalizedY, 0, 1) * crop.height
      : clamp(normalizedY, 0, 1) * sourceHeight;
    const pixelX = clamp(
      Math.round((xInSource / sourceWidth) * image.width()),
      0,
      image.width() - 1,
    );
    const pixelY = clamp(
      Math.round((yInSource / sourceHeight) * image.height()),
      0,
      image.height() - 1,
    );
    const pixels = image.readPixels(pixelX, pixelY, {
      width: 1,
      height: 1,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    });
    if (!pixels || pixels.length < 3) {
      throw new Error("The selected color could not be read.");
    }
    const red = pixels[0];
    const green = pixels[1];
    const blue = pixels[2];
    return `#${componentToHex(red)}${componentToHex(green)}${componentToHex(blue)}`;
  } finally {
    image.dispose();
    data.dispose();
  }
}
