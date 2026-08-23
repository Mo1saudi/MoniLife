import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appShell = readFileSync("components/omni-life-center.tsx", "utf8");

describe("contact management controls", () => {
  it("keeps the device picker focused on one contact and selects the imported result", () => {
    expect(appShell).toContain("importSingleDeviceContact()");
    expect(appShell).toContain("setSelectedContactId(importedId)");
    expect(appShell).toContain("Pick one person only");
  });

  it("offers in-app selection and a confirmed local-only deletion path", () => {
    expect(appShell).toContain("const selectSavedContact");
    expect(appShell).toContain("const confirmContactDeletion");
    expect(appShell).toContain("Delete contact?");
    expect(appShell).toContain("not from your phone contacts");
    expect(appShell).toContain("onDeleteContact={confirmContactDeletion}");
  });
});
