const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withRemoveRecordAudio(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    const permissions = Array.isArray(manifest["uses-permission"]) ? manifest["uses-permission"] : [];
    manifest["uses-permission"] = permissions.filter(
      (permission) => permission?.$?.["android:name"] !== "android.permission.RECORD_AUDIO",
    );
    manifest["uses-permission"].push({
      $: {
        "android:name": "android.permission.RECORD_AUDIO",
        "tools:node": "remove",
      },
    });
    return mod;
  });
};
