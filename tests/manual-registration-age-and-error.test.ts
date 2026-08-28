import { describe, expect, it } from "vitest";
import { classifyManualRegistrationError } from "../lib/manual-registration-error";
import { manualRegistrationSchema } from "../shared/manual-profile-validation";

const baseRegistration = {
  fullName: "مستخدم تجريبي",
  email: "new.user@example.com",
  phone: "٠١٠٠٠٠٠٠٠٠٠",
  pin: "١٢٣٤٥٦",
  passwordConfirmation: "١٢٣٤٥٦",
};

describe("manual registration age and error handling", () => {
  it("accepts Arabic and Persian numerals and normalizes them", () => {
    const arabic = manualRegistrationSchema.parse({ ...baseRegistration, age: "٣١" });
    const persian = manualRegistrationSchema.parse({ ...baseRegistration, age: "۳۱" });

    expect(arabic).toMatchObject({ age: 31, phone: "01000000000", pin: "123456", passwordConfirmation: "123456" });
    expect(persian.age).toBe(31);
  });

  it("allows no more than three digits and enforces the safe age range", () => {
    expect(manualRegistrationSchema.parse({ ...baseRegistration, age: "120" }).age).toBe(120);
    expect(() => manualRegistrationSchema.parse({ ...baseRegistration, age: "121" })).toThrow(/Age must be between 13 and 120/);
    expect(() => manualRegistrationSchema.parse({ ...baseRegistration, age: "١٢٣٤" })).toThrow(/Age must contain digits only/);
  });

  it("distinguishes a real duplicate email from an old server birthDate contract", () => {
    expect(classifyManualRegistrationError({ data: { code: "CONFLICT" }, message: "A profile already exists for this email." })).toBe("conflict");
    expect(classifyManualRegistrationError({ data: { code: "BAD_REQUEST" }, message: "Invalid input: expected string at birthDate" })).toBe("server_update");
  });
});
