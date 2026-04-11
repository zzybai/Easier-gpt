# Question Favorites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 SlimGPT 增加“问题收藏”能力，在消息区和右上角问题栏提供双入口星标，并在刷新后保留收藏状态。

**Architecture:** 新增纯函数模块 `question-favorites.js`，负责归一化问题文本和生成稳定收藏键。`question-dock.js` 继续负责问题栏列表构建，但会附带收藏元数据。`content.js` 负责从 `STATE.messages` 派生用户问题、读写 `chrome.storage.local`、在消息区和问题栏渲染星标，并保证两处交互同步。

**Tech Stack:** Manifest V3 extension, vanilla JavaScript, Node `--test`, `chrome.storage.local`

---

### Task 1: 建立收藏键纯函数与测试

**Files:**
- Create: `question-favorites.js`
- Create: `tests/question-favorites.test.js`

- [ ] **Step 1: 写失败测试，锁定收藏键规则**

```js
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
```

- [ ] **Step 2: 运行测试，确认当前失败**

Run: `node --test tests/question-favorites.test.js`
Expected: FAIL with `Cannot find module '../question-favorites.js'`

- [ ] **Step 3: 实现最小纯函数模块**

```js
(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.SlimGPTQuestionFavorites = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  function normalizeFavoriteQuestionText(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function buildQuestionFavoriteKey(conversationPath, turnIndex, text) {
    const path = String(conversationPath || "").trim() || "/";
    const turn = Number.isFinite(Number(turnIndex)) ? Number(turnIndex) : -1;
    const normalizedText = normalizeFavoriteQuestionText(text);
    return `${path}::${turn}::${normalizedText}`;
  }

  return {
    buildQuestionFavoriteKey,
    normalizeFavoriteQuestionText
  };
});
```

- [ ] **Step 4: 重新运行测试，确认通过**

Run: `node --test tests/question-favorites.test.js`
Expected: PASS

### Task 2: 扩展问题栏数据测试与构建逻辑

**Files:**
- Modify: `question-dock.js`
- Modify: `tests/question-dock.test.js`

- [ ] **Step 1: 先写失败测试，锁定问题栏收藏元数据**

```js
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
```

- [ ] **Step 2: 运行测试，确认因字段缺失而失败**

Run: `node --test tests/question-dock.test.js`
Expected: FAIL with assertion error for `isFavorited` / `favoriteKey`

- [ ] **Step 3: 在问题栏构建逻辑中增加收藏字段**

```js
function buildQuestionItems(messages, getText, maxLength = 52, minLength = 2, options = {}) {
  const items = [];
  const seenTurns = new Set();
  const favorites = options.favorites instanceof Set ? options.favorites : new Set();
  const buildFavoriteKey =
    typeof options.buildFavoriteKey === "function" ? options.buildFavoriteKey : null;

  for (const message of Array.isArray(messages) ? messages : []) {
    // 现有过滤逻辑保留

    const fullText = normalizeQuestionText(rawText);
    const favoriteKey = buildFavoriteKey ? buildFavoriteKey(message, fullText) : "";

    items.push({
      id: message.id,
      turnIndex,
      label: `Q${turnIndex + 1}`,
      fullText,
      shortText: truncateQuestionText(fullText, maxLength),
      favoriteKey,
      isFavorited: favoriteKey ? favorites.has(favoriteKey) : false
    });
  }

  return items;
}
```

- [ ] **Step 4: 再次运行测试，确认全部通过**

Run: `node --test tests/question-dock.test.js`
Expected: PASS

### Task 3: 在内容脚本中接入收藏状态、消息区按钮和问题栏按钮

**Files:**
- Modify: `content.js`
- Modify: `manifest.json`

- [ ] **Step 1: 把新模块加入 content script 入口**

```json
"js": [
  "vendor/katex/katex.min.js",
  "export-cleanup.js",
  "question-dock.js",
  "question-favorites.js",
  "turn-preview.js",
  "content.js"
]
```

- [ ] **Step 2: 在 `STATE` 和 `CONFIG` 中新增收藏所需状态**

```js
const CONFIG = {
  // 现有配置保留
  questionFavoritesStoragePrefix: "slimgpt-question-favorites:",
  questionFavoriteMessageButtonSize: 24
};

const STATE = {
  // 现有状态保留
  favoriteQuestionKeys: new Set(),
  favoriteConversationKey: "",
  favoriteQuestionsLoaded: false,
  favoriteQuestionsLoadPromise: null
};
```

- [ ] **Step 3: 增加会话键、收藏键、读取与保存 helper**

```js
function getConversationFavoriteStorageKey() {
  const conversationKey = `${location.pathname}${location.search || ""}`;
  return `${CONFIG.questionFavoritesStoragePrefix}${conversationKey}`;
}

function buildFavoriteKeyForItem(item, textOverride = "") {
  const favoriteApi = globalThis.SlimGPTQuestionFavorites;
  if (!favoriteApi || typeof favoriteApi.buildQuestionFavoriteKey !== "function") {
    return "";
  }

  const text = textOverride || getItemText(item);
  return favoriteApi.buildQuestionFavoriteKey(location.pathname, item.turnIndex, text);
}

function loadFavoriteQuestions() {
  if (!chrome?.storage?.local) {
    STATE.favoriteQuestionsLoaded = true;
    return Promise.resolve();
  }

  const key = getConversationFavoriteStorageKey();
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      const values = Array.isArray(result?.[key]) ? result[key] : [];
      STATE.favoriteQuestionKeys = new Set(values.filter(Boolean));
      STATE.favoriteQuestionsLoaded = true;
      resolve();
    });
  });
}

function persistFavoriteQuestions() {
  if (!chrome?.storage?.local) {
    return;
  }

  const key = getConversationFavoriteStorageKey();
  chrome.storage.local.set({ [key]: Array.from(STATE.favoriteQuestionKeys) });
}
```

