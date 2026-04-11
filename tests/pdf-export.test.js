const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  parseMessageBlocks,
  renderMessageHtml
} = require("../pdf-export.js");

test("parseMessageBlocks keeps fenced code blocks isolated", () => {
  const text = [
    "Before math $E=mc^2$",
    "",
    "```js",
    "const value = '$notMath$';",
    "```",
    "",
    "After block"
  ].join("\n");

  const blocks = parseMessageBlocks(text);

  assert.deepEqual(
    blocks.map((block) => block.type),
    ["paragraph", "code", "paragraph"]
  );
  assert.equal(blocks[1].lang, "js");
  assert.match(blocks[1].text, /\$notMath\$/);
});

test("parseMessageBlocks detects $$ block math across lines", () => {
  const text = [
    "$$",
    "\\int_0^1 x^2 dx",
    "$$"
  ].join("\n");

  const blocks = parseMessageBlocks(text);

  assert.deepEqual(blocks, [
    {
      type: "math",
      displayMode: true,
      text: "\\int_0^1 x^2 dx"
    }
  ]);
});

test("renderMessageHtml converts inline math but preserves inline code", () => {
  const html = renderMessageHtml("Inline $a^2+b^2=c^2$ and `const x = '$y$';`");

  assert.match(html, /data-easier-gpt-math="1"/);
  assert.match(html, /data-display-mode="0"/);
  assert.match(html, /const x = &#39;\$y\$&#39;;/);
  assert.doesNotMatch(html, /<code>.*data-easier-gpt-math="1"/);
});

test("renderMessageHtml escapes raw HTML from message text", () => {
  const html = renderMessageHtml("<img src=x onerror=alert(1)> $x$");

  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /data-easier-gpt-math="1"[^>]*>x<\/span>/);
});

test("renderMessageHtml returns placeholder for empty text", () => {
  const html = renderMessageHtml("");

  assert.match(html, /easier-gpt-print-empty/);
});

test("renderMessageHtml prefers structured blocks when available", () => {
  const html = renderMessageHtml("", [
    {
      type: "paragraph",
      segments: [
        { type: "text", text: "Inline " },
        { type: "math", displayMode: false, text: "a+b" },
        { type: "text", text: " and " },
        { type: "inlineCode", text: "const x = 1;" }
      ]
    },
    {
      type: "math",
      displayMode: true,
      text: "\\int_0^1 x\\,dx"
    },
    {
      type: "code",
      lang: "js",
      text: "console.log('ok');"
    }
  ]);

  assert.match(html, /data-display-mode="0"[^>]*>a\+b<\/span>/);
  assert.match(html, /<code class="easier-gpt-print-inline-code">const x = 1;<\/code>/);
  assert.match(html, /data-display-mode="1"[^>]*>\\int_0\^1 x\\,dx<\/span>/);
  assert.match(html, /<code data-lang="js">console\.log\(&#39;ok&#39;\);<\/code>/);
  assert.doesNotMatch(html, /easier-gpt-print-empty/);
});

test("renderMessageHtml prefers exported rich html over regenerated blocks", () => {
  const html = renderMessageHtml(
    "Inline $a+b$",
    [
      {
        type: "paragraph",
        segments: [
          { type: "text", text: "fallback" }
        ]
      }
    ],
    '<div class="easier-gpt-print-rich-region"><span class="katex"><span class="katex-html">rendered</span></span></div>'
  );

  assert.match(html, /easier-gpt-print-rich-region/);
  assert.match(html, /katex-html/);
  assert.doesNotMatch(html, /data-easier-gpt-math="1"/);
  assert.doesNotMatch(html, /fallback/);
});

test("manifest exposes print.html to the matched ChatGPT pages", () => {
  const manifestPath = path.join(__dirname, "..", "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const resources = manifest.web_accessible_resources || [];

  const printEntry = resources.find((entry) => {
    return Array.isArray(entry.resources) && entry.resources.includes("print.html");
  });

  assert.ok(printEntry, "print.html must be in web_accessible_resources");
  assert.deepEqual(printEntry.matches, [
    "https://chatgpt.com/*",
    "https://chat.openai.com/*"
  ]);
});
