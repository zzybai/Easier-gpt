(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.EasierGPTQuestionDock = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  function normalizeQuestionText(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function truncateQuestionText(text, maxLength) {
    const normalized = normalizeQuestionText(text);
    const limit = Math.max(6, Number(maxLength) || 52);
    if (normalized.length <= limit) {
      return normalized;
    }

    return `${normalized.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
  }

  function buildQuestionItems(messages, getText, maxLength = 52, minLength = 2, options = {}) {
    const items = [];
    const seenTurns = new Set();
    const favorites = options.favorites instanceof Set ? options.favorites : new Set();
    const buildFavoriteKey =
      typeof options.buildFavoriteKey === "function" ? options.buildFavoriteKey : null;

    for (const message of Array.isArray(messages) ? messages : []) {
      if (!message || message.role !== "user") {
        continue;
      }

      const turnIndex = Number(message.turnIndex);
      if (!Number.isFinite(turnIndex) || seenTurns.has(turnIndex)) {
        continue;
      }

      const rawText = typeof getText === "function"
        ? getText(message)
        : message.text;
      const fullText = normalizeQuestionText(rawText);
      if (fullText.length < minLength) {
        continue;
      }

      seenTurns.add(turnIndex);
      const favoriteKey = buildFavoriteKey ? buildFavoriteKey(message, fullText) : "";
      items.push({
        id: message.id,
        turnIndex,
        label: `Q${turnIndex + 1}`,
        fullText,
        shortText: truncateQuestionText(fullText, maxLength),
        favoriteKey,
        isFavorited: favoriteKey ? favorites.has(favoriteKey) : false
      });
    }

    return items;
  }

  return {
    buildQuestionItems,
    normalizeQuestionText,
    truncateQuestionText
  };
});
