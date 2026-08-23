import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("Expo server credentials", () => {
  it("authenticates the configured server-only Expo token", async () => {
    expect(process.env.EXPO_TOKEN).toBeTruthy();

    const { stdout } = await execFileAsync(
      "pnpm",
      ["dlx", "eas-cli@15.0.0", "whoami", "--non-interactive"],
      {
        cwd: process.cwd(),
        env: process.env,
        timeout: 45_000,
      },
    );

    expect(stdout).toContain("authenticated");
  }, 60_000);
});
