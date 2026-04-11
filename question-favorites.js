(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.EasierGPTQuestionFavorites = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  function normalizeFavoriteQuestionText(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function buildQuestionFavoriteKey(conversationPath, turnIndex, text) {
    const path = String(conversationPath || "").trim() || "/";
    const turn = Number.isFinite(Number(turnIndex)) ? Number(turnIndex) : -1;
    const normalizedText = normalizeFavoriteQuestionText(text);
    return `${path}::${turn}::${normalizedText}`;
  }

  return {
    buildQuestionFavoriteKey,
    normalizeFavoriteQuestionText
  };
});
