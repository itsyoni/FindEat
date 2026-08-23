import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import {
  type AppAlertRequest,
  registerAppAlertHandler,
} from "@/lib/appAlert";
import { Image } from "expo-image";
import {
  CheckCircleIcon,
  CameraIcon,
  ImagesSquareIcon,
  InfoIcon,
  TrashIcon,
  WarningDiamondIcon,
  XIcon,
} from "phosphor-react-native";
import type { AlertButton } from "react-native";
import type { AppAlertButton } from "@/lib/appAlert";
import { Modal, Pressable, View } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Reanimated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from "react-native-reanimated";

const GUIDE_ILLUSTRATION = require("@/assets/images/alerts/findeat-guide.png");

function inferredTone(request: AppAlertRequest | null, buttons: AlertButton[]) {
  if (request?.options?.tone) return request.options.tone;
  if (buttons.some((button) => button.style === "destructive")) {
    return "destructive" as const;
  }

  const copy = `${request?.title ?? ""} ${request?.message ?? ""}`.toLowerCase();
  if (
    /(error|failed|could not|invalid|missing|required|unable|problem|שגיאה|נכשל|לא ניתן|חסר|נדרש|בעיה)/i.test(
      copy,
    )
  ) {
    return "warning" as const;
  }
  if (
    /(success|saved|sent|changed|added|created|ready|joined|הצלח|נשמר|נשלח|שונה|נוסף|נוצר|מוכן)/i.test(
      copy,
    )
  ) {
    return "success" as const;
  }
  return "default" as const;
}

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const { isDark } = useAppTheme();
  const { t, i18n } = useTranslation("common");
  const isRtl = i18n.language.startsWith("he");
  const [request, setRequest] = useState<AppAlertRequest | null>(null);
  const [closing, setClosing] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const dismissFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeAnimationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAlert = useCallback((nextRequest: AppAlertRequest) => {
    if (closeAnimationRef.current) {
      clearTimeout(closeAnimationRef.current);
      closeAnimationRef.current = null;
    }
    setClosing(false);
    setRequest(nextRequest);
  }, []);

  useEffect(() => {
    registerAppAlertHandler(showAlert);
    return () => {
      registerAppAlertHandler(null);
      if (dismissFallbackRef.current) {
        clearTimeout(dismissFallbackRef.current);
      }
      if (closeAnimationRef.current) {
        clearTimeout(closeAnimationRef.current);
      }
    };
  }, [showAlert]);

  const buttons: AppAlertButton[] = request?.buttons?.length
    ? request.buttons
    : [{ text: t("ok") }];

  const runPendingAction = useCallback(() => {
    if (dismissFallbackRef.current) {
      clearTimeout(dismissFallbackRef.current);
      dismissFallbackRef.current = null;
    }

    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    action?.();
  }, []);

  const schedulePendingAction = useCallback(() => {
    if (dismissFallbackRef.current) {
      clearTimeout(dismissFallbackRef.current);
    }

    // Native controllers such as the camera and photo picker need the
    // presenting view controller to settle after the alert has disappeared.
    dismissFallbackRef.current = setTimeout(runPendingAction, 250);
  }, [runPendingAction]);

  const close = useCallback(
    (button?: AlertButton) => {
      if (closing) return;
      const onPress = button?.onPress;
      const onDismiss = request?.options?.onDismiss;
      pendingActionRef.current = () => {
        onPress?.();
        onDismiss?.();
      };
      setClosing(true);
      closeAnimationRef.current = setTimeout(() => {
        closeAnimationRef.current = null;
        setRequest(null);
        setClosing(false);
      }, 180);

      // `onDismiss` schedules the action with a small post-animation buffer.
      // Keep a longer fallback for platforms where that event is not emitted.
      if (dismissFallbackRef.current) {
        clearTimeout(dismissFallbackRef.current);
      }
      dismissFallbackRef.current = setTimeout(runPendingAction, 900);
    },
    [closing, request?.options?.onDismiss, runPendingAction],
  );

  const cancelButton = buttons.find((button) => button.style === "cancel");
  const canDismissBackdrop = request?.options?.cancelable === true;
  const horizontalActions = buttons.length === 2;
  const tone = inferredTone(request, buttons);
  const illustration = request?.options?.illustration ?? "auto";
  const showGuide =
    illustration === "guide" ||
    (illustration === "auto" &&
      (tone === "default" || tone === "info") &&
      Boolean(request?.message) &&
      buttons.length > 1);
  const alertBackgroundColor = isDark ? "#1B1A18" : "#FAF8F3";
  const alertBorderColor = isDark
    ? "rgba(250,249,246,0.1)"
    : "rgba(36,34,31,0.08)";
  const titleColor = isDark ? "#F5F2EC" : "#24221F";
  const toneVisual =
    tone === "success"
      ? { background: isDark ? "#18351F" : "#E7F4E8", color: "#4F9D5D" }
      : tone === "warning"
        ? { background: isDark ? "#402D12" : "#FFF0D4", color: "#D97706" }
        : tone === "destructive"
          ? { background: isDark ? "#421D1D" : "#FBE7E5", color: "#D64A42" }
          : { background: isDark ? "#2E2B25" : "#F3E7CE", color: "#D97706" };

  const ToneIcon =
    tone === "success"
      ? CheckCircleIcon
      : tone === "warning"
        ? WarningDiamondIcon
        : tone === "destructive"
          ? TrashIcon
          : InfoIcon;

  return (
    <>
      {children}
      <Modal
        visible={!!request}
        transparent
        animationType="none"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onDismiss={schedulePendingAction}
        onRequestClose={() => {
          if (closing) return;
          if (cancelButton) close(cancelButton);
          else if (canDismissBackdrop) close();
        }}
      >
        {!closing ? (
        <Reanimated.View
          entering={FadeIn.duration(170)}
          exiting={FadeOut.duration(170)}
          className="flex-1"
          style={{ backgroundColor: "rgba(24,22,18,0.62)" }}
        >
        <Pressable
          className="flex-1 items-center justify-center px-5"
          onPress={() => {
            if (canDismissBackdrop) close(cancelButton);
          }}
        >
          <Reanimated.View
            entering={ZoomIn.duration(210)}
            exiting={ZoomOut.duration(170)}
            className="w-full max-w-[390px]"
          >
          <Pressable
            accessibilityViewIsModal
            className="w-full overflow-hidden rounded-[32px] border px-5 pb-5 pt-4 shadow-2xl"
            onPress={(event) => event.stopPropagation()}
            style={{
              direction: isRtl ? "rtl" : "ltr",
              backgroundColor: alertBackgroundColor,
              borderColor: alertBorderColor,
            }}
          >
            <View className="items-center">
              {illustration === "none" ? null : showGuide ? (
                <View
                  className="mb-2 h-32 w-full items-center justify-center overflow-hidden rounded-3xl"
                  style={{ backgroundColor: toneVisual.background }}
                >
                  <Image
                    source={GUIDE_ILLUSTRATION}
                    style={{ width: 126, height: 126 }}
                    contentFit="contain"
                  />
                </View>
              ) : (
                <View
                  className="mb-4 h-14 w-14 items-center justify-center rounded-full"
                  style={{ backgroundColor: toneVisual.background }}
                >
                  <ToneIcon size={28} color={toneVisual.color} weight="duotone" />
                </View>
              )}
              <Text
                weight="bold"
                className="text-center text-[21px] leading-7"
                style={{
                  textAlign: "center",
                  writingDirection: isRtl ? "rtl" : "ltr",
                  color: titleColor,
                }}
              >
                {request?.title}
              </Text>
              {request?.message ? (
                <Text
                  className="mt-2 text-center text-[15px] leading-6 text-[#706C66] dark:text-[#C9C5BE]"
                  style={{
                    textAlign: "center",
                    writingDirection: isRtl ? "rtl" : "ltr",
                  }}
                >
                  {request.message}
                </Text>
              ) : null}
            </View>

            <View
              className={`${horizontalActions ? "flex-row gap-2" : "gap-2"} mt-5`}
              style={{ direction: isRtl ? "rtl" : "ltr" }}
            >
              {buttons.map((button, index) => {
                const destructive = button.style === "destructive";
                const cancel = button.style === "cancel";
                const backgroundColor = destructive
                  ? "#D64A42"
                  : cancel
                    ? isDark
                      ? "#2B2926"
                      : "#EEE9E1"
                    : tone === "success"
                      ? "#4F9D5D"
                      : tone === "warning"
                        ? "#D97706"
                        : isDark
                          ? "#F0ECE4"
                          : "#2B2926";
                const textColor = destructive
                  ? "#FAF9F6"
                  : cancel
                    ? isDark
                      ? "#F5F2EC"
                      : "#24221F"
                    : tone === "success" || tone === "warning"
                      ? "#FAF9F6"
                      : isDark
                        ? "#24221F"
                        : "#F5F2EC";

                const ButtonIcon =
                  button.icon === "camera"
                    ? CameraIcon
                    : button.icon === "gallery"
                      ? ImagesSquareIcon
                      : button.icon === "check"
                        ? CheckCircleIcon
                        : button.icon === "trash"
                          ? TrashIcon
                          : button.icon === "close"
                            ? XIcon
                            : destructive
                              ? TrashIcon
                              : cancel
                                ? XIcon
                                : tone === "success"
                                  ? CheckCircleIcon
                                  : null;

                return (
                  <Pressable
                    key={`${button.text ?? "action"}-${index}`}
                    accessibilityRole="button"
                    onPress={() => close(button)}
                    className={`${horizontalActions ? "flex-1" : "w-full"} min-h-12 flex-row items-center justify-center rounded-2xl px-4 py-3 active:opacity-75`}
                    style={{ backgroundColor }}
                  >
                    {ButtonIcon ? (
                      <ButtonIcon
                        size={17}
                        color={textColor}
                        weight={destructive ? "bold" : "regular"}
                      />
                    ) : null}
                    <Text
                      weight="bold"
                      className="text-center text-[15px]"
                      style={{ color: textColor, marginStart: ButtonIcon ? 7 : 0 }}
                    >
                      {button.text ?? t("ok")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
          </Reanimated.View>
        </Pressable>
        </Reanimated.View>
        ) : null}
      </Modal>
    </>
  );
}
