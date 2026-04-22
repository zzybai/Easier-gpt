const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("question dock click queues reveal and flushes it after list rebuild", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");

  assert.match(source, /questionDockPendingRevealTurn:\s*-1/);
  assert.match(source, /function queueQuestionDockReveal\(turnIndex\)/);
  assert.match(source, /function flushQuestionDockReveal\(list\)/);
  assert.match(source, /list\.replaceChildren\(\.\.\.items\.map\(\(item\) => buildQuestionDockItem\(item, activeTurn\)\)\);\s+flushQuestionDockReveal\(list\);/);
});
