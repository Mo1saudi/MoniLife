import { z } from "zod";
import { normalizeNumericInput } from "./telegram-recovery-input";

const validPhone = /^[0-9+()[\]\-\s]+$/;
const manualPhone = z.string().trim().transform((value) => normalizeNumericInput(value).replace(/\s+/g, " ")).pipe(z.string().min(7).max(32).regex(validPhone));
const manualPin = z.string().transform(normalizeNumericInput).pipe(z.string().regex(/^\d{6}$/, "PIN must contain exactly 6 digits"));
const manualAge = z.preprocess(
  (value) => typeof value === "number" ? String(value) : value,
  z.string().trim().transform(normalizeNumericInput).pipe(z.string().regex(/^\d{1,3}$/, "Age must contain digits only")).transform(Number).refine((value) => Number.isInteger(value) && value >= 13 && value <= 120, "Age must be between 13 and 120"),
);
const legacyBirthDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed < new Date();
}, "Birth date must be in the past");

export const manualRegistrationSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  age: manualAge.optional(),
  birthDate: legacyBirthDate.optional(),
  email: z.string().trim().email().max(320),
  phone: manualPhone,
  secondaryContact: z.string().trim().max(255).optional(),
  pin: manualPin,
  passwordConfirmation: manualPin,
}).refine((value) => value.age !== undefined || value.birthDate !== undefined, {
  message: "Age is required",
  path: ["age"],
}).refine((value) => value.pin === value.passwordConfirmation, {
  message: "Passwords do not match",
  path: ["passwordConfirmation"],
});

export const manualLoginSchema = z.object({
  email: z.string().trim().email().max(320),
  pin: manualPin,
});

export const telegramPasswordResetRequestSchema = z.object({
  email: z.string().trim().email().max(320),
});

export const telegramPasswordResetConfirmationSchema = z.object({
  email: z.string().trim().email().max(320),
  code: z.string().regex(/^\d{6}$/, "Recovery code must contain exactly 6 digits"),
  pin: manualPin,
  passwordConfirmation: manualPin,
}).refine((value) => value.pin === value.passwordConfirmation, {
  message: "Passwords do not match",
  path: ["passwordConfirmation"],
});

export const manualProfileUpdateSchema = z.object({
  email: z.string().trim().email().max(320),
  sessionToken: z.string().min(20).max(512).optional(),
  pin: manualPin,
  fullName: z.string().trim().min(2).max(160).optional(),
  newEmail: z.string().trim().email().max(320).optional(),
  phone: manualPhone.optional(),
  secondaryContact: z.string().trim().max(255).optional(),
});

export const manualPasswordChangeSchema = z.object({
  email: z.string().trim().email().max(320),
  sessionToken: z.string().min(20).max(512).optional(),
  currentPin: manualPin,
  newPin: manualPin,
  passwordConfirmation: manualPin,
}).refine((value) => value.newPin === value.passwordConfirmation, {
  message: "Passwords do not match",
  path: ["passwordConfirmation"],
}).refine((value) => value.currentPin !== value.newPin, {
  message: "New password must differ from current password",
  path: ["newPin"],
});

export const telegramAccountActionSchema = manualLoginSchema;
