import AppBottomSheet from "@/components/common/AppBottomSheet";
import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import type { Chat } from "@findeat/types";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import {
  ArchiveIcon,
  PushPinIcon,
  PushPinSlashIcon,
  TrashIcon,
} from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";

type Props = {
  chat: Chat | null;
  updating: boolean;
  onClose: () => void;
  onTogglePin: (chat: Chat) => void;
  onToggleArchive: (chat: Chat) => void;
  onDelete: (chat: Chat) => void;
};

export default function ChatOptionsBottomSheet({
  chat,
  updating,
  onClose,
  onTogglePin,
  onToggleArchive,
  onDelete,
}: Props) {
  const { t } = useTranslation("chat");
  const { isDark } = useAppTheme();
  const iconColor = isDark ? "#FAF9F6" : "#171717";
  const PinIcon = chat?.pinned ? PushPinSlashIcon : PushPinIcon;

  return (
    <AppBottomSheet
      open={!!chat}
      onClose={onClose}
      snapPoints={[chat?.archived ? "44%" : "58%"]}
    >
      <BottomSheetView className="flex-1 px-4 pb-6 pt-1">
        <Text className="px-2 pb-3 text-center text-xl font-bold text-black dark:text-white">
          {t("chatOptions")}
        </Text>
        {!chat?.archived ? (
          <TouchableOpacity
            disabled={!chat || updating}
            onPress={() => chat && onTogglePin(chat)}
            className="mb-2 flex-row items-center rounded-2xl bg-gray-50 px-4 py-4 dark:bg-gray-900"
          >
            <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-gray-800">
              {updating ? <ActivityIndicator color="#D97706" /> : <PinIcon size={23} color={iconColor} weight="duotone" />}
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-black dark:text-white">
                {t(chat?.pinned ? "unpinChat" : "pinChat")}
              </Text>
              {!chat?.pinned ? <Text className="mt-0.5 text-xs text-gray-500">{t("pinChatHint")}</Text> : null}
            </View>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          disabled={!chat || updating}
          onPress={() => chat && onToggleArchive(chat)}
          className="flex-row items-center rounded-2xl bg-gray-50 px-4 py-4 dark:bg-gray-900"
        >
          <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-gray-800">
            {updating ? <ActivityIndicator color="#D97706" /> : <ArchiveIcon size={23} color={iconColor} weight="duotone" />}
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-black dark:text-white">
              {t(chat?.archived ? "unarchiveChat" : "archiveChat")}
            </Text>
            <Text className="mt-0.5 text-xs text-gray-500">
              {t(chat?.archived ? "unarchiveChatHint" : "archiveChatHint")}
            </Text>
          </View>
        </TouchableOpacity>
        <View className="my-3 h-px bg-gray-100 dark:bg-gray-800" />
        <TouchableOpacity
          disabled={!chat || updating}
          onPress={() => chat && onDelete(chat)}
          className="flex-row items-center rounded-2xl bg-gray-50 px-4 py-4 dark:bg-gray-900"
        >
          <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-gray-800">
            <TrashIcon size={23} color="#DC2626" weight="regular" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-red-600 dark:text-red-400">
              {t("deleteChat")}
            </Text>
            <Text className="mt-0.5 text-xs text-gray-500">
              {t("deleteChatHint")}
            </Text>
          </View>
        </TouchableOpacity>
      </BottomSheetView>
    </AppBottomSheet>
  );
}
