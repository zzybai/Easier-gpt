const test = require("node:test");
const assert = require("node:assert/strict");

const {
  resolveConversationContext
} = require("../conversation-context.js");

test("resolveConversationContext recognizes classic conversation paths", () => {
  assert.deepEqual(resolveConversationContext("/c/69d8e5c0-71fc-8320-826c-5b313c4317f2"), {
    isConversation: true,
    conversationPath: "/c/69d8e5c0-71fc-8320-826c-5b313c4317f2",
    conversationId: "69d8e5c0-71fc-8320-826c-5b313c4317f2",
    projectPath: "",
    isProjectConversation: false
  });
});

test("resolveConversationContext recognizes project conversation paths", () => {
  assert.deepEqual(
    resolveConversationContext("/g/g-p-69d995a20b588191b22b93be5eee8a2b-lun-wen/c/69d9965a-48f8-8321-88b0-a4e44845518f"),
    {
      isConversation: true,
      conversationPath: "/g/g-p-69d995a20b588191b22b93be5eee8a2b-lun-wen/c/69d9965a-48f8-8321-88b0-a4e44845518f",
      conversationId: "69d9965a-48f8-8321-88b0-a4e44845518f",
      projectPath: "/g/g-p-69d995a20b588191b22b93be5eee8a2b-lun-wen",
      isProjectConversation: true
    }
  );
});

test("resolveConversationContext keeps project home pages out of conversation mode", () => {
  assert.deepEqual(resolveConversationContext("/g/g-p-69d995a20b588191b22b93be5eee8a2b-lun-wen"), {
    isConversation: false,
    conversationPath: "",
    conversationId: "",
    projectPath: "/g/g-p-69d995a20b588191b22b93be5eee8a2b-lun-wen",
    isProjectConversation: false
  });
});
