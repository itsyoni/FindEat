import { lightPalette } from "@/constants/palette";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type LoadingScreenVariant =
  | "feed"
  | "profile"
  | "list"
  | "detail"
  | "chat"
  | "map"
  | "menu";

type Props = {
  backgroundColor?: string;
  contained?: boolean;
  variant?: LoadingScreenVariant;
};

type BlockProps = {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  circle?: boolean;
};

function SkeletonBlock({
  width = "100%",
  height,
  radius = 12,
  circle = false,
}: BlockProps) {
  const { isDark } = useAppTheme();
  return (
    <View
      style={{
        width,
        height,
        borderRadius: circle ? height / 2 : radius,
        backgroundColor: isDark ? "#242426" : "#E8E4DD",
      }}
    />
  );
}

function HeaderSkeleton() {
  return (
    <View style={styles.header}>
      <SkeletonBlock width={44} height={44} circle />
      <View style={styles.headerCopy}>
        <SkeletonBlock width="42%" height={15} radius={7} />
        <SkeletonBlock width="28%" height={11} radius={6} />
      </View>
    </View>
  );
}

function FeedSkeleton() {
  return (
    <View style={styles.feed}>
      <HeaderSkeleton />
      <SkeletonBlock height={390} radius={0} />
      <View style={styles.actions}>
        <SkeletonBlock width={30} height={30} circle />
        <SkeletonBlock width={30} height={30} circle />
        <SkeletonBlock width={30} height={30} circle />
      </View>
      <View style={styles.copy}>
        <SkeletonBlock width="72%" height={13} radius={6} />
        <SkeletonBlock width="48%" height={13} radius={6} />
      </View>
    </View>
  );
}

