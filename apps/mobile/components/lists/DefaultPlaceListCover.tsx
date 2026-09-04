import { LinearGradient } from "expo-linear-gradient";
import { StorefrontIcon } from "phosphor-react-native";
import { View } from "react-native";

export default function DefaultPlaceListCover({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <LinearGradient
      colors={["#F6C768", "#E96C45"]}
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
            shadowColor: "#94432D",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.22,
            shadowRadius: 14,
            elevation: 5,
          }}
        >
          <StorefrontIcon
            size={compact ? 17 : 42}
            color="#94432D"
            weight="fill"
          />
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
