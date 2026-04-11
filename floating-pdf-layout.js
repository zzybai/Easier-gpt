(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.EasierGPTFloatingPdfLayout = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const PDF_HORIZONTAL_SHIFT_PX = 110;

  function computeFloatingPdfPosition(sidebarRect, buttonSize, viewportSize) {
    const sidebarLeft = Math.max(0, Number(sidebarRect?.left) || 0);
    const sidebarRight = Math.max(sidebarLeft, Number(sidebarRect?.right) || 0);
    const sidebarBottom = Math.max(0, Number(sidebarRect?.bottom) || 0);
    const buttonWidth = Math.max(1, Number(buttonSize?.width) || 92);
    const buttonHeight = Math.max(1, Number(buttonSize?.height) || 34);
    const viewportWidth = Math.max(buttonWidth + 24, Number(viewportSize?.width) || 1280);
    const viewportHeight = Math.max(buttonHeight + 24, Number(viewportSize?.height) || 720);
    const left = Math.max(
      12,
      Math.min(sidebarRight - buttonWidth - 28 + PDF_HORIZONTAL_SHIFT_PX, viewportWidth - buttonWidth - 12)
    );
    const top = Math.max(
      12,
      Math.min(sidebarBottom + 16, viewportHeight - buttonHeight - 12)
    );

    return {
      left: Math.round(left),
      top: Math.round(top)
    };
  }

  return {
    computeFloatingPdfPosition
  };
});
