const { withAndroidManifest } = require("@expo/config-plugins");

const MICROPHONE_FEATURE = "android.hardware.microphone";

module.exports = function withAndroidOptionalMicrophone(config) {
  return withAndroidManifest(config, (configWithManifest) => {
    const manifest = configWithManifest.modResults.manifest;
    const features = manifest["uses-feature"] ?? [];
    const existing = features.find(
      (feature) => feature.$?.["android:name"] === MICROPHONE_FEATURE,
    );

    if (existing) {
      existing.$["android:required"] = "false";
    } else {
      features.push({
        $: {
          "android:name": MICROPHONE_FEATURE,
          "android:required": "false",
        },
      });
    }

    manifest["uses-feature"] = features;
    return configWithManifest;
  });
};
