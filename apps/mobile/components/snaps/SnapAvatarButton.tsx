import Avatar from "@/components/common/Avatar";
import FullScreenImageViewer from "@/components/common/FullScreenImageViewer";
import { useSnapIndicator } from "@/contexts/SnapIndicatorContext";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  type StyleProp,
  TouchableOpacity,
  type ViewStyle,
} from "react-native";

type Props = {
  userId?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  onPressWithoutSnap?: () => void;
  showProfilePictureOnLongPress?: boolean;
};

/**
 * Keeps the story interaction attached to the avatar itself: tap an active
 * ring to view snaps, tap an inactive avatar for its normal destination, and
 * hold to inspect the profile picture without triggering either navigation.
 */
export default function SnapAvatarButton({
  userId,
  username,
  avatarUrl,
  size = 40,
  style,
  onPressWithoutSnap,
  showProfilePictureOnLongPress = true,
}: Props) {
  const indicator = useSnapIndicator({ userId, username, avatarUrl });
  const [avatarOpen, setAvatarOpen] = useState(false);
  const longPressRef = useRef(false);

  function handlePress() {
    if (longPressRef.current) return;
    if (indicator && userId) {
      router.push({
        pathname: "/snaps/[userId]",
        params: { userId },
      });
      return;
    }
    onPressWithoutSnap?.();
  }

  function handleLongPress() {
    if (!showProfilePictureOnLongPress) return;
    longPressRef.current = true;
    setAvatarOpen(true);
  }

  return (
    <>
      <TouchableOpacity
        activeOpacity={1}
        accessibilityRole="imagebutton"
        accessibilityLabel={indicator ? "View snaps" : "View profile"}
        onPressIn={() => {
          longPressRef.current = false;
        }}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={280}
        style={style}
      >
        <Avatar
          uri={avatarUrl}
          username={username}
          userId={userId}
          size={size}
        />
      </TouchableOpacity>
      {showProfilePictureOnLongPress ? (
        <FullScreenImageViewer
          uri={avatarUrl}
          visible={avatarOpen}
          onClose={() => setAvatarOpen(false)}
          showDefaultAvatar
        />
      ) : null}
    </>
  );
}
