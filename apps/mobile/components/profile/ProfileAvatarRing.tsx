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
  const snapRingGap = 3;
  const snapDiameter = hasSnap
    ? size + (snapRingWidth + snapRingGap) * 2
    : size;
  const outerDiameter = snapDiameter + profileRingWidth * 2;

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
      <View
        style={{
          width: snapDiameter,
          height: snapDiameter,
          borderRadius: snapDiameter / 2,
          borderWidth: hasSnap ? snapRingWidth : 0,
          borderColor:
            snapIndicator === "unseen"
              ? "#FF5B35"
              : snapIndicator === "viewed"
                ? isDark
                  ? "#6B7280"
                  : "#9CA3AF"
                : "transparent",
          padding: hasSnap ? snapRingGap : 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Avatar
          uri={avatarUrl}
          username={username}
          size={size}
          showSnapIndicator={false}
        />
      </View>
    </View>
  );
}
