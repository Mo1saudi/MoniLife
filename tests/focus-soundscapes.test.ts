import { describe, expect, it } from "vitest";
import { FOCUS_SOUNDSCAPES, getFocusSoundscape } from "../lib/focus-soundscapes";

describe("Pomodoro focus soundscapes", () => {
  it("offers only the attributed user-provided rain and thunder option", () => {
    expect(FOCUS_SOUNDSCAPES.map((soundscape) => soundscape.id)).toEqual(["rain-thunder"]);
    expect(getFocusSoundscape("rain-thunder")).toMatchObject({
      label: { ar: "مطر ورعد" },
      audioUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663900529948/dltbwxmnwEiCBMAw.m4a",
      attribution: { url: "https://www.youtube.com/watch?v=u71h_s9fteg" },
    });
  });

  it("returns the supplied rain-and-thunder soundscape metadata", () => {
    expect(getFocusSoundscape("rain-thunder")).toMatchObject({
      label: { en: "Rain & thunder" },
      detail: { ar: "مطر غزير ورعد هادئ" },
    });
  });
});
