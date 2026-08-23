import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";

type VoiceCaptureButtonProps = {
  isArabic: boolean;
  onCapture: (payload: { base64: string; mimeType: string }) => Promise<void>;
};

export function VoiceCaptureButton({ isArabic, onCapture }: VoiceCaptureButtonProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [processing, setProcessing] = useState(false);
  const wave = useRef(new Animated.Value(0.35)).current;
  const listening = recorderState.isRecording;

  useEffect(() => {
    if (!listening) { wave.stopAnimation(); wave.setValue(0.35); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(wave, { toValue: 1, duration: 480, useNativeDriver: false }),
      Animated.timing(wave, { toValue: 0.35, duration: 480, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [listening, wave]);

  const start = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(isArabic ? "يلزم إذن الميكروفون" : "Microphone permission needed", isArabic ? "نستخدم الميكروفون فقط لتسجيل طلبك الصوتي ثم تحويله إلى نص." : "The microphone is used only to record and transcribe your voice request.");
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stop = async () => {
    try {
      setProcessing(true);
      await recorder.stop();
      if (!recorder.uri) throw new Error("No voice recording was created");
      const base64 = await FileSystem.readAsStringAsync(recorder.uri, { encoding: FileSystem.EncodingType.Base64 });
      await onCapture({ base64, mimeType: Platform.OS === "android" ? "audio/m4a" : "audio/m4a" });
    } catch {
      Alert.alert(isArabic ? "تعذر معالجة التسجيل" : "Could not process recording", isArabic ? "جرّب تسجيل رسالة أقصر وتأكد من الاتصال بالإنترنت." : "Try a shorter recording and confirm your internet connection.");
    } finally {
      setProcessing(false);
    }
  };

  return <View pointerEvents="box-none" style={styles.wrap}>
    {listening ? <View style={styles.listeningCard}><View style={styles.waveRow}>{[0, 1, 2, 3, 4].map((key) => <Animated.View key={key} style={[styles.wave, { height: wave.interpolate({ inputRange: [0.35, 1], outputRange: [8 + (key % 2) * 3, 22 - (key % 2) * 2] }) }]} />)}</View><Text style={styles.listeningText}>{isArabic ? "أستمع إليك… اضغط للإرسال" : "Listening… tap to send"}</Text></View> : null}
    <Pressable accessibilityRole="button" accessibilityLabel={isArabic ? "إدخال صوتي سريع" : "Quick voice capture"} onPress={() => { void (listening ? stop() : start()); }} onLongPress={() => { if (!listening) void start(); }} style={({ pressed }) => [styles.button, listening && styles.buttonActive, processing && styles.buttonBusy, pressed && styles.pressed]}>
      <Text style={styles.icon}>{processing ? "…" : listening ? "■" : "🎙"}</Text>
      <Text style={styles.label}>{processing ? (isArabic ? "جارٍ الفهم" : "Processing") : listening ? (isArabic ? "إرسال" : "Send") : (isArabic ? "قلها بسرعة" : "Quick capture")}</Text>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 18, bottom: 104, alignItems: "flex-start", gap: 9, zIndex: 10 },
  button: { minHeight: 52, paddingHorizontal: 15, borderRadius: 26, backgroundColor: "#0D3B54", borderWidth: 1, borderColor: "#38D8FF", shadowColor: "#38D8FF", shadowOpacity: 0.42, shadowRadius: 16, elevation: 8, flexDirection: "row", alignItems: "center", gap: 7 },
  buttonActive: { backgroundColor: "#15526C", borderColor: "#4FE1A8" },
  buttonBusy: { opacity: 0.76 },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  icon: { color: "#F2F7FC", fontSize: 18, fontWeight: "900" },
  label: { color: "#F2F7FC", fontSize: 11, fontWeight: "900" },
  listeningCard: { backgroundColor: "#101F33", borderWidth: 1, borderColor: "rgba(79,225,168,0.55)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, gap: 5, minWidth: 160 },
  waveRow: { height: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  wave: { width: 4, borderRadius: 4, backgroundColor: "#4FE1A8" },
  listeningText: { color: "#C9D9E8", fontSize: 10, textAlign: "center", fontWeight: "700" },
});
