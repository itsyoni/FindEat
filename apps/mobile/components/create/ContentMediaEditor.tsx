import Text from "@/components/common/AppText";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import type { ContentMediaDraft } from "@/lib/postDrafts";
import {
  ArrowClockwiseIcon,
  CropIcon,
  DownloadSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "phosphor-react-native";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/contexts/ThemeContext";

type Props = {
  media: ContentMediaDraft[];
  selectedIndex: number;
  busy?: boolean;
  onSelect: (index: number) => void;
  onBack: () => void;
  onNext: () => void;
  onAdd: () => void;
  onCrop: () => void;
  onRotate: () => void;
  onSaveToGallery: () => void;
  onDelete: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
};

export default function ContentMediaEditor({
  media,
  selectedIndex,
  busy = false,
  onSelect,
  onBack,
  onNext,
  onAdd,
  onCrop,
  onRotate,
  onSaveToGallery,
  onDelete,
  onReorder,
}: Props) {
  const { t } = useTranslation(["create", "common"]);
  const { isDark } = useAppTheme();
  const selectedMedia = media[selectedIndex];
  const foreground = isDark ? "#FAF9F6" : "#171717";
  const mutedForeground = isDark ? "rgba(255,255,255,0.55)" : "#706C66";
  const [dragState, setDragState] = useState<{
    id: string;
    fromIndex: number;
    targetIndex: number;
  } | null>(null);

  function selectMedia(index: number) {
    onSelect(index);
  }

  function displayedSlot(itemId: string, index: number) {
    if (!dragState || itemId === dragState.id) return index;
    const { fromIndex, targetIndex } = dragState;
    if (fromIndex < targetIndex && index > fromIndex && index <= targetIndex) {
      return index - 1;
    }
    if (fromIndex > targetIndex && index >= targetIndex && index < fromIndex) {
      return index + 1;
    }
    return index;
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View
          className="flex-row items-center px-4 py-2"
          style={{ flexShrink: 0 }}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("back")}
            disabled={busy}
            onPress={onBack}
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{
              backgroundColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(23,23,23,0.07)",
            }}
          >
            <DirectionalIcon
              direction="back"
              size={24}
              color={foreground}
              weight="bold"
            />
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <Text className="text-base font-bold" style={{ color: foreground }}>
              {t("editPhotos")}
            </Text>
            <Text
              className="mt-0.5 text-xs"
              style={{ color: mutedForeground }}
            >
              {t("photoCount", {
                current: selectedIndex + 1,
                total: media.length,
              })}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={busy || media.length === 0}
            onPress={onNext}
            className={`min-h-11 min-w-16 items-center justify-center rounded-full bg-brand px-4 ${
              busy || media.length === 0 ? "opacity-40" : ""
            }`}
          >
            <Text className="font-bold text-black">{t("next")}</Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            backgroundColor: isDark ? "#0A0A0A" : "#EEEAE4",
          }}
        >
          {selectedMedia ? (
            <ProgressiveImage
              key={`${selectedMedia.id}-${selectedMedia.uri}`}
              source={{ uri: selectedMedia.uri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              cachePolicy="none"
              transition={0}
            />
          ) : null}

          <View className="absolute right-3 top-3 gap-3">
            <EditorTool
              label={t("crop")}
              disabled={busy}
              onPress={onCrop}
              icon={
                <CropIcon
                  size={23}
                  color="#FFFFFFCC"
                  weight="bold"
                  style={editorIconShadow}
                />
              }
            />
            <EditorTool
              label={t("rotate")}
              disabled={busy}
              onPress={onRotate}
              icon={
                <ArrowClockwiseIcon
                  size={23}
                  color="#FFFFFFCC"
                  weight="bold"
                  style={editorIconShadow}
                />
              }
            />
            <EditorTool
              label={t("common:saveToGallery")}
              disabled={busy}
              onPress={onSaveToGallery}
              icon={
                <DownloadSimpleIcon
                  size={23}
                  color="#FFFFFFCC"
                  weight="bold"
                  style={editorIconShadow}
                />
              }
            />
            <EditorTool
              label={t("delete")}
              disabled={busy}
              onPress={onDelete}
              icon={
                <TrashIcon
                  size={22}
                  color="#FFFFFFCC"
                  weight="bold"
                  style={editorIconShadow}
                />
              }
            />
          </View>

          {busy ? (
            <View className="absolute inset-0 items-center justify-center bg-black/45">
              <ActivityIndicator color="#F7D786" size="large" />
            </View>
          ) : null}
        </View>

        <View className="pb-2 pt-3" style={{ flexShrink: 0 }}>
          <ScrollView
            horizontal
            scrollEnabled={!dragState}
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0, height: 64 }}
            contentContainerStyle={{
              alignItems: "center",
              paddingHorizontal: 18,
            }}
          >
            <View
              style={{
                position: "relative",
                width:
                  media.length * thumbnailStride +
                  (media.length < 10 ? 64 : 0),
                height: 64,
              }}
            >
              {media.map((item, index) => (
                <DraggableThumbnail
                  key={item.id}
                  item={item}
                  index={index}
                  count={media.length}
                  slotIndex={displayedSlot(item.id, index)}
                  selected={index === selectedIndex}
                  disabled={busy}
                  onPress={() => selectMedia(index)}
                  onDragStart={() =>
                    setDragState({
                      id: item.id,
                      fromIndex: index,
                      targetIndex: index,
                    })
                  }
                  onDragTarget={(targetIndex) =>
                    setDragState((current) =>
                      current?.id === item.id &&
                      current.targetIndex !== targetIndex
                        ? { ...current, targetIndex }
                        : current,
                    )
                  }
                  onDrop={(targetIndex) => {
                    onReorder(index, targetIndex);
                    setDragState(null);
                  }}
                  onDragCancel={() => setDragState(null)}
                />
              ))}

              {media.length < 10 ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t("addPhotos")}
                  disabled={busy}
                  onPress={onAdd}
                  className="h-16 w-16 items-center justify-center rounded-2xl border"
                  style={{
                    position: "absolute",
                    left: media.length * thumbnailStride,
                    top: 0,
                    borderColor: isDark
                      ? "rgba(255,255,255,0.15)"
                      : "rgba(23,23,23,0.12)",
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(23,23,23,0.06)",
                  }}
                >
                  <PlusIcon size={25} color={foreground} weight="bold" />
                </TouchableOpacity>
              ) : null}
            </View>
          </ScrollView>
          <Text
            numberOfLines={1}
            className="mt-2 px-5 text-center text-xs"
            style={{ color: mutedForeground }}
          >
            {selectedMedia ? t("editPhotoHint") : ""}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const thumbnailStride = 74;

