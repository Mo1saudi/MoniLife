// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

// Bundle ID format: space.manus.<project_name_dots>.<timestamp>
// e.g., "my-app" created at 2024-01-15 10:30:45 -> "space.manus.my.app.t20240115103045"
// Bundle ID can only contain letters, numbers, and dots
// Android requires each dot-separated segment to start with a letter
const rawBundleId = "com.app.omnilifecenter";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".") // Replace hyphens/underscores with dots
    .replace(/[^a-zA-Z0-9.]/g, "") // Remove invalid chars
    .replace(/\.+/g, ".") // Collapse consecutive dots
    .replace(/^\.+|\.+$/g, "") // Trim leading/trailing dots
    .toLowerCase()
    .split(".")
    .map((segment) => {
      // Android requires each segment to start with a letter
      // Prefix with 'x' if segment starts with a digit
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "space.manus.app";
// Extract timestamp from bundle ID and prefix with "manus" for deep link scheme
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "OMNI LIFE",
  appSlug: "omni-life-center",
  // S3 URL of the app logo - set this to the URL returned by generate_image when creating custom logo
  // Leave empty to use the default icon from assets/images/icon.png
  logoUrl: "",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
  easProjectId: "316799b8-5ca6-44ed-bacd-b675e3d091b5",
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  owner: "mosaudifinal",
  // Account-management release; keep the Android version strictly increasing.
  version: "1.0.79",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  extra: {
    eas: {
      projectId: env.easProjectId,
    },
  },
  // OTA updates were intentionally cancelled; keeping this explicit prevents EAS from configuring an update runtime during APK builds.
  updates: {
    enabled: false,
  },
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    // Android compares this integer, not the display version. It must always increase for updates.
    versionCode: 10079,
    googleServicesFile: "./google-services.json",
    // READ_SMS is Android-only and requested only after the user enables the opt-in bank-SMS tracker.
    // Play distribution requires the applicable SMS Permissions Declaration and Data safety disclosure.
    permissions: ["POST_NOTIFICATIONS", "SCHEDULE_EXACT_ALARM", "RECEIVE_BOOT_COMPLETED", "WAKE_LOCK", "REQUEST_IGNORE_BATTERY_OPTIMIZATIONS", "FOREGROUND_SERVICE", "FOREGROUND_SERVICE_DATA_SYNC", "READ_SMS", "ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "ACCESS_BACKGROUND_LOCATION", "ACCESS_NOTIFICATION_POLICY"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-web-browser",
    "expo-asset",
    "expo-secure-store",
    [
      "expo-contacts",
      {
        contactsPermission: "يسمح OMNI LIFE بالوصول إلى جهات اتصالك لإضافة الشخص الذي تختاره إلى قسم العلاقات فقط.",
      },
    ],
    [
      "expo-notifications",
      {
        color: "#38D8FF",
        defaultChannel: "omni-life-high-priority",
        enableBackgroundRemoteNotifications: true,
        sounds: [
          "./assets/audio/sound_tasks.wav",
          "./assets/audio/sound_habits.wav",
          "./assets/audio/sound_finance.wav",
          "./assets/audio/sound_persona.wav",
          "./assets/audio/sound_evening.wav",
          "./assets/audio/sound_admin.wav",
        ],
      },
    ],
    "./plugins/with-omni-notification-sounds",
    "./plugins/with-remove-record-audio",
    [
      "expo-audio",
      {
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission: "Allow OMNI LIFE to use your location to link a task to a place.",
        locationAlwaysAndWhenInUsePermission: "Allow OMNI LIFE to remind you about tasks when you arrive at a linked place.",
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    "expo-task-manager",
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: false,
  },
};

export default config;
