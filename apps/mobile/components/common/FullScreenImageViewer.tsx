import { XIcon } from "phosphor-react-native";
import { StatusBar } from "expo-status-bar";
import { Modal, Pressable, View } from "react-native";
import ProgressiveImage from "./ProgressiveImage";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgUri } from "react-native-svg";
import Avatar from "./Avatar";

type Props = {
  uri?: string | null;
  visible: boolean;
  onClose: () => void;
  showDefaultAvatar?: boolean;
};

export default function FullScreenImageViewer({
  uri,
  visible,
  onClose,
  showDefaultAvatar = false,
}: Props) {
  if (!uri && !showDefaultAvatar) return null;

  const isSvg =
    !!uri && (uri.startsWith("data:image/svg+xml") || uri.endsWith(".svg"));

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar style="light" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close image"
        onPress={onClose}
        className="flex-1 bg-black"
      >
        <View className="flex-1 items-center justify-center">
          {!uri ? (
            <Avatar size={240} fallbackType="user" showSnapIndicator={false} />
          ) : isSvg ? (
            <SvgUri width="100%" height="100%" uri={uri} />
          ) : (
            <ProgressiveImage
              source={{ uri }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="contain"
            />
          )}
        </View>

        <SafeAreaView
          edges={["top"]}
          pointerEvents="box-none"
          style={{ position: "absolute", top: 0, left: 0, right: 0 }}
        >
          <View className="items-end px-4 pt-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close image"
              hitSlop={8}
              onPress={onClose}
              className="h-11 w-11 items-center justify-center rounded-full bg-white/15"
            >
              <XIcon size={25} color="#FAF9F6" weight="bold" />
            </Pressable>
          </View>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}
