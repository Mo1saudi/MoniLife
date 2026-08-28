import { randomBytes } from "node:crypto";
import { deleteSupabaseManualAccount, loginSupabaseManualProfile, registerSupabaseManualProfile, updateSupabaseManualProfile } from "../server/supabase";

async function main() {
  const pin = "739184";
  const email = `omni.auth.test.${Date.now()}-${randomBytes(3).toString("hex")}@example.com`;
  let currentEmail = email;
  let created = false;
  try {
    const registered = await registerSupabaseManualProfile({
      fullName: "OMNI LIFE Auth Test",
      age: 31,
      email,
      phone: "+201000000000",
      pin,
    });
    created = true;
    const loggedIn = await loginSupabaseManualProfile(email, pin);
    if (registered.email !== email || !registered.manualSessionToken || loggedIn.email !== email || !loggedIn.manualSessionToken) throw new Error("Authentication round-trip returned an unexpected profile.");
    let duplicateRejected = false;
    try {
      await registerSupabaseManualProfile({ fullName: "OMNI LIFE Duplicate Test", age: 31, email, phone: "+201000000000", pin });
    } catch (error) {
      duplicateRejected = /already exists|already registered/i.test(error instanceof Error ? error.message : "");
    }
    if (!duplicateRejected) throw new Error("Duplicate email was not rejected with the expected conflict.");
    let wrongPinRejected = false;
    try {
      await loginSupabaseManualProfile(email, "000000");
    } catch {
      wrongPinRejected = true;
    }
    if (!wrongPinRejected) throw new Error("An incorrect PIN was accepted.");
    const updatedEmail = `omni.auth.updated.${Date.now()}-${randomBytes(3).toString("hex")}@example.com`;
    const updated = await updateSupabaseManualProfile({ email, sessionToken: registered.manualSessionToken, pin, fullName: "OMNI LIFE Auth Test Updated", newEmail: updatedEmail });
    currentEmail = updatedEmail;
    if (updated.fullName !== "OMNI LIFE Auth Test Updated" || updated.email !== updatedEmail) throw new Error("Profile update did not return the updated identity.");
    const staleTokenUpdate = await updateSupabaseManualProfile({ email: updatedEmail, sessionToken: registered.manualSessionToken, pin, fullName: "OMNI LIFE Auth Test Recovered" });
    if (staleTokenUpdate.fullName !== "OMNI LIFE Auth Test Recovered") throw new Error("A stale session token incorrectly blocked a valid profile update.");
    await deleteSupabaseManualAccount(currentEmail, pin);
    created = false;
    console.log("SUPABASE_AUTH_ROUND_TRIP=PASS");
  } finally {
    if (created) await deleteSupabaseManualAccount(currentEmail, pin).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Supabase authentication test failed.");
  process.exitCode = 1;
});
