import { StorefrontIcon, UserIcon } from "phosphor-react-native";
import { StyleProp, View, ViewStyle } from "react-native";
import { SvgUri } from "react-native-svg";
import ProgressiveImage from "./ProgressiveImage";

type Props = {
  uri?: string | null;
  username?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  fallbackType?: "user" | "restaurant";
};

export default function Avatar({
  uri,
  size = 40,
  style,
  fallbackType = "user",
}: Props) {
  if (!uri) {
    return (
      <View
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className="items-center justify-center bg-gray-200 dark:bg-gray-800"
      >
        {fallbackType === "restaurant" ? (
          <StorefrontIcon size={size * 0.5} color="#3B82F6" weight="fill" />
        ) : (
          <UserIcon size={size * 0.55} color="#9CA3AF" weight="fill" />
        )}
      </View>
    );
  }

  const isSvg = uri.startsWith("data:image/svg+xml") || uri.endsWith(".svg");

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {isSvg ? (
        <SvgUri width={size} height={size} uri={uri} />
      ) : (
        <ProgressiveImage
          source={{ uri }}
          transition={160}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
        />
      )}
    </View>
  );
}
