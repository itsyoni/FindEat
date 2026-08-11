import {
  BottomSheetBackdrop,
  BottomSheetFooterProps,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import { ReactNode, useCallback, useEffect, useRef } from "react";
import { Keyboard } from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";

type Props = {
  open: boolean;
  snapPoints?: string[];
  onClose: () => void;
  children: ReactNode;
  stackBehavior?: "push" | "switch" | "replace";
  androidKeyboardInputMode?: "adjustPan" | "adjustResize";
  keyboardBehavior?: "interactive" | "extend" | "fillParent";
  keyboardBlurBehavior?: "none" | "restore";
  enableContentPanningGesture?: boolean;
  dismissKeyboardBeforeBackdropClose?: boolean;
  footerComponent?: (
    props: BottomSheetFooterProps,
  ) => React.ReactElement | null;
};

export default function AppBottomSheet({
  open,
  onClose,
  children,
  footerComponent,
  snapPoints,
  stackBehavior,
  androidKeyboardInputMode,
  keyboardBehavior,
  keyboardBlurBehavior,
  enableContentPanningGesture,
  dismissKeyboardBeforeBackdropClose,
}: Props) {
  if (!open) return null;

  return (
    <PresentedBottomSheet
      onClose={onClose}
      footerComponent={footerComponent}
      snapPoints={snapPoints}
      stackBehavior={stackBehavior}
      androidKeyboardInputMode={androidKeyboardInputMode}
      keyboardBehavior={keyboardBehavior}
      keyboardBlurBehavior={keyboardBlurBehavior}
      enableContentPanningGesture={enableContentPanningGesture}
      dismissKeyboardBeforeBackdropClose={dismissKeyboardBeforeBackdropClose}
    >
      {children}
    </PresentedBottomSheet>
  );
}

function PresentedBottomSheet({
  onClose,
  children,
  footerComponent,
  snapPoints,
  stackBehavior,
  androidKeyboardInputMode = "adjustResize",
  keyboardBehavior = "interactive",
  keyboardBlurBehavior = "restore",
  enableContentPanningGesture = true,
  dismissKeyboardBeforeBackdropClose = false,
}: Omit<Props, "open">) {
  const { isDark } = useAppTheme();
  const modalRef = useRef<BottomSheetModal>(null);
  const backdropCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const finishBackdropClose = useCallback(() => {
    modalRef.current?.dismiss();
    onClose();
  }, [onClose]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      modalRef.current?.present();
    });

    return () => {
      cancelAnimationFrame(frame);
      if (backdropCloseTimerRef.current) {
        clearTimeout(backdropCloseTimerRef.current);
      }
    };
  }, []);

  const closeAfterKeyboard = useCallback(() => {
    if (!dismissKeyboardBeforeBackdropClose || !Keyboard.isVisible()) {
      finishBackdropClose();
      return;
    }

    let closed = false;
    const finishClose = () => {
      if (closed) return;
      closed = true;
      keyboardHiddenSubscription.remove();
      if (backdropCloseTimerRef.current) {
        clearTimeout(backdropCloseTimerRef.current);
        backdropCloseTimerRef.current = null;
      }
      finishBackdropClose();
    };
    const keyboardHiddenSubscription = Keyboard.addListener(
      "keyboardDidHide",
      finishClose,
    );

    Keyboard.dismiss();
    backdropCloseTimerRef.current = setTimeout(finishClose, 450);
  }, [dismissKeyboardBeforeBackdropClose, finishBackdropClose]);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        opacity={0.45}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={dismissKeyboardBeforeBackdropClose ? 0 : "close"}
        onPress={
          dismissKeyboardBeforeBackdropClose ? closeAfterKeyboard : undefined
        }
        style={{
          backgroundColor: "#0B0B0A",
        }}
      />
    ),
    [closeAfterKeyboard, dismissKeyboardBeforeBackdropClose],
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      enableContentPanningGesture={enableContentPanningGesture}
      enableHandlePanningGesture
      keyboardBehavior={keyboardBehavior}
      keyboardBlurBehavior={keyboardBlurBehavior}
      android_keyboardInputMode={androidKeyboardInputMode}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      footerComponent={footerComponent}
      stackBehavior={stackBehavior}
      backgroundStyle={{
        backgroundColor: isDark ? "#111827" : "#FAF9F6",
        borderRadius: 28,
      }}
      handleIndicatorStyle={{
        backgroundColor: isDark ? "#6B7280" : "#D1D5DB",
      }}
    >
      {children}
    </BottomSheetModal>
  );
}
