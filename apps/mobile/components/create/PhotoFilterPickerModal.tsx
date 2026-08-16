import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import {
  PHOTO_FILTERS,
  photoFilterMatrix,
  type PhotoFilterId,
} from "@/lib/photoFilters";
import {
  Canvas,
  ColorMatrix,
  Image as SkiaImage,
  useImage,
} from "@shopify/react-native-skia";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  View,
} from "react-native";
import {
  initialWindowMetrics,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

function FilteredPreview({
  filterId,
  width,
  height,
  image,
}: {
  filterId: PhotoFilterId;
  width: number;
  height: number;
  image: ReturnType<typeof useImage>;
}) {
  return (
    <Canvas style={{ width, height }}>
      {image ? (
        <SkiaImage
          image={image}
          x={0}
          y={0}
          width={width}
          height={height}
          fit="cover"
        >
          <ColorMatrix matrix={photoFilterMatrix(filterId)} />
        </SkiaImage>
      ) : null}
    </Canvas>
  );
}

export default function PhotoFilterPickerModal({
  visible,
  imageUri,
  value = "ORIGINAL",
  onClose,
  onApply,
}: {
  visible: boolean;
  imageUri: string;
  value?: PhotoFilterId;
  onClose: () => void;
  onApply: (filterId: PhotoFilterId) => Promise<void>;
}) {
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation("common");
  const [selected, setSelected] = useState<PhotoFilterId>(value);
  const [applying, setApplying] = useState(false);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });

  async function apply() {
    if (applying) return;
    setApplying(true);
    try {
      await onApply(selected);
      onClose();
    } finally {
      setApplying(false);
    }
  }

  const foreground = isDark ? "#F5F2EC" : "#24231F";
  const surface = isDark ? "#121210" : "#FBFAF8";
  const image = useImage(imageUri);
  const reportedTopInset = Math.max(
    insets.top,
    initialWindowMetrics?.insets.top ?? 0,
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0,
  );
  const topInset = reportedTopInset || (Platform.OS === "ios" ? 44 : 0);
  const bottomInset = Math.max(
    insets.bottom,
    initialWindowMetrics?.insets.bottom ?? 0,
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onShow={() => setSelected(value)}
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: surface,
          paddingTop: topInset,
          paddingBottom: bottomInset,
        }}
      >
          <View className="flex-row items-center px-4 py-2">
            <TouchableOpacity
              disabled={applying}
              onPress={onClose}
              className="min-h-11 min-w-16 justify-center"
            >
              <Text className="text-base font-semibold" style={{ color: foreground }}>
                {t("cancel")}
              </Text>
            </TouchableOpacity>
            <Text
              className="flex-1 text-center text-lg font-bold"
              style={{ color: foreground }}
            >
              {t("photoFilters")}
            </Text>
            <TouchableOpacity
              disabled={applying}
              onPress={() => void apply()}
              className="min-h-11 min-w-16 items-end justify-center"
            >
              {applying ? (
                <ActivityIndicator color="#D5A400" />
              ) : (
                <Text className="text-base font-bold text-[#C99500]">
                  {t("done")}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View
            className="min-h-0 flex-1 overflow-hidden"
            style={{ backgroundColor: isDark ? "#0B0B0A" : "#EEEAE4" }}
            onLayout={(event) =>
              setPreviewSize({
                width: event.nativeEvent.layout.width,
                height: event.nativeEvent.layout.height,
              })
            }
          >
            {previewSize.width > 0 && previewSize.height > 0 ? (
              <FilteredPreview
                filterId={selected}
                width={previewSize.width}
                height={previewSize.height}
                image={image}
              />
            ) : null}
          </View>

          <View className="py-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
            >
              {PHOTO_FILTERS.map((filter) => {
                const active = selected === filter.id;
                return (
                  <TouchableOpacity
                    key={filter.id}
                    disabled={applying}
                    onPress={() => setSelected(filter.id)}
                    className="items-center"
                  >
                    <View
                      className="h-[78px] w-[62px] overflow-hidden rounded-xl border-2"
                      style={{
                        borderColor: active ? "#E9B51B" : "transparent",
                      }}
                    >
                      <FilteredPreview
                        filterId={filter.id}
                        width={62}
                        height={78}
                        image={image}
                      />
                    </View>
                    <Text
                      numberOfLines={1}
                      className="mt-1.5 max-w-[72px] text-xs font-semibold"
                      style={{ color: active ? "#C99500" : foreground }}
                    >
                      {t(filter.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
      </View>
    </Modal>
  );
}
