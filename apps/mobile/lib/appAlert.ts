import { Alert as NativeAlert } from "react-native";
import type { AlertButton, AlertOptions } from "react-native";

export type AppAlertButtonIcon =
  | "camera"
  | "gallery"
  | "check"
  | "trash"
  | "sign-out"
  | "close";

export type AppAlertButton = AlertButton & {
  icon?: AppAlertButtonIcon;
};

export type AppAlertTone =
  | "default"
  | "info"
  | "success"
  | "error"
  | "warning"
  | "destructive";

export type AppAlertOptions = AlertOptions & {
  tone?: AppAlertTone;
  illustration?: "auto" | "guide" | "none";
  icon?: "auto" | "sign-out";
};

export type AppAlertRequest = {
  title: string;
  message?: string;
  buttons?: AppAlertButton[];
  options?: AppAlertOptions;
};

type AlertHandler = (request: AppAlertRequest) => void;

let handler: AlertHandler | null = null;

export function registerAppAlertHandler(nextHandler: AlertHandler | null) {
  handler = nextHandler;
}

export const AppAlert = {
  alert(
    title: string,
    message?: string,
    buttons?: AppAlertButton[],
    options?: AppAlertOptions,
  ) {
    if (!handler) {
      const {
        tone: _tone,
        illustration: _illustration,
        icon: _icon,
        ...nativeOptions
      } = options ?? {};
      NativeAlert.alert(title, message, buttons, nativeOptions);
      return;
    }

    handler({ title, message, buttons, options });
  },
};
