import Text from "@/components/common/AppText";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { useAppTheme } from "@/contexts/ThemeContext";
import type { PlaceListDetail } from "@findeat/types";
import { CalendarBlankIcon, MapPinIcon } from "phosphor-react-native";
import { StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import DefaultPlaceListCover from "./DefaultPlaceListCover";
import SystemPlaceListCover from "./SystemPlaceListCover";

export const FOLDER_COVER_HEIGHT = 280;

type Props = {
  list: PlaceListDetail;
  scrollY: SharedValue<number>;
};

export default function ParallaxFolderCover({ list, scrollY }: Props) {
  const { isDark } = useAppTheme();
  const fallbackRestaurantCover = list.items.find(
    ({ restaurant }) => Boolean(restaurant.coverUrl?.trim()),
  )?.restaurant.coverUrl;
  const tripDate = list.eventAt
    ? [list.eventAt, list.eventEndAt]
        .filter((value): value is string => Boolean(value))
        .map((value) =>
          new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
            new Date(value),
          ),
        )
        .join(" – ")
    : null;
  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [-FOLDER_COVER_HEIGHT, 0, FOLDER_COVER_HEIGHT],
      [-FOLDER_COVER_HEIGHT / 2, 0, FOLDER_COVER_HEIGHT * 0.55],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollY.value,
      [-FOLDER_COVER_HEIGHT, 0, FOLDER_COVER_HEIGHT],
      [2, 1, 1],
      Extrapolation.CLAMP,
    );

    return { transform: [{ translateY }, { scale }] };
  });

  return (
    <View
      style={[
        styles.frame,
        { backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6" },
      ]}
    >
      <Animated.View style={[styles.cover, animatedStyle]}>
        {list.coverUrl ? (
          <ProgressiveImage
            source={{ uri: list.coverUrl }}
            style={styles.cover}
            contentFit="cover"
            transition={180}
          />
        ) : list.systemType ? (
          <SystemPlaceListCover type={list.systemType} />
        ) : fallbackRestaurantCover ? (
          <ProgressiveImage
            source={{ uri: fallbackRestaurantCover }}
            style={styles.cover}
            contentFit="cover"
            transition={180}
          />
        ) : (
          <DefaultPlaceListCover />
        )}
      </Animated.View>
      {(list.eventType === "TRIP" && tripDate) || list.eventLocation ? (
        <View className="absolute bottom-10 left-5 max-w-[82%] rounded-2xl bg-black/60 px-3.5 py-2.5">
          {list.eventType === "TRIP" && tripDate ? (
            <View className="flex-row items-center">
              <CalendarBlankIcon size={16} color="#FAF9F6" weight="fill" />
              <Text className="ml-2 text-sm font-bold text-white">
                {tripDate}
              </Text>
            </View>
          ) : null}
          {list.eventLocation ? (
            <View
              className={
                list.eventType === "TRIP" && tripDate
                  ? "mt-1.5 flex-row items-center"
                  : "flex-row items-center"
              }
            >
              <MapPinIcon size={16} color="#FAF9F6" weight="fill" />
              <Text numberOfLines={1} className="ml-2 flex-shrink text-sm text-white">
                {list.eventLocation}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: FOLDER_COVER_HEIGHT,
    width: "100%",
    overflow: "visible",
  },
  cover: {
    height: FOLDER_COVER_HEIGHT,
    width: "100%",
  },
});
