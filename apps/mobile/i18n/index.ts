import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import { resources } from "@/locales";

const i18n = createInstance();

void i18n.use(initReactI18next).init({
  compatibilityJSON: "v4",
  resources,
  lng: "en",
  fallbackLng: "en",
  defaultNS: "common",
  ns: ["common", "auth", "create", "profile", "settings", "map", "chat", "notifications", "snaps", "restaurants", "collaborativeReview"],
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
