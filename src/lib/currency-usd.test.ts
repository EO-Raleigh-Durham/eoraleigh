import assert from "node:assert/strict";
import test from "node:test";

// The local-currency conversion reads chapter config at import time, so set a
// local currency before loading the module.
process.env.NEXT_PUBLIC_CHAPTER_LOCAL_CURRENCY = "JPY";
process.env.NEXT_PUBLIC_CHAPTER_LOCAL_PER_USD = "26000";
const { VND_PER_USD, toUsd } = await import("./currency.ts");

test("USD cents and JPY both convert to US dollars", () => {
  assert.equal(toUsd(369_000, "usd"), 3690);
  assert.equal(toUsd(2_400_000, "JPY"), 2_400_000 / VND_PER_USD);
  assert.equal(toUsd(100, "EUR"), null);
});
