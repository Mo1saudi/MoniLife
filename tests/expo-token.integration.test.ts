import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("Expo access token", () => {
  it("authenticates with Expo's official EAS CLI without exposing the credential", async () => {
    const token = process.env.EXPO_TOKEN;
    expect(token).toBeTruthy();

    const { stdout } = await execFileAsync("npx", ["eas-cli@latest", "whoami"], {
      env: { ...process.env, EXPO_TOKEN: token },
    });

    expect(stdout).toContain("authenticated using EXPO_TOKEN");
  }, 30_000);
});
