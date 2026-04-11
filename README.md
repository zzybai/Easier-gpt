中文 | [English](./README.en.md)

# Easier-GPT

> 让长对话可追踪，让知识可导出，让公式可复用。

Easier-GPT 是一个面向 ChatGPT 网页版的 Chrome / Edge Manifest V3 扩展，重点突出三项能力：长对话收藏追踪、结构化 PDF 导出、LaTeX 一键复制。整个扩展仅通过 Content Script 改造页面 DOM，不依赖 ChatGPT 内部 React 状态。

> [!NOTE]
> 扩展当前匹配 `https://chatgpt.com/*` 和 `https://chat.openai.com/*`，并优先使用仓库内置的离线资源，例如 `vendor/katex/`。

## Quick Start

1. 打开 `chrome://extensions`
2. 开启“开发者模式”
3. 选择“加载已解压的扩展程序”，导入当前仓库目录
4. 打开 `https://chatgpt.com/` 对话页开始使用
5. 重点体验：长对话收藏追踪、PDF 导出、LaTeX 一键复制

## 创新亮点

- 长对话收藏追踪
  不只是折叠长对话，而是把 minimap、问题栏、问题收藏和 turn 预览串成一套可追踪系统，让超长会话里的关键提问可以被持续定位、回看和跳转。
- 结构化 PDF 导出
  不只是把页面截图成 PDF，而是尽量保留对话里的段落、代码块和数学公式结构，方便沉淀为可阅读、可分享、可打印的资料。
- LaTeX 一键复制
  对渲染后的公式直接提供 LaTeX 源码复制能力，降低从 ChatGPT 到论文、笔记和技术文档的二次整理成本。

## 功能概览

功能示例：问题收藏联动、LaTeX 复制和 PDF 下载入口。

![Easier-GPT 功能示例](./docs/screenshots/feature-overview-example.png)

- 长对话虚拟化
  仅保留视口附近消息为完整 DOM，远处消息折叠为占位节点，降低超长会话的滚动与重排压力。
- Minimap 导航
  在聊天区侧边生成对话缩略导航，支持点击跳转、当前位置高亮，以及 turn 级别的快速定位。
- Turn 预览
  悬停或点击 minimap 点位时，显示前文回答、当前问题、后续回答的摘要预览。
- 搜索与导出面板
  内置对话搜索，并支持导出为 JSON、Markdown、TXT、CSV、PDF。
- PDF 打印页
  通过独立的 `print.html` / `print.js` 渲染打印视图，保留结构化段落、代码块和数学公式。
- 问题停靠栏
  自动提取用户问题，生成右侧问题列表，便于在长对话中按轮次回跳。
- 问题收藏
  可按会话保存关键问题，方便复盘、二次整理或导出前筛选。
- 公式增强
  对 ChatGPT 未处理的行内 `$...$` 数学表达式做补渲染，使用本地 KaTeX 离线完成显示。
- LaTeX 复制
  为公式节点绑定复制能力，便于把 TeX 直接带回论文、笔记或其他编辑器。
- 输入框增强
  为 composer 注入展开按钮，临时拉高输入区；同时提供浮动 PDF 按钮，减少导出路径。
- 性能统计
  可选展示 turns 数、展开/折叠数量和同步耗时，便于观察虚拟化策略是否工作正常。

## 安装

### 方式一：从源码直接加载

1. 打开 `chrome://extensions` 或 `edge://extensions`
2. 开启“开发者模式”
3. 选择“加载已解压的扩展程序”
4. 选择当前仓库根目录
5. 打开 `https://chatgpt.com/` 或 `https://chat.openai.com/` 下的对话页面进行验证

### 方式二：从 GitHub 打包产物安装

1. 在 GitHub Actions 中找到 `Package Extension` 工作流产物
2. 下载生成的 `easier-gpt-<commit>.zip`
3. 解压该压缩包到本地目录
4. 打开 `chrome://extensions` 或 `edge://extensions`
5. 开启“开发者模式”
6. 选择“加载已解压的扩展程序”
7. 选择刚刚解压后的目录

> [!TIP]
> 日常开发和调试更推荐直接加载仓库根目录，因为这样不需要重复打包。

## 使用方式

- 长对话打开后，Easier-GPT 会自动构建消息模型并折叠远处内容
- 右侧 minimap 可用于跳转、预览和打开搜索/导出面板
- 问题停靠栏会提取用户问题，点击即可跳回对应 turn
- 星标按钮可收藏问题，便于在同一会话内回看重点提问
- 数学公式支持补渲染与复制 LaTeX
- 导出面板支持将当前会话整理为多种文本格式或 PDF

## 隐私与安全

- 扩展当前不依赖外部服务，不会把会话内容发送到自建后端
- 数据处理发生在浏览器本地页面上下文中
- 持久化数据仅使用 `chrome.storage.local`，用于保存导出中间数据和问题收藏
- 数学渲染依赖仓库内置的离线 KaTeX 资源，不引入运行时 CDN

> [!IMPORTANT]
> Easier-GPT 会读取当前 ChatGPT 页面中的对话 DOM，以完成折叠、搜索、导出和公式增强。这是扩展工作的前提，不适合安装在你不信任的第三方修改版仓库上。

## 许可与商用提醒

- 本项目采用 MIT License，允许个人与商业使用、修改与再分发。
- 使用、分发或二次开发时，请保留原始版权与许可声明，并自行评估合规责任。
- 本项目与 OpenAI 无官方关联；涉及 ChatGPT、OpenAI 等名称或服务时，请遵守其最新服务条款、品牌与平台政策。
- 若将本项目用于生产或商业环境，建议先完成安全评估、隐私评估与法务审查。

## 项目结构

```text
Easier-GPT/
├── .github/workflows/
├── manifest.json
├── content.js
├── styles.css
├── export-cleanup.js
├── question-dock.js
├── question-favorites.js
├── turn-preview.js
├── floating-pdf-layout.js
├── formula-copy.js
├── print-structure.js
├── pdf-export.js
├── print.js
├── print.html
├── docs/screenshots/
├── tests/
└── vendor/katex/
```

## 适合什么场景

- 单个 ChatGPT 会话已经非常长，滚动和定位开始吃力
- 需要按问题轮次快速回顾上下文
- 需要把对话导出为结构化资料继续整理
- 对数学公式、代码块和打印输出的可读性有要求
