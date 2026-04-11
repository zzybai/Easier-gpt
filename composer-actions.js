(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.EasierGPTComposerActions = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  function getPdfExportButtonLabel(compact) {
    return "PDF";
  }

  return {
    getPdfExportButtonLabel
  };
});
