import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import {
  type EditableImage,
} from "@/components/create/SingleImageCropEditor";
import ContentCropPreview, {
  type ContentCropRect,
} from "@/components/create/ContentCropPreview";
import CustomColorPicker from "@/components/create/CustomColorPicker";
import ImageEyedropper from "@/components/create/ImageEyedropper";
import { sampleImageColor } from "@/lib/sampleImageColor";
import {
  renderImageMarkup,
  type MarkupBrush,
  type ImageTextMarkup,
  type MarkupPoint,
  type MarkupStroke,
} from "@/lib/renderImageMarkup";
import { Image } from "expo-image";
import {
  ArrowLeftIcon,
  ArrowCounterClockwiseIcon,
  EyedropperIcon,
  PaletteIcon,
  PencilSimpleIcon,
  TextAaIcon,
  TrashIcon,
} from "phosphor-react-native";
import * as Haptics from "expo-haptics";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

type Tool = "text" | "draw";

export type ImageMarkupState = {
  strokes: MarkupStroke[];
  textMarkup: ImageTextMarkup | null;
  fillColor: string | null;
  fillAfterStrokeIndex: number;
};

type Props = {
  image: EditableImage;
  allowText?: boolean;
  allowDrawing?: boolean;
  immersive?: boolean;
  crop?: ContentCropRect;
  outputWidth?: number;
  outputHeight?: number;
  initialStrokes?: MarkupStroke[];
  initialTextMarkup?: ImageTextMarkup | null;
  initialFillColor?: string | null;
  initialFillAfterStrokeIndex?: number;
  initialTool?: Tool;
  onCancel: () => void;
  onApply: (
    image: EditableImage,
    markup: ImageMarkupState,
  ) => void | Promise<void>;
};

const COLORS = ["#FAF9F6", "#171717", "#FF715B", "#F7C948", "#39D98A", "#5B8DEF", "#B983FF"];
const MIN_STROKE_WIDTH = 0.002;
const MAX_STROKE_WIDTH = 0.06;
const BRUSHES: readonly {
  id: MarkupBrush;
  labelKey: string;
  label: string;
  width: number;
  opacity: number;
}[] = [
  {
    id: "PENCIL",
    labelKey: "common:brushPencil",
    label: "Pencil",
    width: 0.004,
    opacity: 0.78,
  },
  {
    id: "PEN",
    labelKey: "common:brushPen",
    label: "Pen",
    width: 0.009,
    opacity: 1,
  },
  {
    id: "MARKER",
    labelKey: "common:brushMarker",
    label: "Marker",
    width: 0.022,
    opacity: 0.82,
  },
  {
    id: "HIGHLIGHTER",
    labelKey: "common:brushHighlighter",
    label: "Highlighter",
    width: 0.04,
    opacity: 0.38,
  },
];

function pathData(points: MarkupPoint[], width: number, height: number) {
  return points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x * width} ${point.y * height}`,
    )
    .join(" ");
}

function pointToSegmentDistance(
  pointX: number,
  pointY: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (segmentLengthSquared === 0) {
    return Math.hypot(pointX - startX, pointY - startY);
  }
  const position = Math.max(
    0,
    Math.min(
      1,
      ((pointX - startX) * segmentX + (pointY - startY) * segmentY) /
        segmentLengthSquared,
    ),
  );
  return Math.hypot(
    pointX - (startX + position * segmentX),
    pointY - (startY + position * segmentY),
  );
}

function colorChannels(color: string) {
  const normalized = color.replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function readableColorForeground(color: string) {
  const channels = colorChannels(color);
  if (!channels) return "#171717";
  const brightness =
    channels.red * 0.299 + channels.green * 0.587 + channels.blue * 0.114;
  return brightness > 155 ? "#171717" : "#FAF9F6";
}

function blendColors(background: string, foreground: string, opacity = 1) {
  const bottom = colorChannels(background);
  const top = colorChannels(foreground);
  if (!top) return background;
  if (!bottom || opacity >= 1) return foreground;
  const alpha = Math.max(0, Math.min(1, opacity));
  const channel = (front: number, back: number) =>
    Math.round(front * alpha + back * (1 - alpha))
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `#${channel(top.red, bottom.red)}${channel(top.green, bottom.green)}${channel(top.blue, bottom.blue)}`;
}

