import AnimatedGallerySaveIcon from "@/components/common/AnimatedGallerySaveIcon";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import ContentVideo from "@/components/posts/content/ContentVideo";
import { useAppTheme } from "@/contexts/ThemeContext";
import type { GallerySaveStatus } from "@/hooks/useGallerySaveFeedback";
import {
  PencilSimpleIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
  TextAaIcon,
  TrashIcon,
} from "phosphor-react-native";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CONTENT_ASPECT = 11 / 17;

type Props = {
  uri: string;
  overlayUri?: string;
  muted: boolean;
  busy?: boolean;
  gallerySaveStatus?: GallerySaveStatus;
  onBack: () => void;
  onNext: () => void;
  onMutedChange: (muted: boolean) => void;
  onEditText: () => void;
  onEditDraw: () => void;
  onSaveToGallery: () => void;
  onDelete: () => void;
};

export default function ContentVideoEditor({
  uri,
  overlayUri,
  muted,
  busy = false,
  gallerySaveStatus = "idle",
  onBack,
  onNext,
  onMutedChange,
  onEditText,
  onEditDraw,
  onSaveToGallery,
  onDelete,
}: Props) {
  const { t } = useTranslation(["create", "common", "snaps"]);
  const { isDark } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const foreground = isDark ? "#FAF9F6" : "#171717";
  const mutedForeground = isDark ? "rgba(255,255,255,0.55)" : "#706C66";
  const availableHeight = Math.max(320, height - 150);
  const previewWidth = Math.min(width, availableHeight * CONTENT_ASPECT);

  return (
    <View
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-row items-center px-4 py-2">
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
              {t("editVideo")}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={busy}
            onPress={onNext}
            className={`min-h-11 min-w-16 items-center justify-center rounded-full bg-brand px-4 ${
              busy ? "opacity-40" : ""
            }`}
          >
            <Text className="font-bold text-black">{t("next")}</Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            flex: 1,
            minHeight: 0,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            backgroundColor: isDark ? "#0A0A0A" : "#EEEAE4",
          }}
        >
          <View
            className="overflow-hidden bg-black"
            style={{ width: previewWidth, aspectRatio: CONTENT_ASPECT }}
          >
            <ContentVideo
              uri={uri}
              overlayUri={overlayUri}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              autoPlay
              tapToToggle
              showProgress
              muted={muted}
              onMutedChange={onMutedChange}
            />
          </View>

          <View className="absolute right-3 top-3 gap-3">
            <EditorTool
              label={t("snaps:textTool")}
              disabled={busy}
              onPress={onEditText}
              icon={
                <TextAaIcon
                  size={23}
                  color="#FFFFFFCC"
                  weight="bold"
                  style={editorIconShadow}
                />
              }
            />
            <EditorTool
              label={t("common:draw")}
              disabled={busy}
              onPress={onEditDraw}
              icon={
                <PencilSimpleIcon
                  size={23}
                  color="#FFFFFFCC"
                  weight="bold"
                  style={editorIconShadow}
                />
              }
            />
            <EditorTool
              label={t(muted ? "restoreOriginalSound" : "muteOriginalSound")}
              disabled={busy}
              onPress={() => onMutedChange(!muted)}
              icon={
                muted ? (
                  <SpeakerSlashIcon
                    size={23}
                    color="#FFFFFFCC"
                    weight="fill"
                    style={editorIconShadow}
                  />
                ) : (
                  <SpeakerHighIcon
                    size={23}
                    color="#FFFFFFCC"
                    weight="fill"
                    style={editorIconShadow}
                  />
                )
              }
            />
            <EditorTool
              label={t("common:saveToGallery")}
              disabled={busy || gallerySaveStatus === "saving"}
              onPress={onSaveToGallery}
              icon={
                <AnimatedGallerySaveIcon
                  status={gallerySaveStatus}
                  size={23}
                  color="#FFFFFFCC"
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
        </View>

        <Text
          numberOfLines={1}
          className="px-5 pb-3 pt-3 text-center text-xs"
          style={{ color: mutedForeground }}
        >
          {t("videoEditHint")}
        </Text>
      </SafeAreaView>
    </View>
  );
}

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
