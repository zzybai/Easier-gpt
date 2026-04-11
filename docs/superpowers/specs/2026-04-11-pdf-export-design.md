# SlimGPT PDF 导出设计

## 目标
在现有 `JSON / MD / TXT / CSV` 导出之外，新增一个 `PDF` 导出入口。用户点击后打开扩展内部打印页，保留 `You / Assistant` 聊天结构，并把正文中的 LaTeX 公式渲染为常见数学公式后再打印保存为 PDF。

## 范围
- 复用 `buildExportPayload()`，不重新抓取整页 DOM。
- 支持标题、导出时间、原始 URL、消息角色和正文。
- 支持 `$...$` 行内公式和 `$$...$$` 块级公式。
- 代码块和行内代码保持原样，不参与公式解析。
- 单个公式渲染失败时降级显示原始 LaTeX，不阻断整页导出。

## 架构
- `content.js` 新增 `PDF` 按钮和 `exportChatAsPdf()`，将 payload 写入临时存储后打开 `print.html`。
- `print.html` / `print.js` / `print.css` 组成独立打印页，不依赖 ChatGPT 页面样式。
- 新增纯函数模块 `pdf-export.js`，负责把导出文本解析为打印块结构并生成安全 HTML，供打印页和测试复用。
- 使用本地 `vendor/katex` 渲染公式，打印页完成后自动调用 `window.print()`。

## 数据通道
使用 `chrome.storage.local` 以随机导出 ID 暂存 payload。打印页通过 URL 参数读取导出 ID，渲染后删除对应存储项，避免 URL 长度限制和页面间共享失败。

## 验证
- `node --test` 覆盖文本分块、代码隔离、行内公式、块级公式和 HTML 转义。
- 手工验证打印页打开、公式渲染、错误降级和长对话分页。