- [ ] **Step 4: 在问题栏更新流程中传入收藏信息，并把星标按钮从跳转按钮中拆开**

```js
const items = questionApi.buildQuestionItems(
  STATE.messages,
  getItemText,
  CONFIG.questionDockSnippetLength,
  2,
  {
    buildFavoriteKey: (item, text) => buildFavoriteKeyForItem(item, text),
    favorites: STATE.favoriteQuestionKeys
  }
);

function buildQuestionDockItem(item, activeTurn) {
  const row = document.createElement("div");
  row.className = "slimgpt-question-dock-item";

  const jumpButton = document.createElement("button");
  jumpButton.type = "button";
  jumpButton.className = "slimgpt-question-dock-main";
  jumpButton.addEventListener("click", () => jumpToTurn(item.turnIndex));

  const starButton = buildFavoriteToggleButton(item.isFavorited, {
    title: item.isFavorited ? "取消收藏问题" : "收藏问题",
    onClick: () => toggleFavoriteQuestion(item.favoriteKey)
  });

  // Qx 在上，星标在下，文本在右
  return row;
}
```

- [ ] **Step 5: 给消息区用户问题挂载星标按钮，并在同步周期内重复对齐**

```js
function updateMessageFavoriteButtons() {
  for (const item of STATE.messages) {
    if (!item || item.role !== CONFIG.userRole || item.isPlaceholder) {
      continue;
    }

    const favoriteKey = buildFavoriteKeyForItem(item);
    const isFavorited = favoriteKey && STATE.favoriteQuestionKeys.has(favoriteKey);
    ensureMessageFavoriteButton(item, favoriteKey, isFavorited);
  }
}

function ensureMessageFavoriteButton(item, favoriteKey, isFavorited) {
  const host = item.el instanceof HTMLElement ? item.el : null;
  if (!host) {
    return;
  }

  let button = host.querySelector("[data-slimgpt-question-favorite='1']");
  if (!(button instanceof HTMLButtonElement)) {
    button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-slimgpt-question-favorite", "1");
    host.appendChild(button);
  }

  button.classList.toggle("is-active", isFavorited);
  button.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleFavoriteQuestion(favoriteKey);
  };
}
```

- [ ] **Step 6: 在收藏切换后统一刷新两处 UI**

```js
function toggleFavoriteQuestion(favoriteKey) {
  if (!favoriteKey) {
    return;
  }

  if (STATE.favoriteQuestionKeys.has(favoriteKey)) {
    STATE.favoriteQuestionKeys.delete(favoriteKey);
  } else {
    STATE.favoriteQuestionKeys.add(favoriteKey);
  }

  persistFavoriteQuestions();
  updateQuestionDock();
  updateMessageFavoriteButtons();
}
```

- [ ] **Step 7: 验证脚本语法**

Run: `node --check content.js`
Expected: exit code `0`

### Task 4: 打磨样式，确保低干扰双入口

**Files:**
- Modify: `styles.css`

- [ ] **Step 1: 给消息区星标按钮增加轻量样式**

```css
[data-slimgpt-question-favorite="1"] {
  position: absolute;
  top: 8px;
  right: 10px;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.16);
  color: rgba(226, 232, 240, 0.68);
  opacity: 0.72;
}

[data-slimgpt-question-favorite="1"].is-active {
  color: #facc15;
  background: rgba(250, 204, 21, 0.14);
  opacity: 1;
}
```

- [ ] **Step 2: 调整问题栏布局，让 `Qx` 与星标形成竖向左列**

```css
.slimgpt-question-dock-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
}

.slimgpt-question-dock-item-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 30px;
}

.slimgpt-question-dock-favorite {
  border: 0;
  background: transparent;
  color: rgba(203, 213, 225, 0.5);
}

.slimgpt-question-dock-favorite.is-active {
  color: #facc15;
}
```

- [ ] **Step 3: 用窄屏验证约束按钮尺寸，避免遮挡正文**

Run: 手工在浏览器窄屏模式检查消息区星标是否压住正文
Expected: 星标贴边，正文仍可读

### Task 5: 运行验证并记录手工检查结果

**Files:**
- Test: `tests/question-favorites.test.js`
- Test: `tests/question-dock.test.js`
- Test: `content.js`
- Test: 浏览器手工验证

- [ ] **Step 1: 运行纯函数测试**

Run: `node --test tests/question-favorites.test.js tests/question-dock.test.js tests/turn-preview.test.js tests/composer-actions.test.js tests/export-cleanup.test.js`
Expected: PASS

- [ ] **Step 2: 再次运行内容脚本语法检查**

Run: `node --check content.js`
Expected: exit code `0`

- [ ] **Step 3: 在浏览器中手工验证以下行为**

Run: 加载扩展后打开一段长对话并连续提出新问题
Expected:
- 用户问题右上角出现低干扰星标
- 问题栏 `Qx` 下方出现同状态星标
- 点击消息区星标与问题栏星标能双向同步
- 点击问题栏星标不会跳转，点击问题栏正文仍跳转
- 刷新页面后收藏状态保留
