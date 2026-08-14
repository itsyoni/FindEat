import Text from "@/components/common/AppText";
import type { Sound } from "@findeat/types";
import { MusicNoteIcon } from "phosphor-react-native";
import { TouchableOpacity, View } from "react-native";

export default function SoundLabel({
  sound,
  tone = "overlay",
  onPress,
}: {
  sound?: Sound | null;
  tone?: "overlay" | "surface";
  onPress?: () => void;
}) {
  if (!sound) return null;
  const color = tone === "overlay" ? "#FAF9F6" : "#D5A400";
  const content = (
    <View className="min-w-0 flex-row items-center gap-1.5">
      <MusicNoteIcon size={15} color={color} weight="fill" />
      <Text
        numberOfLines={1}
        className={tone === "overlay" ? "shrink text-sm font-semibold text-white" : "shrink text-sm font-semibold text-black dark:text-white"}
      >
        {sound.title} · {sound.artist}
      </Text>
    </View>
  );
  return onPress ? (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress}>{content}</TouchableOpacity>
  ) : content;
}
