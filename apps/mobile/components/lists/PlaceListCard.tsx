import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import type { PlaceListSummary } from "@findeat/types";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { CalendarBlankIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";
import DefaultPlaceListCover from "./DefaultPlaceListCover";
import SystemPlaceListCover from "./SystemPlaceListCover";

type Props = {
  list: PlaceListSummary;
  onPress: () => void;
};

export default function PlaceListCard({ list, onPress }: Props) {
  const { t } = useTranslation("common");
  const preview = list.previewImages[0];
  const title = list.systemType
    ? t(
        list.systemType === "WANT_TO_TRY"
          ? "wantToTry"
          : list.systemType === "VISITED"
            ? "visited"
            : "favorite",
      )
    : list.name;

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      className="mb-5 w-[48%]"
    >
      <View className="h-40 overflow-hidden rounded-[22px] bg-amber-50 dark:bg-amber-950/40">
        {list.coverUrl ? (
          <ProgressiveImage
            source={{ uri: list.coverUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={150}
          />
        ) : list.systemType ? (
          <SystemPlaceListCover type={list.systemType} />
        ) : preview ? (
          <ProgressiveImage
            source={{ uri: preview }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <DefaultPlaceListCover />
        )}
        {list.eventAt ? (
          <View className="absolute bottom-2 left-2 max-w-[68%] flex-row items-center rounded-full bg-black/60 px-2 py-1.5">
            <CalendarBlankIcon size={13} color="#FAF9F6" weight="fill" />
            <Text numberOfLines={1} className="ml-1 text-xs font-bold text-white">
              {new Intl.DateTimeFormat(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              }).format(new Date(list.eventAt))}
            </Text>
          </View>
        ) : null}
        {list.memberCount > 1 ? (
          <View
            pointerEvents="none"
            className="absolute bottom-2 right-2 flex-row items-center"
          >
            {list.memberPreviews.slice(0, 3).map((member, index) => (
              <View
                key={member.id}
                className="rounded-full border-2 border-white bg-white dark:border-gray-900 dark:bg-gray-900"
                style={{ marginLeft: index ? -7 : 0 }}
              >
                <Avatar
                  uri={member.avatarUrl}
                  username={member.username}
                  size={24}
                />
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <Text
        numberOfLines={1}
        className="mt-2.5 text-base font-bold text-black dark:text-white"
      >
        {title}
      </Text>
      <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
        {t("placesCount", { count: list.itemCount })}
      </Text>
    </TouchableOpacity>
  );
}
