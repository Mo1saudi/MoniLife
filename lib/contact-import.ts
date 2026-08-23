import { Platform } from "react-native";
import * as Contacts from "expo-contacts";
import { pickPreferredPhone } from "./contact-normalization";

export type ImportedDeviceContact = { name: string; phone: string };
export type ContactImportResult =
  | { status: "imported"; contact: ImportedDeviceContact }
  | { status: "unsupported" | "denied" | "cancelled" | "missing_phone" | "failed" };

export async function importSingleDeviceContact(): Promise<ContactImportResult> {
  if (Platform.OS === "web" || !(await Contacts.isAvailableAsync())) return { status: "unsupported" };
  const existing = await Contacts.getPermissionsAsync();
  const permission = existing.granted ? existing : await Contacts.requestPermissionsAsync();
  if (!permission.granted) return { status: "denied" };

  try {
    const selected = await Contacts.presentContactPickerAsync();
    if (!selected) return { status: "cancelled" };
    const hydrated = selected.id ? await Contacts.getContactByIdAsync(selected.id, [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers]) : selected;
    const contact = hydrated ?? selected;
    const phone = pickPreferredPhone(contact.phoneNumbers);
    if (!phone) return { status: "missing_phone" };
    return { status: "imported", contact: { name: contact.name?.trim() || "جهة اتصال", phone } };
  } catch (error) {
    console.warn("[Contacts] Import failed", error);
    return { status: "failed" };
  }
}
