export const FOCUS_SOUNDSCAPES = [
  {
    id: "rain-thunder",
    icon: "thunderstorm" as const,
    label: { ar: "مطر ورعد", en: "Rain & thunder" },
    detail: { ar: "مطر غزير ورعد هادئ", en: "Heavy rain with gentle thunder" },
    audioUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663900529948/dltbwxmnwEiCBMAw.m4a",
    attribution: {
      label: { ar: "المصدر: YouTube · Creative Commons Attribution", en: "Source: YouTube · Creative Commons Attribution" },
      url: "https://www.youtube.com/watch?v=u71h_s9fteg",
    },
  },
] as const;

export type FocusSoundscapeId = (typeof FOCUS_SOUNDSCAPES)[number]["id"];
export type FocusSoundscape = (typeof FOCUS_SOUNDSCAPES)[number];

export function getFocusSoundscape(id: FocusSoundscapeId): FocusSoundscape {
  return FOCUS_SOUNDSCAPES.find((soundscape) => soundscape.id === id) ?? FOCUS_SOUNDSCAPES[0];
}
