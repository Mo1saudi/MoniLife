export type BankSmsCategory = "food" | "transport" | "utilities" | "shopping" | "health" | "education" | "entertainment" | "cash" | "transfer" | "income" | "other";
export type BankSmsTransaction = { fingerprint: string; amount: number; direction: "expense" | "income"; merchant: string; category: BankSmsCategory; occurredAt: string; source: "sms" };
type DeviceSms = { _id?: number | string; address?: string; date?: number | string; body?: string };

const BANK_MARKERS = /\b(purchase|withdrawal|withdraw|debit|credit|deposit|transfer|salary|egp|cib|nbe|banque misr|qnb|alexbank|fawry|instapay|vodafone cash)\b|مشتريات|شراء|سحب|خصم|إيداع|تحويل|راتب|رصيد|ج\.?\s*م\.?|بنك|فودافون|انستاباي|المحفظة/i;
const EXPENSE_MARKERS = /\b(purchase|withdrawal|withdraw|debit|paid|payment|cash out)\b|مشتريات|شراء|سحب|خصم|مدفوع/i;
const INCOME_MARKERS = /\b(credit|deposit|received|salary|cash in)\b|إيداع|تحويل وارد|تم إضافة|راتب|استلام/i;

function normalizeDigits(value: string) { return value.replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit).toString()).replace(/٫/g, ".").replace(/[٬,،]/g, ""); }
function parseAmount(body: string): number | null { const normalized = normalizeDigits(body); const patterns = [/(?:amount|amounting to|مبلغ|بقيمة|قيمة)\D{0,16}([0-9]+(?:\.[0-9]{1,2})?)/i, /([0-9]+(?:\.[0-9]{1,2})?)\s*(?:EGP|ج\.?\s*م\.?)/i, /(?:EGP|ج\.?\s*م\.?)\s*([0-9]+(?:\.[0-9]{1,2})?)/i]; for (const pattern of patterns) { const match = normalized.match(pattern); const amount = match ? Number(match[1]) : Number.NaN; if (Number.isFinite(amount) && amount > 0 && amount < 10_000_000) return Math.round(amount * 100) / 100; } return null; }
function cleanMerchant(value: string | undefined) { return (value ?? "").replace(/\s+/g, " ").replace(/[.,;:]+$/, "").trim().slice(0, 80); }
function parseMerchant(body: string) { const patterns = [/(?:at|merchant|لدى|تاجر)\s*[:\-]?\s*([^\n.،؛]{2,80})/i, /(?:from|من)\s*[:\-]?\s*([^\n.،؛]{2,80})/i, /(?:purchase|مشتريات|شراء)\s+(?:at|من|لدى)?\s*([^\n.،؛]{2,80})/i]; for (const pattern of patterns) { const merchant = cleanMerchant(body.match(pattern)?.[1]); if (merchant) return merchant; } return "عملية بنكية"; }
function fingerprint(input: string) { let hash = 2166136261; for (let index = 0; index < input.length; index += 1) hash = Math.imul(hash ^ input.charCodeAt(index), 16777619); return `sms-${(hash >>> 0).toString(36)}`; }

const CATEGORY_KEYWORDS: [BankSmsCategory, RegExp][] = [
  ["cash", /\batm\b|cash withdrawal|سحب|ماكينة/i],
  ["transfer", /instapay|fawry|\btransfer\b|تحويل|فوري/i],
  ["utilities", /vodafone|orange|etisalat|\bwe\b|electricity|water|internet|utility|فاتورة|كهرباء|مياه|انترنت|اتصالات/i],
  ["food", /carrefour|market|mart|supermarket|restaurant|cafe|coffee|talabat|بقالة|سوبر|ماركت|مطعم|كافيه|قهوة|طلبات/i],
  ["transport", /uber|careem|indrive|fuel|gas station|transport|مواصلات|اوبر|كريم|بنزين/i],
  ["health", /pharmacy|clinic|hospital|صيدلية|عيادة|مستشفى/i],
  ["education", /school|university|course|udemy|coursera|education|مدرسة|جامعة|كورس|تعليم/i],
  ["entertainment", /netflix|spotify|cinema|steam|playstation|سينما|ترفيه/i],
  ["shopping", /amazon|noon|jumia|zara|\bh&m\b|store|shopping|امازون|نون|جوميا|متجر|تسوق/i],
];

export function classifyBankSmsTransaction(merchant: string, body: string, direction: "expense" | "income"): BankSmsCategory {
  if (direction === "income") return "income";
  const searchable = `${merchant} ${body}`;
  return CATEGORY_KEYWORDS.find(([, matcher]) => matcher.test(searchable))?.[0] ?? "other";
}

export function getBankSmsCategoryLabel(category: BankSmsCategory, isArabic: boolean) {
  const labels: Record<BankSmsCategory, [string, string]> = { food: ["طعام ومشروبات", "Food & drinks"], transport: ["مواصلات", "Transport"], utilities: ["فواتير وخدمات", "Bills & utilities"], shopping: ["تسوق", "Shopping"], health: ["صحة", "Health"], education: ["تعليم", "Education"], entertainment: ["ترفيه", "Entertainment"], cash: ["سحب نقدي", "Cash withdrawal"], transfer: ["تحويلات", "Transfers"], income: ["دخل", "Income"], other: ["أخرى", "Other"] };
  return labels[category][isArabic ? 0 : 1];
}

/** Parses one message in memory. It returns structured financial fields only and never retains the original body. */
export function parseBankSms(message: DeviceSms): BankSmsTransaction | null { const body = message.body?.trim(); if (!body || !BANK_MARKERS.test(body)) return null; const amount = parseAmount(body); if (amount === null) return null; const direction = INCOME_MARKERS.test(body) && !EXPENSE_MARKERS.test(body) ? "income" : EXPENSE_MARKERS.test(body) ? "expense" : null; if (!direction) return null; const occurredAt = new Date(Number(message.date) || Date.now()).toISOString(); const merchant = parseMerchant(body); return { fingerprint: fingerprint(`${message._id ?? ""}|${message.date ?? ""}|${amount}|${direction}|${merchant}`), amount, direction, merchant, category: classifyBankSmsTransaction(merchant, body, direction), occurredAt, source: "sms" }; }
