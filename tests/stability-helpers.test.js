const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isInlineLatexAutoRenderActive,
  isRelevantStructuralMutation,
  expandTurnRange,
  isCollapseIdle,
  isVirtualizationActive,
  resolvePlaceholderHeight,
  shouldRefreshMeasuredHeight,
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

test("shouldRefreshMeasuredHeight ignores small measurement drift", () => {
  assert.equal(shouldRefreshMeasuredHeight(320, 325, 8, 0.05), false);
  assert.equal(shouldRefreshMeasuredHeight(320, 339, 8, 0.05), true);
  assert.equal(shouldRefreshMeasuredHeight(0, 180, 8, 0.05), true);
});

test("expandTurnRange adds a protection buffer without leaving valid bounds", () => {
  assert.deepEqual(expandTurnRange(5, 8, 20, 3), { min: 2, max: 11 });
  assert.deepEqual(expandTurnRange(0, 2, 10, 4), { min: 0, max: 6 });
  assert.deepEqual(expandTurnRange(7, 9, 10, 4), { min: 3, max: 9 });
});

test("isCollapseIdle waits for both scroll and input to cool down", () => {
  assert.equal(
    isCollapseIdle({
      nowTs: 10_000,
      lastScrollAt: 9_700,
      lastInputAt: 8_000,
      typingHot: false,
      pauseAfterScrollMs: 400,
      pauseAfterInputMs: 800
    }),
    false
  );

  assert.equal(
    isCollapseIdle({
      nowTs: 10_000,
      lastScrollAt: 8_000,
      lastInputAt: 9_500,
      typingHot: false,
      pauseAfterScrollMs: 400,
      pauseAfterInputMs: 800
    }),
    false
  );

  assert.equal(
    isCollapseIdle({
      nowTs: 10_000,
      lastScrollAt: 8_000,
      lastInputAt: 8_000,
      typingHot: false,
      pauseAfterScrollMs: 400,
      pauseAfterInputMs: 800
    }),
    true
  );

  assert.equal(
    isCollapseIdle({
      nowTs: 10_000,
      lastScrollAt: 8_000,
      lastInputAt: 8_000,
      typingHot: true,
      pauseAfterScrollMs: 400,
      pauseAfterInputMs: 800
    }),
    false
  );
});

test("isVirtualizationActive defaults to off unless explicitly enabled in dynamic mode", () => {
  assert.equal(isVirtualizationActive({ virtualizationEnabled: false, mode: "dynamic" }), false);
  assert.equal(isVirtualizationActive({ virtualizationEnabled: true, mode: "dynamic" }), true);
  assert.equal(isVirtualizationActive({ virtualizationEnabled: true, mode: "expanded" }), false);
});

test("isInlineLatexAutoRenderActive defaults to off unless explicitly enabled", () => {
  assert.equal(isInlineLatexAutoRenderActive({ inlineLatexAutoRenderEnabled: false }), false);
  assert.equal(isInlineLatexAutoRenderActive({ inlineLatexAutoRenderEnabled: true }), true);
});
