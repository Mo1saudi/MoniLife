export const ONBOARDING_TOUR = [
  {
    icon: "auto-awesome",
    title: "مرحبًا بك في OMNI LIFE",
    text: "مساحة واحدة هادئة تجمع ما يهمك في يومك بدل التنقل بين عدة تطبيقات.",
    highlights: ["مهام واضحة", "عادات ثابتة", "يوم أخف"],
  },
  {
    icon: "checklist",
    title: "رتّب يومك في دقيقة",
    text: "ابدأ من الرئيسية، اختر طاقتك، ثم أضف أهم مهمة أو عادة بخطوات سريعة.",
    highlights: ["أولوية اليوم", "تذكيرات مرنة", "خطوات صغيرة"],
  },
  {
    icon: "account-balance-wallet",
    title: "افهم وقتك ومالك",
    text: "سجّل مصروفاتك بالجنيه المصري، واستخدم التركيز بومودورو لإنهاء ما بدأت به.",
    highlights: ["مصروفات يومية", "تركيز بومودورو", "ملخصات مفيدة"],
  },
  {
    icon: "rocket-launch",
    title: "ابدأ بخطوة واحدة",
    text: "أنشئ حسابك لتحفظ تقدمك وتعود إلى خطتك بسهولة في كل مرة تفتح فيها التطبيق.",
    highlights: ["حفظ آمن", "عودة سريعة", "تحكم كامل"],
  },
] as const;

export type OnboardingTourSlide = (typeof ONBOARDING_TOUR)[number];
