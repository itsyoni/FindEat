import AppBottomSheet from "@/components/common/AppBottomSheet";
import Text from "@/components/common/AppText";
import type { Restaurant } from "@findeat/types";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import {
  GlobeIcon,
  InstagramLogoIcon,
  MapPinIcon,
  PhoneIcon,
  StorefrontIcon,
} from "phosphor-react-native";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Linking, TouchableOpacity, View } from "react-native";
import RestaurantOpeningHours from "./RestaurantOpeningHours";

function DetailRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const content = (
    <View className="flex-row items-center rounded-2xl bg-gray-100 p-3.5 dark:bg-gray-800">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-gray-900">
        {icon}
      </View>
      <View className="ml-3 min-w-0 flex-1">
        <Text className="text-xs font-bold uppercase tracking-wide text-gray-500">
          {label}
        </Text>
        <Text numberOfLines={2} className="mt-0.5 text-black dark:text-white">
          {value}
        </Text>
      </View>
    </View>
  );
  return onPress ? (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress}>
      {content}
    </TouchableOpacity>
  ) : (
    content
  );
}

export default function RestaurantAboutBottomSheet({
  restaurant,
  open,
  onClose,
}: {
  restaurant: Restaurant;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation("restaurants");
  const location = [restaurant.address, restaurant.city].filter(Boolean).join(", ");
  const website = restaurant.website?.trim();
  const instagram = restaurant.instagram?.trim().replace(/^@/, "");

  return (
    <AppBottomSheet open={open} onClose={onClose} snapPoints={["72%"]}>
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
      >
        <View className="mb-5 flex-row items-center">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
            <StorefrontIcon size={22} color="#D97706" weight="fill" />
          </View>
          <View className="ml-3 min-w-0 flex-1">
            <Text className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              {t("aboutRestaurant")}
            </Text>
            <Text numberOfLines={1} className="text-xl font-bold text-black dark:text-white">
              {restaurant.name}
            </Text>
          </View>
        </View>

        {restaurant.bio ? (
          <View className="mb-4 rounded-2xl bg-gray-100 p-4 dark:bg-gray-800">
            <Text className="mb-2 font-bold text-black dark:text-white">
              {t("description")}
            </Text>
            <Text className="leading-6 text-gray-700 dark:text-gray-300">
              {restaurant.bio}
            </Text>
          </View>
        ) : null}

        <RestaurantOpeningHours hours={restaurant.resolvedOpeningHours} />

        <View className="mt-4 gap-2.5">
          {location ? (
            <DetailRow
              icon={<MapPinIcon size={20} color="#3B82F6" weight="fill" />}
              label={t("address")}
              value={location}
            />
          ) : null}
          {restaurant.phone ? (
            <DetailRow
              icon={<PhoneIcon size={20} color="#16A34A" weight="fill" />}
              label={t("phone")}
              value={restaurant.phone}
              onPress={() => void Linking.openURL(`tel:${restaurant.phone}`)}
            />
          ) : null}
          {website ? (
            <DetailRow
              icon={<GlobeIcon size={20} color="#7C3AED" weight="duotone" />}
              label={t("website")}
              value={website}
              onPress={() =>
                void Linking.openURL(
                  /^https?:\/\//i.test(website) ? website : `https://${website}`,
                )
              }
            />
          ) : null}
          {instagram ? (
            <DetailRow
              icon={<InstagramLogoIcon size={20} color="#DB2777" weight="fill" />}
              label={t("instagram")}
              value={`@${instagram}`}
              onPress={() =>
                void Linking.openURL(`https://instagram.com/${instagram}`)
              }
            />
          ) : null}
        </View>
      </BottomSheetScrollView>
    </AppBottomSheet>
  );
}
