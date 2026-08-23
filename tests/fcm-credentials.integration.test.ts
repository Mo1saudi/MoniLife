import { createSign } from "crypto";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const ANDROID_PACKAGE = "com.app.omnilifecenter";

type GoogleServicesFile = {
  project_info?: { project_number?: string; project_id?: string };
  client?: Array<{
    client_info?: { android_client_info?: { package_name?: string } };
  }>;
};

type ServiceAccount = {
  client_email?: string;
  private_key?: string;
  token_uri?: string;
};

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function createServiceAccountAssertion(account: Required<Pick<ServiceAccount, "client_email" | "private_key">>) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 300,
  }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  signer.end();
  return `${header}.${payload}.${signer.sign(account.private_key).toString("base64url")}`;
}

describe("Android FCM credentials", () => {
  it("match OMNI LIFE's Android package and obtain a temporary Google access token", async () => {
    const serviceAccountRaw = process.env.EXPO_FCM_SERVICE_ACCOUNT_JSON;

    expect(serviceAccountRaw, "EXPO_FCM_SERVICE_ACCOUNT_JSON must be configured").toBeTruthy();

    const googleServices = JSON.parse(
      await readFile(resolve(process.cwd(), "google-services.json"), "utf8"),
    ) as GoogleServicesFile;
    const serviceAccount = JSON.parse(serviceAccountRaw!) as ServiceAccount;
    expect(googleServices.project_info?.project_number).toMatch(/^\d+$/);
    expect(googleServices.project_info?.project_id).toBeTruthy();
    expect(
      googleServices.client?.some(
        (client) => client.client_info?.android_client_info?.package_name === ANDROID_PACKAGE,
      ),
      `google-services.json must contain Android package ${ANDROID_PACKAGE}`,
    ).toBe(true);
    expect(serviceAccount.client_email).toMatch(/\.iam\.gserviceaccount\.com$/);
    expect(serviceAccount.private_key).toContain("BEGIN PRIVATE KEY");

    const assertion = createServiceAccountAssertion({
      client_email: serviceAccount.client_email!,
      private_key: serviceAccount.private_key!,
    });
    const response = await fetch(serviceAccount.token_uri ?? "https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    const body = await response.json() as { access_token?: string; error?: string; error_description?: string };
    expect(response.ok, body.error_description ?? body.error ?? "Google OAuth exchange failed").toBe(true);
    expect(body.access_token).toMatch(/^ya29\./);
  }, 20_000);
});
