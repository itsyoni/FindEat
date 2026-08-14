import AppBottomSheet from "@/components/common/AppBottomSheet";
import Text from "@/components/common/AppText";
import type { PlaceListDetail } from "@findeat/types";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import {
  PencilSimpleIcon,
  SignOutIcon,
  TrashIcon,
  UsersThreeIcon,
} from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";

type Props = {
  list: PlaceListDetail | null;
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
  onLeave: () => void;
};

export default function PlaceListOptionsBottomSheet({
  list,
  open,
  onClose,
  onDelete,
  onLeave,
}: Props) {
  const { t } = useTranslation("common");
  if (!list) return null;

  const actions = [
    ...(list.canEdit && !list.systemType
      ? [
          {
            key: "edit",
            label: t("editList"),
            icon: PencilSimpleIcon,
            run: () =>
              router.push({
                pathname: "/saved-lists/edit/[id]",
                params: { id: list.id },
              }),
          },
        ]
      : []),
    ...(!list.systemType ? [{
      key: "members",
      label: t("listMembers"),
      icon: UsersThreeIcon,
      run: () =>
        router.push({
          pathname: "/saved-lists/members/[id]",
          params: { id: list.id },
        }),
    }] : []),
  ];

  return (
    <AppBottomSheet open={open} onClose={onClose} snapPoints={[list.accessRole === "OWNER" ? "40%" : "34%"]}>
      <BottomSheetView className="flex-1 px-5 pb-7 pt-1">
        <Text className="mb-3 text-center text-lg font-bold text-black dark:text-white">
          {list.name}
        </Text>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <TouchableOpacity
              key={action.key}
              onPress={() => {
                onClose();
                action.run();
              }}
              className="mb-2 flex-row items-center rounded-2xl bg-gray-50 px-4 py-3.5 dark:bg-gray-900"
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-gray-800">
                <Icon size={19} color="#D97706" weight="bold" />
              </View>
              <Text className="ml-3 font-bold text-black dark:text-white">
                {action.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        {!list.systemType ? <TouchableOpacity
          onPress={() => {
            onClose();
            if (list.accessRole === "OWNER") onDelete();
            else onLeave();
          }}
          className="mt-1 flex-row items-center rounded-2xl bg-red-50 px-4 py-3.5 dark:bg-red-950/40"
        >
          <View className="h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-red-950">
            {list.accessRole === "OWNER" ? (
              <TrashIcon size={19} color="#DC2626" weight="bold" />
            ) : (
              <SignOutIcon size={19} color="#DC2626" weight="bold" />
            )}
          </View>
          <Text className="ml-3 font-bold text-red-600">
            {t(list.accessRole === "OWNER" ? "deleteList" : "leaveList")}
          </Text>
        </TouchableOpacity> : null}
      </BottomSheetView>
    </AppBottomSheet>
  );
}
