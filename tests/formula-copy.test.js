const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getLatexCopyBinding,
  normalizeLatexCopySource
} = require("../formula-copy.js");

function createAnnotation({ latex, displayTarget = null, inlineTarget = null }) {
  return {
    textContent: latex,
    closest(selector) {
      if (selector === ".katex-display") {
        return displayTarget;
      }
      if (selector === ".katex") {
        return inlineTarget;
      }
      return null;
    }
  };
}

test("getLatexCopyBinding returns display container and latex source", () => {
  const displayTarget = { className: "katex-display" };
  const inlineTarget = { className: "katex" };
  const binding = getLatexCopyBinding(createAnnotation({
    latex: "x^2+y^2",
    displayTarget,
    inlineTarget
  }));

  assert.equal(binding.latex, "x^2+y^2");
  assert.equal(binding.target, displayTarget);
  assert.equal(binding.isDisplay, true);
});

test("getLatexCopyBinding returns inline katex container for inline formulas", () => {
  const inlineTarget = { className: "katex" };
  const binding = getLatexCopyBinding(createAnnotation({
    latex: "a+b",
    inlineTarget
  }));

  assert.equal(binding.latex, "a+b");
  assert.equal(binding.target, inlineTarget);
  assert.equal(binding.isDisplay, false);
});

test("getLatexCopyBinding returns null when latex source is blank", () => {
  const inlineTarget = { className: "katex" };

  assert.equal(getLatexCopyBinding(createAnnotation({
    latex: "   ",
    inlineTarget
  })), null);
});

test("normalizeLatexCopySource normalizes operator-style functions to mathrm", () => {
  assert.equal(
    normalizeLatexCopySource("\\text{operatorname}tr(AB)=\\alpha\\beta"),
    "\\mathrm{tr}(AB)=\\alpha\\beta"
  );

  assert.equal(
    normalizeLatexCopySource("\\text{\\operatorname{tr}}(A)\\text{\\operatorname{rank}}(B)"),
    "\\mathrm{tr}(A)\\mathrm{rank}(B)"
  );

  assert.equal(
    normalizeLatexCopySource("\\operatorname{diag}(A)+\\operatorname{span}(B)"),
    "\\mathrm{diag}(A)+\\mathrm{span}(B)"
  );
});
