import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { getFocusSoundscape, type FocusSoundscapeId } from "./focus-soundscapes";

let player: AudioPlayer | null = null;
let activeSoundscape: FocusSoundscapeId | null = null;

/** Starts one bundled focus soundscape; a single player avoids overlapping audio across focus cycles. */
export async function startAmbientFocusAudio(soundscape: FocusSoundscapeId = "rain-thunder") {
  await setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  if (player && activeSoundscape !== soundscape) stopAmbientFocusAudio();
  if (!player) {
    player = createAudioPlayer(getFocusSoundscape(soundscape).audioUrl);
    player.loop = true;
    activeSoundscape = soundscape;
  }
  player.seekTo(0);
  player.play();
}

/** Pauses and releases focus ambience as soon as a rest period or screen exit begins. */
export function stopAmbientFocusAudio() {
  if (!player) return;
  player.pause();
  player.remove();
  player = null;
  activeSoundscape = null;
}
