import { useAccessibilityPreferences } from "@/contexts/AccessibilityContext";
import {
  Platform,
  StyleSheet,
  Text as RNText,
  TextProps,
} from "react-native";

type Props = TextProps & {
  scaleWithAccessibility?: boolean;
  weight?:
    | "thin"
    | "extralight"
    | "light"
    | "regular"
    | "medium"
    | "bold"
    | "extrabold"
    | "black";
};

const classFontSizes: Record<string, number> = {
  "text-xs": 12,
  "text-sm": 14,
  "text-base": 16,
  "text-lg": 18,
  "text-xl": 20,
  "text-2xl": 24,
  "text-3xl": 30,
  "text-4xl": 36,
  "text-5xl": 48,
};

function classFontSize(className?: string) {
  if (!className) return undefined;
  const tokens = className.split(/\s+/);
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (classFontSizes[token]) return classFontSizes[token];
    const arbitrary = token.match(/^text-\[(\d+(?:\.\d+)?)px\]$/);
    if (arbitrary) return Number(arbitrary[1]);
  }
  return undefined;
}

function classFontWeight(className?: string): Props["weight"] {
  if (!className) return undefined;
  const tokens = className.split(/\s+/);
  const weights: Record<string, NonNullable<Props["weight"]>> = {
    "font-thin": "thin",
    "font-extralight": "extralight",
    "font-light": "light",
    "font-normal": "regular",
    "font-medium": "medium",
    "font-semibold": "bold",
    "font-bold": "bold",
    "font-extrabold": "extrabold",
    "font-black": "black",
  };

  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const resolved = weights[tokens[index]];
    if (resolved) return resolved;
  }
  return undefined;
}

const fonts = {
  thin: "CabinetThin",
  extralight: "CabinetExtraLight",
  light: "CabinetLight",
  regular: "CabinetRegular",
  medium: "CabinetMedium",
  bold: "CabinetBold",
  extrabold: "CabinetExtraBold",
  black: "CabinetBlack",
};

export default function Text({
  weight,
  scaleWithAccessibility = true,
  style,
  ...props
}: Props) {
  const { textScale, usesSystemTextSize, boldText } =
    useAccessibilityPreferences();
  const flattenedStyle = StyleSheet.flatten(style);
  const baseFontSize =
    flattenedStyle?.fontSize ?? classFontSize(props.className) ?? 14;
  const requestedWeight = weight ?? classFontWeight(props.className) ?? "regular";
  const effectiveWeight =
    boldText && requestedWeight === "regular" ? "medium" : requestedWeight;
  const androidScale = Platform.OS === "android" ? 0.9 : 1;
  const appTextScale = usesSystemTextSize ? 1 : textScale;
  const shouldSetFontMetrics =
    Platform.OS === "android" ||
    (scaleWithAccessibility && !usesSystemTextSize);

  return (
    <RNText
      {...props}
      allowFontScaling={scaleWithAccessibility && usesSystemTextSize}
      maxFontSizeMultiplier={
        props.maxFontSizeMultiplier ?? (Platform.OS === "android" ? 1.15 : undefined)
      }
      style={[
        style,
        {
          fontFamily: fonts[effectiveWeight],
          fontWeight: "normal",
        },
        shouldSetFontMetrics
          ? {
              fontSize: Math.round(baseFontSize * appTextScale * androidScale),
              lineHeight: Math.round(
                baseFontSize * appTextScale * androidScale * 1.35,
              ),
            }
          : null,
      ]}
    />
  );
}
