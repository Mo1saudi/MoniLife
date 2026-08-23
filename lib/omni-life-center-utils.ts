export type LifeTask = {
  id: string;
  done: boolean;
  energy: "high" | "medium" | "low";
};

export type FrictionTaskContext = { id: string; title: string; detail?: string };

function cleanTaskText(value: string | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function detailPrompt(detail: string, isArabic: boolean) {
  if (!detail) return isArabic ? "حدد أصغر نتيجة تريد الوصول إليها" : "name the smallest result you want";
  const excerpt = detail.length > 92 ? `${detail.slice(0, 89).trim()}…` : detail;
  return isArabic ? `ارجع لهذا التوضيح: «${excerpt}»` : `use this note: “${excerpt}”`;
}

export function buildFrictionSteps(context: FrictionTaskContext | string, isArabic: boolean) {
  const task = typeof context === "string" ? { id: context, title: "" } : context;
  const taskTitle = cleanTaskText(task.title) || (isArabic ? "هذه المهمة" : "this task");
  const detail = cleanTaskText(task.detail);
  const lower = `${taskTitle} ${detail}`.toLowerCase();
  const callTask = /(اتصل|اتصال|كلم|اتكلم|تواصل|مكالمة|call|phone|contact)/.test(lower);
  const writingTask = /(اكتب|كتابة|رسالة|ايميل|بريد|تقرير|مقال|مسودة|email|write|draft|report|message)/.test(lower);

  if (callTask) {
    return [
      { id: `${task.id}-1`, title: isArabic ? `افتح جهة الاتصال أو الرقم الخاص بـ «${taskTitle}»` : `Open the contact or number for “${taskTitle}”`, done: false },
      { id: `${task.id}-2`, title: isArabic ? `اكتب سبب الاتصال بـ «${taskTitle}» في سطر واحد: ${detailPrompt(detail, true)}` : `Write the purpose of “${taskTitle}” in one line: ${detailPrompt(detail, false)}`, done: false },
      { id: `${task.id}-3`, title: isArabic ? `اضغط اتصال وقل أول جملة تخص «${taskTitle}»` : `Tap call and say the first sentence for “${taskTitle}”`, done: false },
    ];
  }

  if (writingTask) {
    return [
      { id: `${task.id}-1`, title: isArabic ? `افتح مسودة خاصة بـ «${taskTitle}»` : `Open a draft for “${taskTitle}”`, done: false },
      { id: `${task.id}-2`, title: isArabic ? `اكتب عنوانًا أو أول سطر يوضح «${taskTitle}»` : `Write a subject or first line for “${taskTitle}”`, done: false },
      { id: `${task.id}-3`, title: isArabic ? `أضف ثلاث جمل فقط إلى «${taskTitle}» وفقًا للتفاصيل: ${detailPrompt(detail, true)}` : `Add only three sentences to “${taskTitle}” using the details: ${detailPrompt(detail, false)}`, done: false },
    ];
  }

  return [
    {
      id: `${task.id}-1`,
      title: isArabic ? `افتح الشيء الذي تحتاجه لبدء «${taskTitle}»` : `Open what you need to start “${taskTitle}”`,
      done: false,
    },
    {
      id: `${task.id}-2`,
      title: isArabic ? `حدد أول فعل صغير لـ «${taskTitle}»: ${detailPrompt(detail, true)}` : `Choose the first tiny action for “${taskTitle}”: ${detailPrompt(detail, false)}`,
      done: false,
    },
    {
      id: `${task.id}-3`,
      title: isArabic ? `نفّذ أول جزء من «${taskTitle}» لمدة دقيقتين فقط` : `Work on the first part of “${taskTitle}” for just two minutes`,
      done: false,
    },
  ];
}

export function filterLifeTasks<T extends LifeTask>(tasks: T[], filter: string) {
  if (filter === "pending") return tasks.filter((task) => !task.done);
  if (filter === "done") return tasks.filter((task) => task.done);
  if (filter === "high" || filter === "medium" || filter === "low") return tasks.filter((task) => task.energy === filter);
  return tasks;
}

export function getAdvisorResponse(query: string, isArabic: boolean, waterMl: number) {
  const lower = query.toLowerCase();
  if (lower.includes("تسويف") || lower.includes("تأجيل") || lower.includes("procrastination")) {
    return isArabic
      ? "ابدأ بأقل خطوة ممكنة الآن: افتح الملف، ضع عنوانًا، ثم خصّص دقيقتين فقط. أنت لا تحتاج إلى الحماس قبل البدء."
      : "Start with the smallest possible action: open the file, write a title, then commit to only two minutes. You do not need motivation before beginning.";
  }
  if (lower.includes("ماء") || lower.includes("ترطيب") || lower.includes("water") || lower.includes("hydration")) {
    return isArabic
      ? `لقد سجلت ${waterMl} مل حتى الآن. أضف 250 مل الآن ثم ضع كوبًا قريبًا منك للساعة التالية.`
      : `You have logged ${waterMl} ml so far. Add 250 ml now, then keep a glass nearby for the next hour.`;
  }
  if (lower.includes("مال") || lower.includes("اشتراك") || lower.includes("فكرة") || lower.includes("finance") || lower.includes("idea")) {
    return isArabic
      ? "راجع العناصر المعلّمة في رادار الديتوكس. كل فكرة قديمة تحتاج قرارًا بسيطًا: تنفيذها هذا الأسبوع أو أرشفتها بلا ذنب."
      : "Review the flagged items in the detox radar. Each older idea only needs one simple decision: execute it this week or archive it without guilt.";
  }
  return isArabic
    ? "مؤشر طاقتك مرتفع اليوم. اختر مهمة واحدة عالية الأثر، فعّل جلسة Zen قصيرة، ثم أعد التقييم بعد 25 دقيقة."
    : "Your energy index is high today. Choose one high-impact task, start a short Zen session, then reassess after 25 minutes.";
}
