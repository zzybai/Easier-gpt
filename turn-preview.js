(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.EasierGPTTurnPreview = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  function buildTurnPreviewItems(snapshot) {
    return [
      { text: snapshot?.prevAssistant || "" },
      { text: snapshot?.userText || "" },
      { text: snapshot?.nextAssistant || "" }
    ];
  }

  return {
    buildTurnPreviewItems
  };
});
