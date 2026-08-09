import Avatar from "@/components/common/Avatar";
import { useAppTheme } from "@/contexts/ThemeContext";
import type { SnapIndicatorStatus } from "@/contexts/SnapIndicatorContext";
import { View } from "react-native";

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
  const profileRingWidth = 4;
  const snapRingWidth = 3;
  const outerDiameter = size + profileRingWidth * 2;

  return (
    <View
      style={{
        width: outerDiameter,
        height: outerDiameter,
        borderRadius: outerDiameter / 2,
        padding: profileRingWidth,
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
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: size / 2,
              borderWidth: snapRingWidth,
              borderColor:
                snapIndicator === "unseen"
                  ? "#FF5B35"
                  : isDark
                    ? "#6B7280"
                    : "#9CA3AF",
            }}
          />
        ) : null}
      </View>
    </View>
  );
}
