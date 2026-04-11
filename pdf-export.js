(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.EasierGPTPdfExport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeText(text) {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\u00a0/g, " ");
  }

  function parseMessageBlocks(text) {
    const normalized = normalizeText(text).trim();
    if (!normalized) {
      return [];
    }

    const lines = normalized.split("\n");
    const blocks = [];
    let index = 0;

    while (index < lines.length) {
      const line = lines[index];
      const trimmed = line.trim();

      if (!trimmed) {
        index += 1;
        continue;
      }

      if (/^```/.test(trimmed)) {
        const lang = trimmed.slice(3).trim();
        const codeLines = [];
        index += 1;

        while (index < lines.length && !/^```/.test(lines[index].trim())) {
          codeLines.push(lines[index]);
          index += 1;
        }

        if (index < lines.length && /^```/.test(lines[index].trim())) {
          index += 1;
        }

        blocks.push({
          type: "code",
          lang,
          text: codeLines.join("\n")
        });
        continue;
      }

      if (trimmed === "$$") {
        const mathLines = [];
        index += 1;

        while (index < lines.length && lines[index].trim() !== "$$") {
          mathLines.push(lines[index]);
          index += 1;
        }

        if (index < lines.length && lines[index].trim() === "$$") {
          index += 1;
        }

        blocks.push({
          type: "math",
          displayMode: true,
          text: mathLines.join("\n").trim()
        });
        continue;
      }

      if (/^\$\$.+\$\$$/.test(trimmed)) {
        blocks.push({
          type: "math",
          displayMode: true,
          text: trimmed.slice(2, -2).trim()
        });
        index += 1;
        continue;
      }

      const paragraphLines = [];
      while (index < lines.length) {
        const current = lines[index];
        const currentTrimmed = current.trim();
        if (!currentTrimmed) {
          index += 1;
          break;
        }
        if (/^```/.test(currentTrimmed) || currentTrimmed === "$$" || /^\$\$.+\$\$$/.test(currentTrimmed)) {
          break;
        }
        paragraphLines.push(current);
        index += 1;
      }

      if (paragraphLines.length) {
        blocks.push({
          type: "paragraph",
          text: paragraphLines.join("\n").trim()
        });
      }
    }

    return blocks;
  }

  function renderInlineTokens(text) {
    const source = normalizeText(text);
    const parts = [];
    let cursor = 0;

    while (cursor < source.length) {
      const char = source[cursor];

      if (char === "`") {
        const end = source.indexOf("`", cursor + 1);
        if (end > cursor + 1) {
          const code = source.slice(cursor + 1, end);
          parts.push(`<code class="easier-gpt-print-inline-code">${escapeHtml(code)}</code>`);
          cursor = end + 1;
          continue;
        }
      }

      if (char === "$" && source[cursor - 1] !== "\\") {
        const end = findInlineMathEnd(source, cursor + 1);
        if (end > cursor + 1) {
          const math = source.slice(cursor + 1, end).trim();
          if (math) {
            parts.push(
              `<span class="easier-gpt-print-math" data-easier-gpt-math="1" data-display-mode="0">${escapeHtml(math)}</span>`
            );
            cursor = end + 1;
            continue;
          }
        }
      }

      let next = cursor + 1;
      while (next < source.length) {
        const nextChar = source[next];
        if (nextChar === "`") {
          break;
        }
        if (nextChar === "$" && source[next - 1] !== "\\") {
          break;
        }
        next += 1;
      }
      parts.push(escapeHtml(source.slice(cursor, next)));
      cursor = next;
    }

    return parts.join("");
  }

  function findInlineMathEnd(source, start) {
    for (let index = start; index < source.length; index += 1) {
      if (source[index] === "\n") {
        return -1;
      }
      if (source[index] === "$" && source[index - 1] !== "\\") {
        return index;
      }
    }
    return -1;
  }

  function renderParagraphHtml(text) {
    return String(text || "")
      .split("\n")
      .map((line) => renderInlineTokens(line))
      .join("<br>");
  }

  function renderStructuredParagraph(block) {
    const parts = [];

    for (const segment of block?.segments || []) {
      if (!segment || !segment.type) {
        continue;
      }

      if (segment.type === "text") {
        parts.push(escapeHtml(segment.text));
        continue;
      }

      if (segment.type === "inlineCode") {
        parts.push(`<code class="easier-gpt-print-inline-code">${escapeHtml(segment.text)}</code>`);
        continue;
      }

      if (segment.type === "math") {
        parts.push(
          `<span class="easier-gpt-print-math" data-easier-gpt-math="1" data-display-mode="0">${escapeHtml(segment.text)}</span>`
        );
        continue;
      }

      if (segment.type === "lineBreak") {
        parts.push("<br>");
      }
    }

    return `<p class="easier-gpt-print-paragraph">${parts.join("")}</p>`;
  }

  function renderStructuredBlock(block) {
    if (!block || !block.type) {
      return "";
    }

    if (block.type === "code") {
      const langAttr = block.lang ? ` data-lang="${escapeHtml(block.lang)}"` : "";
      return `<pre class="easier-gpt-print-code"><code${langAttr}>${escapeHtml(block.text)}</code></pre>`;
    }

    if (block.type === "math") {
      return `<div class="easier-gpt-print-math-block"><span class="easier-gpt-print-math" data-easier-gpt-math="1" data-display-mode="1">${escapeHtml(block.text)}</span></div>`;
    }

    if (block.type === "paragraph") {
      if (Array.isArray(block.segments) && block.segments.length > 0) {
        return renderStructuredParagraph(block);
      }
      return `<p class="easier-gpt-print-paragraph">${renderParagraphHtml(block.text || "")}</p>`;
    }

    return "";
  }

  function renderMessageHtml(text, structuredBlocks, printHtml) {
    if (typeof printHtml === "string" && printHtml.trim()) {
      return printHtml;
    }

    const blocks = Array.isArray(structuredBlocks) && structuredBlocks.length
      ? structuredBlocks
      : parseMessageBlocks(text);
    if (!blocks.length) {
      return '<p class="easier-gpt-print-empty">_(empty)_</p>';
    }

    return blocks.map((block) => renderStructuredBlock(block)).join("");
  }

  return {
    escapeHtml,
    parseMessageBlocks,
    renderMessageHtml
  };
});
