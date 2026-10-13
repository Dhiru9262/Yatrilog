const test = require("node:test");
const assert = require("node:assert/strict");
const { segmentsOverlap } = require("../services/seatLockService");

test("overlapping route segments conflict", () => {
  assert.equal(segmentsOverlap(0, 3, 2, 5), true);
});

test("a segment fully contained in another conflicts", () => {
  assert.equal(segmentsOverlap(0, 5, 1, 2), true);
});

test("identical segments conflict", () => {
  assert.equal(segmentsOverlap(1, 4, 1, 4), true);
});

test("adjacent route segments do not conflict", () => {
  assert.equal(segmentsOverlap(0, 2, 2, 4), false);
});

test("non-overlapping later segments do not conflict", () => {
  assert.equal(segmentsOverlap(0, 1, 2, 4), false);
});
