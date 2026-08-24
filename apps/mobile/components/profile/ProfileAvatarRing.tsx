import Avatar from "@/components/common/Avatar";
import { useAppTheme } from "@/contexts/ThemeContext";
import type { SnapIndicatorStatus } from "@/contexts/SnapIndicatorContext";
import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

type Props = {
  avatarUrl?: string | null;
  username?: string | null;
  snapIndicator: SnapIndicatorStatus | null;
  size?: number;
};

export default function ProfileAvatarRing({
  avatarUrl,
  username,
  snapIndicator,
  size = 100,
}: Props) {
  const { isDark } = useAppTheme();
  const hasSnap = snapIndicator !== null;
  const outerDiameter = size + (hasSnap ? 16 : 8);

  return (
    <View
      style={{
        width: outerDiameter,
        height: outerDiameter,
        borderRadius: outerDiameter / 2,
        backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={{ width: size, height: size, borderRadius: size / 2 }}>
        <Avatar
          uri={avatarUrl}
          username={username}
          size={size}
          showSnapIndicator={false}
        />
        {hasSnap ? (
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
              <LinearGradient id="profileSnapGradient" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#FFD447" />
                <Stop offset="0.52" stopColor="#FF9F1C" />
                <Stop offset="1" stopColor="#FF5B35" />
              </LinearGradient>
            </Defs>
            <Circle
              cx={(size + 12) / 2}
              cy={(size + 12) / 2}
              r={(size + 8) / 2}
              fill="none"
              stroke={snapIndicator === "unseen" ? "url(#profileSnapGradient)" : isDark ? "#6B7280" : "#9CA3AF"}
              strokeWidth={3}
            />
          </Svg>
        ) : null}
      </View>
    </View>
  );
}
