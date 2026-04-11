# Favorites Layout Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正 SlimGPT 的 PDF 按钮与消息区收藏星标位置，让它们不遮挡正文，并提高可见性。

**Architecture:** 新增一个小型纯函数模块来计算 PDF 浮动按钮相对锚点矩形的定位，便于用 Node 测试。`content.js` 负责在左侧导航栏内部寻找底部最后一个可见标签/条目作为 PDF 锚点，并把收藏星标挂载到用户气泡外侧右边缘。`styles.css` 负责黑色 PDF 按钮和贴边但不压字的星标样式。

**Tech Stack:** Manifest V3 extension, vanilla JavaScript, Node `--test`

---

### Task 1: 为 PDF 按钮定位增加纯函数与测试

**Files:**
- Create: `floating-pdf-layout.js`
- Create: `tests/floating-pdf-layout.test.js`

- [ ] **Step 1: 写失败测试，锁定“侧栏外部正下方”的定位规则**

```js
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  computeFloatingPdfPosition
} = require("../floating-pdf-layout.js");

test("computeFloatingPdfPosition places button below sidebar and keeps it onscreen", () => {
  assert.deepEqual(
    computeFloatingPdfPosition(
      { left: 0, right: 148, bottom: 728 },
      { width: 92, height: 34 },
      { width: 1440, height: 900 }
    ),
    { left: 28, top: 744 }
  );
});

test("computeFloatingPdfPosition clamps top when sidebar bottom is near viewport edge", () => {
  assert.deepEqual(
    computeFloatingPdfPosition(
      { left: 0, right: 148, bottom: 886 },
      { width: 92, height: 34 },
      { width: 1440, height: 900 }
    ),
    { left: 28, top: 854 }
  );
});
```

- [ ] **Step 2: 运行测试，确认当前失败**

Run: `node --test tests/floating-pdf-layout.test.js`
Expected: FAIL with `Cannot find module '../floating-pdf-layout.js'`

- [ ] **Step 3: 实现最小定位纯函数**

```js
(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.SlimGPTFloatingPdfLayout = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  function computeFloatingPdfPosition(sidebarRect, buttonSize, viewportSize) {
    const sidebarLeft = Math.max(0, Number(sidebarRect?.left) || 0);
    const sidebarRight = Math.max(sidebarLeft, Number(sidebarRect?.right) || 0);
    const sidebarBottom = Math.max(0, Number(sidebarRect?.bottom) || 0);
    const buttonWidth = Math.max(1, Number(buttonSize?.width) || 92);
    const buttonHeight = Math.max(1, Number(buttonSize?.height) || 34);
    const viewportWidth = Math.max(buttonWidth + 24, Number(viewportSize?.width) || 1280);
    const viewportHeight = Math.max(buttonHeight + 24, Number(viewportSize?.height) || 720);
    const left = Math.max(
      12,
      Math.min(sidebarRight - buttonWidth - 28, viewportWidth - buttonWidth - 12)
    );
    const top = Math.max(
      12,
      Math.min(sidebarBottom + 16, viewportHeight - buttonHeight - 12)
    );
    return {
      left: Math.round(left),
      top: Math.round(top)
    };
  }

  return {
    computeFloatingPdfPosition
  };
});
```

- [ ] **Step 4: 重新运行测试，确认通过**

Run: `node --test tests/floating-pdf-layout.test.js`
Expected: PASS

### Task 2: 接入新定位并修正消息区星标挂载点

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
  "content.js"
]
```

- [ ] **Step 2: 修改 PDF 按钮逻辑，创建后立即定位，并在侧栏布局更新时重复定位**

```js
function positionFloatingPdfButton() {
  const button = document.querySelector("[data-slimgpt-pdf-float='1']");
  const layoutApi = globalThis.SlimGPTFloatingPdfLayout;
  if (!(button instanceof HTMLButtonElement) || !layoutApi) {
    return;
  }

  const position = layoutApi.computeFloatingPdfPosition(
    getFloatingPdfAnchorRect(),
    { width: button.offsetWidth || 92, height: button.offsetHeight || 34 },
    { width: window.innerWidth, height: window.innerHeight }
  );

  button.style.left = `${position.left}px`;
  button.style.top = `${position.top}px`;
}
```

- [ ] **Step 3: 把消息区星标宿主改成用户气泡本身，并让按钮挂到气泡外侧**

```js
function getFavoriteButtonHost(item) {
  if (!(item?.el instanceof HTMLElement)) {
    return null;
  }

  if (item.el.matches(CONFIG.messageSelector)) {
    return item.el;
  }

  const roleNode = item.el.querySelector(`${CONFIG.messageSelector}[data-message-author-role='user']`);
  return roleNode instanceof HTMLElement ? roleNode : item.el;
}
```

- [ ] **Step 4: 在刷新消息区星标时，为宿主打上“右侧留白”类**

```js
host.classList.add("slimgpt-question-favorite-host");
```

- [ ] **Step 5: 运行脚本语法检查**

Run: `node --check content.js`
Expected: exit code `0`

### Task 3: 调整样式，修正黑色 PDF 与右侧操作区

**Files:**
- Modify: `styles.css`

- [ ] **Step 1: 让 PDF 按钮变为黑色独立悬浮按钮**

```css
.slimgpt-floating-pdf-btn {
  position: fixed;
  background: rgba(12, 12, 12, 0.96);
  color: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.28);
}
```

- [ ] **Step 2: 让星标贴在用户气泡外侧右边缘，不让星标压住文字**

```css
.slimgpt-question-favorite-host {
  position: relative;
  overflow: visible;
}

.slimgpt-question-favorite-message {
  top: 50%;
  right: -18px;
  width: 26px;
  height: 26px;
  transform: translateY(-50%);
}
```

- [ ] **Step 3: 提升星标颜色可见性**

```css
.slimgpt-question-favorite-toggle {
  color: rgba(245, 208, 108, 0.92);
}

.slimgpt-question-favorite-toggle.is-active {
  color: #facc15;
}
```

### Task 4: 跑验证并记录浏览器检查项

**Files:**
- Test: `tests/floating-pdf-layout.test.js`
- Test: `content.js`
- Test: 浏览器手工验证

- [ ] **Step 1: 跑 Node 测试与现有回归测试**

Run: `node --test tests/floating-pdf-layout.test.js tests/question-favorites.test.js tests/question-dock.test.js tests/turn-preview.test.js tests/composer-actions.test.js tests/export-cleanup.test.js`
Expected: PASS

- [ ] **Step 2: 再跑一次内容脚本语法检查**

Run: `node --check content.js`
Expected: exit code `0`

- [ ] **Step 3: 浏览器手工验证**

Run: 刷新已加载扩展的 ChatGPT 会话页
Expected:
- PDF 按钮位于左侧导航底部最后一个标签/条目的正下方，单独悬浮
- 消息区星标紧挨用户提问气泡右侧，不覆盖文字
- 星标始终显示且颜色更醒目
- 问题栏星标与消息区同步
