import { z } from "zod";

const validPhone = /^[0-9+()[\]\-\s]+$/;

export const manualRegistrationSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const parsed = new Date(`${value}T00:00:00`);
    return !Number.isNaN(parsed.getTime()) && parsed < new Date();
  }, "Birth date must be in the past"),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(7).max(32).regex(validPhone),
  secondaryContact: z.string().trim().max(255).optional(),
  pin: z.string().regex(/^\d{6}$/, "PIN must contain exactly 6 digits"),
  passwordConfirmation: z.string().regex(/^\d{6}$/, "Password confirmation must contain exactly 6 digits"),
}).refine((value) => value.pin === value.passwordConfirmation, {
  message: "Passwords do not match",
  path: ["passwordConfirmation"],
});

export const manualLoginSchema = z.object({
  email: z.string().trim().email().max(320),
  pin: z.string().regex(/^\d{6}$/, "PIN must contain exactly 6 digits"),
});

export const telegramPasswordResetRequestSchema = z.object({
  email: z.string().trim().email().max(320),
});

export const telegramPasswordResetConfirmationSchema = z.object({
  email: z.string().trim().email().max(320),
  code: z.string().regex(/^\d{6}$/, "Recovery code must contain exactly 6 digits"),
  pin: z.string().regex(/^\d{6}$/, "PIN must contain exactly 6 digits"),
  passwordConfirmation: z.string().regex(/^\d{6}$/, "Password confirmation must contain exactly 6 digits"),
}).refine((value) => value.pin === value.passwordConfirmation, {
  message: "Passwords do not match",
  path: ["passwordConfirmation"],
});
