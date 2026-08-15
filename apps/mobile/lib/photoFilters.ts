import { File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { ImageFormat, Skia } from "@shopify/react-native-skia";

export type PhotoFilterId =
  | "ORIGINAL"
  | "WARM"
  | "COOL"
  | "MONO"
  | "CONTRAST";

export type PhotoFilter = {
  id: PhotoFilterId;
  labelKey: string;
  matrix: number[];
};

const IDENTITY = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1, 0,
];

export const PHOTO_FILTERS: PhotoFilter[] = [
  { id: "ORIGINAL", labelKey: "photoFilterOriginal", matrix: IDENTITY },
  {
    id: "WARM",
    labelKey: "photoFilterWarm",
    matrix: [
      1.12, 0.03, 0, 0, 0.02,
      0.02, 1.04, 0, 0, 0.01,
      0, 0.01, 0.9, 0, -0.01,
      0, 0, 0, 1, 0,
    ],
  },
  {
    id: "COOL",
    labelKey: "photoFilterCool",
    matrix: [
      0.92, 0, 0.02, 0, -0.01,
      0, 1.02, 0.02, 0, 0.005,
      0.01, 0.03, 1.12, 0, 0.02,
      0, 0, 0, 1, 0,
    ],
  },
  {
    id: "MONO",
    labelKey: "photoFilterMono",
    matrix: [
      0.2126, 0.7152, 0.0722, 0, 0,
      0.2126, 0.7152, 0.0722, 0, 0,
      0.2126, 0.7152, 0.0722, 0, 0,
      0, 0, 0, 1, 0,
    ],
  },
  {
    id: "CONTRAST",
    labelKey: "photoFilterContrast",
    matrix: [
      1.22, 0, 0, 0, -0.11,
      0, 1.22, 0, 0, -0.11,
      0, 0, 1.22, 0, -0.11,
      0, 0, 0, 1, 0,
    ],
  },
];

export function photoFilterMatrix(filterId: PhotoFilterId) {
  return (
    PHOTO_FILTERS.find((filter) => filter.id === filterId)?.matrix ?? IDENTITY
  );
}

export async function applyPhotoFilter(
  sourceUri: string,
  filterId: PhotoFilterId,
) {
  if (filterId === "ORIGINAL") {
    return { uri: sourceUri };
  }

  // Normalizing first applies camera/gallery orientation metadata and bounds
  // memory use for very large modern phone photos before creating a surface.
  const source = new File(sourceUri);
  if (!source.exists) throw new Error("The selected photo is unavailable.");
  // Rendering once through ImageManipulator bakes HEIC/JPEG orientation into
  // the pixels before Skia applies the color matrix.
  const manipulator = ImageManipulator.manipulate(sourceUri);
  const rendered = await manipulator.renderAsync();
  const normalized = await rendered.saveAsync({
    compress: 0.94,
    format: SaveFormat.JPEG,
  });

  const longestEdge = Math.max(normalized.width, normalized.height);
  const scale = longestEdge > 2560 ? 2560 / longestEdge : 1;
  const outputWidth = Math.max(1, Math.round(normalized.width * scale));
  const outputHeight = Math.max(1, Math.round(normalized.height * scale));

  let preparedUri = normalized.uri;
  if (scale < 1) {
    const resize = ImageManipulator.manipulate(normalized.uri);
    resize.resize({ width: outputWidth, height: outputHeight });
    const resized = await resize.renderAsync();
    preparedUri = (
      await resized.saveAsync({ compress: 0.94, format: SaveFormat.JPEG })
    ).uri;
  }

  const normalizedFile = new File(preparedUri);
  const normalizedBytes = await normalizedFile.bytes();
  const data = Skia.Data.fromBytes(normalizedBytes);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) {
    data.dispose();
    throw new Error("The selected photo could not be prepared.");
  }

  const surface = Skia.Surface.Make(outputWidth, outputHeight);
  if (!surface) {
    image.dispose();
    data.dispose();
    throw new Error("The photo filter could not be created.");
  }

  const paint = Skia.Paint();
  const colorFilter = Skia.ColorFilter.MakeMatrix(
    photoFilterMatrix(filterId),
  );
  paint.setColorFilter(colorFilter);
  const canvas = surface.getCanvas();
  canvas.drawImageRect(
    image,
    Skia.XYWHRect(0, 0, image.width(), image.height()),
    Skia.XYWHRect(0, 0, outputWidth, outputHeight),
    paint,
  );
  surface.flush();
  const snapshot = surface.makeImageSnapshot();
  const outputBytes = snapshot.encodeToBytes(ImageFormat.JPEG, 92);
  const output = new File(
    Paths.cache,
    `findeat-filter-${filterId.toLowerCase()}-${Date.now()}.jpg`,
  );
  output.create({ overwrite: true, intermediates: true });
  output.write(outputBytes);

  snapshot.dispose();
  colorFilter.dispose();
  paint.dispose();
  surface.dispose();
  image.dispose();
  data.dispose();

  return { uri: output.uri, width: outputWidth, height: outputHeight };
}
