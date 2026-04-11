const test = require("node:test");
const assert = require("node:assert/strict");

const {
  extractPrintBlocks
} = require("../print-structure.js");

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

function text(value) {
  return {
    nodeType: TEXT_NODE,
    childNodes: [],
    textContent: value,
    parentNode: null
  };
}

function el(tagName, attributes = {}, children = []) {
  const node = {
    nodeType: ELEMENT_NODE,
    tagName: String(tagName || "").toUpperCase(),
    attributes: { ...attributes },
    childNodes: [],
    parentNode: null,
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name)
        ? this.attributes[name]
        : null;
    },
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name);
    }
  };

  node.className = node.getAttribute("class") || "";
  node.childNodes = children.map((child) => {
    child.parentNode = node;
    return child;
  });

  Object.defineProperty(node, "textContent", {
    get() {
      return this.childNodes.map((child) => child.textContent || "").join("");
    }
  });

  return node;
}

test("extractPrintBlocks preserves inline math, display math and inline code", () => {
  const root = el("div", { class: "markdown" }, [
    el("p", {}, [
      text("Value "),
      el("span", { class: "katex" }, [
        el("annotation", { encoding: "application/x-tex" }, [
          text("a+b")
        ]),
        text("ignored-rendered-math")
      ]),
      text(" and "),
      el("code", {}, [
        text("const total = 1;")
      ])
    ]),
    el("div", { class: "katex-display" }, [
      el("span", { class: "katex" }, [
        el("annotation", { encoding: "application/x-tex" }, [
          text("\\int_0^1 x\\,dx")
        ]),
        text("ignored-rendered-display")
      ])
    ])
  ]);

  assert.deepEqual(extractPrintBlocks(root), [
    {
      type: "paragraph",
      segments: [
        { type: "text", text: "Value " },
        { type: "math", displayMode: false, text: "a+b" },
        { type: "text", text: " and " },
        { type: "inlineCode", text: "const total = 1;" }
      ]
    },
    {
      type: "math",
      displayMode: true,
      text: "\\int_0^1 x\\,dx"
    }
  ]);
});

test("extractPrintBlocks isolates code blocks and captures language", () => {
  const root = el("div", { class: "markdown" }, [
    el("pre", {}, [
      el("code", { class: "language-js" }, [
        text("const value = '$notMath$';")
      ])
    ])
  ]);

  assert.deepEqual(extractPrintBlocks(root), [
    {
      type: "code",
      lang: "js",
      text: "const value = '$notMath$';"
    }
  ]);
});
