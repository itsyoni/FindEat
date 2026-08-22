import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = process.env.APP_VARIANT ?? "development";
  const appleTeamId = process.env.APPLE_TEAM_ID?.trim();
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const googleIosUrlScheme =
    process.env.GOOGLE_IOS_URL_SCHEME?.trim() ??
    (googleIosClientId?.endsWith(".apps.googleusercontent.com")
      ? `com.googleusercontent.apps.${googleIosClientId.replace(".apps.googleusercontent.com", "")}`
      : undefined);
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON?.trim() ??
    config.android?.googleServicesFile;

  const isDevelopment = variant === "development";
  const isPreview = variant === "preview";

  const name = isDevelopment
    ? "FindEat Dev"
    : isPreview
      ? "FindEat Preview"
      : "FindEat";

  const bundleIdentifier = isDevelopment
    ? "com.itsyoni.findeat.dev"
    : isPreview
      ? "com.itsyoni.findeat.preview"
      : "com.itsyoni.findeat";

  const scheme = isDevelopment
    ? "findeat-dev"
    : isPreview
      ? "findeat-preview"
      : "findeat";

  const userActivityTypes = Array.from(
    new Set([
      ...((config.ios?.infoPlist?.NSUserActivityTypes as string[] | undefined) ?? []),
      "INSendMessageIntent",
    ]),
  );

  return {
    ...config,

    name,
    slug: config.slug ?? "mobile",
    scheme,

    plugins: [
      ...(config.plugins ?? []),
      ...(googleIosUrlScheme
        ? [
            [
              "@react-native-google-signin/google-signin",
              { iosUrlScheme: googleIosUrlScheme },
            ] as [string, { iosUrlScheme: string }],
          ]
        : []),
      "@react-native-community/datetimepicker",
      "@bacons/apple-targets",
    ],

    ios: {
      ...config.ios,
      bundleIdentifier,
      usesAppleSignIn: true,
      ...(appleTeamId ? { appleTeamId } : {}),
      entitlements: {
        ...config.ios?.entitlements,
        "com.apple.developer.usernotifications.communication": true,
        "com.apple.developer.siri": true,
      },
      infoPlist: {
        ...config.ios?.infoPlist,
        NSUserActivityTypes: userActivityTypes,
      },
    },

    android: {
      ...config.android,
      package: bundleIdentifier,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
