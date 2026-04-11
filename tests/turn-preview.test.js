const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildTurnPreviewItems
} = require("../turn-preview.js");

test("buildTurnPreviewItems returns preview text without role labels", () => {
  assert.deepEqual(buildTurnPreviewItems({
    prevAssistant: "上一条回答",
    userText: "当前问题",
    nextAssistant: "下一条回答"
  }), [
    { text: "上一条回答" },
    { text: "当前问题" },
    { text: "下一条回答" }
  ]);
});
