import { describe, expect, it } from "vitest";
import { manualLoginSchema, manualRegistrationSchema } from "../shared/manual-profile-validation";

const profile = { fullName: "Mohamed Ali", birthDate: "1995-06-14", email: "mohamed@example.com", phone: "+20 100 123 4567", secondaryContact: "WhatsApp: +20 100 123 4567", pin: "123456", passwordConfirmation: "123456" };

describe("OMNI LIFE manual profile validation", () => {
  it("accepts the required profile details and an optional secondary contact", () => {
    expect(manualRegistrationSchema.safeParse(profile).success).toBe(true);
  });

  it("requires valid personal details and a six-digit sign-in PIN", () => {
    expect(manualRegistrationSchema.safeParse({ ...profile, phone: "12", pin: "123" }).success).toBe(false);
    expect(manualRegistrationSchema.safeParse({ ...profile, passwordConfirmation: "654321" }).success).toBe(false);
    expect(manualLoginSchema.safeParse({ email: profile.email, pin: "123456" }).success).toBe(true);
  });
});
