import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { CheckIcon, XIcon } from "phosphor-react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

type HsvColor = { h: number; s: number; v: number };

type Props = {
  value: string;
  onChange: (color: string) => void;
  onClose: () => void;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeHex(value: string) {
  const normalized = value.trim().replace(/^#/, "");
  return /^[0-9a-f]{6}$/i.test(normalized)
    ? `#${normalized.toUpperCase()}`
    : "#FF715B";
}

function hexToHsv(value: string): HsvColor {
  const hex = normalizeHex(value).slice(1);
  const red = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const green = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(hex.slice(4, 6), 16) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  let hue = 0;
  if (delta) {
    if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  if (hue < 0) hue += 360;
  return {
    h: hue,
    s: maximum === 0 ? 0 : delta / maximum,
    v: maximum,
  };
}

function hsvToHex({ h, s, v }: HsvColor) {
  const chroma = v * s;
  const segment = h / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const [red, green, blue] =
    segment < 1
      ? [chroma, secondary, 0]
      : segment < 2
        ? [secondary, chroma, 0]
        : segment < 3
          ? [0, chroma, secondary]
          : segment < 4
            ? [0, secondary, chroma]
            : segment < 5
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary];
  const match = v - chroma;
  const component = (item: number) =>
    Math.round((item + match) * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `#${component(red)}${component(green)}${component(blue)}`;
}

export default function CustomColorPicker({
  value,
  onChange,
  onClose,
}: Props) {
  const { t } = useTranslation("common");
  const { isDark } = useAppTheme();
  const [hsv, setHsv] = useState<HsvColor>(() => hexToHsv(value));
  const [square, setSquare] = useState({ width: 1, height: 1 });
  const [hueRailHeight, setHueRailHeight] = useState(1);

  function update(next: HsvColor) {
    setHsv(next);
    onChange(hsvToHex(next));
  }

  function updateSaturationValue(x: number, y: number) {
    update({
      ...hsv,
      s: clamp(x / square.width, 0, 1),
      v: 1 - clamp(y / square.height, 0, 1),
    });
  }

  function updateHue(y: number) {
    update({ ...hsv, h: clamp(y / hueRailHeight, 0, 1) * 359.999 });
  }

  const saturationGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((event) => updateSaturationValue(event.x, event.y))
        .onUpdate((event) => updateSaturationValue(event.x, event.y))
        .runOnJS(true),
    // Gesture callbacks intentionally use the current picker dimensions/state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hsv, square.height, square.width],
  );
  const hueGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((event) => updateHue(event.y))
        .onUpdate((event) => updateHue(event.y))
        .runOnJS(true),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hsv, hueRailHeight],
  );

  const selectedColor = hsvToHex(hsv);
  const pureHue = hsvToHex({ h: hsv.h, s: 1, v: 1 });
  const foreground = isDark ? "#FAF9F6" : "#171717";
  const surface = isDark ? "#242321" : "#FBFAF8";

  return (
    <View style={styles.overlay}>
      <Pressable accessibilityLabel={t("close")} onPress={onClose} style={StyleSheet.absoluteFill} />
      <View style={[styles.card, { backgroundColor: surface }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: foreground }]}>
              {t("customColor")}
            </Text>
            <Text style={styles.value}>{selectedColor}</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("close")}
            onPress={onClose}
            style={[styles.iconButton, { borderColor: isDark ? "#44413C" : "#DDD8D0" }]}
          >
            <XIcon size={20} color={foreground} weight="bold" />
          </TouchableOpacity>
        </View>

        <View style={styles.pickerRow}>
          <View
            onLayout={({ nativeEvent }) =>
              setSquare({
                width: nativeEvent.layout.width,
                height: nativeEvent.layout.height,
              })
            }
            style={[styles.saturationSquare, { backgroundColor: pureHue }]}
          >
            <LinearGradient
              colors={["#FFFFFF", "rgba(255,255,255,0)"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={["rgba(0,0,0,0)", "#000000"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <GestureDetector gesture={saturationGesture}>
              <View style={StyleSheet.absoluteFill} />
            </GestureDetector>
            <View
              pointerEvents="none"
              style={[
                styles.selector,
                {
                  left: hsv.s * square.width - 10,
                  top: (1 - hsv.v) * square.height - 10,
                  backgroundColor: selectedColor,
                },
              ]}
            />
          </View>

          <View
            onLayout={({ nativeEvent }) =>
              setHueRailHeight(nativeEvent.layout.height)
            }
            style={styles.hueRail}
          >
            <LinearGradient
              colors={[
                "#FF0000",
                "#FF00FF",
                "#0000FF",
                "#00FFFF",
                "#00FF00",
                "#FFFF00",
                "#FF0000",
              ]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <GestureDetector gesture={hueGesture}>
              <View style={StyleSheet.absoluteFill} />
            </GestureDetector>
            <View
              pointerEvents="none"
              style={[styles.hueSelector, { top: (hsv.h / 360) * hueRailHeight - 8 }]}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("done")}
            onPress={onClose}
            style={styles.doneButton}
          >
            <CheckIcon size={21} color="#171717" weight="bold" />
            <Text style={styles.doneText}>{t("done")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    backgroundColor: "rgba(11,11,10,0.5)",
  },
  card: {
    width: "100%",
    maxWidth: 390,
    borderRadius: 28,
    padding: 18,
    shadowColor: "#0B0B0A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontFamily: "CabinetBold" },
  value: { marginTop: 2, color: "#8D8880", fontSize: 12, fontFamily: "CabinetMedium" },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 20,
  },
  pickerRow: { flexDirection: "row", gap: 14 },
  saturationSquare: {
    flex: 1,
    aspectRatio: 1.12,
    overflow: "hidden",
    borderRadius: 18,
  },
  selector: {
    position: "absolute",
    width: 20,
    height: 20,
    borderWidth: 3,
    borderColor: "#FAF9F6",
    borderRadius: 10,
    shadowColor: "#0B0B0A",
    shadowOpacity: 0.65,
    shadowRadius: 3,
    elevation: 3,
  },
  hueRail: {
    width: 34,
    overflow: "hidden",
    borderRadius: 17,
  },
  hueSelector: {
    position: "absolute",
    left: -1,
    width: 36,
    height: 16,
    borderWidth: 3,
    borderColor: "#FAF9F6",
    borderRadius: 8,
    shadowColor: "#0B0B0A",
    shadowOpacity: 0.55,
    shadowRadius: 3,
    elevation: 3,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  doneButton: {
    minHeight: 48,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    backgroundColor: "#F7D786",
  },
  doneText: { color: "#171717", fontSize: 14, fontFamily: "CabinetBold" },
});
