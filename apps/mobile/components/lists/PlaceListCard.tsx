import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import type { PlaceListSummary } from "@findeat/types";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { CalendarBlankIcon, FolderSimpleIcon, UsersThreeIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";

type Props = {
  list: PlaceListSummary;
  onPress: () => void;
};

export default function PlaceListCard({ list, onPress }: Props) {
  const { t } = useTranslation("common");
  const previews = list.previewImages.slice(0, 4);

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={list.name}
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
        ) : previews.length ? (
          <View className="flex-1 flex-row flex-wrap">
            {Array.from({ length: 4 }, (_, index) => {
              const uri = previews[index];
              return uri ? (
                <ProgressiveImage
                  key={`${uri}-${index}`}
                  source={{ uri }}
                  style={{ width: "50%", height: "50%" }}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <View
                  key={`empty-${index}`}
                  className="h-1/2 w-1/2 bg-amber-100 dark:bg-amber-950/60"
                />
              );
            })}
          </View>
        ) : (
          <View className="flex-1 items-center justify-center">
            <FolderSimpleIcon size={44} color="#D97706" weight="duotone" />
          </View>
        )}
        {list.eventType ? (
          <View className="absolute left-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/55">
            <CalendarBlankIcon size={17} color="#FFF" weight="fill" />
          </View>
        ) : null}
        {list.memberCount > 1 ? (
          <View className="absolute bottom-2 right-2 flex-row items-center rounded-full bg-black/60 px-2 py-1">
            <UsersThreeIcon size={13} color="#FFF" weight="fill" />
            <Text className="ml-1 text-xs font-bold text-white">
              {list.memberCount}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        numberOfLines={1}
        className="mt-2.5 text-base font-bold text-black dark:text-white"
      >
        {list.name}
      </Text>
      <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
        {t("placesCount", { count: list.itemCount })}
      </Text>
      {list.eventAt ? (
        <View className="mt-1 flex-row items-center">
          <CalendarBlankIcon size={13} color="#D97706" weight="bold" />
          <Text className="ml-1 text-xs text-amber-700 dark:text-amber-300">
            {new Intl.DateTimeFormat(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(new Date(list.eventAt))}
          </Text>
        </View>
      ) : list.memberCount > 1 ? (
        <View className="mt-1 flex-row items-center">
          {list.memberPreviews.slice(0, 3).map((member, index) => (
            <View key={member.id} style={{ marginLeft: index ? -6 : 0 }}>
              <Avatar uri={member.avatarUrl} username={member.username} size={20} />
            </View>
          ))}
          <Text className="ml-1.5 text-xs text-gray-500 dark:text-gray-400">
            {t("sharedList")}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
