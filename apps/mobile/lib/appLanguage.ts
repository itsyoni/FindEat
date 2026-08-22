import { LANGUAGE_KEY } from "@/constants/storage";
import i18n from "@/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { reloadAppAsync } from "expo";
import { I18nManager, Platform } from "react-native";

export type AppLanguage = "en" | "he" | "ru";

export function isRtlLanguage(language: string) {
  return language.toLowerCase().startsWith("he");
}

export async function applyAppLanguage(
  language: AppLanguage,
  options: { reloadIfDirectionChanges?: boolean } = {},
) {
  const shouldBeRtl = isRtlLanguage(language);

  await AsyncStorage.setItem(LANGUAGE_KEY, language);
  await i18n.changeLanguage(language);

  if (Platform.OS === "web") {
    if (typeof document !== "undefined") {
      document.documentElement.dir = shouldBeRtl ? "rtl" : "ltr";
      document.documentElement.lang = language;
    }
    return false;
  }

  I18nManager.swapLeftAndRightInRTL(true);
  if (I18nManager.isRTL === shouldBeRtl) return false;

  I18nManager.allowRTL(shouldBeRtl);
  I18nManager.forceRTL(shouldBeRtl);

  if (options.reloadIfDirectionChanges !== false) {
    await reloadAppAsync("language-direction-change");
  }

  return true;
}
