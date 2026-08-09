import { StorefrontIcon, UserIcon } from "phosphor-react-native";
import { StyleProp, View, ViewStyle } from "react-native";
import { SvgUri } from "react-native-svg";
import ProgressiveImage from "./ProgressiveImage";
import { useSnapIndicator } from "@/contexts/SnapIndicatorContext";

type Props = {
  uri?: string | null;
  thumbnailUrl?: string | null;
  username?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  fallbackType?: "user" | "restaurant";
  userId?: string | null;
  showSnapIndicator?: boolean;
};

export default function Avatar({
  uri,
  thumbnailUrl,
  username,
  size = 40,
  style,
  fallbackType = "user",
  userId,
  showSnapIndicator = true,
}: Props) {
  const resolvedUri = uri?.trim() || thumbnailUrl?.trim() || null;
  const snapIndicator = useSnapIndicator({
    userId,
    username,
    avatarUrl: resolvedUri,
    enabled: fallbackType === "user" && showSnapIndicator,
  });
  const circleStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };
  const ringWidth = Math.max(2, Math.min(3, size * 0.06));
  const mediaSize = size;
  const mediaStyle = {
    width: mediaSize,
    height: mediaSize,
    borderRadius: mediaSize / 2,
  };
  const isSvg =
    !!resolvedUri &&
    (resolvedUri.startsWith("data:image/svg+xml") ||
      resolvedUri.endsWith(".svg"));

  return (
    <View
      style={[circleStyle, { alignItems: "center", justifyContent: "center" }, style]}
    >
      <View style={{ ...mediaStyle, overflow: "hidden" }}>
        {!resolvedUri ? (
          <View
            style={mediaStyle}
            className="items-center justify-center bg-gray-200 dark:bg-gray-800"
          >
            {fallbackType === "restaurant" ? (
              <StorefrontIcon
                size={mediaSize * 0.5}
                color="#3B82F6"
                weight="fill"
              />
            ) : (
              <UserIcon
                size={mediaSize * 0.55}
                color="#9CA3AF"
                weight="fill"
              />
            )}
          </View>
        ) : isSvg ? (
          <SvgUri width={mediaSize} height={mediaSize} uri={resolvedUri} />
        ) : (
          <ProgressiveImage
            source={{ uri: resolvedUri }}
            thumbnailUrl={
              uri?.trim() && thumbnailUrl?.trim() ? thumbnailUrl.trim() : null
            }
            transition={160}
            style={mediaStyle}
          />
        )}
      </View>
      {snapIndicator ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            borderRadius: size / 2,
            borderWidth: ringWidth,
            borderColor:
              snapIndicator === "unseen" ? "#FF5B35" : "#9CA3AF",
          }}
        />
      ) : null}
    </View>
  );
}
