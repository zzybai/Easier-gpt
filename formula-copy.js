(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.EasierGPTFormulaCopy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  function normalizeLatexCopySource(source) {
    let latex = String(source || "").trim();
    if (!latex) {
      return "";
    }

    latex = latex
      .replace(/\\text\s*\{\s*\\operatorname\s*\{([^{}]+)\}\s*\}/g, "\\mathrm{$1}")
      .replace(/\\text\s*\{\s*operatorname\s*\}\s*([A-Za-z]+)/g, "\\mathrm{$1}")
      .replace(/\\text\s*\{\s*\\operatorname\s*\}\s*([A-Za-z]+)/g, "\\mathrm{$1}")
      .replace(/\\operatorname\s*\{([^{}]+)\}/g, "\\mathrm{$1}");

    return latex;
  }

  function getLatexCopyBinding(annotation) {
    if (!annotation || typeof annotation.closest !== "function") {
      return null;
    }

    const latex = normalizeLatexCopySource(annotation.textContent || "");
    if (!latex) {
      return null;
    }

    const displayContainer = annotation.closest(".katex-display");
    const inlineContainer = annotation.closest(".katex");
    const target = displayContainer || inlineContainer;
    if (!target) {
      return null;
    }

    return {
      target,
      latex,
      isDisplay: Boolean(displayContainer)
    };
  }

  return {
    getLatexCopyBinding,
    normalizeLatexCopySource
  };
});
