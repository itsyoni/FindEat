import type { PlaceListSystemType } from "@findeat/types";
import { LinearGradient } from "expo-linear-gradient";
import {
  BookmarkSimpleIcon,
  CheckCircleIcon,
  HeartIcon,
} from "phosphor-react-native";
import { View } from "react-native";

const coverDesign = {
  WANT_TO_TRY: {
    colors: ["#F6D77A", "#DE8A32"] as const,
    accent: "#8A4B18",
    Icon: BookmarkSimpleIcon,
  },
  VISITED: {
    colors: ["#72C9A5", "#287969"] as const,
    accent: "#14564A",
    Icon: CheckCircleIcon,
  },
  FAVORITES: {
    colors: ["#F39A91", "#B64C70"] as const,
    accent: "#7E294D",
    Icon: HeartIcon,
  },
} satisfies Record<
  PlaceListSystemType,
  {
    colors: readonly [string, string];
    accent: string;
    Icon: typeof BookmarkSimpleIcon;
  }
>;

export default function SystemPlaceListCover({
  type,
  compact = false,
}: {
  type: PlaceListSystemType;
  compact?: boolean;
}) {
  const design = coverDesign[type];
  const Icon = design.Icon;

  return (
    <LinearGradient
      colors={design.colors}
      start={{ x: 0.08, y: 0.05 }}
      end={{ x: 0.95, y: 1 }}
      style={{ flex: 1, overflow: "hidden" }}
    >
      <View
        style={{
          position: "absolute",
          width: compact ? 54 : 150,
          height: compact ? 54 : 150,
          borderRadius: compact ? 27 : 75,
          right: compact ? -19 : -54,
          top: compact ? -19 : -54,
          backgroundColor: "rgba(250,249,246,0.17)",
        }}
      />
      <View
        style={{
          position: "absolute",
          width: compact ? 36 : 94,
          height: compact ? 36 : 94,
          borderRadius: compact ? 18 : 47,
          left: compact ? -12 : -32,
          bottom: compact ? -10 : -28,
          backgroundColor: "rgba(250,249,246,0.12)",
        }}
      />
      <View className="flex-1 items-center justify-center">
        <View
          className="items-center justify-center rounded-full"
          style={{
            width: compact ? 31 : 76,
            height: compact ? 31 : 76,
            backgroundColor: "rgba(250,249,246,0.82)",
            shadowColor: design.accent,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.22,
            shadowRadius: 14,
            elevation: 5,
          }}
        >
          <Icon size={compact ? 17 : 39} color={design.accent} weight="fill" />
        </View>
      </View>
      {!compact ? (
        <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-1.5">
          <View className="h-1.5 w-1.5 rounded-full bg-[#FAF9F6]/55" />
          <View className="h-1.5 w-5 rounded-full bg-[#FAF9F6]/80" />
          <View className="h-1.5 w-1.5 rounded-full bg-[#FAF9F6]/55" />
        </View>
      ) : null}
    </LinearGradient>
  );
}
