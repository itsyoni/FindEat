import ProgressiveImage from "@/components/common/ProgressiveImage";
import { useAppTheme } from "@/contexts/ThemeContext";
import { ForkKnifeIcon } from "phosphor-react-native";
import { useMemo, useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { View } from "react-native";

type Props = {
  pickedUri?: string | null;
  menuImageUrl?: string | null;
  style?: StyleProp<ViewStyle>;
};

export default function DishPreviewImage({
  pickedUri,
  menuImageUrl,
  style,
}: Props) {
  const { isDark } = useAppTheme();
  const sources = useMemo(
    () =>
      [pickedUri, menuImageUrl].filter(
        (uri, index, values): uri is string =>
          !!uri && values.indexOf(uri) === index,
      ),
    [menuImageUrl, pickedUri],
  );
  const [failedUris, setFailedUris] = useState<string[]>([]);
  const activeUri = sources.find((uri) => !failedUris.includes(uri));

  return (
    <View
      style={[
        {
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDark ? "#1F2937" : "#F3F4F6",
        },
        style,
      ]}
    >
      {activeUri ? (
        <ProgressiveImage
          source={{ uri: activeUri }}
          style={{ position: "absolute", inset: 0 }}
          contentFit="cover"
          onError={() =>
            setFailedUris((current) =>
              current.includes(activeUri) ? current : [...current, activeUri],
            )
          }
        />
      ) : (
        <ForkKnifeIcon
          size={34}
          color={isDark ? "#9CA3AF" : "#6B7280"}
          weight="fill"
        />
      )}
    </View>
  );
}
