import { describe, expect, it } from "vitest";

import { isAuthorizedOmniAdmin, OMNI_ADMIN_EMAIL } from "../lib/admin-access";

describe("OMNI LIFE administration access", () => {
  it("permits only the configured administrator email", () => {
    expect(isAuthorizedOmniAdmin(OMNI_ADMIN_EMAIL)).toBe(true);
    expect(isAuthorizedOmniAdmin("MOHAMEDSEO2002@GMAIL.COM")).toBe(true);
    expect(isAuthorizedOmniAdmin("member@example.com")).toBe(false);
    expect(isAuthorizedOmniAdmin(null)).toBe(false);
  });
});
