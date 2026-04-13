(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.EasierGPTConversationContext = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  function buildEmptyContext(projectPath = "") {
    return {
      isConversation: false,
      conversationPath: "",
      conversationId: "",
      projectPath,
      isProjectConversation: false
    };
  }

  function resolveConversationContext(pathname) {
    const path = String(pathname || "").trim() || "/";
    const classicMatch = path.match(/^\/c\/([^/]+)$/);
    if (classicMatch) {
      return {
        isConversation: true,
        conversationPath: path,
        conversationId: classicMatch[1],
        projectPath: "",
        isProjectConversation: false
      };
    }

    const projectConversationMatch = path.match(/^\/g\/([^/]+)\/c\/([^/]+)$/);
    if (projectConversationMatch) {
      return {
        isConversation: true,
        conversationPath: path,
        conversationId: projectConversationMatch[2],
        projectPath: `/g/${projectConversationMatch[1]}`,
        isProjectConversation: true
      };
    }

    const projectPathMatch = path.match(/^\/g\/([^/]+)$/);
    if (projectPathMatch) {
      return buildEmptyContext(`/g/${projectPathMatch[1]}`);
    }

    return buildEmptyContext("");
  }

  return {
    resolveConversationContext
  };
});
