import { describe, expect, it } from "vitest";
import { classifyBankSmsTransaction, parseBankSms } from "../lib/bank-sms-parser";
import { assessOverspending } from "../lib/overspending-rules";

describe("bank SMS parser", () => {
  it("extracts an Arabic card purchase without retaining the message body", () => {
    const parsed = parseBankSms({ _id: 7, date: Date.parse("2026-08-19T10:00:00Z"), body: "تم خصم مبلغ ١٢٥٫٥٠ ج.م من بطاقتك لدى Market One" });
    expect(parsed).toMatchObject({ amount: 125.5, direction: "expense", merchant: "Market One", source: "sms" });
    expect(parsed).not.toHaveProperty("body");
  });

  it("extracts an English deposit and ignores unrelated messages", () => {
    expect(parseBankSms({ _id: 8, date: Date.now(), body: "EGP 2,000.00 credited to your account from salary" })?.direction).toBe("income");
    expect(parseBankSms({ _id: 9, date: Date.now(), body: "Your package arrives tomorrow" })).toBeNull();
  });

  it("extracts amounts accurately across a representative synthetic Arabic and English corpus", () => {
    const corpus = [
      { body: "CIB: Purchase of EGP 2,000.75 at GREEN MART", amount: 2000.75, direction: "expense" },
      { body: "تم سحب مبلغ ٣٬٥٠٠٫٢٥ ج.م من ماكينة ATM", amount: 3500.25, direction: "expense" },
      { body: "تم إيداع مبلغ 1,250.50 EGP في حسابك من Salary", amount: 1250.5, direction: "income" },
      { body: "Vodafone Cash: خصم ٧٥٫٥ ج.م لدى Pharmacy", amount: 75.5, direction: "expense" },
      { body: "Debit card payment amounting to 450 EGP at CAFÉ", amount: 450, direction: "expense" },
      { body: "NBE: تم إضافة ٩٬٩٩٩ ج.م إلى رصيدك", amount: 9999, direction: "income" },
    ] as const;
    for (const [index, sample] of corpus.entries()) {
      const parsed = parseBankSms({ _id: 20 + index, date: Date.parse("2026-08-19T12:00:00Z"), body: sample.body });
      expect(parsed?.amount, sample.body).toBe(sample.amount);
      expect(parsed?.direction, sample.body).toBe(sample.direction);
    }
  });

  it("classifies extracted merchants across Arabic and English finance categories", () => {
    expect(classifyBankSmsTransaction("Carrefour Market", "Purchase of EGP 300 at Carrefour Market", "expense")).toBe("food");
    expect(classifyBankSmsTransaction("Uber Trip", "Debit EGP 95 at Uber Trip", "expense")).toBe("transport");
    expect(classifyBankSmsTransaction("صيدلية الشفاء", "تم خصم ١٢٠ ج.م لدى صيدلية الشفاء", "expense")).toBe("health");
    expect(classifyBankSmsTransaction("Vodafone Cash", "خصم 50 ج.م فودافون", "expense")).toBe("utilities");
    expect(classifyBankSmsTransaction("Salary", "EGP 5000 credited from Salary", "income")).toBe("income");
    expect(classifyBankSmsTransaction("Unknown Seller", "Purchase of EGP 10 at Unknown Seller", "expense")).toBe("other");
  });
});

describe("overspending assessment", () => {
  it("flags a daily limit breach and rapid same-day transactions", () => {
    const now = new Date("2026-08-19T12:00:00Z");
    expect(assessOverspending([{ amount: 600, occurredAt: now.toISOString() }, { amount: 500, occurredAt: now.toISOString() }], 1000, now).reason).toBe("daily_limit");
    expect(assessOverspending([1, 2, 3].map((offset) => ({ amount: 10, occurredAt: new Date(now.getTime() - offset * 60_000).toISOString() })), 1000, now).reason).toBe("rapid_withdrawals");
  });
});
