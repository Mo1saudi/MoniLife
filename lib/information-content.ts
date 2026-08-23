import AsyncStorage from "@react-native-async-storage/async-storage";

export type InformationPageKey = "privacy" | "about" | "howTo" | "faq";

export type FAQItem = {
  id: string;
  questionAr: string;
  answerAr: string;
  questionEn: string;
  answerEn: string;
};

export type InformationContent = Record<Exclude<InformationPageKey, "faq">, string> & { faq: FAQItem[] };

export const INFORMATION_PAGE_LABELS: Record<InformationPageKey, { ar: string; en: string }> = {
  privacy: { ar: "سياسة الخصوصية", en: "Privacy Policy" },
  about: { ar: "من نحن", en: "About Us" },
  howTo: { ar: "كيفية استخدام التطبيق", en: "How to Use the App" },
  faq: { ar: "الأسئلة الشائعة", en: "FAQ" },
};

export const DEFAULT_FAQ: FAQItem[] = [
  { id: "getting-started", questionAr: "كيف أبدأ استخدام OMNI LIFE؟", answerAr: "ابدأ من الرئيسية، اختر مزاجك وطاقتك، ثم أضف أول مهمة أو عادة من زر الإضافة السريعة.", questionEn: "How do I get started with OMNI LIFE?", answerEn: "Start on Home, choose your mood and energy, then add your first task or habit from Quick Add." },
  { id: "tasks", questionAr: "كيف أضيف مهمة وأذكر نفسي بها؟", answerAr: "افتح المهام، اكتب العنوان والتفاصيل، ثم اختر التاريخ والوقت ونوع التذكير المناسب لك.", questionEn: "How do I add and schedule a task?", answerEn: "Open Tasks, enter a title and details, then choose the date, time, and reminder options that suit you." },
  { id: "habits", questionAr: "كيف أكرر عادة؟", answerAr: "عند إنشاء العادة اختر التكرار اليومي أو الأسبوعي أو الشهري أو السنوي، وحدد وقت التذكير.", questionEn: "How do I repeat a habit?", answerEn: "When creating a habit, choose daily, weekly, monthly, or yearly recurrence and set its reminder time." },
  { id: "finance", questionAr: "كيف أسجل مصروفًا؟", answerAr: "من قسم المال اكتب المبلغ بالجنيه المصري أولًا، ثم أضف الاسم والتصنيف اختياريًا واحفظ المعاملة.", questionEn: "How do I record an expense?", answerEn: "In Finance, enter the amount in Egyptian pounds first, optionally add a name and category, then save the transaction." },
  { id: "pomodoro", questionAr: "ما فائدة جلسة بومودورو؟", answerAr: "تساعدك جلسة بومودورو على التركيز في مهمة واحدة لمدة محددة مع فواصل قصيرة للراحة.", questionEn: "What is Pomodoro focus?", answerEn: "Pomodoro helps you focus on one task for a set period with short breaks to recover your attention." },
  { id: "privacy", questionAr: "كيف أتحكم في بياناتي؟", answerAr: "يمكنك مراجعة سياسة الخصوصية، تصدير بياناتك، أو فتح إعادة ضبط الحساب من الإعدادات.", questionEn: "How do I control my data?", answerEn: "Review the Privacy Policy, export your data, or open account reset from Settings." },
];

export const DEFAULT_INFORMATION_CONTENT: InformationContent = {
  privacy: "نحترم خصوصيتك. تُستخدم بيانات OMNI LIFE لتقديم المهام والعادات والمالية والتنبيهات التي تختارها. لا نبيع بياناتك الشخصية. يمكنك طلب تصدير بياناتك أو إعادة ضبط حسابك من الإعدادات.\n\nتُطلب أذونات الإشعارات والموقع والميكروفون والرسائل القصيرة فقط عند تفعيل الميزة المرتبطة بها، ويمكنك إيقافها من إعدادات جهازك أو التطبيق.",
  about: "OMNI LIFE مساحة عربية عملية تساعدك على تنظيم يومك بهدوء: مهام، عادات، تركيز، مصروفات، أفكار، وعلاقات في تجربة واحدة. صُمم التطبيق ليقلل التعقيد ويمنحك خطوة واضحة تالية بدلًا من قائمة طويلة من الضغوط.",
  howTo: "ابدأ من الرئيسية واختر مزاجك وطاقتك، ثم أضف مهمة أو عادة من زر الإضافة السريعة. استخدم زر «ابدأ بومودورو» داخل المهمة لبدء جلسة تركيز مرتبطة بها.\n\nسجّل المصروف بالمبلغ أولًا، وأضف الفكرة في سطر واحد. يمكنك فتح الإعدادات لتخصيص التنبيهات واللغة ومدد البومودورو، أو الوصول إلى الإشعارات والمساعدة من البطاقات الموجودة في الرئيسية.",
  faq: DEFAULT_FAQ,
};

const STORAGE_KEY = "omni-life:information-content:v1";

function normalizeFaq(value: unknown): FAQItem[] {
  if (!Array.isArray(value)) return DEFAULT_FAQ;
  const items = value.filter((item): item is FAQItem => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<FAQItem>;
    return [candidate.id, candidate.questionAr, candidate.answerAr, candidate.questionEn, candidate.answerEn].every((field) => typeof field === "string" && field.trim().length > 0);
  });
  return items.length ? items : DEFAULT_FAQ;
}

export async function loadInformationContent(): Promise<InformationContent> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_INFORMATION_CONTENT;
    const parsed = JSON.parse(raw) as Partial<InformationContent>;
    return {
      privacy: typeof parsed.privacy === "string" && parsed.privacy.trim() ? parsed.privacy : DEFAULT_INFORMATION_CONTENT.privacy,
      about: typeof parsed.about === "string" && parsed.about.trim() ? parsed.about : DEFAULT_INFORMATION_CONTENT.about,
      howTo: typeof parsed.howTo === "string" && parsed.howTo.trim() ? parsed.howTo : DEFAULT_INFORMATION_CONTENT.howTo,
      faq: normalizeFaq(parsed.faq),
    };
  } catch {
    return DEFAULT_INFORMATION_CONTENT;
  }
}

export async function saveInformationContent(content: InformationContent): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(content));
}