function strokeCoversPoint(
  stroke: MarkupStroke,
  normalizedX: number,
  normalizedY: number,
  width: number,
  height: number,
) {
  if (!stroke.points.length) return false;
  const pointX = normalizedX * width;
  const pointY = normalizedY * height;
  const radius = Math.max(1.5, (stroke.width * width) / 2);
  if (stroke.points.length === 1) {
    const onlyPoint = stroke.points[0];
    return (
      Math.hypot(
        pointX - onlyPoint.x * width,
        pointY - onlyPoint.y * height,
      ) <= radius
    );
  }
  return stroke.points.slice(1).some((point, index) => {
    const previous = stroke.points[index];
    return (
      pointToSegmentDistance(
        pointX,
        pointY,
        previous.x * width,
        previous.y * height,
        point.x * width,
        point.y * height,
      ) <= radius
    );
  });
}

export default function ImageMarkupEditor({
  image,
  allowText = true,
  allowDrawing = true,
  immersive = false,
  crop,
  outputWidth,
  outputHeight,
  initialStrokes = [],
  initialTextMarkup = null,
  initialFillColor = null,
  initialFillAfterStrokeIndex = 0,
  initialTool,
  onCancel,
  onApply,
}: Props) {
  const { t } = useTranslation(["common", "snaps", "create"]);
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [tool, setTool] = useState<Tool | null>(initialTool ?? null);
  const [color, setColor] = useState("#FAF9F6");
  const [strokes, setStrokes] = useState<MarkupStroke[]>(() =>
    initialStrokes.map((stroke) => ({
      ...stroke,
      points: stroke.points.map((point) => ({ ...point })),
    })),
  );
  const [draftStroke, setDraftStroke] = useState<MarkupStroke | null>(null);
  const [textMarkup, setTextMarkup] = useState<ImageTextMarkup | null>(
    initialTextMarkup ? { ...initialTextMarkup } : null,
  );
  const [fillColor, setFillColor] = useState<string | null>(initialFillColor);
  const [fillAfterStrokeIndex, setFillAfterStrokeIndex] = useState(() =>
    initialFillColor
      ? Math.max(
          0,
          Math.min(initialStrokes.length, initialFillAfterStrokeIndex),
        )
      : 0,
  );
  const [brush, setBrush] = useState<MarkupBrush>("PEN");
  const [strokeWidth, setStrokeWidth] = useState(0.009);
  const [widthTrack, setWidthTrack] = useState(1);
  const [customColorOpen, setCustomColorOpen] = useState(false);
  const [eyedropperActive, setEyedropperActive] = useState(false);
  const [frame, setFrame] = useState({ width: 1, height: 1 });
  const [busy, setBusy] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  const drawingGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(tool === "draw" && !busy)
        .minDistance(3)
        .onBegin((event) => {
          setDraftStroke({
            color,
            width: strokeWidth,
            opacity:
              BRUSHES.find((item) => item.id === brush)?.opacity ?? 1,
            brush,
            points: [{ x: event.x / frame.width, y: event.y / frame.height }],
          });
        })
        .onUpdate((event) => {
          setDraftStroke((current) =>
            current
              ? {
                  ...current,
                  points: [
                    ...current.points,
                    { x: event.x / frame.width, y: event.y / frame.height },
                  ],
                }
              : current,
          );
        })
        .onEnd(() => {
          setDraftStroke((current) => {
            if (current) setStrokes((items) => [...items, current]);
            return null;
          });
        })
        .runOnJS(true),
    [brush, busy, color, frame.height, frame.width, strokeWidth, tool],
  );

  const strokeWidthGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .runOnJS(true)
        .onBegin((event) => {
          setStrokeWidth(
            MIN_STROKE_WIDTH +
              (Math.max(0, Math.min(widthTrack, event.x)) / widthTrack) *
                (MAX_STROKE_WIDTH - MIN_STROKE_WIDTH),
          );
        })
        .onUpdate((event) => {
          setStrokeWidth(
            MIN_STROKE_WIDTH +
              (Math.max(0, Math.min(widthTrack, event.x)) / widthTrack) *
                (MAX_STROKE_WIDTH - MIN_STROKE_WIDTH),
          );
        }),
    [widthTrack],
  );

  const canvasGesture = useMemo(() => {
    const fillGesture = Gesture.LongPress()
      .enabled(tool === "draw" && !busy)
      .minDuration(450)
      .onStart(() => {
        setDraftStroke(null);
        setFillColor(color);
        setFillAfterStrokeIndex(strokes.length);
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      })
      .runOnJS(true);
    return Gesture.Race(fillGesture, drawingGesture);
  }, [busy, color, drawingGesture, strokes.length, tool]);

  const textGesture = useMemo(() => {
    const startX = textMarkup?.x ?? 0;
    const startY = textMarkup?.y ?? 0;
    const startSize = textMarkup?.fontSize ?? 0.06;
    const pan = Gesture.Pan()
      .enabled(!!textMarkup && tool !== "draw")
      .onUpdate((event) => {
        setTextMarkup((current) =>
          current
            ? {
                ...current,
                x: Math.max(0, Math.min(1 - current.width, startX + event.translationX / frame.width)),
                y: Math.max(0, Math.min(0.92, startY + event.translationY / frame.height)),
              }
            : current,
        );
      })
      .runOnJS(true);
    const pinch = Gesture.Pinch()
      .enabled(!!textMarkup && tool !== "draw")
      .onUpdate((event) => {
        setTextMarkup((current) =>
          current
            ? {
                ...current,
                fontSize: Math.max(0.025, Math.min(0.13, startSize * event.scale)),
              }
            : current,
        );
      })
      .runOnJS(true);
    return Gesture.Simultaneous(pan, pinch);
  }, [frame.height, frame.width, textMarkup, tool]);

  function beginText() {
    setTool("text");
    setTextMarkup((current) =>
      current ?? {
        text: "",
        x: 0.12,
        y: 0.38,
        width: 0.76,
        fontSize: 0.06,
        color,
      },
    );
    requestAnimationFrame(() => textInputRef.current?.focus());
  }

  function applyColor(next: string) {
    setColor(next);
    if (tool === "text") {
      setTextMarkup((current) =>
        current ? { ...current, color: next } : current,
      );
    }
  }

  async function sampleColorFromImage(normalizedX: number, normalizedY: number) {
    try {
      let visibleColor =
        fillColor ??
        (await sampleImageColor({
          uri: image.uri,
          normalizedX,
          normalizedY,
          sourceWidth: image.width,
          sourceHeight: image.height,
          crop,
        }));
      const visibleStrokes = fillColor
        ? strokes.slice(fillAfterStrokeIndex)
        : strokes;
      for (const stroke of visibleStrokes) {
        if (
          strokeCoversPoint(
            stroke,
            normalizedX,
            normalizedY,
            frame.width,
            frame.height,
          )
        ) {
          visibleColor = blendColors(
            visibleColor,
            stroke.color,
            stroke.opacity ?? 1,
          );
        }
      }
      return visibleColor;
    } catch (error) {
      console.warn("Could not sample image color", error);
      showToast(
        t("common:colorSampleError", {
          defaultValue: "Could not pick that color. Try another point.",
        }),
        { kind: "error" },
      );
      throw error;
    }
  }

  async function finish() {
    if (busy) return;
    Keyboard.dismiss();
    setBusy(true);
    try {
      const renderedWidth = crop ? outputWidth ?? 1080 : image.width;
      const renderedHeight = crop
        ? outputHeight ??
          Math.max(1, Math.round(1080 * (crop.height / crop.width)))
        : image.height;
      const edited = await renderImageMarkup(
        image.uri,
        renderedWidth,
        renderedHeight,
        strokes,
        textMarkup,
        fillColor,
        crop
          ? {
              ...crop,
              sourceWidth: image.width,
              sourceHeight: image.height,
            }
          : null,
        fillAfterStrokeIndex,
      );
      await onApply(edited, {
        strokes,
        textMarkup,
        fillColor,
        fillAfterStrokeIndex,
      });
    } catch (error) {
      console.error("Could not apply image markup", error);
      showToast(t("create:imageEditError"), { kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  const visibleStrokes = [
    ...(fillColor ? strokes.slice(fillAfterStrokeIndex) : strokes),
    ...(draftStroke ? [draftStroke] : []),
  ];
  const foreground = isDark ? "#FAF9F6" : "#171717";
  const canvasAspect = crop?.width && crop?.height
    ? crop.width / crop.height
    : image.width / image.height;

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}>
      <SafeAreaView edges={immersive ? [] : ["top", "bottom"]} style={{ flex: 1 }}>
        <View
          className="flex-row items-center px-4 py-2"
          style={
            immersive
              ? {
                  position: "absolute",
                  top: insets.top,
                  left: 0,
                  right: 0,
                  zIndex: 30,
                }
              : undefined
          }
        >
          <TouchableOpacity onPress={onCancel} disabled={busy} className="h-11 w-11 items-center justify-center rounded-full bg-black/10">
            <ArrowLeftIcon
              size={23}
              color={immersive ? "#FAF9F6" : foreground}
              weight="bold"
            />
          </TouchableOpacity>
          <Text
            className="flex-1 text-center text-base font-bold"
            style={{
              color: immersive ? "#FAF9F6" : foreground,
              textShadowColor: immersive ? "rgba(11,11,10,0.8)" : "transparent",
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: immersive ? 5 : 0,
            }}
          >
            {t("common:editPhoto")}
          </Text>
          <TouchableOpacity onPress={() => void finish()} disabled={busy} className="h-11 min-w-16 items-center justify-center rounded-full bg-brand px-4">
            {busy ? <ActivityIndicator color="#171717" /> : <Text className="font-bold text-[#171717]">{t("common:done")}</Text>}
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center justify-center overflow-hidden bg-[#111]">
          <GestureDetector gesture={canvasGesture}>
            <View
              onLayout={({ nativeEvent }) => setFrame(nativeEvent.layout)}
              style={{ width: "100%", aspectRatio: canvasAspect, maxHeight: "100%", overflow: "hidden" }}
            >
              {crop ? (
                <ContentCropPreview
                  sourceUri={image.uri}
                  sourceWidth={image.width}
                  sourceHeight={image.height}
                  crop={crop}
                  aspectRatio={canvasAspect}
                  canvasAspectRatio={canvasAspect}
                  disabled
                  onCropChange={() => undefined}
                />
              ) : (
                <Image source={{ uri: image.uri }} contentFit="fill" style={StyleSheet.absoluteFill} />
              )}
              {fillColor ? (
                <View
                  pointerEvents="none"
                  style={[StyleSheet.absoluteFill, { backgroundColor: fillColor }]}
                />
              ) : null}
              <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
                {visibleStrokes.map((stroke, index) => (
                  <Path
                    key={index}
                    d={pathData(stroke.points, frame.width, frame.height)}
                    stroke={stroke.color}
                    strokeOpacity={stroke.opacity ?? 1}
                    strokeWidth={stroke.width * frame.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ))}
              </Svg>
              {textMarkup ? (
                <GestureDetector gesture={textGesture}>
                  <View style={{ position: "absolute", left: textMarkup.x * frame.width, top: textMarkup.y * frame.height, width: textMarkup.width * frame.width }}>
                    <TextInput
                      ref={textInputRef}
                      value={textMarkup.text}
                      multiline
                      maxLength={160}
                      placeholder={t("snaps:textPlaceholder")}
                      placeholderTextColor="rgba(250,249,246,0.7)"
                      onChangeText={(text) => setTextMarkup((current) => current ? { ...current, text } : current)}
                      style={{
                        color: textMarkup.color,
                        fontSize: textMarkup.fontSize * frame.width,
                        fontWeight: "700",
                        textAlign: "center",
                        padding: 6,
                        textShadowColor: "rgba(0,0,0,0.6)",
                        textShadowOffset: { width: 0, height: 2 },
                        textShadowRadius: 5,
                        borderWidth: tool === "text" ? 1 : 0,
                        borderStyle: "dashed",
                        borderColor: "rgba(250,249,246,0.75)",
                      }}
                    />
                  </View>
                </GestureDetector>
              ) : null}
              {eyedropperActive ? (
                <ImageEyedropper
                  value={color}
                  onSample={sampleColorFromImage}
                  onChange={applyColor}
                  onComplete={(picked) => {
                    applyColor(picked);
                    setEyedropperActive(false);
                    void Haptics.selectionAsync();
                  }}
                />
              ) : null}
            </View>
          </GestureDetector>

          <View
            className="absolute right-3 gap-3"
            style={{ top: immersive ? insets.top + 58 : 12 }}
          >
            {allowText ? <MarkupTool label={t("snaps:textTool")} active={tool === "text"} onPress={beginText} icon={<TextAaIcon size={25} color="#FAF9F6" weight="bold" />} /> : null}
            {allowDrawing ? <MarkupTool label={t("common:draw")} active={tool === "draw"} onPress={() => { Keyboard.dismiss(); setTool("draw"); }} icon={<PencilSimpleIcon size={25} color="#FAF9F6" weight="bold" />} /> : null}
            <MarkupTool label={t("common:undo")} disabled={!strokes.length && !fillColor} onPress={() => {
              if (fillColor && strokes.length <= fillAfterStrokeIndex) {
                setFillColor(null);
                setFillAfterStrokeIndex(0);
              } else {
                setStrokes((current) => current.slice(0, -1));
              }
            }} icon={<ArrowCounterClockwiseIcon size={24} color="#FAF9F6" weight="bold" />} />
            <MarkupTool label={t("common:clear")} disabled={!strokes.length && !textMarkup && !fillColor} onPress={() => { setStrokes([]); setTextMarkup(null); setFillColor(null); setFillAfterStrokeIndex(0); setTool(null); Keyboard.dismiss(); }} icon={<TrashIcon size={23} color="#FAF9F6" weight="bold" />} />
          </View>
        </View>

        <View
          style={
            immersive
              ? {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: insets.bottom + 6,
                  zIndex: 30,
                }
              : undefined
          }
        >
        {tool === "draw" ? (
          <View className="px-4 pt-2">
            <View className="flex-row gap-2">
              {BRUSHES.map((item) => {
                const selected = brush === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => {
                      setBrush(item.id);
                      setStrokeWidth(item.width);
                    }}
                    className={`min-h-9 flex-1 items-center justify-center rounded-full px-2 ${selected ? "bg-brand" : "bg-black/45"}`}
                  >
                    <Text
                      numberOfLines={1}
                      className={`text-[11px] font-bold ${selected ? "text-[#171717]" : "text-[#FAF9F6]"}`}
                    >
                      {t(item.labelKey, {
                        defaultValue: item.label,
                      })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View className="mt-3 flex-row items-center justify-center gap-3">
              <View
                className="rounded-full bg-[#FAF9F6]"
                style={{
                  width: Math.max(3, strokeWidth * 260),
                  height: Math.max(3, strokeWidth * 260),
                  opacity:
                    BRUSHES.find((item) => item.id === brush)?.opacity ?? 1,
                }}
              />
              <GestureDetector gesture={strokeWidthGesture}>
                <View
                  accessible
                  accessibilityRole="adjustable"
                  accessibilityLabel={t("common:strokeWidth", {
                    defaultValue: "Stroke width",
                  })}
                  accessibilityValue={{
                    min: 1,
                    max: 100,
                    now: Math.round(
                      ((strokeWidth - MIN_STROKE_WIDTH) /
                        (MAX_STROKE_WIDTH - MIN_STROKE_WIDTH)) *
                        100,
                    ),
                  }}
                  onLayout={({ nativeEvent }) =>
                    setWidthTrack(nativeEvent.layout.width)
                  }
                  className="h-8 w-52 justify-center"
                >
                  <View className="h-1 rounded-full bg-white/35" />
                  <View
                    className="absolute left-0 h-1 rounded-full bg-brand"
                    style={{
                      width: `${((strokeWidth - MIN_STROKE_WIDTH) / (MAX_STROKE_WIDTH - MIN_STROKE_WIDTH)) * 100}%`,
                    }}
                  />
                  <View
                    className="absolute h-5 w-5 rounded-full border-2 border-[#FAF9F6] bg-brand"
                    style={{
                      left:
                        ((strokeWidth - MIN_STROKE_WIDTH) /
                          (MAX_STROKE_WIDTH - MIN_STROKE_WIDTH)) *
                          widthTrack -
                        10,
                    }}
                  />
                </View>
              </GestureDetector>
            </View>
          </View>
        ) : null}
        {tool ? (
          <View className="flex-row items-center justify-center gap-3 px-4 py-3">
            {COLORS.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => applyColor(item)}
                style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: item, borderWidth: color === item ? 3 : 1, borderColor: color === item ? "#F7C948" : "rgba(128,128,128,0.5)" }}
              />
            ))}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("common:customColor")}
              onPress={() => setCustomColorOpen((current) => !current)}
              className="h-[30px] w-[30px] items-center justify-center rounded-full"
              style={{
                backgroundColor: COLORS.some(
                  (item) => item.toUpperCase() === color.toUpperCase(),
                )
                  ? "#FAF9F6"
                  : color,
                borderWidth: COLORS.some(
                  (item) => item.toUpperCase() === color.toUpperCase(),
                )
                  ? 1
                  : 3,
                borderColor: COLORS.some(
                  (item) => item.toUpperCase() === color.toUpperCase(),
                )
                  ? "rgba(23,23,23,0.2)"
                  : "#F7C948",
              }}
            >
              <PaletteIcon
                size={18}
                color={
                  COLORS.some(
                    (item) => item.toUpperCase() === color.toUpperCase(),
                  )
                    ? "#171717"
                    : readableColorForeground(color)
                }
                weight="bold"
              />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("common:eyedropper", {
                defaultValue: "Eyedropper",
              })}
              onPress={() => {
                setCustomColorOpen(false);
                setEyedropperActive(true);
              }}
              className="h-[30px] w-[30px] items-center justify-center rounded-full border border-white/30 bg-black/35"
            >
              <EyedropperIcon size={18} color="#FAF9F6" weight="bold" />
            </TouchableOpacity>
          </View>
        ) : null}
        {tool === "draw" ? (
          <Text className="pb-2 text-center text-[11px] text-black/50 dark:text-white/50">
            {t("common:holdDrawToFill")}
          </Text>
        ) : null}
        </View>
      </SafeAreaView>
      {customColorOpen ? (
        <CustomColorPicker
          value={color}
          onChange={applyColor}
          onClose={() => setCustomColorOpen(false)}
        />
      ) : null}
    </View>
  );
}

function MarkupTool({ label, icon, active, disabled, onPress }: { label: string; icon: React.ReactNode; active?: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} className={`w-16 items-center py-2 ${disabled ? "opacity-35" : ""}`}>
      <View className={active ? "rounded-full bg-brand/30 p-2" : "p-2"}>{icon}</View>
      <Text numberOfLines={1} className="mt-0.5 text-[10px] font-semibold text-[#FAF9F6]" style={{ textShadowColor: "#0B0B0A", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 }}>{label}</Text>
    </TouchableOpacity>
  );
}
