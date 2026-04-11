const test = require("node:test");
const assert = require("node:assert/strict");

const {
  computeFloatingPdfPosition
} = require("../floating-pdf-layout.js");

test("computeFloatingPdfPosition places button below sidebar and keeps it onscreen", () => {
  assert.deepEqual(
    computeFloatingPdfPosition(
      { left: 0, right: 148, bottom: 728 },
      { width: 92, height: 34 },
      { width: 1440, height: 900 }
    ),
    { left: 138, top: 744 }
  );
});

test("computeFloatingPdfPosition clamps top when sidebar bottom is near viewport edge", () => {
  assert.deepEqual(
    computeFloatingPdfPosition(
      { left: 0, right: 148, bottom: 886 },
      { width: 92, height: 34 },
      { width: 1440, height: 900 }
    ),
    { left: 138, top: 854 }
  );
});
