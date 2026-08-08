import {
  BookmarkSimpleIcon,
  CheckIcon,
  FolderSimpleIcon,
  HeartIcon,
} from "phosphor-react-native";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

type Props = {
  wantToTry: boolean;
  visited: boolean;
  favorite: boolean;
  size: number;
  defaultColor: string;
  savedListCount?: number;
  style?: StyleProp<ViewStyle>;
};

export function getPlaceStatusLabelKey(
  wantToTry: boolean,
  visited: boolean,
  favorite: boolean,
) {
  if (favorite) return "favorite";
  if (visited) return "visited";
  if (wantToTry) return "wantToTry";
  return "savePlace";
}

export default function PlaceStatusBookmark({
  wantToTry,
  visited,
  favorite,
  size,
  defaultColor,
  savedListCount = 0,
  style,
}: Props) {
  const color = favorite
    ? "#FF3040"
    : visited
      ? "#22C55E"
      : wantToTry
        ? "#F7D786"
        : defaultColor;
  const indicatorSize = Math.round(size * 0.43);

  return (
    <View style={[{ width: size, height: size }, style]}>
      <BookmarkSimpleIcon size={size} color={color} weight="fill" />
      {(visited || favorite) && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              alignItems: "center",
              justifyContent: "center",
              paddingBottom: size * 0.16,
            },
          ]}
        >
          {favorite ? (
            <HeartIcon
              size={indicatorSize}
              color="#FAF9F6"
              weight="fill"
            />
          ) : (
            <CheckIcon
              size={indicatorSize}
              color="#FAF9F6"
              weight="bold"
            />
          )}
        </View>
      )}
      {savedListCount > 0 && (
        <View
          pointerEvents="none"
          style={[
            styles.listBadge,
            {
              width: Math.max(14, Math.round(size * 0.46)),
              height: Math.max(14, Math.round(size * 0.46)),
              borderRadius: Math.max(7, Math.round(size * 0.23)),
              right: -Math.round(size * 0.08),
              top: -Math.round(size * 0.18),
            },
          ]}
        >
          <FolderSimpleIcon
            size={Math.max(9, Math.round(size * 0.29))}
            color="#FAF9F6"
            weight="fill"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  listBadge: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8B5CF6",
    borderColor: "#FAF9F6",
    borderWidth: 1.5,
  },
});
