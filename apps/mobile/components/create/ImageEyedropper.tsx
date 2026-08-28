/* eslint-disable react-hooks/purity, react-hooks/refs -- Gesture callbacks run only after touch events, not during React render. */
import { useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

type Props = {
  value: string;
  onSample: (normalizedX: number, normalizedY: number) => Promise<string>;
  onChange: (color: string) => void;
  onComplete: (color: string) => void;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export default function ImageEyedropper({
  value,
  onSample,
  onChange,
  onComplete,
}: Props) {
  const [frame, setFrame] = useState({ width: 1, height: 1 });
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [sampledColor, setSampledColor] = useState(value);
  const requestSequenceRef = useRef(0);
  const lastSampleAtRef = useRef(0);

  async function sampleAt(x: number, y: number, complete = false) {
    const clampedX = clamp(x, 0, frame.width);
    const clampedY = clamp(y, 0, frame.height);
    setPointer({ x: clampedX, y: clampedY });

    const now = Date.now();
    if (!complete && now - lastSampleAtRef.current < 32) return;
    lastSampleAtRef.current = now;
    const sequence = ++requestSequenceRef.current;
    try {
      const color = await onSample(
        clampedX / frame.width,
        clampedY / frame.height,
      );
      if (sequence !== requestSequenceRef.current) return;
      setSampledColor(color);
      onChange(color);
      if (complete) onComplete(color);
    } catch {
      if (complete) onComplete(sampledColor);
    }
  }

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .runOnJS(true)
        .onBegin((event) => {
          void sampleAt(event.x, event.y);
        })
        .onUpdate((event) => {
          void sampleAt(event.x, event.y);
        })
        .onEnd((event) => {
          void sampleAt(event.x, event.y, true);
        }),
    // The gesture must use the latest frame, callbacks and sampled color.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [frame.height, frame.width, onChange, onComplete, onSample, sampledColor],
  );

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessibilityRole="adjustable"
        onLayout={({ nativeEvent }) =>
          setFrame({
            width: nativeEvent.layout.width,
            height: nativeEvent.layout.height,
          })
        }
        style={styles.surface}
      >
        {pointer ? (
          <View
            pointerEvents="none"
            style={[
              styles.preview,
              {
                left: clamp(pointer.x - 29, 4, frame.width - 62),
                top: clamp(pointer.y - 92, 4, frame.height - 62),
                backgroundColor: sampledColor,
              },
            ]}
          >
            <View style={styles.previewTarget} />
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  surface: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 60,
  },
  preview: {
    position: "absolute",
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FAF9F6",
    borderRadius: 29,
    shadowColor: "#0B0B0A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 7,
    elevation: 10,
  },
  previewTarget: {
    width: 8,
    height: 8,
    borderWidth: 2,
    borderColor: "#FAF9F6",
    borderRadius: 4,
    backgroundColor: "transparent",
  },
});
