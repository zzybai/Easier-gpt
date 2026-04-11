# PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 SlimGPT 增加保留聊天结构且支持 LaTeX 公式渲染的 PDF 导出。

**Architecture:** 复用现有导出 payload，由 `content.js` 把数据写入 `chrome.storage.local` 并打开扩展内部打印页。打印页通过共享的 `pdf-export.js` 把纯文本消息拆分为段落、代码块和公式块，再用本地 KaTeX 渲染并触发浏览器打印。

**Tech Stack:** Manifest V3 extension, vanilla JavaScript, Chrome storage API, local KaTeX, Node `--test`

---

### Task 1: 先补纯函数测试

**Files:**
- Create: `tests/pdf-export.test.js`
- Test: `tests/pdf-export.test.js`

- [ ] **Step 1: 写失败测试**
  覆盖行内公式、块级公式、代码块不转公式、HTML 转义和空消息处理。
- [ ] **Step 2: 运行测试确认失败**
  Run: `node --test tests/pdf-export.test.js`
- [ ] **Step 3: 实现最小解析模块**
  在 `pdf-export.js` 提供解析与 HTML 生成函数。
- [ ] **Step 4: 再次运行测试确认通过**
  Run: `node --test tests/pdf-export.test.js`

### Task 2: 实现打印页

**Files:**
- Create: `print.html`
- Create: `print.js`
- Create: `print.css`
- Modify: `pdf-export.js`

- [ ] **Step 1: 搭建独立打印页结构**
- [ ] **Step 2: 从存储读取 payload 并渲染聊天结构**
- [ ] **Step 3: 调用 KaTeX 渲染公式并处理失败降级**
- [ ] **Step 4: 页面准备完成后触发 `window.print()`**

### Task 3: 接入扩展导出入口

**Files:**
- Modify: `content.js`
- Modify: `manifest.json`

- [ ] **Step 1: 在导出面板新增 `PDF` 按钮**
- [ ] **Step 2: 增加 `exportChatAsPdf()` 与存储/打开打印页逻辑**
- [ ] **Step 3: 为存储 API 和打印页资源更新 manifest**

### Task 4: 验证

**Files:**
- Test: `tests/pdf-export.test.js`
- Test: 浏览器手工验证

- [ ] **Step 1: 运行 `node --test tests/pdf-export.test.js`**
- [ ] **Step 2: 检查 `print.html`、`print.js`、`print.css`、`pdf-export.js` 是否已被 manifest 和页面正确引用**
- [ ] **Step 3: 记录仍需浏览器手测的项目，包括公式、分页和打印窗口**
