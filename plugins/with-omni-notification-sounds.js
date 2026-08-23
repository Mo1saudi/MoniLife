const fs = require("fs");
const path = require("path");
const { withDangerousMod, withXcodeProject } = require("@expo/config-plugins");

const SOUND_FILES = ["sound_tasks.wav", "sound_habits.wav", "sound_finance.wav", "sound_persona.wav", "sound_evening.wav", "sound_admin.wav", "sound_tasks_sleep.wav", "sound_habits_sleep.wav", "sound_finance_sleep.wav", "sound_persona_sleep.wav", "sound_evening_sleep.wav", "sound_admin_sleep.wav"];

function copy(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function withOmniNotificationSounds(config) {
  config = withDangerousMod(config, ["android", async (next) => {
    const assetDirectory = path.join(next.modRequest.projectRoot, "assets", "audio");
    const rawDirectory = path.join(next.modRequest.platformProjectRoot, "app", "src", "main", "res", "raw");
    SOUND_FILES.forEach((file) => copy(path.join(assetDirectory, file), path.join(rawDirectory, file)));
    return next;
  }]);
  config = withDangerousMod(config, ["ios", async (next) => {
    const assetDirectory = path.join(next.modRequest.projectRoot, "assets", "audio");
    const resourceDirectory = path.join(next.modRequest.platformProjectRoot, "OMNILifeSounds");
    SOUND_FILES.forEach((file) => copy(path.join(assetDirectory, file), path.join(resourceDirectory, file)));
    return next;
  }]);
  config = withXcodeProject(config, (next) => {
    const project = next.modResults;
    const target = project.getFirstTarget();
    const group = project.pbxGroupByName("Resources") || project.pbxGroupByName("Supporting Files");
    if (!target || !group) return next;
    SOUND_FILES.forEach((file) => {
      const filePath = `OMNILifeSounds/${file}`;
      if (!project.hasFile(filePath)) project.addResourceFile(filePath, { target: target.uuid }, group.uuid);
    });
    return next;
  });
  return config;
}

module.exports = withOmniNotificationSounds;
