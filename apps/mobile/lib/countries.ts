import * as countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import he from "i18n-iso-countries/langs/he.json";

countries.registerLocale(en);
countries.registerLocale(he);

export type CountryOption = {
  code: string;
  name: string;
};

export function getCountryOptions(language: string): CountryOption[] {
  const locale = language.toLowerCase().startsWith("he") ? "he" : "en";
  return Object.keys(countries.getAlpha2Codes()).map((code) => ({
    code,
    name: countries.getName(code, locale, { select: "official" }) ??
      countries.getName(code, "en", { select: "official" }) ??
      code,
  })).sort((left, right) => left.name.localeCompare(right.name, language));
}

export function countryFlag(code: string) {
  return code
    .toUpperCase()
    .replace(/[A-Z]/g, (letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)));
}
