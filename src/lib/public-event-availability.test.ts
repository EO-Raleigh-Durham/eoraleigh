import assert from "node:assert/strict";
import test from "node:test";
import { publicEventAvailability } from "./public-event-availability.ts";

test("keeps exact registration counts private while the event is open", () => {
  assert.equal(publicEventAvailability(50, 0), "Limited to 50 participants");
  assert.equal(publicEventAvailability(50, 18), "Limited to 50 participants");
  assert.equal(publicEventAvailability(50, 39), "Limited to 50 participants");
});

test("uses truthful availability bands as capacity fills", () => {
  assert.equal(publicEventAvailability(50, 40), "Limited availability");
  assert.equal(publicEventAvailability(50, 44), "Limited availability");
  assert.equal(publicEventAvailability(50, 45), "Final places available");
  assert.equal(publicEventAvailability(50, 49), "Final places available");
});

test("moves full events to the waitlist without exposing a count", () => {
  assert.equal(publicEventAvailability(50, 50), "Waitlist open");
  assert.equal(publicEventAvailability(50, 52), "Waitlist open");
  assert.equal(publicEventAvailability(null, 18), null);
});

test("never interpolates the occupied seat count into public availability copy", () => {
  for (const occupiedSeats of [18, 40, 47, 52]) {
    const availability = publicEventAvailability(50, occupiedSeats);
    assert.ok(availability);
    assert.doesNotMatch(availability, new RegExp(`\\b${occupiedSeats}\\b`));
  }
});
