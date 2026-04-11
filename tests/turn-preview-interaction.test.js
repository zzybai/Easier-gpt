const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("minimap dot click also triggers preview rendering", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");

  assert.match(source, /previewClickPinMs:\s*\d+/);
  assert.match(
    source,
    /showDotPreviewForTurn\(turn,\s*dot,\s*\{\s*pin:\s*true\s*\}\);/
  );
});
