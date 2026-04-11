const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("manifest exposes Easier-GPT branding", () => {
  const manifestPath = path.join(__dirname, "..", "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  assert.equal(manifest.name, "Easier-GPT");
  assert.match(manifest.description, /Easier-GPT/);
});

test("package workflow uses easier-gpt artifact naming", () => {
  const workflowPath = path.join(__dirname, "..", ".github", "workflows", "package.yml");
  const workflow = fs.readFileSync(workflowPath, "utf8");

  assert.match(workflow, /ZIP_NAME="easier-gpt-\$\{SHORT_SHA\}\.zip"/);
});
