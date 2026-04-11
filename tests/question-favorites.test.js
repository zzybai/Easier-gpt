const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildQuestionFavoriteKey,
  normalizeFavoriteQuestionText
} = require("../question-favorites.js");

test("buildQuestionFavoriteKey folds whitespace and uses conversation path", () => {
  assert.equal(
    buildQuestionFavoriteKey("/c/abc", 2, "  帮我\n整理   导航栏  "),
    "/c/abc::2::帮我 整理 导航栏"
  );
});

test("buildQuestionFavoriteKey keeps different conversations isolated", () => {
  assert.notEqual(
    buildQuestionFavoriteKey("/c/a", 2, "同一问题"),
    buildQuestionFavoriteKey("/c/b", 2, "同一问题")
  );
});

test("normalizeFavoriteQuestionText returns empty string for blank input", () => {
  assert.equal(normalizeFavoriteQuestionText("   "), "");
});
