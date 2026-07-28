import type { UserRelationship } from "@findeat/types";
import {
  type GestureResponderEvent,
  type StyleProp,
  TouchableOpacity,
  type ViewStyle,
} from "react-native";
import Text from "@/components/common/AppText";
import {
  CheckIcon,
  ClockIcon,
  UserPlusIcon,
  UsersThreeIcon,
} from "phosphor-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";

type Props = {
  relationship?: UserRelationship;
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
  showIcon?: boolean;
};

function relationshipColors(relationship?: UserRelationship) {
  switch (relationship) {
    case "FRIENDS":
      return {
        button: "bg-[#F7D786]",
        text: "text-[#171717]",
      };
    case "FOLLOWING":
      return {
        button: "bg-gray-900 dark:bg-gray-100",
        text: "text-white dark:text-gray-950",
      };
    case "REQUESTED":
      return {
        button: "bg-gray-200 dark:bg-gray-800",
        text: "text-gray-950 dark:text-white",
      };
    default:
      return {
        button: "bg-black dark:bg-white",
        text: "text-white dark:text-black",
      };
  }
}

export default function RelationshipActionButton({
  relationship,
  label,
  onPress,
  className,
  style,
  showIcon = false,
}: Props) {
  const colors = relationshipColors(relationship);
  const { isDark } = useAppTheme();
  const iconColor =
    relationship === "FRIENDS"
      ? "#171717"
      : relationship === "FOLLOWING" || relationship === "REQUESTED"
        ? isDark
          ? relationship === "FOLLOWING"
            ? "#171717"
            : "#FFFFFF"
          : relationship === "FOLLOWING"
            ? "#FFFFFF"
            : "#171717"
        : isDark
          ? "#171717"
          : "#FFFFFF";
  const icon =
    relationship === "FRIENDS" ? (
      <UsersThreeIcon size={18} color={iconColor} weight="fill" />
    ) : relationship === "FOLLOWING" ? (
      <CheckIcon size={18} color={iconColor} weight="bold" />
    ) : relationship === "REQUESTED" ? (
      <ClockIcon size={18} color={iconColor} weight="bold" />
    ) : (
      <UserPlusIcon size={18} color={iconColor} weight="bold" />
    );

  return (
    <TouchableOpacity
      className={`flex-row items-center justify-center rounded-xl px-4 py-2 ${colors.button} ${className ?? ""}`}
      style={style}
      onPress={onPress}
    >
      {showIcon ? icon : null}
      <Text
        weight="bold"
        className={`text-center ${showIcon ? "ml-2" : ""} ${colors.text}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
