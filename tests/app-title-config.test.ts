import { describe, expect, it } from "vitest";
import config from "../app.config";

describe("OMNI LIFE app title configuration", () => {
  it("keeps the configured title available to the Expo app config", () => {
    expect(config.name).toBe("OMNI LIFE");
  });
});

