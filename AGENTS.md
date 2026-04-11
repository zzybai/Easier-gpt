# Repository Guidelines

## 文档语言
本仓库的说明性内容默认使用中文，包括贡献指南、评审说明、变更解释和面向协作者的补充文档。除非有明确外部要求，否则不要改回英文叙述。

## 项目结构与模块组织
`manifest.json` 定义 Manifest V3 扩展入口和可访问资源。`content.js` 是核心运行脚本，负责 DOM 观察、长对话虚拟化、minimap、行内 KaTeX 渲染和输入框增强。`styles.css` 存放所有注入页面的样式。第三方离线数学资源位于 `vendor/katex/`。打包流程在 `.github/workflows/package.yml`。

## 构建、测试与本地开发
本仓库没有 `npm` 或其他构建系统，开发方式以浏览器直接加载扩展为主。

- `zip -r easier-gpt-local.zip manifest.json content.js styles.css vendor`
  本地打包，产物结构应与 CI 一致。
- 打开 `chrome://extensions` 或 `edge://extensions`，开启开发者模式后选择 `Load unpacked`
  直接加载仓库根目录进行调试。
- `unzip -l easier-gpt-local.zip`
  检查压缩包是否包含 `manifest.json`、运行脚本、样式和 `vendor/` 资源。

## 代码风格与命名约定
JavaScript 与 CSS 统一使用 2 空格缩进，保留分号，JS 字符串优先使用双引号以保持与 `content.js` 一致。函数和局部变量使用 `camelCase`，全局配置对象保持 `CONFIG`、`STATE` 这类大写命名。新增样式类名继续使用 `easier-gpt-` 前缀，新增 DOM 钩子继续使用 `data-easier-gpt-*`。修改高频同步路径时，优先抽出小型辅助函数，不要继续堆叠大型内联分支。

## 测试要求
当前没有自动化测试框架，所有改动都需要手工验证。至少在 Chrome 或 Edge 中检查 `https://chatgpt.com/*` 和 `https://chat.openai.com/*` 下的长对话折叠、minimap 跳转、公式渲染、输入框展开与恢复。提交 PR 时写清复现步骤、验证步骤和结果。

## 提交与合并请求规范
当前目录快照不包含 `.git` 历史，因此提交信息请使用简短祈使句，例如 `fix: reduce minimap sync churn` 或 `docs: update Chinese contributor guide`。一次提交只解决一个主题。PR 需要包含变更摘要、测试浏览器、手工验证步骤；涉及界面变化时附截图或 GIF。

## 安全与配置说明
保持扩展自包含，优先使用 `vendor/` 中的离线资源，不要随意引入新的 CDN 依赖。页面识别逻辑应继续依赖稳定的语义属性，例如 `data-message-author-role`，避免耦合 ChatGPT 内部框架状态。
