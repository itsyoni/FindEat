import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import {
  type AppAlertRequest,
  registerAppAlertHandler,
} from "@/lib/appAlert";
import type { AlertButton } from "react-native";
import { Modal, Pressable, View } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const { isDark } = useAppTheme();
  const { t, i18n } = useTranslation("common");
  const isRtl = i18n.language.startsWith("he");
  const [request, setRequest] = useState<AppAlertRequest | null>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const dismissFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    registerAppAlertHandler(setRequest);
    return () => {
      registerAppAlertHandler(null);
      if (dismissFallbackRef.current) {
        clearTimeout(dismissFallbackRef.current);
      }
    };
  }, []);

  const buttons: AlertButton[] = request?.buttons?.length
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
      const onPress = button?.onPress;
      const onDismiss = request?.options?.onDismiss;
      pendingActionRef.current = () => {
        onPress?.();
        onDismiss?.();
      };
      setRequest(null);

      // `onDismiss` schedules the action with a small post-animation buffer.
      // Keep a longer fallback for platforms where that event is not emitted.
      if (dismissFallbackRef.current) {
        clearTimeout(dismissFallbackRef.current);
      }
      dismissFallbackRef.current = setTimeout(runPendingAction, 700);
    },
    [request?.options?.onDismiss, runPendingAction],
  );

  const cancelButton = buttons.find((button) => button.style === "cancel");
  const canDismissBackdrop = request?.options?.cancelable === true;
  const horizontalActions = buttons.length === 2;
  const tone = request?.options?.tone ?? "default";
  const alertBackgroundColor = isDark ? "#171717" : "#FAF9F6";
  const alertBorderColor = isDark
    ? "rgba(255,255,255,0.1)"
    : "rgba(0,0,0,0.08)";
  const titleColor = isDark ? "#FAF9F6" : "#171717";

  return (
    <>
      {children}
      <Modal
        visible={!!request}
        transparent
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onDismiss={schedulePendingAction}
        onRequestClose={() => {
          if (cancelButton) close(cancelButton);
          else if (canDismissBackdrop) close();
        }}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 px-6"
          onPress={() => {
            if (canDismissBackdrop) close(cancelButton);
          }}
        >
          <Pressable
            accessibilityViewIsModal
            className="w-full max-w-md overflow-hidden rounded-3xl border p-5 shadow-2xl"
            onPress={(event) => event.stopPropagation()}
            style={{
              direction: isRtl ? "rtl" : "ltr",
              backgroundColor: alertBackgroundColor,
              borderColor: alertBorderColor,
            }}
          >
            <View className="mb-5">
              <Text
                weight="bold"
                className="text-xl text-[#171717] dark:text-white"
                style={{
                  textAlign: "auto",
                  writingDirection: isRtl ? "rtl" : "ltr",
                  color: titleColor,
                }}
              >
                {request?.title}
              </Text>
              {request?.message ? (
                <Text
                  className="mt-2 text-base leading-6 text-[#706C66] dark:text-gray-300"
                  style={{
                    textAlign: "auto",
                    writingDirection: isRtl ? "rtl" : "ltr",
                  }}
                >
                  {request.message}
                </Text>
              ) : null}
            </View>

            <View
              className={horizontalActions ? "flex-row gap-2" : "gap-2"}
              style={{ direction: isRtl ? "rtl" : "ltr" }}
            >
              {buttons.map((button, index) => {
                const destructive = button.style === "destructive";
                const cancel = button.style === "cancel";
                const backgroundColor = destructive
                  ? "#DC2626"
                  : cancel
                    ? isDark
                      ? "#292929"
                      : "#EEEAE4"
                    : tone === "success"
                      ? "#16A34A"
                      : tone === "warning"
                        ? "#DC2626"
                        : isDark
                          ? "#FAF9F6"
                          : "#171717";
                const textColor = destructive
                  ? "#FAF9F6"
                  : cancel
                    ? isDark
                      ? "#FAF9F6"
                      : "#171717"
                    : tone === "success" || tone === "warning"
                      ? "#FAF9F6"
                      : isDark
                        ? "#171717"
                        : "#FAF9F6";

                return (
                  <Pressable
                    key={`${button.text ?? "action"}-${index}`}
                    accessibilityRole="button"
                    onPress={() => close(button)}
                    className={`${horizontalActions ? "flex-1" : "w-full"} min-h-12 items-center justify-center rounded-2xl px-4 py-3 active:opacity-75`}
                    style={{ backgroundColor }}
                  >
                    <Text
                      weight="bold"
                      className="text-center text-base"
                      style={{ color: textColor }}
                    >
                      {button.text ?? t("ok")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
