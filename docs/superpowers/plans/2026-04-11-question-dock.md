# Question Dock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 SlimGPT 增加右上角问题栏，展示用户问题摘要并支持展开/折叠与跳转。

**Architecture:** 复用现有会话模型，从 `STATE.messages` 派生问题列表。`content.js` 渲染右上角浮层和图标按钮，`styles.css` 控制视觉和布局，纯函数模块 `question-dock.js` 负责问题数据整理并用 Node 测试覆盖。

**Tech Stack:** Manifest V3 extension, vanilla JavaScript, Node `--test`

---

### Task 1: 写问题列表构建测试

**Files:**
- Create: `tests/question-dock.test.js`
- Test: `tests/question-dock.test.js`

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 运行 `node --test tests/question-dock.test.js` 确认失败**
- [ ] **Step 3: 实现最小问题列表构建模块**
- [ ] **Step 4: 再次运行测试确认通过**

### Task 2: 接入右上角问题栏

**Files:**
- Modify: `content.js`
- Modify: `styles.css`
- Modify: `manifest.json`

- [ ] **Step 1: 增加右上角问题栏状态和 DOM 创建逻辑**
- [ ] **Step 2: 在同步周期内更新问题列表、高亮与折叠状态**
- [ ] **Step 3: 添加图标按钮、点击跳转和窄屏折叠样式**

### Task 3: 验证

**Files:**
- Test: `tests/question-dock.test.js`
- Test: 浏览器手工验证

- [ ] **Step 1: 运行 `node --test tests/question-dock.test.js`**
- [ ] **Step 2: 运行 `node --check content.js`**
- [ ] **Step 3: 记录需在浏览器确认的展开/折叠、高亮与跳转行为**
