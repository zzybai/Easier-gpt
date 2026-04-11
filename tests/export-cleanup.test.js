const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isLikelyCitationChip
} = require("../export-cleanup.js");

test("identifies short interactive source chips with +count suffix", () => {
  assert.equal(isLikelyCitationChip({
    text: "GitHub +5",
    tagName: "a",
    hasHref: true,
    inCode: false
  }), true);

  assert.equal(isLikelyCitationChip({
    text: "OpenAI开发者 +3",
    tagName: "button",
    role: "button",
    inCode: false
  }), true);
});

test("does not flag normal prose or code-like text", () => {
  assert.equal(isLikelyCitationChip({
    text: "请先读取 AGENTS.md，然后整理模块边界。",
    tagName: "a",
    hasHref: true,
    inCode: false
  }), false);

  assert.equal(isLikelyCitationChip({
    text: "GitHub +5",
    tagName: "code",
    inCode: true
  }), false);
});