const editorIconShadow = {
  shadowColor: "#0B0B0A",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.35,
  shadowRadius: 4,
  elevation: 6,
};

const editorTextShadow = {
  textShadowColor: "#0B0B0A",
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 8,
};

function triggerReorderHaptic() {
  void Haptics.selectionAsync();
}

function DraggableThumbnail({
  item,
  index,
  count,
  slotIndex,
  selected,
  disabled,
  onPress,
  onDragStart,
  onDragTarget,
  onDrop,
  onDragCancel,
}: {
  item: ContentMediaDraft;
  index: number;
  count: number;
  slotIndex: number;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  onDragStart: () => void;
  onDragTarget: (targetIndex: number) => void;
  onDrop: (targetIndex: number) => void;
  onDragCancel: () => void;
}) {
  const translateX = useSharedValue(0);
  const dragging = useSharedValue(0);
  const slotX = useSharedValue(slotIndex * thumbnailStride);
  const lastTarget = useSharedValue(index);

  useEffect(() => {
    slotX.set(
      withTiming(slotIndex * thumbnailStride, {
        duration: dragging.get() ? 110 : 0,
      }),
    );
  }, [dragging, slotIndex, slotX]);

  useEffect(() => {
    if (!dragging.get()) {
      translateX.set(0);
      lastTarget.set(index);
    }
  }, [dragging, index, lastTarget, translateX]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!disabled)
        .activateAfterLongPress(280)
        .maxPointers(1)
        .onStart(() => {
          dragging.set(1);
          lastTarget.set(index);
          runOnJS(triggerReorderHaptic)();
          runOnJS(onDragStart)();
        })
        .onUpdate((event) => {
          translateX.set(
            Math.max(
              -index * thumbnailStride,
              Math.min(
                (count - 1 - index) * thumbnailStride,
                event.translationX,
              ),
            ),
          );
          const targetIndex = Math.max(
            0,
            Math.min(
              count - 1,
              index + Math.round(translateX.get() / thumbnailStride),
            ),
          );
          if (targetIndex !== lastTarget.get()) {
            lastTarget.set(targetIndex);
            runOnJS(triggerReorderHaptic)();
            runOnJS(onDragTarget)(targetIndex);
          }
        })
        .onEnd(() => {
          runOnJS(onDrop)(lastTarget.get());
        })
        .onFinalize((_event, success) => {
          dragging.set(0);
          if (!success || lastTarget.get() === index) {
            translateX.set(0);
          }
          if (!success) {
            runOnJS(onDragCancel)();
          }
        }),
    [
      count,
      disabled,
      dragging,
      index,
      lastTarget,
      onDragCancel,
      onDragStart,
      onDragTarget,
      onDrop,
      translateX,
    ],
  );
  const animatedStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    left: slotX.value,
    top: 0,
    zIndex: dragging.value ? 50 : 0,
    elevation: dragging.value ? 12 : 0,
    opacity: dragging.value ? 0.92 : 1,
    transform: [
      { translateX: translateX.value },
      { scale: dragging.value ? 1.08 : 1 },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected }}
          disabled={disabled}
          onPress={onPress}
          className={`h-16 w-16 overflow-hidden rounded-2xl border-2 ${
            selected ? "border-brand" : "border-transparent"
          }`}
        >
          <ProgressiveImage
            source={{ uri: item.uri }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            cachePolicy="none"
            transition={0}
          />
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
}

function EditorTool({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      className={`w-16 items-center px-1 py-2.5 ${
        disabled ? "opacity-40" : ""
      }`}
    >
      {icon}
      <Text
        numberOfLines={1}
        className="mt-1 text-[10px] font-semibold"
        style={[editorTextShadow, { color: "#FAF9F6" }]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
