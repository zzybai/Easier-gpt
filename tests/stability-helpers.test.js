const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isRelevantStructuralMutation,
  resolvePlaceholderHeight,
  shouldApplySidebarOffset
} = require("../stability-helpers.js");

class FakeNode {
  constructor(attributes = {}, parentElement = null) {
    this.attributes = new Map(Object.entries(attributes));
    this.parentElement = parentElement;
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }
}

test("isRelevantStructuralMutation ignores extension-owned nodes outside the conversation tree", () => {
  const record = {
    type: "childList",
    target: new FakeNode({ "data-easier-gpt-minimap": "1" }),
    addedNodes: [new FakeNode({ "data-easier-gpt-inline-math": "1" })],
    removedNodes: []
  };

  assert.equal(isRelevantStructuralMutation(record), false);
});

test("isRelevantStructuralMutation keeps real conversation mutations observable", () => {
  const record = {
    type: "childList",
    target: new FakeNode({ "data-testid": "conversation-turn-12" }),
    addedNodes: [new FakeNode()],
    removedNodes: []
  };

  assert.equal(isRelevantStructuralMutation(record), true);
});

test("resolvePlaceholderHeight refuses low-cost fallback estimates without a cached or measured height", () => {
  assert.equal(
    resolvePlaceholderHeight({
      cachedHeight: 0,
      measuredHeight: 0,
      minHeight: 24,
      lowCostMode: true
    }),
    0
  );
});

test("resolvePlaceholderHeight uses measured height when available", () => {
  assert.equal(
    resolvePlaceholderHeight({
      cachedHeight: 0,
      measuredHeight: 132,
      minHeight: 24,
      lowCostMode: false
    }),
    132
  );
});

test("shouldApplySidebarOffset ignores sub-pixel jitter but keeps meaningful moves", () => {
  assert.equal(shouldApplySidebarOffset(268, 269, 2), false);
  assert.equal(shouldApplySidebarOffset(268, 270, 2), true);
  assert.equal(shouldApplySidebarOffset(-1, 268, 2), true);
});
