import { Image } from "expo-image";
import { useEffect, useState, type ReactNode } from "react";
import {
  Image as NativeImage,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
  View,
} from "react-native";
import Text from "./AppText";

type Props = {
  uri: string;
  width: DimensionValue;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  showGiphyAttribution?: boolean;
};

function boundedAspectRatio(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || height <= 0) {
    return 1;
  }
  return Math.max(0.55, Math.min(1.8, width / height));
}

export default function AdaptiveGif({
  uri,
  width,
  style,
  children,
  showGiphyAttribution = true,
}: Props) {
  const [aspectRatio, setAspectRatio] = useState(1);

  useEffect(() => {
    let active = true;
    NativeImage.getSize(
      uri,
      (imageWidth, imageHeight) => {
        if (active) {
          setAspectRatio(boundedAspectRatio(imageWidth, imageHeight));
        }
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [uri]);

  return (
    <View style={[{ width, aspectRatio, overflow: "hidden" }, style]}>
      <Image
        source={{ uri }}
        style={{ width: "100%", height: "100%" }}
        contentFit="contain"
      />
      {showGiphyAttribution ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 7,
            bottom: 7,
            height: 22,
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            borderRadius: 6,
            paddingHorizontal: 7,
            backgroundColor: "rgba(11,11,10,0.72)",
          }}
        >
          <View style={{ flexDirection: "row", gap: 1 }}>
            <View style={{ width: 2, height: 10, backgroundColor: "#00CCFF" }} />
            <View style={{ width: 2, height: 10, backgroundColor: "#2DCC70" }} />
            <View style={{ width: 2, height: 10, backgroundColor: "#FFF35C" }} />
            <View style={{ width: 2, height: 10, backgroundColor: "#FF6666" }} />
            <View style={{ width: 2, height: 10, backgroundColor: "#9933FF" }} />
          </View>
          <Text
            scaleWithAccessibility={false}
            weight="bold"
            style={{
              color: "#FAF9F6",
              fontSize: 10,
              lineHeight: 12,
              letterSpacing: 0.7,
            }}
          >
            GIPHY
          </Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}
