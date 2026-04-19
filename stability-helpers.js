(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.EasierGPTStability = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const SIDEBAR_OFFSET_JITTER_THRESHOLD_PX = 2;

  function isRelevantStructuralMutation(record) {
    if (!record || record.type !== "childList") {
      return false;
    }

    const nodes = [record.target, ...(record.addedNodes || []), ...(record.removedNodes || [])];
    for (const node of nodes) {
      if (!isInspectableNode(node)) {
        continue;
      }

      if (isIgnoredExtensionNode(node)) {
        continue;
      }

      if (isConversationNode(node) || hasConversationAncestor(node)) {
        return true;
      }
    }

    return false;
  }

  function resolvePlaceholderHeight(options = {}) {
    const cachedHeight = normalizePositiveNumber(options.cachedHeight);
    if (cachedHeight > 0) {
      return cachedHeight;
    }

    const minHeight = Math.max(1, normalizePositiveNumber(options.minHeight) || 24);
    const measuredHeight = normalizePositiveNumber(options.measuredHeight);
    if (measuredHeight > 0) {
      return Math.max(measuredHeight, minHeight);
    }

    return options.lowCostMode ? 0 : minHeight;
  }

  function shouldApplySidebarOffset(previousOffsetPx, nextOffsetPx, thresholdPx = SIDEBAR_OFFSET_JITTER_THRESHOLD_PX) {
    const next = Number(nextOffsetPx);
    if (!Number.isFinite(next)) {
      return false;
    }

    const previous = Number(previousOffsetPx);
    if (!Number.isFinite(previous) || previous < 0) {
      return true;
    }

    return Math.abs(next - previous) >= Math.max(0, Number(thresholdPx) || 0);
  }

  function isInspectableNode(node) {
    return !!node && typeof node === "object" && typeof node.getAttribute === "function";
  }

  function isIgnoredExtensionNode(node) {
    return Boolean(
      getAttr(node, "data-easier-gpt-minimap") ||
      getAttr(node, "data-easier-gpt-panel") ||
      getAttr(node, "data-easier-gpt-preview") ||
      getAttr(node, "data-easier-gpt-stats") ||
      getAttr(node, "data-easier-gpt-question-dock") ||
      getAttr(node, "data-easier-gpt-question-favorite") ||
      getAttr(node, "data-easier-gpt-pdf-float") ||
      getAttr(node, "data-easier-gpt-expand-btn") ||
      getAttr(node, "data-easier-gpt-latex-copy") ||
      getAttr(node, "data-easier-gpt-inline-math")
    );
  }

  function isConversationNode(node) {
    return Boolean(
      getAttr(node, "data-message-author-role") ||
      getAttr(node, "data-easier-gpt-placeholder") ||
      hasPrefix(getAttr(node, "data-testid"), "conversation-turn")
    );
  }

  function hasConversationAncestor(node) {
    let cursor = node.parentElement;
    while (isInspectableNode(cursor)) {
      if (isIgnoredExtensionNode(cursor)) {
        return false;
      }

      if (isConversationNode(cursor)) {
        return true;
      }

      cursor = cursor.parentElement;
    }

    return false;
  }

  function getAttr(node, name) {
    const value = node?.getAttribute?.(name);
    return value == null ? "" : String(value);
  }

  function hasPrefix(value, prefix) {
    return String(value || "").startsWith(prefix);
  }

  function normalizePositiveNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? Math.round(num) : 0;
  }

  return {
    isRelevantStructuralMutation,
    resolvePlaceholderHeight,
    shouldApplySidebarOffset,
    SIDEBAR_OFFSET_JITTER_THRESHOLD_PX
  };
});
