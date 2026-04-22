const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("question dock item exposes a full-width click target", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");

  const itemRule = css.match(/\.easier-gpt-question-dock-item\s*\{[^}]*\}/);
  assert.ok(itemRule, "missing .easier-gpt-question-dock-item rule");
  assert.match(itemRule[0], /cursor:\s*pointer\s*;/);

  const mainRule = css.match(/\.easier-gpt-question-dock-main\s*\{[^}]*\}/);
  assert.ok(mainRule, "missing .easier-gpt-question-dock-main rule");
  assert.match(mainRule[0], /width:\s*100%\s*;/);
  assert.match(mainRule[0], /min-height:\s*100%\s*;/);
});

test("question dock hover states avoid vertical movement that can look like flicker", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
  const selectors = [
    ".easier-gpt-question-dock-toggle:hover",
    ".easier-gpt-question-dock-item:hover",
    ".easier-gpt-question-favorite-toggle:hover"
  ];

  for (const selector of selectors) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rule = css.match(new RegExp(`${escaped}\\s*\\{[^}]*\\}`));
    assert.ok(rule, `missing ${selector} rule`);
    assert.doesNotMatch(rule[0], /transform\s*:/, `${selector} should not animate position`);
  }
});
