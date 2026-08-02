import { StorefrontIcon, UserIcon } from "phosphor-react-native";
import { StyleProp, View, ViewStyle } from "react-native";
import { SvgUri } from "react-native-svg";
import ProgressiveImage from "./ProgressiveImage";
import { useSnapIndicator } from "@/contexts/SnapIndicatorContext";

type Props = {
  uri?: string | null;
  username?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  fallbackType?: "user" | "restaurant";
  userId?: string | null;
  showSnapIndicator?: boolean;
};

export default function Avatar({
  uri,
  username,
  size = 40,
  style,
  fallbackType = "user",
  userId,
  showSnapIndicator = true,
}: Props) {
  const snapIndicator = useSnapIndicator({
    userId,
    username,
    avatarUrl: uri,
    enabled: fallbackType === "user" && showSnapIndicator,
  });
  const circleStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };
  const isSvg =
    !!uri && (uri.startsWith("data:image/svg+xml") || uri.endsWith(".svg"));

  return (
    <View style={[circleStyle, style]}>
      {!uri ? (
        <View
          style={circleStyle}
          className="items-center justify-center bg-gray-200 dark:bg-gray-800"
        >
          {fallbackType === "restaurant" ? (
            <StorefrontIcon size={size * 0.5} color="#3B82F6" weight="fill" />
          ) : (
            <UserIcon size={size * 0.55} color="#9CA3AF" weight="fill" />
          )}
        </View>
      ) : (
      <View
        style={{ ...circleStyle, overflow: "hidden" }}
      >
        {isSvg ? (
          <SvgUri width={size} height={size} uri={uri} />
        ) : (
          <ProgressiveImage
            source={{ uri }}
            transition={160}
            style={circleStyle}
          />
        )}
      </View>
      )}
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
            borderWidth: Math.max(2, Math.min(3, size * 0.06)),
            borderColor:
              snapIndicator === "unseen" ? "#FF5B35" : "#9CA3AF",
          }}
        />
      ) : null}
    </View>
  );
}
