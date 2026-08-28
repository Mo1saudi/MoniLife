import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const serverRequired = [
  "JWT_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TELEGRAM_BOT_TOKEN",
  "BUILT_IN_FORGE_API_URL",
  "BUILT_IN_FORGE_API_KEY",
] as const;
const easRequired = ["EXPO_TOKEN", "EXPO_FCM_SERVICE_ACCOUNT_JSON"] as const;

function present(name: string) {
  return Boolean(process.env[name]?.trim());
}

function reportGroup(title: string, names: readonly string[]) {
  console.log(`\n${title}`);
  let ok = true;
  for (const name of names) {
    const available = present(name);
    console.log(`  ${available ? "OK" : "MISSING"} ${name}`);
    if (!available) ok = false;
  }
  return ok;
}

function verifyPublicFiles() {
  const googleServicesPath = resolve(root, "google-services.json");
  const migrationPath = resolve(root, "docs/supabase-age-migration.sql");
  if (!existsSync(googleServicesPath)) throw new Error("google-services.json is missing");
  if (!existsSync(migrationPath)) throw new Error("docs/supabase-age-migration.sql is missing");
  const googleServices = JSON.parse(readFileSync(googleServicesPath, "utf8")) as { client?: Array<{ client_info?: { android_client_info?: { package_name?: string } } }> };
  const packages = googleServices.client?.map((client) => client.client_info?.android_client_info?.package_name).filter(Boolean) ?? [];
  if (!packages.includes("com.app.omnilifecenter")) throw new Error("google-services.json does not contain com.app.omnilifecenter");
  console.log("\nPublic files: OK (Firebase package and age migration are present)");
}

const serverOk = reportGroup("Server runtime secrets (values are never printed)", serverRequired);
const checkEas = process.argv.includes("--eas");
const easOk = checkEas ? reportGroup("EAS/FCM secret-store values", easRequired) : true;
verifyPublicFiles();
if (!serverOk || !easOk) {
  console.error("\nConfiguration is incomplete. Add missing values to the server/EAS secret store, not to the APK.");
  process.exitCode = 1;
} else {
  console.log("\nConfiguration is ready for the requested scope.");
}
