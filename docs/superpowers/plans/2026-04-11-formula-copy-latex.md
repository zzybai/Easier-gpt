# Formula Copy Latex Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 SlimGPT 支持点击公式本体一键复制该公式的 LaTeX 源码，并提供轻量反馈。

**Architecture:** 复用现有 KaTeX 渲染链路中的 `annotation[encoding="application/x-tex"]` 作为唯一可信源码来源。将公式复制目标识别与绑定逻辑拆到一个纯函数模块做最小测试覆盖，`content.js` 继续负责动态注入和点击委托，`styles.css` 只负责 hover 与 copied 提示的轻量视觉。

**Tech Stack:** Manifest V3 extension, vanilla JavaScript, Node `--test`

---

### Task 1: 提取公式复制目标识别纯函数并补测试

**Files:**
- Create: `formula-copy.js`
- Create: `tests/formula-copy.test.js`

- [ ] **Step 1: 写失败测试，锁定块级与行内公式的目标选择**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");

const {
  getLatexCopyBinding
} = require("../formula-copy.js");

test("getLatexCopyBinding returns display container and latex source", () => {
  const dom = new JSDOM(`
    <div class="katex-display">
      <span class="katex">
        <annotation encoding="application/x-tex">x^2+y^2</annotation>
      </span>
    </div>
  `);
  const annotation = dom.window.document.querySelector("annotation");
  const binding = getLatexCopyBinding(annotation);

  assert.equal(binding.latex, "x^2+y^2");
  assert.equal(binding.target.className, "katex-display");
});

test("getLatexCopyBinding returns inline katex container for inline formulas", () => {
  const dom = new JSDOM(`
    <span class="katex">
      <annotation encoding="application/x-tex">a+b</annotation>
    </span>
  `);
  const annotation = dom.window.document.querySelector("annotation");
  const binding = getLatexCopyBinding(annotation);

  assert.equal(binding.latex, "a+b");
  assert.equal(binding.target.className, "katex");
});
```

- [ ] **Step 2: 运行测试，确认当前失败**

Run: `node --test tests/formula-copy.test.js`
Expected: FAIL with `Cannot find module '../formula-copy.js'`

- [ ] **Step 3: 实现最小纯函数模块**

```js
(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.SlimGPTFormulaCopy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  function getLatexCopyBinding(annotation) {
    if (!(annotation instanceof Element)) {
      return null;
    }

    const latex = String(annotation.textContent || "").trim();
    if (!latex) {
      return null;
    }

    const displayContainer = annotation.closest(".katex-display");
    const inlineContainer = annotation.closest(".katex");
    const target = displayContainer || inlineContainer;
    if (!(target instanceof Element)) {
      return null;
    }

    return { target, latex, isDisplay: !!displayContainer };
  }

  return {
    getLatexCopyBinding
  };
});
```

- [ ] **Step 4: 再次运行测试，确认通过**

Run: `node --test tests/formula-copy.test.js`
Expected: PASS

### Task 2: 接入内容脚本，正式化点击公式复制 LaTeX

**Files:**
- Modify: `manifest.json`
- Modify: `content.js`

- [ ] **Step 1: 把新模块加入 content script**

```json
"js": [
  "vendor/katex/katex.min.js",
  "export-cleanup.js",
  "question-dock.js",
  "question-favorites.js",
  "turn-preview.js",
  "floating-pdf-layout.js",
  "formula-copy.js",
  "content.js"
]
```

- [ ] **Step 2: 用纯函数替换当前注解到目标节点的识别逻辑**

```js
function injectLatexCopyBtn(annotation) {
  const formulaApi = globalThis.SlimGPTFormulaCopy;
  const binding = formulaApi?.getLatexCopyBinding(annotation);
  if (!binding) return;

  const { target, latex } = binding;
  if (target.closest("[data-slimgpt-inline-math='1']")) {
    return;
  }

  bindLatexCopyTarget(target, latex);
}
```

- [ ] **Step 3: 保持点击委托只作用于公式本体，不作用于普通文本**

```js
const target = event.target.closest("[data-slimgpt-latex-copy='1']");
if (!(target instanceof HTMLElement)) {
  return;
}
```

- [ ] **Step 4: 运行语法检查**

Run: `node --check content.js`
Expected: exit code `0`

### Task 3: 打磨提示文案与样式

**Files:**
- Modify: `styles.css`

- [ ] **Step 1: 调整 hover 文案为更明确的 LaTeX 提示**

```css
[data-slimgpt-latex-copy="1"]::after {
  content: "LaTeX";
}
```

- [ ] **Step 2: 保留复制成功反馈**

```css
[data-slimgpt-latex-copy="1"].is-copied::after {
  content: "Copied";
}
```

- [ ] **Step 3: 对行内公式保持克制，对块级公式维持右上角提示**

```css
.katex-display[data-slimgpt-latex-copy="1"]::after {
  top: 6px;
  right: 6px;
}
```

### Task 4: 跑验证并记录浏览器检查项

**Files:**
- Test: `tests/formula-copy.test.js`
- Test: `content.js`
- Test: 浏览器手工验证

- [ ] **Step 1: 跑 Node 测试与现有回归测试**

Run: `node --test tests/formula-copy.test.js tests/floating-pdf-layout.test.js tests/question-favorites.test.js tests/question-dock.test.js tests/turn-preview.test.js tests/composer-actions.test.js tests/export-cleanup.test.js`
Expected: PASS

- [ ] **Step 2: 再跑一次内容脚本语法检查**

Run: `node --check content.js`
Expected: exit code `0`

- [ ] **Step 3: 浏览器手工验证**

Run: 刷新已加载扩展的 ChatGPT 会话页并测试含公式的对话
Expected:
- 点击块级公式可复制 LaTeX
- 点击行内公式可复制 LaTeX
- hover 时显示 `LaTeX`
- 复制成功后短暂显示 `Copied`
