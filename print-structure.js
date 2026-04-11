(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.EasierGPTPrintStructure = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const ELEMENT_NODE = 1;
  const TEXT_NODE = 3;

  function extractPrintBlocks(root) {
    if (!root) {
      return [];
    }

    const contentRoots = findContentRoots(root);
    const sources = contentRoots.length ? contentRoots : [root];
    const blocks = [];

    for (const source of sources) {
      appendBlocksFromNode(source, blocks);
    }

    return blocks;
  }

  function findContentRoots(root) {
    const matches = [];
    collectDistinctMatches(root, (node) => hasClass(node, "markdown"), matches);
    return matches;
  }

  function collectDistinctMatches(node, matcher, matches) {
    if (!isElementNode(node)) {
      return;
    }

    if (matcher(node)) {
      matches.push(node);
      return;
    }

    for (const child of getChildNodes(node)) {
      collectDistinctMatches(child, matcher, matches);
    }
  }

  function appendBlocksFromNode(node, blocks) {
    if (!node) {
      return;
    }

    if (isDisplayMathElement(node)) {
      const latex = extractLatexSource(node);
      if (latex) {
        blocks.push({
          type: "math",
          displayMode: true,
          text: latex
        });
      }
      return;
    }

    if (isCodeBlockElement(node)) {
      const block = extractCodeBlock(node);
      if (block) {
        blocks.push(block);
      }
      return;
    }

    if (isParagraphElement(node)) {
      const block = extractParagraphBlock(node);
      if (block) {
        blocks.push(block);
      }
      return;
    }

    const inlineSegments = [];
    for (const child of getChildNodes(node)) {
      if (isDisplayMathElement(child) || isCodeBlockElement(child) || isParagraphElement(child) || isContainerBlockElement(child)) {
        flushInlineParagraph(blocks, inlineSegments);
        appendBlocksFromNode(child, blocks);
        continue;
      }

      appendInlineSegments(child, inlineSegments);
    }

    flushInlineParagraph(blocks, inlineSegments);
  }

  function extractParagraphBlock(node) {
    const segments = [];

    if (getTagName(node) === "LI") {
      appendTextSegment(segments, getListItemPrefix(node));
    }

    for (const child of getChildNodes(node)) {
      if (isDisplayMathElement(child)) {
        continue;
      }
      appendInlineSegments(child, segments);
    }

    const normalized = normalizeParagraphSegments(segments);
    if (!normalized.length) {
      return null;
    }

    return {
      type: "paragraph",
      segments: normalized
    };
  }

  function appendInlineSegments(node, segments) {
    if (!node) {
      return;
    }

    if (isTextNode(node)) {
      appendTextSegment(segments, getTextContent(node));
      return;
    }

    if (!isElementNode(node) || isIgnoredElement(node)) {
      return;
    }

    if (isInlineMathElement(node)) {
      const latex = extractLatexSource(node);
      if (latex) {
        segments.push({
          type: "math",
          displayMode: false,
          text: latex
        });
      }
      return;
    }

    const tag = getTagName(node);
    if (tag === "BR") {
      segments.push({ type: "lineBreak" });
      return;
    }

    if (tag === "CODE") {
      const code = normalizeInlineCode(getTextContent(node));
      if (code) {
        segments.push({
          type: "inlineCode",
          text: code
        });
      }
      return;
    }

    if (tag === "PRE") {
      return;
    }

    for (const child of getChildNodes(node)) {
      appendInlineSegments(child, segments);
    }
  }

  function flushInlineParagraph(blocks, inlineSegments) {
    const normalized = normalizeParagraphSegments(inlineSegments);
    inlineSegments.length = 0;

    if (!normalized.length) {
      return;
    }

    blocks.push({
      type: "paragraph",
      segments: normalized
    });
  }

  function extractCodeBlock(node) {
    const codeNode = findFirstDescendant(node, (child) => getTagName(child) === "CODE");
    const source = codeNode || node;
    const text = normalizeCodeText(getTextContent(source));

    if (!text) {
      return null;
    }

    return {
      type: "code",
      lang: extractCodeLanguage(source),
      text
    };
  }

  function findFirstDescendant(node, matcher) {
    for (const child of getChildNodes(node)) {
      if (matcher(child)) {
        return child;
      }

      const nested = findFirstDescendant(child, matcher);
      if (nested) {
        return nested;
      }
    }

    return null;
  }

  function extractCodeLanguage(node) {
    const className = getClassName(node);
    const match = className.match(/(?:^|\s)(?:language|lang)-([A-Za-z0-9_-]+)(?:\s|$)/);
    return match ? match[1] : "";
  }

  function extractLatexSource(node) {
    if (!node) {
      return "";
    }

    if (getTagName(node) === "ANNOTATION" && getAttribute(node, "encoding") === "application/x-tex") {
      return normalizeMathSource(getTextContent(node));
    }

    for (const child of getChildNodes(node)) {
      const latex = extractLatexSource(child);
      if (latex) {
        return latex;
      }
    }

    return "";
  }

  function normalizeParagraphSegments(segments) {
    const normalized = [];

    for (const segment of segments || []) {
      if (!segment || !segment.type) {
        continue;
      }

      if (segment.type === "text") {
        const text = normalizeInlineText(segment.text);
        if (!text) {
          continue;
        }

        const previous = normalized[normalized.length - 1];
        if (previous && previous.type === "text") {
          previous.text += text;
        } else {
          normalized.push({
            type: "text",
            text
          });
        }
        continue;
      }

      if (segment.type === "inlineCode") {
        const text = normalizeInlineCode(segment.text);
        if (!text) {
          continue;
        }
        normalized.push({
          type: "inlineCode",
          text
        });
        continue;
      }

      if (segment.type === "math") {
        const text = normalizeMathSource(segment.text);
        if (!text) {
          continue;
        }
        normalized.push({
          type: "math",
          displayMode: false,
          text
        });
        continue;
      }

      if (segment.type === "lineBreak") {
        if (normalized.length > 0 && normalized[normalized.length - 1].type !== "lineBreak") {
          normalized.push({ type: "lineBreak" });
        }
      }
    }

    trimParagraphEdges(normalized);
    return normalized;
  }

  function trimParagraphEdges(segments) {
    while (segments.length > 0 && segments[0].type === "lineBreak") {
      segments.shift();
    }
    while (segments.length > 0 && segments[segments.length - 1].type === "lineBreak") {
      segments.pop();
    }

    if (segments[0] && segments[0].type === "text") {
      segments[0].text = segments[0].text.replace(/^\s+/, "");
      if (!segments[0].text) {
        segments.shift();
      }
    }

    const last = segments[segments.length - 1];
    if (last && last.type === "text") {
      last.text = last.text.replace(/\s+$/, "");
      if (!last.text) {
        segments.pop();
      }
    }
  }

  function appendTextSegment(segments, text) {
    const value = normalizeInlineText(text);
    if (!value) {
      return;
    }

    const previous = segments[segments.length - 1];
    if (previous && previous.type === "text") {
      previous.text += value;
      return;
    }

    segments.push({
      type: "text",
      text: value
    });
  }

  function normalizeInlineText(text) {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ");
  }

  function normalizeInlineCode(text) {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\u00a0/g, " ")
      .trim();
  }

  function normalizeCodeText(text) {
    const value = String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\u00a0/g, " ")
      .replace(/\n+$/, "");

    return value.trim() ? value : "";
  }

  function normalizeMathSource(text) {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\u00a0/g, " ")
      .trim();
  }

  function getListItemPrefix(node) {
    const parent = node?.parentNode;
    if (!parent) {
      return "- ";
    }

    if (getTagName(parent) === "OL") {
      const items = getChildNodes(parent).filter((child) => getTagName(child) === "LI");
      const index = items.indexOf(node);
      return `${index + 1}. `;
    }

    return "- ";
  }

  function isContainerBlockElement(node) {
    return /^(DIV|SECTION|ARTICLE|MAIN|ASIDE|NAV|UL|OL|TABLE|TBODY|THEAD|TR)$/.test(getTagName(node));
  }

  function isParagraphElement(node) {
    return /^(P|LI|BLOCKQUOTE|H1|H2|H3|H4|H5|H6|TD|TH|SUMMARY|DETAILS)$/.test(getTagName(node));
  }

  function isCodeBlockElement(node) {
    return getTagName(node) === "PRE";
  }

  function isDisplayMathElement(node) {
    return isElementNode(node) && hasClass(node, "katex-display");
  }

  function isInlineMathElement(node) {
    return isElementNode(node) && hasClass(node, "katex") && !hasClass(node, "katex-display");
  }

  function isIgnoredElement(node) {
    if (!isElementNode(node)) {
      return false;
    }

    if (hasClass(node, "sr-only")) {
      return true;
    }

    return /^(BUTTON|SVG|PATH|USE|SCRIPT|STYLE|NOSCRIPT)$/.test(getTagName(node));
  }

  function isElementNode(node) {
    return !!node && (node.nodeType === ELEMENT_NODE || typeof node.tagName === "string");
  }

  function isTextNode(node) {
    return !!node && node.nodeType === TEXT_NODE;
  }

  function getChildNodes(node) {
    return Array.isArray(node?.childNodes) ? node.childNodes : [];
  }

  function getTextContent(node) {
    return typeof node?.textContent === "string" ? node.textContent : "";
  }

  function getTagName(node) {
    return typeof node?.tagName === "string" ? node.tagName.toUpperCase() : "";
  }

  function getAttribute(node, name) {
    if (!node || typeof name !== "string") {
      return null;
    }

    if (typeof node.getAttribute === "function") {
      return node.getAttribute(name);
    }

    return node.attributes && Object.prototype.hasOwnProperty.call(node.attributes, name)
      ? node.attributes[name]
      : null;
  }

  function getClassName(node) {
    if (!node) {
      return "";
    }

    if (typeof node.className === "string") {
      return node.className;
    }

    return String(getAttribute(node, "class") || "");
  }

  function hasClass(node, className) {
    const classes = getClassName(node)
      .split(/\s+/)
      .filter(Boolean);

    return classes.includes(className);
  }

  return {
    extractPrintBlocks
  };
});
