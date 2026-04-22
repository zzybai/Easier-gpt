const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildQuestionDockSignature,
  buildQuestionItems
} = require("../question-dock.js");

test("buildQuestionItems keeps only first user message per turn", () => {
  const items = buildQuestionItems([
    { id: 1, role: "user", turnIndex: 0, text: "第一个问题，关于地址替换。" },
    { id: 2, role: "assistant", turnIndex: 0, text: "回答" },
    { id: 3, role: "user", turnIndex: 0, text: "同一轮第二条用户消息，不应该展示。" },
    { id: 4, role: "user", turnIndex: 1, text: "第二个问题，关于欧洲插头。" }
  ], (item) => item.text, 18);

  assert.deepEqual(items, [
    {
      id: 1,
      turnIndex: 0,
      label: "Q1",
      fullText: "第一个问题，关于地址替换。",
      shortText: "第一个问题，关于地址替换。",
      favoriteKey: "",
      isFavorited: false
    },
    {
      id: 4,
      turnIndex: 1,
      label: "Q2",
      fullText: "第二个问题，关于欧洲插头。",
      shortText: "第二个问题，关于欧洲插头。",
      favoriteKey: "",
      isFavorited: false
    }
  ]);
});

test("buildQuestionItems skips empty and too-short user messages", () => {
  const items = buildQuestionItems([
    { id: 1, role: "user", turnIndex: 0, text: "好" },
    { id: 2, role: "user", turnIndex: 1, text: "   " },
    { id: 3, role: "user", turnIndex: 2, text: "请整理旧仓库模块边界，并给迁移建议。" }
  ], (item) => item.text, 12);

  assert.deepEqual(items, [
    {
      id: 3,
      turnIndex: 2,
      label: "Q3",
      fullText: "请整理旧仓库模块边界，并给迁移建议。",
      shortText: "请整理旧仓库模块边...",
      favoriteKey: "",
      isFavorited: false
    }
  ]);
});

test("buildQuestionItems attaches favorite metadata when key builder is provided", () => {
  const favorites = new Set(["/c/demo::1::第二个问题"]);

  const items = buildQuestionItems(
    [
      { id: 1, role: "user", turnIndex: 0, text: "第一个问题" },
      { id: 2, role: "user", turnIndex: 1, text: "第二个问题" }
    ],
    (item) => item.text,
    18,
    2,
    {
      buildFavoriteKey: (item, text) => `/c/demo::${item.turnIndex}::${text}`,
      favorites
    }
  );

  assert.equal(items[0].isFavorited, false);
  assert.equal(items[1].isFavorited, true);
  assert.equal(items[1].favoriteKey, "/c/demo::1::第二个问题");
});

test("buildQuestionDockSignature changes when dock state or favorite readiness changes", () => {
  const items = buildQuestionItems(
    [
      { id: 1, role: "user", turnIndex: 0, text: "第一个问题" },
      { id: 2, role: "user", turnIndex: 1, text: "第二个问题" }
    ],
    (item) => item.text,
    18
  );

  const base = buildQuestionDockSignature(items, 0, {
    isCollapsed: false,
    favoritesLoaded: false
  });
  const same = buildQuestionDockSignature(items, 0, {
    isCollapsed: false,
    favoritesLoaded: false
  });
  const collapsed = buildQuestionDockSignature(items, 0, {
    isCollapsed: true,
    favoritesLoaded: false
  });
  const favoritesReady = buildQuestionDockSignature(items, 0, {
    isCollapsed: false,
    favoritesLoaded: true
  });

  assert.equal(base, same);
  assert.notEqual(base, collapsed);
  assert.notEqual(base, favoritesReady);
});
