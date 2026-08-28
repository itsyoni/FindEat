import { File, Paths } from "expo-file-system";
import {
  FontWeight,
  ImageFormat,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
} from "@shopify/react-native-skia";

export type MarkupPoint = { x: number; y: number };

export type MarkupBrush = "PEN" | "PENCIL" | "MARKER" | "HIGHLIGHTER";

export type MarkupStroke = {
  color: string;
  width: number;
  opacity?: number;
  brush?: MarkupBrush;
  points: MarkupPoint[];
};

export type ImageTextMarkup = {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  color: string;
};

export type MarkupSourceCrop = {
  originX: number;
  originY: number;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
};

export async function renderImageMarkup(
  sourceUri: string,
  width: number,
  height: number,
  strokes: MarkupStroke[],
  textMarkup: ImageTextMarkup | null,
  fillColor: string | null = null,
  sourceCrop: MarkupSourceCrop | null = null,
  fillAfterStrokeIndex = 0,
) {
  if (!strokes.length && !textMarkup?.text.trim() && !fillColor && !sourceCrop) {
    return { uri: sourceUri, width, height };
  }

  const source = new File(sourceUri);
  if (!source.exists) throw new Error("The edited photo is unavailable.");
  const data = Skia.Data.fromBytes(await source.bytes());
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) {
    data.dispose();
    throw new Error("The edited photo could not be decoded.");
  }
  const surface = Skia.Surface.Make(width, height);
  if (!surface) {
    image.dispose();
    data.dispose();
    throw new Error("The edited photo could not be rendered.");
  }

  const canvas = surface.getCanvas();
  const imagePaint = Skia.Paint();
  imagePaint.setAntiAlias(true);
  const sourceRect = sourceCrop
    ? Skia.XYWHRect(
        sourceCrop.originX * (image.width() / sourceCrop.sourceWidth),
        sourceCrop.originY * (image.height() / sourceCrop.sourceHeight),
        sourceCrop.width * (image.width() / sourceCrop.sourceWidth),
        sourceCrop.height * (image.height() / sourceCrop.sourceHeight),
      )
    : Skia.XYWHRect(0, 0, image.width(), image.height());
  canvas.drawImageRect(
    image,
    sourceRect,
    Skia.XYWHRect(0, 0, width, height),
    imagePaint,
  );

  const normalizedFillIndex = fillColor
    ? Math.max(0, Math.min(strokes.length, fillAfterStrokeIndex))
    : 0;

  const drawStroke = (stroke: MarkupStroke) => {
    if (!stroke.points.length) return;
    const path = Skia.Path.Make();
    const first = stroke.points[0];
    path.moveTo(first.x * width, first.y * height);
    for (const point of stroke.points.slice(1)) {
      path.lineTo(point.x * width, point.y * height);
    }
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeCap(StrokeCap.Round);
    paint.setStrokeJoin(StrokeJoin.Round);
    paint.setStrokeWidth(Math.max(2, stroke.width * width));
    paint.setColor(Skia.Color(stroke.color));
    paint.setAlphaf(stroke.opacity ?? 1);
    canvas.drawPath(path, paint);
    paint.dispose();
    path.dispose();
  };

  for (const stroke of strokes.slice(0, normalizedFillIndex)) {
    drawStroke(stroke);
  }

  if (fillColor) {
    const fillPaint = Skia.Paint();
    fillPaint.setColor(Skia.Color(fillColor));
    canvas.drawPaint(fillPaint);
    fillPaint.dispose();
  }

  for (const stroke of strokes.slice(normalizedFillIndex)) {
    drawStroke(stroke);
  }

  if (textMarkup?.text.trim()) {
    const builder = Skia.ParagraphBuilder.Make({});
    builder.pushStyle({
      color: Skia.Color(textMarkup.color),
      fontFamilies: ["Arial", "sans-serif"],
      fontSize: textMarkup.fontSize * width,
      fontStyle: { weight: FontWeight.Bold },
      shadows: [
        {
          color: Skia.Color("rgba(0,0,0,0.55)"),
          offset: Skia.Point(0, Math.max(1, width * 0.002)),
          blurRadius: Math.max(2, width * 0.005),
        },
      ],
    });
    builder.addText(textMarkup.text.trim());
    const paragraph = builder.build();
    paragraph.layout(Math.max(1, textMarkup.width * width));
    paragraph.paint(canvas, textMarkup.x * width, textMarkup.y * height);
    paragraph.dispose();
    builder.dispose();
  }

  surface.flush();
  const snapshot = surface.makeImageSnapshot();
  const bytes = snapshot.encodeToBytes(ImageFormat.JPEG, 94);
  const output = new File(
    Paths.cache,
    `findeat-markup-${Date.now()}.jpg`,
  );
  output.create({ overwrite: true, intermediates: true });
  output.write(bytes);

  snapshot.dispose();
  imagePaint.dispose();
  surface.dispose();
  image.dispose();
  data.dispose();
  return { uri: output.uri, width, height };
}
