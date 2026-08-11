import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import type { SearchResultItem } from "@findeat/types/search";
import type { UserRelationship } from "@findeat/types";
import { View } from "react-native";
import RestaurantBadge from "@/components/restaurants/RestaurantBadge";
import { useTranslation } from "react-i18next";
import { usernameLabel } from "@/lib/userIdentity";

type Props = {
  item: SearchResultItem;
};

export default function SearchResultRow({ item }: Props) {
  const { t, i18n } = useTranslation(["common", "notifications"]);
  const isRtl = i18n.dir() === "rtl";
  const rtlTextStyle = isRtl
    ? ({ textAlign: "right", writingDirection: "rtl" } as const)
    : undefined;
  const relationshipKeys: Partial<Record<UserRelationship, string>> = {
    FRIENDS: "friends",
    FOLLOWING: "following",
    FOLLOWED_BY: "followsYou",
    REQUESTED: "requested",
  };
  const relationshipKey = item.relationship
    ? relationshipKeys[item.relationship]
    : undefined;
  const relationshipLabel = relationshipKey
    ? t(`notifications:${relationshipKey}`)
    : undefined;
  const entityLabel = t(
    item.type === "USER"
      ? "common:user"
      : item.type === "RESTAURANT"
        ? "common:restaurant"
        : "common:dish",
  );
  const title = item.type === "USER" ? usernameLabel(item.title) : item.title;

  return (
    <View
      className="relative flex-row items-center p-4"
      style={isRtl ? { flexDirection: "row-reverse" } : undefined}
    >
      <Avatar
        uri={item.imageUrl}
        username={title}
        size={52}
        fallbackType={item.type === "RESTAURANT" ? "restaurant" : "user"}
      />

      <View
        className="flex-1"
        style={isRtl ? { marginRight: 16 } : { marginLeft: 16 }}
      >
        <View
          className="flex-row items-center"
          style={isRtl ? { flexDirection: "row-reverse" } : undefined}
        >
          <Text style={rtlTextStyle} className="font-bold text-black dark:text-white">{title}</Text>
          {item.type === "RESTAURANT" ? <RestaurantBadge /> : null}
        </View>

        {!!item.subtitle && (
          <Text style={rtlTextStyle} className="mt-1 text-sm text-gray-500">{item.subtitle}</Text>
        )}

        {!!relationshipLabel && (
          <Text style={rtlTextStyle} className="mt-1 text-xs font-semibold text-[#8A6A1F]">
            {relationshipLabel}
          </Text>
        )}

      </View>

      <Text style={rtlTextStyle} className="text-xs font-semibold text-gray-400">
        {entityLabel}
      </Text>
      <View
        pointerEvents="none"
        className="absolute bottom-0 left-4 right-4 h-px bg-gray-200/40 dark:bg-gray-700/35"
      />
    </View>
  );
}
