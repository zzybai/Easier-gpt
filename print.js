(() => {
  "use strict";

  const EXPORT_STORAGE_PREFIX = "easier-gpt-pdf-export:";
  const LOAD_RETRY_LIMIT = 30;
  const LOAD_RETRY_MS = 200;

  async function main() {
    const statusEl = document.querySelector("[data-easier-gpt-print-status]");
    const titleEl = document.querySelector("[data-easier-gpt-print-page-title]");
    const metaEl = document.querySelector("[data-easier-gpt-print-meta]");
    const messagesEl = document.querySelector("[data-easier-gpt-print-messages]");
    const exportId = new URLSearchParams(location.search).get("exportId");

    if (!(statusEl instanceof HTMLElement) ||
        !(titleEl instanceof HTMLElement) ||
        !(metaEl instanceof HTMLElement) ||
        !(messagesEl instanceof HTMLElement)) {
      return;
    }

    if (!exportId) {
      renderFatal(messagesEl, statusEl, "缺少导出参数，无法生成 PDF。");
      return;
    }

    try {
      const storageKey = `${EXPORT_STORAGE_PREFIX}${exportId}`;
      const entry = await waitForExportEntry(storageKey);
      if (!entry || !entry.payload) {
        renderFatal(messagesEl, statusEl, "没有找到可打印的导出内容。");
        return;
      }

      document.title = `${entry.payload.title || "Easier-GPT"} PDF`;
      titleEl.textContent = entry.payload.title || "Easier-GPT 对话导出";
      statusEl.textContent = "正在渲染打印预览…";

      renderMeta(metaEl, entry.payload);
      renderMessages(messagesEl, entry.payload);
      renderMath(messagesEl);

      statusEl.textContent = "打印预览已准备完成，正在打开打印窗口…";
      await waitForFonts();
      window.setTimeout(() => {
        window.print();
      }, 80);
    } catch (error) {
      renderFatal(messagesEl, statusEl, "生成 PDF 失败，请关闭页面后重试。");
      console.error("Easier-GPT PDF export failed:", error);
    }
  }

  function renderMeta(container, payload) {
    const items = [];
    if (payload.exportedAt) {
      items.push(["导出时间", formatDateTime(payload.exportedAt)]);
    }
    if (payload.url) {
      items.push(["原始链接", payload.url]);
    }
    items.push(["消息数", String(payload.totalMessages || 0)]);
    items.push(["轮次", String(payload.totalTurns || 0)]);

    container.innerHTML = items.map(([label, value]) => {
      return `<div class="easier-gpt-print-meta-item"><strong>${escapeHtml(label)}：</strong>${escapeHtml(value)}</div>`;
    }).join("");
    container.hidden = false;
  }

  function renderMessages(container, payload) {
    const exportApi = globalThis.EasierGPTPdfExport;
    if (!exportApi || typeof exportApi.renderMessageHtml !== "function") {
      throw new Error("EasierGPTPdfExport is unavailable");
    }

    const fragments = [];
    for (const turn of payload.turns || []) {
      for (const message of turn.messages || []) {
        const role = message.role === "user" ? "user" : "assistant";
        const roleLabel = role === "user" ? "You" : "Assistant";
        const modelLabel = message.model ? escapeHtml(message.model) : "";

        fragments.push([
          `<article class="easier-gpt-print-message" data-role="${role}">`,
          '<header class="easier-gpt-print-message-header">',
          `<span class="easier-gpt-print-role">${roleLabel}</span>`,
          modelLabel ? `<span class="easier-gpt-print-model">${modelLabel}</span>` : "",
          "</header>",
          `<section class="easier-gpt-print-body">${exportApi.renderMessageHtml(message.text || "", message.printBlocks || null, message.printHtml || "")}</section>`,
          "</article>"
        ].join(""));
      }
    }

    if (!fragments.length) {
      fragments.push('<p class="easier-gpt-print-empty">当前没有可导出的对话内容。</p>');
    }

    container.innerHTML = fragments.join("");
  }

  function renderMath(root) {
    if (!globalThis.katex || typeof globalThis.katex.render !== "function") {
      return;
    }

    root.querySelectorAll("[data-easier-gpt-math='1']").forEach((node) => {
      if (!(node instanceof HTMLElement)) {
        return;
      }

      const source = node.textContent || "";
      const displayMode = node.getAttribute("data-display-mode") === "1";

      try {
        globalThis.katex.render(source, node, {
          displayMode,
          throwOnError: true
        });
      } catch (error) {
        node.classList.add("is-error");
        node.textContent = source;
        node.title = error instanceof Error ? error.message : "KaTeX render error";
      }
    });
  }

  function renderFatal(container, statusEl, message) {
    statusEl.textContent = message;
    container.innerHTML = `<p class="easier-gpt-print-empty">${escapeHtml(message)}</p>`;
  }

  async function waitForExportEntry(storageKey) {
    for (let attempt = 0; attempt < LOAD_RETRY_LIMIT; attempt += 1) {
      const entry = await storageGet(storageKey);
      if (entry) {
        await storageRemove(storageKey);
        return entry;
      }
      await delay(LOAD_RETRY_MS);
    }
    return null;
  }

  function storageGet(key) {
    return new Promise((resolve, reject) => {
      if (!chrome?.storage?.local) {
        reject(new Error("chrome.storage.local is unavailable"));
        return;
      }

      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(result ? result[key] : null);
      });
    });
  }

  function storageRemove(key) {
    return new Promise((resolve, reject) => {
      if (!chrome?.storage?.local) {
        reject(new Error("chrome.storage.local is unavailable"));
        return;
      }

      chrome.storage.local.remove(key, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  }

  function waitForFonts() {
    if (document.fonts?.ready && typeof document.fonts.ready.then === "function") {
      return document.fonts.ready.catch(() => undefined);
    }
    return Promise.resolve();
  }

  function delay(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value || "");
    }
    return date.toLocaleString();
  }

  function escapeHtml(text) {
    const exportApi = globalThis.EasierGPTPdfExport;
    if (exportApi && typeof exportApi.escapeHtml === "function") {
      return exportApi.escapeHtml(text);
    }
    return String(text || "");
  }

  main();
})();
