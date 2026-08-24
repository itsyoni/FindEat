import { StorefrontIcon, UserIcon, UsersThreeIcon } from "phosphor-react-native";
import { StyleProp, View, ViewStyle } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  SvgUri,
  Stop,
} from "react-native-svg";
import ProgressiveImage from "./ProgressiveImage";
import { useSnapIndicator } from "@/contexts/SnapIndicatorContext";

type Props = {
  uri?: string | null;
  thumbnailUrl?: string | null;
  username?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  fallbackType?: "user" | "restaurant" | "group";
  userId?: string | null;
  showSnapIndicator?: boolean;
  snapIndicatorStrokeWidth?: number;
  snapIndicatorViewedColor?: string;
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
  snapIndicatorStrokeWidth = 2.5,
  snapIndicatorViewedColor = "#9CA3AF",
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
            ) : fallbackType === "group" ? (
              <UsersThreeIcon size={mediaSize * 0.58} color="#9CA3AF" weight="fill" />
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
        <Svg
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -6,
            left: -6,
          }}
          width={size + 12}
          height={size + 12}
          viewBox={`0 0 ${size + 12} ${size + 12}`}
        >
          <Defs>
            <SvgLinearGradient id="unseenSnapRing" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFD447" />
              <Stop offset="0.52" stopColor="#FF9F1C" />
              <Stop offset="1" stopColor="#FF5B35" />
            </SvgLinearGradient>
          </Defs>
          <Circle
            cx={(size + 12) / 2}
            cy={(size + 12) / 2}
            r={(size + 8) / 2}
            fill="none"
            stroke={
              snapIndicator === "unseen"
                ? "url(#unseenSnapRing)"
                : snapIndicatorViewedColor
            }
            strokeWidth={snapIndicatorStrokeWidth}
          />
        </Svg>
      ) : null}
    </View>
  );
}
