import AsyncStorage from "@react-native-async-storage/async-storage";

export const TUTORIAL_VERSION = 1;
export type TutorialKey = "home" | "tasks" | "habits" | "goals" | "focus" | "finance" | "relationships" | "routines" | "health" | "insights" | "trends" | "inbox" | "templates" | "archive" | "achievements" | "reports" | "advisor" | "settings" | "notifications" | "support" | "telegram";
export type TutorialState = { onboardingCompleted: boolean; tourVersion: number; tutorialsEnabled: boolean; featureTipsEnabled: boolean; contextualHintsEnabled: boolean; featureTourStates: Partial<Record<TutorialKey, boolean>>; lastTourSeen?: string };

export function createDefaultTutorialState(): TutorialState { return { onboardingCompleted: false, tourVersion: TUTORIAL_VERSION, tutorialsEnabled: true, featureTipsEnabled: true, contextualHintsEnabled: true, featureTourStates: {} }; }
export function tutorialStorageKey(scope: string) { return `omni-life:tutorial-state:v1:${scope.trim().toLowerCase() || "local"}`; }
export async function loadTutorialState(scope: string): Promise<TutorialState> { try { const raw = await AsyncStorage.getItem(tutorialStorageKey(scope)); if (!raw) return createDefaultTutorialState(); const parsed = JSON.parse(raw) as Partial<TutorialState>; return { ...createDefaultTutorialState(), ...parsed, tourVersion: typeof parsed.tourVersion === "number" ? parsed.tourVersion : TUTORIAL_VERSION, featureTourStates: parsed.featureTourStates ?? {} }; } catch { return createDefaultTutorialState(); } }
export async function saveTutorialState(scope: string, state: TutorialState) { await AsyncStorage.setItem(tutorialStorageKey(scope), JSON.stringify(state)); }
export async function resetTutorialState(scope: string) { const next = createDefaultTutorialState(); await saveTutorialState(scope, next); return next; }
export function markTourSeen(state: TutorialState, feature: TutorialKey | "core") { return { ...state, onboardingCompleted: feature === "core" ? true : state.onboardingCompleted, tourVersion: TUTORIAL_VERSION, lastTourSeen: new Date().toISOString(), featureTourStates: feature === "core" ? { ...state.featureTourStates } : { ...state.featureTourStates, [feature]: true } }; }
export function shouldShowInitialTour(state: TutorialState) { return state.tutorialsEnabled && (!state.onboardingCompleted || state.tourVersion < TUTORIAL_VERSION); }