function ProfileSkeleton() {
  return (
    <View>
      <SkeletonBlock height={210} radius={0} />
      <View style={styles.profileBody}>
        <View style={styles.profileIdentity}>
          <SkeletonBlock width={92} height={92} circle />
          <View style={styles.profileCopy}>
            <SkeletonBlock width="58%" height={20} radius={8} />
            <SkeletonBlock width="38%" height={13} radius={6} />
          </View>
        </View>
        <View style={styles.stats}>
          {[0, 1, 2].map((item) => (
            <View key={item} style={styles.stat}>
              <SkeletonBlock width={38} height={18} radius={7} />
              <SkeletonBlock width={58} height={11} radius={6} />
            </View>
          ))}
        </View>
        <SkeletonBlock height={46} radius={14} />
        <View style={styles.tabs}>
          <SkeletonBlock width="22%" height={12} radius={6} />
          <SkeletonBlock width="22%" height={12} radius={6} />
          <SkeletonBlock width="22%" height={12} radius={6} />
        </View>
        <View style={styles.grid}>
          {Array.from({ length: 9 }, (_, index) => (
            <View key={index} style={styles.gridItem}>
              <SkeletonBlock height={132} radius={3} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function ListSkeleton() {
  return (
    <View style={styles.list}>
      <SkeletonBlock height={48} radius={16} />
      {Array.from({ length: 7 }, (_, index) => (
        <View key={index} style={styles.row}>
          <SkeletonBlock width={52} height={52} circle />
          <View style={styles.rowCopy}>
            <SkeletonBlock width="62%" height={15} radius={7} />
            <SkeletonBlock width="42%" height={12} radius={6} />
          </View>
        </View>
      ))}
    </View>
  );
}

function DetailSkeleton() {
  return (
    <View>
      <SkeletonBlock height={280} radius={0} />
      <View style={styles.detailBody}>
        <SkeletonBlock width="68%" height={26} radius={9} />
        <SkeletonBlock width="44%" height={14} radius={7} />
        <View style={styles.detailActions}>
          <SkeletonBlock width="47%" height={46} radius={14} />
          <SkeletonBlock width="47%" height={46} radius={14} />
        </View>
        <SkeletonBlock height={96} radius={20} />
        <SkeletonBlock width="36%" height={20} radius={8} />
        <SkeletonBlock height={120} radius={20} />
        <SkeletonBlock height={120} radius={20} />
      </View>
    </View>
  );
}

function ChatSkeleton() {
  return (
    <View style={styles.chat}>
      <HeaderSkeleton />
      <View style={styles.messages}>
        {["left", "right", "left", "left", "right", "left"].map(
          (side, index) => (
            <View
              key={`${side}-${index}`}
              style={{ alignItems: side === "right" ? "flex-end" : "flex-start" }}
            >
              <SkeletonBlock
                width={index % 2 === 0 ? "62%" : "45%"}
                height={index === 2 ? 66 : 46}
                radius={18}
              />
            </View>
          ),
        )}
      </View>
      <SkeletonBlock height={48} radius={22} />
    </View>
  );
}

function MapSkeleton() {
  return (
    <View style={styles.map}>
      <SkeletonBlock height={48} radius={16} />
      <View style={styles.mapPins}>
        {[0, 1, 2, 3, 4].map((pin) => (
          <SkeletonBlock key={pin} width={48} height={48} circle />
        ))}
      </View>
      <View style={styles.mapCard}>
        <SkeletonBlock width={62} height={62} circle />
        <View style={styles.rowCopy}>
          <SkeletonBlock width="70%" height={18} radius={8} />
          <SkeletonBlock width="48%" height={12} radius={6} />
        </View>
      </View>
    </View>
  );
}

function MenuSkeleton() {
  return (
    <View style={styles.list}>
      <SkeletonBlock width="45%" height={28} radius={9} />
      <SkeletonBlock height={46} radius={15} />
      {Array.from({ length: 5 }, (_, index) => (
        <View key={index} style={styles.menuCard}>
          <SkeletonBlock width={96} height={82} radius={14} />
          <View style={styles.rowCopy}>
            <SkeletonBlock width="72%" height={16} radius={7} />
            <SkeletonBlock width="90%" height={12} radius={6} />
            <SkeletonBlock width="32%" height={13} radius={6} />
          </View>
        </View>
      ))}
    </View>
  );
}

function SkeletonForVariant({ variant }: { variant: LoadingScreenVariant }) {
  if (variant === "feed") return <FeedSkeleton />;
  if (variant === "profile") return <ProfileSkeleton />;
  if (variant === "list") return <ListSkeleton />;
  if (variant === "chat") return <ChatSkeleton />;
  if (variant === "map") return <MapSkeleton />;
  if (variant === "menu") return <MenuSkeleton />;
  return <DetailSkeleton />;
}

export default function LoadingScreen({
  backgroundColor,
  contained = false,
  variant = "detail",
}: Props) {
  const { isDark } = useAppTheme();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.set(
      withRepeat(
        withTiming(0.48, {
          duration: 850,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const background =
    backgroundColor === "bg-black"
      ? "#0B0B0A"
      : isDark
        ? "#0B0B0A"
        : lightPalette.canvas;

  const skeleton = (
    <ScrollView
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <Animated.View style={[styles.animatedContent, animatedStyle]}>
        <SkeletonForVariant variant={variant} />
      </Animated.View>
    </ScrollView>
  );

  if (contained) {
    return <View style={[styles.screen, { backgroundColor: background }]}>{skeleton}</View>;
  }

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.screen, { backgroundColor: background }]}
    >
      {skeleton}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  animatedContent: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  headerCopy: { flex: 1, gap: 8 },
  feed: { paddingTop: 4 },
  actions: { flexDirection: "row", gap: 18, paddingHorizontal: 16, paddingTop: 14 },
  copy: { gap: 9, padding: 16 },
  profileBody: { gap: 18, padding: 16 },
  profileIdentity: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: -58 },
  profileCopy: { flex: 1, gap: 9, paddingTop: 48 },
  stats: { flexDirection: "row", justifyContent: "space-around" },
  stat: { alignItems: "center", gap: 7 },
  tabs: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 3 },
  gridItem: { width: "32.7%" },
  list: { gap: 14, padding: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 13, minHeight: 64 },
  rowCopy: { flex: 1, gap: 9 },
  detailBody: { gap: 18, padding: 18 },
  detailActions: { flexDirection: "row", justifyContent: "space-between" },
  chat: { flex: 1, paddingHorizontal: 14, paddingBottom: 12 },
  messages: { flex: 1, justifyContent: "flex-end", gap: 13, paddingVertical: 18 },
  map: { flex: 1, padding: 16, justifyContent: "space-between" },
  mapPins: { flex: 1, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-around", alignContent: "space-around" },
  mapCard: { flexDirection: "row", alignItems: "center", gap: 13, padding: 16 },
  menuCard: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 4 },
});
