import { getThumbnailUrl } from "@findeat/utils";
import {
  Image as ExpoImage,
  type ImageProps,
  type ImageSource,
} from "expo-image";
import { useColorScheme } from "react-native";

type Props = ImageProps & {
  thumbnailUrl?: string | null;
};

function sourceUri(source: ImageProps["source"]) {
  if (typeof source === "string") return source;
  if (
    source &&
    !Array.isArray(source) &&
    typeof source === "object" &&
    "uri" in source
  ) {
    return (source as ImageSource).uri;
  }
  return undefined;
}

/**
 * The app-wide image primitive. It keeps a tiny edge-generated thumbnail on
 * screen while expo-image fetches and decodes the original, then cross-fades.
 */
export default function ProgressiveImage({
  source,
  thumbnailUrl,
  placeholder,
  placeholderContentFit,
  contentFit,
  resizeMode,
  transition = 220,
  cachePolicy = "memory-disk",
  style,
  ...props
}: Props) {
  const colorScheme = useColorScheme();
  const uri = sourceUri(source);
  const resolvedThumbnail =
    thumbnailUrl ?? getThumbnailUrl(uri, { width: 64, quality: 22, blur: 6 });
  const resolvedContentFit =
    contentFit ??
    (resizeMode === "contain"
      ? "contain"
      : resizeMode === "stretch"
        ? "fill"
        : resizeMode === "center"
          ? "none"
          : "cover");

  return (
    <ExpoImage
      {...props}
      source={source}
      placeholder={
        placeholder ??
        (resolvedThumbnail ? { uri: resolvedThumbnail } : undefined)
      }
      contentFit={resolvedContentFit}
      placeholderContentFit={placeholderContentFit ?? resolvedContentFit}
      transition={transition}
      cachePolicy={cachePolicy}
      style={[
        {
          backgroundColor: colorScheme === "dark" ? "#1F2937" : "#E5E7EB",
        },
        style,
      ]}
    />
  );
}
