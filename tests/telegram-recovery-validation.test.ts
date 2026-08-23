import { describe, expect, it } from "vitest";

import {
  telegramPasswordResetConfirmationSchema,
  telegramPasswordResetRequestSchema,
} from "../shared/manual-profile-validation";

describe("Telegram password recovery validation", () => {
  it("accepts a valid recovery request email", () => {
    expect(telegramPasswordResetRequestSchema.safeParse({ email: "member@example.com" }).success).toBe(true);
  });

  it("requires a six-digit recovery code and matching replacement password", () => {
    expect(telegramPasswordResetConfirmationSchema.safeParse({
      email: "member@example.com",
      code: "123456",
      pin: "654321",
      passwordConfirmation: "654321",
    }).success).toBe(true);

    expect(telegramPasswordResetConfirmationSchema.safeParse({
      email: "member@example.com",
      code: "12345",
      pin: "654321",
      passwordConfirmation: "654321",
    }).success).toBe(false);

    expect(telegramPasswordResetConfirmationSchema.safeParse({
      email: "member@example.com",
      code: "123456",
      pin: "654321",
      passwordConfirmation: "111111",
    }).success).toBe(false);
  });
});
