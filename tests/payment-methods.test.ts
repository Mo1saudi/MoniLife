import { describe, expect, it } from "vitest";

import { PAYMENT_METHODS } from "../shared/subscription-plans";

describe("manual payment providers", () => {
  it("uses the approved InstaPay and Vodafone Cash payment links without a phone destination", () => {
    expect(PAYMENT_METHODS.instapay.url).toBe("https://ipn.eg/S/mosaudi/instapay/1P8VGl");
    expect(PAYMENT_METHODS.vodafone_cash.url).toBe("http://vf.eg/vfcash?id=mt&qrId=sZttJT");
    expect(JSON.stringify(PAYMENT_METHODS)).not.toContain("01099526347");
  });
});
