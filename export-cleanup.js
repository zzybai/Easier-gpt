(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.EasierGPTExportCleanup = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  function isLikelyCitationChip(input) {
    const text = String(input?.text || "").trim();
    const tagName = String(input?.tagName || "").toUpperCase();
    const role = String(input?.role || "").toLowerCase();
    const hasHref = !!input?.hasHref;
    const inCode = !!input?.inCode;

    if (!text || inCode) {
      return false;
    }

    const interactive =
      hasHref ||
      tagName === "A" ||
      tagName === "BUTTON" ||
      role === "button" ||
      role === "link";

    if (!interactive) {
      return false;
    }

    if (text.length > 40) {
      return false;
    }

    if (!/[+＋]\s*\d+\b/.test(text)) {
      return false;
    }

    if (/[。！？；：.!?;:]/.test(text)) {
      return false;
    }

    return true;
  }

  return {
    isLikelyCitationChip
  };
});
