const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getPdfExportButtonLabel
} = require("../composer-actions.js");

test("getPdfExportButtonLabel always returns PDF", () => {
  assert.equal(getPdfExportButtonLabel(false), "PDF");
  assert.equal(getPdfExportButtonLabel(true), "PDF");
});
