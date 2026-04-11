(() => {
  "use strict";

  const CONFIG = {
    messageSelector: "[data-message-author-role]",
    placeholderSelector: "[data-easier-gpt-placeholder='1']",
    userRole: "user",
    assistantRole: "assistant",
    turnsAroundViewport: 3,
    maxTurnsAroundViewportFastScroll: 12,
    jumpPreloadTurns: 24,
    maxLiveTurns: 8,
    maxLiveTurnsTyping: 4,
    minimapVisibleDots: 20,
    minimapThrottleMs: 140,
    typingMinimapThrottleMs: 260,
    fastScrollWindowMs: 220,
    collapseOpsPerFrame: 4,
    collapseOpsPerFrameTyping: 1,
    budgetCollapseOpsPerSync: 40,
    budgetCollapseOpsPerSyncTyping: 10,
    collapsePauseAfterScrollMs: 160,
    modelRebuildMinIntervalMs: 220,
    pinToBottomThresholdPx: 260,
    startupCollapseDelayMs: 1100,
    typingHotMs: 1300,
    composerExpandFactor: 5,
    composerExpandViewportCap: 0.8,
    composerExpandMinExtraPx: 120,
    inlineLatexDebounceMs: 90,
    inlineLatexStreamRenderMinIntervalMs: 240,
    inlineLatexInitialReadyDelayMs: 1200,
    inlineLatexPostLoadReadyDelayMs: 320,
    inlineLatexBootstrapScanMs: 700,
    inlineLatexBootstrapScanMaxRuns: 18,
    inlineLatexLiveAssistantScanLimit: 28,
    bootstrapModelRetryMs: 260,
    bootstrapModelMaxRetries: 70,
    composerInitDelayMs: 1200,
    searchDebounceMs: 220,
    searchMinChars: 2,
    statsUpdateThrottleMs: 400,
    maxSnippetLength: 120,
    minPlaceholderHeight: 24,
    sidebarOffsetGapPx: 18,
    sidebarFollowDurationMs: 360,
    sidebarResolveMinIntervalMs: 280,
    pdfExportStoragePrefix: "easier-gpt-pdf-export:",
    questionFavoritesStoragePrefix: "easier-gpt-question-favorites:",
    previewHideDelayMs: 2000,
    previewClickPinMs: 2200,
    questionDockSnippetLength: 52,
    questionDockAutoCollapseWidth: 980
  };

  const STATE = {
    mode: "dynamic", // dynamic | expanded
    nextMessageId: 1,
    rafSyncScheduled: false,
    observerMuted: false,
    modelDirty: true,
    nextModelBuildAt: 0,
    modelBuildTimer: 0,
    bootstrapSyncTimer: 0,
    bootstrapSyncAttempts: 0,
    typingSyncTimer: 0,
    lastUrl: location.href,
    lastScrollAt: 0,
    lastInputAt: 0,
    inputFocused: false,
    composing: false,
    allowCollapseAt: performance.now() + CONFIG.startupCollapseDelayMs,

    scrollRoot: null,
    messages: [],
    messageById: new Map(),
    turnToIds: new Map(),
    totalTurns: 0,
    currentAnchorTurn: 0,
    previousAnchorTurn: 0,
    lastMiniMapAnchorTurn: -1,
    lastMiniMapSignature: "",
    lastMiniMapRenderAt: 0,
    minimapDeferredTimer: 0,
    typingSyncDueAt: 0,
    composerInitStarted: false,
    conversationActive: false,
    composerSubmitListenerBound: false,
    inlineLatexObserver: null,
    inlineLatexPendingRoots: new Map(),
    inlineLatexFlushTimer: 0,
    inlineLatexSafetyTimer: 0,
    inlineLatexBootstrapTimer: 0,
    inlineLatexBootstrapRuns: 0,
    inlineLatexReadyAt: 0,
    inlineLatexSourceByHost: new WeakMap(),
    inlineLatexLastRenderAt: new WeakMap(),
    latexCopyDelegateBound: false,
    panelBound: false,
    statsEnabled: false,
    statsLastUpdateAt: 0,
    lastSyncDurationMs: 0,
    lastSyncAt: 0,
    minimapEl: null,
    minimapTrackEl: null,
    minimapPanelEl: null,
    minimapPreviewEl: null,
    minimapPreviewHideTimer: 0,
    minimapPinnedPreviewTurn: -1,
    minimapPinnedPreviewUntil: 0,
    questionDockEl: null,
    questionDockCollapsed: false,
    favoriteQuestionKeys: new Set(),
    favoriteConversationKey: "",
    favoriteQuestionsLoaded: false,
    favoriteQuestionsLoadPromise: null,
    statsBadgeEl: null,
    lastSidebarOffsetPx: -1,
    sidebarAnchorEl: null,
    lastSidebarResolveAt: 0,
    layoutFollowRaf: 0,
    layoutFollowUntil: 0,
    searchQuery: "",
    searchMatches: [],
    searchIndex: -1,
    searchTimer: 0,

    collapsedById: new Map(),
    heightById: new Map(),
    collapseTargetRange: null,
    collapseWorkerRunning: false,
    collapsePlan: null
  };

  function init() {
    cleanupLegacyUi();
    bindGlobalListeners();
    observeDomChanges();
    observeUrlChanges();
    if (isConversationPage()) {
      activateConversationFeatures();
    } else {
      deactivateConversationFeatures();
    }
    scheduleSync();
  }

  function cleanupLegacyUi() {
    document.querySelector("[data-easier-gpt-controls]")?.remove();
    document.querySelector("[data-easier-gpt-minimap]")?.remove();
    document.querySelector("[data-easier-gpt-preview]")?.remove();
    document.querySelector("[data-easier-gpt-panel]")?.remove();
    document.querySelector("[data-easier-gpt-question-dock]")?.remove();
    document.querySelector("[data-easier-gpt-pdf-float='1']")?.remove();
    document.querySelector("[data-easier-gpt-stats]")?.remove();
    document.querySelectorAll("[data-easier-gpt-question-favorite='1']").forEach((el) => el.remove());
    document.getElementById("easier-gpt-katex-js")?.remove();
    document.getElementById("easier-gpt-katex-css")?.remove();
    document.querySelectorAll("script[src*='cdn.jsdelivr.net/npm/katex'], link[href*='cdn.jsdelivr.net/npm/katex']")
      .forEach((el) => el.remove());
    document.querySelectorAll("[data-easier-gpt-latex-btn='1'], [data-easier-gpt-latex-inline-btn='1']").forEach((el) => el.remove());
    if (STATE.minimapDeferredTimer !== 0) {
      clearTimeout(STATE.minimapDeferredTimer);
      STATE.minimapDeferredTimer = 0;
    }
    if (STATE.layoutFollowRaf !== 0) {
      cancelAnimationFrame(STATE.layoutFollowRaf);
      STATE.layoutFollowRaf = 0;
    }
    STATE.layoutFollowUntil = 0;
    STATE.lastSidebarOffsetPx = -1;
    STATE.sidebarAnchorEl = null;
    STATE.lastSidebarResolveAt = 0;
    STATE.minimapEl = null;
    STATE.minimapTrackEl = null;
    STATE.minimapPanelEl = null;
    STATE.minimapPreviewEl = null;
    STATE.minimapPinnedPreviewTurn = -1;
    STATE.minimapPinnedPreviewUntil = 0;
    STATE.questionDockEl = null;
    if (STATE.minimapPreviewHideTimer !== 0) {
      clearTimeout(STATE.minimapPreviewHideTimer);
      STATE.minimapPreviewHideTimer = 0;
    }
    STATE.statsBadgeEl = null;
    if (STATE.typingSyncTimer !== 0) {
      clearTimeout(STATE.typingSyncTimer);
      STATE.typingSyncTimer = 0;
    }
    if (STATE.bootstrapSyncTimer !== 0) {
      clearTimeout(STATE.bootstrapSyncTimer);
      STATE.bootstrapSyncTimer = 0;
    }
    if (STATE.inlineLatexSafetyTimer !== 0) {
      clearInterval(STATE.inlineLatexSafetyTimer);
      STATE.inlineLatexSafetyTimer = 0;
    }
    if (STATE.inlineLatexBootstrapTimer !== 0) {
      clearInterval(STATE.inlineLatexBootstrapTimer);
      STATE.inlineLatexBootstrapTimer = 0;
    }
    if (STATE.inlineLatexFlushTimer !== 0) {
      clearTimeout(STATE.inlineLatexFlushTimer);
      STATE.inlineLatexFlushTimer = 0;
    }
    STATE.inlineLatexPendingRoots.clear();
    STATE.inlineLatexSourceByHost = new WeakMap();
    STATE.inlineLatexLastRenderAt = new WeakMap();
    STATE.inlineLatexBootstrapRuns = 0;
    STATE.bootstrapSyncAttempts = 0;
    STATE.searchQuery = "";
    STATE.searchMatches = [];
    STATE.searchIndex = -1;
    if (STATE.searchTimer !== 0) {
      clearTimeout(STATE.searchTimer);
      STATE.searchTimer = 0;
    }
    STATE.lastMiniMapSignature = "";
    STATE.lastMiniMapAnchorTurn = -1;
    STATE.lastMiniMapRenderAt = 0;
  }

  function bindGlobalListeners() {
    window.addEventListener("resize", () => {
      requestLayoutFollow();
      scheduleSync();
    }, { passive: true });

    document.addEventListener("transitionrun", handleLayoutTransitionEvent, { capture: true, passive: true });
    document.addEventListener("transitionend", handleLayoutTransitionEvent, { capture: true, passive: true });
    document.addEventListener(
      "click",
      (event) => {
        if (!(event.target instanceof Element)) {
          return;
        }

        const clickable = event.target.closest("button, [role='button'], a");
        if (!(clickable instanceof HTMLElement)) {
          return;
        }

        const rect = clickable.getBoundingClientRect();
        const sidebarProbeEdge = Math.max(220, STATE.lastSidebarOffsetPx + 120);
        if (rect.top <= 140 && rect.left <= sidebarProbeEdge) {
          requestLayoutFollow();
        }
      },
      { capture: true }
    );

    // Capture scroll from nested scroll containers as well.
    document.addEventListener(
      "scroll",
      () => {
        STATE.lastScrollAt = Date.now();
        if (isTypingHot()) {
          return;
        }
        scheduleSync();
      },
      { passive: true, capture: true }
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (!(event.target instanceof Element)) {
          return;
        }

        if (!isEditableTarget(event.target)) {
          return;
        }

        markTypingActivity();
      },
      { capture: true }
    );

    document.addEventListener(
      "input",
      (event) => {
        if (!(event.target instanceof Element)) {
          return;
        }

        if (!isEditableTarget(event.target)) {
          return;
        }

        markTypingActivity();
      },
      { capture: true }
    );

    document.addEventListener(
      "focusin",
      (event) => {
        if (!(event.target instanceof Element)) {
          return;
        }

        if (!isEditableTarget(event.target)) {
          return;
        }

        STATE.inputFocused = true;
      },
      { capture: true }
    );

    document.addEventListener(
      "focusout",
      (event) => {
        if (!(event.target instanceof Element)) {
          return;
        }

        if (!isEditableTarget(event.target)) {
          return;
        }

        STATE.inputFocused = false;
        STATE.composing = false;
      },
      { capture: true }
    );

    document.addEventListener(
      "compositionstart",
      (event) => {
        if (!(event.target instanceof Element)) {
          return;
        }

        if (!isEditableTarget(event.target)) {
          return;
        }

        STATE.composing = true;
        markTypingActivity();
      },
      { capture: true }
    );

    document.addEventListener(
      "compositionend",
      (event) => {
        if (!(event.target instanceof Element)) {
          return;
        }

        if (!isEditableTarget(event.target)) {
          return;
        }

        STATE.composing = false;
        markTypingActivity();
      },
      { capture: true }
    );

    // Alt+ArrowUp / Alt+ArrowDown: jump between turns without touching the mouse.
    // Skip when focus is inside an editable so we don't hijack text editing.
    document.addEventListener("keydown", (event) => {
      if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      jumpToTurn(STATE.currentAnchorTurn + delta);
    }, { capture: true });
  }

  function markTypingActivity() {
    STATE.lastInputAt = Date.now();

    // Keep only one pending sync and move it after the latest keystroke.
    if (STATE.modelDirty || STATE.typingSyncTimer !== 0) {
      scheduleSyncAfterTyping(true);
    }
  }

  function isEditableTarget(target) {
    if (!(target instanceof Element)) {
      return false;
    }

    if (target.closest("[data-easier-gpt-minimap]") || target.closest("[data-easier-gpt-preview]")) {
      return false;
    }

    if (target instanceof HTMLTextAreaElement) {
      return true;
    }

    if (target instanceof HTMLInputElement) {
      const type = (target.type || "").toLowerCase();
      return type === "text" || type === "search";
    }

    if (target instanceof HTMLElement && target.isContentEditable) {
      return true;
    }

    const editableAncestor = target.closest("[contenteditable='true'], textarea, input[type='text'], input[type='search']");
    return editableAncestor instanceof Element;
  }

  function isTypingHot() {
    if (STATE.composing) {
      return true;
    }

    if (!STATE.inputFocused) {
      return false;
    }

    return Date.now() - STATE.lastInputAt < CONFIG.typingHotMs;
  }

  function scheduleSyncAfterTyping(resetTimer = true) {
    const idleFor = Date.now() - STATE.lastInputAt;
    const wait = Math.max(120, CONFIG.typingHotMs - idleFor);
    const dueAt = performance.now() + wait;

    if (STATE.typingSyncTimer !== 0) {
      if (!resetTimer && dueAt >= STATE.typingSyncDueAt - 16) {
        return;
      }

      clearTimeout(STATE.typingSyncTimer);
    }

    STATE.typingSyncDueAt = dueAt;
    STATE.typingSyncTimer = window.setTimeout(() => {
      STATE.typingSyncTimer = 0;
      STATE.typingSyncDueAt = 0;
      scheduleSync();
    }, wait);
  }

  function observeDomChanges() {
    const observer = new MutationObserver((records) => {
      if (STATE.observerMuted) {
        return;
      }

      const typingHot = isTypingHot();
      if (typingHot) {
        // Input responsiveness first: defer all structure checks until typing cools down.
        STATE.modelDirty = true;
        scheduleSyncAfterTyping(false);
        return;
      }

      if (!hasStructuralMutation(records)) {
        return;
      }

      const now = performance.now();
      if (now < STATE.nextModelBuildAt) {
        if (STATE.modelBuildTimer !== 0) {
          return;
        }

        const wait = Math.max(16, Math.ceil(STATE.nextModelBuildAt - now));
        STATE.modelBuildTimer = window.setTimeout(() => {
          STATE.modelBuildTimer = 0;
          STATE.modelDirty = true;
          scheduleSync();
        }, wait);
        return;
      }

      STATE.modelDirty = true;
      scheduleSync();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function hasStructuralMutation(records) {
    for (const record of records) {
      if (!record || record.type !== "childList") {
        continue;
      }

      if (isThreadMutationRecord(record)) {
        return true;
      }
    }

    return false;
  }

  function isThreadMutationRecord(record) {
    if (record.addedNodes.length === 0 && record.removedNodes.length === 0) {
      return false;
    }

    const target = record.target;
    if (target instanceof Element && target.closest("[data-easier-gpt-item='1'], article[data-testid^='conversation-turn']")) {
      return true;
    }

    for (const node of record.addedNodes) {
      if (node instanceof Element && node.matches("article[data-testid^='conversation-turn']")) {
        return true;
      }
    }

    for (const node of record.removedNodes) {
      if (node instanceof Element && node.matches("article[data-testid^='conversation-turn']")) {
        return true;
      }
    }

    return false;
  }

  function observeUrlChanges() {
    setInterval(() => {
      if (location.href === STATE.lastUrl) {
        return;
      }

      STATE.lastUrl = location.href;
      STATE.mode = "dynamic";
      STATE.modelDirty = true;
      if (STATE.modelBuildTimer !== 0) {
        clearTimeout(STATE.modelBuildTimer);
        STATE.modelBuildTimer = 0;
      }
      if (STATE.typingSyncTimer !== 0) {
        clearTimeout(STATE.typingSyncTimer);
        STATE.typingSyncTimer = 0;
      }
      if (STATE.bootstrapSyncTimer !== 0) {
        clearTimeout(STATE.bootstrapSyncTimer);
        STATE.bootstrapSyncTimer = 0;
      }
      STATE.typingSyncDueAt = 0;
      STATE.nextModelBuildAt = 0;
      STATE.bootstrapSyncAttempts = 0;
      STATE.currentAnchorTurn = 0;
      STATE.previousAnchorTurn = 0;
      STATE.lastMiniMapAnchorTurn = -1;
      STATE.lastMiniMapSignature = "";
      STATE.lastMiniMapRenderAt = 0;
      if (STATE.minimapDeferredTimer !== 0) {
        clearTimeout(STATE.minimapDeferredTimer);
        STATE.minimapDeferredTimer = 0;
      }
      STATE.collapseTargetRange = null;
      STATE.collapsePlan = null;
      STATE.allowCollapseAt = performance.now() + CONFIG.startupCollapseDelayMs;
      STATE.lastInputAt = 0;
      STATE.inputFocused = false;
      STATE.composing = false;
      STATE.inlineLatexPendingRoots.clear();
      STATE.inlineLatexSourceByHost = new WeakMap();
      STATE.inlineLatexLastRenderAt = new WeakMap();
      STATE.inlineLatexBootstrapRuns = 0;
      STATE.inlineLatexReadyAt = performance.now() + CONFIG.inlineLatexPostLoadReadyDelayMs;
      STATE.favoriteQuestionKeys = new Set();
      STATE.favoriteConversationKey = "";
      STATE.favoriteQuestionsLoaded = false;
      STATE.favoriteQuestionsLoadPromise = null;
      if (STATE.inlineLatexFlushTimer !== 0) {
        clearTimeout(STATE.inlineLatexFlushTimer);
        STATE.inlineLatexFlushTimer = 0;
      }
      startInlineLatexBootstrapTimer();

      restoreAllCollapsedMessages();
      scheduleSync();
      if (isConversationPage()) {
        activateConversationFeatures();
      } else {
        deactivateConversationFeatures();
      }
    }, 900);
  }

  function scheduleSync() {
    if (STATE.rafSyncScheduled) {
      return;
    }

    STATE.rafSyncScheduled = true;
    requestAnimationFrame(() => {
      STATE.rafSyncScheduled = false;
      sync();
    });
  }

  function sync() {
    const syncStart = performance.now();

    try {
      if (!isConversationPage()) {
        if (STATE.conversationActive) {
          deactivateConversationFeatures();
        }
        return;
      }

      if (!STATE.conversationActive) {
        activateConversationFeatures();
      }

      ensureFavoriteQuestionsLoaded();
      updateSidebarOffset();
      ensureMiniMap();
      ensureQuestionDock();

      const typingHot = isTypingHot();
      const scrollingHot = Date.now() - STATE.lastScrollAt < CONFIG.fastScrollWindowMs;

      if (STATE.modelDirty) {
        if (typingHot && !scrollingHot) {
          scheduleSyncAfterTyping(false);
          return;
        }

        rebuildModel();
      }

      if (STATE.totalTurns <= 0 || STATE.messages.length === 0) {
        scheduleBootstrapSync();
        refreshAuxUi();
        return;
      }
      cancelBootstrapSync();

      if (STATE.mode === "expanded") {
        restoreAllCollapsedMessages();
        if (STATE.modelDirty) {
          rebuildModel();
        }

        STATE.collapseTargetRange = null;
        refreshAuxUi();
        queueInlineLatexForViewportTurns(2);
        return;
      }

      if (typingHot && !scrollingHot) {
        // Typing has highest priority for rendering, but still keep collapsing far turns in background.
        const anchorTurn = findAnchorTurn();
        STATE.previousAnchorTurn = STATE.currentAnchorTurn;
        STATE.currentAnchorTurn = anchorTurn;
        const minTurn = clamp(anchorTurn - 1, 0, STATE.totalTurns - 1);
        const maxTurn = clamp(anchorTurn + 1, 0, STATE.totalTurns - 1);
        enforceLiveTurnBudget(anchorTurn, true);
        requestBackgroundCollapse(minTurn, maxTurn);
        refreshAuxUi();
        queueInlineLatexForViewportTurns(2);
        scheduleSyncAfterTyping(false);
        return;
      }

      const anchorTurn = findAnchorTurn();
      const anchorDelta = Math.abs(anchorTurn - STATE.currentAnchorTurn);
      STATE.previousAnchorTurn = STATE.currentAnchorTurn;
      STATE.currentAnchorTurn = anchorTurn;

      const dynamicTurnsAround = getDynamicTurnsAroundViewport(anchorDelta);
      const effectiveTurnsAround = STATE.inputFocused
        ? Math.min(dynamicTurnsAround, 2)
        : dynamicTurnsAround;
      const minTurn = clamp(anchorTurn - effectiveTurnsAround, 0, STATE.totalTurns - 1);
      const maxTurn = clamp(anchorTurn + effectiveTurnsAround, 0, STATE.totalTurns - 1);

      // Critical path: restore around viewport immediately.
      restoreTurnsImmediately(minTurn, maxTurn);

      // Hard cap: never keep too many full turns in DOM.
      enforceLiveTurnBudget(anchorTurn, false);

      // Background path: collapse far turns lazily.
      requestBackgroundCollapse(minTurn, maxTurn);

      refreshAuxUi();
      queueInlineLatexForViewportTurns();
    } finally {
      finalizeSync(syncStart);
    }
  }

  function rebuildModel() {
    STATE.modelDirty = false;
    STATE.nextModelBuildAt = performance.now() + CONFIG.modelRebuildMinIntervalMs;

    STATE.messages = [];
    STATE.messageById.clear();
    STATE.turnToIds.clear();

    const nodes = document.querySelectorAll(
      `${CONFIG.messageSelector}, ${CONFIG.placeholderSelector}`
    );

    const seenRoots = new Set();
    let turn = -1;
    let sampleRoot = null;

    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) {
        continue;
      }

      const directPlaceholder = node.getAttribute("data-easier-gpt-placeholder") === "1";
      let root = node;
      let role = "";

      if (directPlaceholder) {
        role = normalizeRole(node.getAttribute("data-easier-gpt-role"));
      } else {
        role = normalizeRole(node.getAttribute("data-message-author-role"));
        if (role !== CONFIG.userRole && role !== CONFIG.assistantRole) {
          continue;
        }

        root = getMessageRoot(node);
        if (!(root instanceof HTMLElement)) {
          continue;
        }

        if (seenRoots.has(root)) {
          continue;
        }

        seenRoots.add(root);
      }

      const isPlaceholder = root.getAttribute("data-easier-gpt-placeholder") === "1";
      if (isPlaceholder) {
        role = normalizeRole(root.getAttribute("data-easier-gpt-role") || role);
      }

      if (role === CONFIG.userRole) {
        turn += 1;
      } else if (turn < 0) {
        turn = 0;
      }

      const id = ensureMessageId(root);

      root.setAttribute("data-easier-gpt-item", "1");
      root.setAttribute("data-easier-gpt-id", id);
      root.setAttribute("data-easier-gpt-turn", String(turn));
      root.setAttribute("data-easier-gpt-role", role);

      const item = {
        id,
        role,
        turnIndex: turn,
        el: root,
        isPlaceholder,
        snippet: root.getAttribute("data-easier-gpt-snippet") || ""
      };

      STATE.messages.push(item);
      STATE.messageById.set(id, item);

      const ids = STATE.turnToIds.get(turn) || [];
      ids.push(id);
      STATE.turnToIds.set(turn, ids);

      if (!sampleRoot) {
        sampleRoot = root;
      }
    }

    STATE.totalTurns = Math.max(0, turn + 1);
    resolveScrollRoot(sampleRoot);

    if (STATE.totalTurns === 0) {
      STATE.currentAnchorTurn = 0;
      return;
    }

    if (isPinnedToBottom()) {
      STATE.currentAnchorTurn = STATE.totalTurns - 1;
    } else {
      STATE.currentAnchorTurn = clamp(STATE.currentAnchorTurn, 0, STATE.totalTurns - 1);
    }

    cleanupCollapsedRecords();
    if (STATE.inlineLatexBootstrapRuns < CONFIG.inlineLatexBootstrapScanMaxRuns) {
      queueInlineLatexForViewportTurns(4, CONFIG.inlineLatexLiveAssistantScanLimit);
    }

    if (STATE.searchQuery) {
      refreshSearchMatches();
    }
  }

  function getMessageRoot(roleNode) {
    const article = roleNode.closest("article");
    if (article instanceof HTMLElement) {
      return article;
    }

    const turnContainer = roleNode.closest("[data-testid^='conversation-turn']");
    if (turnContainer instanceof HTMLElement) {
      return turnContainer;
    }

    const block = roleNode.closest(".group");
    if (block instanceof HTMLElement) {
      return block;
    }

    return roleNode;
  }

  function resolveScrollRoot(sampleNode) {
    if (sampleNode instanceof HTMLElement) {
      const scrollable = findScrollableAncestor(sampleNode);
      if (scrollable) {
        STATE.scrollRoot = scrollable;
        return;
      }
    }

    STATE.scrollRoot = document.scrollingElement || document.documentElement;
  }

  function findScrollableAncestor(startNode) {
    let cursor = startNode.parentElement;

    while (cursor && cursor !== document.body && cursor !== document.documentElement) {
      const style = window.getComputedStyle(cursor);
      const overflowY = style.overflowY;
      const canScroll =
        (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
        cursor.scrollHeight > cursor.clientHeight + 4;

      if (canScroll) {
        return cursor;
      }

      cursor = cursor.parentElement;
    }

    return null;
  }

  function requestBackgroundCollapse(minTurn, maxTurn) {
    const target = {
      min: minTurn,
      max: maxTurn,
      key: `${minTurn}:${maxTurn}`
    };

    if (STATE.collapseTargetRange && STATE.collapseTargetRange.key === target.key) {
      return;
    }

    STATE.collapseTargetRange = target;
    STATE.collapsePlan = null;

    if (!STATE.collapseWorkerRunning) {
      STATE.collapseWorkerRunning = true;
      requestAnimationFrame(collapseWorkerTick);
    }
  }

  function collapseWorkerTick() {
    if (STATE.mode !== "dynamic") {
      STATE.collapseWorkerRunning = false;
      return;
    }

    if (STATE.modelDirty) {
      STATE.collapseWorkerRunning = false;
      scheduleSync();
      return;
    }

    const target = STATE.collapseTargetRange;
    if (!target) {
      STATE.collapseWorkerRunning = false;
      return;
    }

    const nowPerf = performance.now();
    const nowTs = Date.now();

    if (nowPerf < STATE.allowCollapseAt || nowTs - STATE.lastScrollAt < CONFIG.collapsePauseAfterScrollMs) {
      requestAnimationFrame(collapseWorkerTick);
      return;
    }

    if (!STATE.collapsePlan || STATE.collapsePlan.key !== target.key) {
      const queue = [];
      for (const item of STATE.messages) {
        if (item.isPlaceholder) {
          continue;
        }

        if (item.turnIndex >= target.min && item.turnIndex <= target.max) {
          continue;
        }

        queue.push(item.id);
      }

      STATE.collapsePlan = { key: target.key, queue, index: 0 };
    }

    const plan = STATE.collapsePlan;
    if (!plan || plan.key !== target.key) {
      requestAnimationFrame(collapseWorkerTick);
      return;
    }

    const typingHot = isTypingHot();
    const opsLimit = typingHot ? CONFIG.collapseOpsPerFrameTyping : CONFIG.collapseOpsPerFrame;
    let ops = 0;
    muteObserver(true);

    while (ops < opsLimit && plan.index < plan.queue.length) {
      collapseMessage(plan.queue[plan.index], typingHot);
      plan.index += 1;
      ops += 1;
    }

    muteObserver(false);

    if (plan.index < plan.queue.length) {
      requestAnimationFrame(collapseWorkerTick);
      return;
    }

    STATE.collapsePlan = null;
    STATE.collapseWorkerRunning = false;
  }

  function restoreTurnsImmediately(minTurn, maxTurn) {
    if (STATE.collapsedById.size === 0) {
      return;
    }

    muteObserver(true);

    for (let turn = minTurn; turn <= maxTurn; turn += 1) {
      const ids = STATE.turnToIds.get(turn) || [];
      for (const id of ids) {
        restoreMessage(id);
      }
    }

    muteObserver(false);
  }

  function enforceLiveTurnBudget(anchorTurn, typingHot) {
    if (STATE.totalTurns <= 0) {
      return;
    }

    const budgetTurns = typingHot ? CONFIG.maxLiveTurnsTyping : CONFIG.maxLiveTurns;
    if (STATE.totalTurns <= budgetTurns) {
      return;
    }

    const maxOps = typingHot
      ? CONFIG.budgetCollapseOpsPerSyncTyping
      : CONFIG.budgetCollapseOpsPerSync;
    if (maxOps <= 0) {
      return;
    }

    const keepStart = clamp(
      anchorTurn - Math.floor((budgetTurns - 1) / 2),
      0,
      Math.max(STATE.totalTurns - budgetTurns, 0)
    );
    const keepEnd = clamp(keepStart + budgetTurns - 1, 0, STATE.totalTurns - 1);

    let ops = 0;
    muteObserver(true);

    for (const item of STATE.messages) {
      if (ops >= maxOps) {
        break;
      }

      if (item.isPlaceholder) {
        continue;
      }

      if (item.turnIndex >= keepStart && item.turnIndex <= keepEnd) {
        continue;
      }

      collapseMessage(item.id, true);
      ops += 1;
    }

    muteObserver(false);

    // Continue trimming on next frame when there is still excess full DOM.
    if (ops >= maxOps) {
      scheduleSync();
    }
  }

  function getDynamicTurnsAroundViewport(anchorDelta) {
    const base = CONFIG.turnsAroundViewport;
    const fastScroll = Date.now() - STATE.lastScrollAt < CONFIG.fastScrollWindowMs;
    if (!fastScroll) {
      return base;
    }

    if (anchorDelta <= 1) {
      return base + 4;
    }

    return clamp(
      base + 4 + anchorDelta * 2,
      base + 4,
      CONFIG.maxTurnsAroundViewportFastScroll
    );
  }

  function collapseMessage(id, lowCostMode = false) {
    const item = STATE.messageById.get(id);
    if (!item || item.isPlaceholder) {
      return;
    }

    const node = item.el;
    if (!node.isConnected || !node.parentNode) {
      STATE.modelDirty = true;
      return;
    }

    let height = STATE.heightById.get(id) || 0;
    if (height <= 0) {
      if (lowCostMode) {
        // Avoid layout reads while typing: estimate and remove heavy DOM first.
        height = item.role === CONFIG.userRole ? 84 : 180;
      } else {
        height = Math.max(node.offsetHeight, CONFIG.minPlaceholderHeight);
      }
      STATE.heightById.set(id, height);
    }

    const placeholder = document.createElement("div");
    placeholder.className = "easier-gpt-placeholder";
    placeholder.style.height = `${height}px`;

    placeholder.setAttribute("data-easier-gpt-placeholder", "1");
    placeholder.setAttribute("data-easier-gpt-item", "1");
    placeholder.setAttribute("data-easier-gpt-id", item.id);
    placeholder.setAttribute("data-easier-gpt-turn", String(item.turnIndex));
    placeholder.setAttribute("data-easier-gpt-role", item.role);

    if (item.snippet) {
      placeholder.setAttribute("data-easier-gpt-snippet", item.snippet);
    }

    node.parentNode.insertBefore(placeholder, node);
    node.parentNode.removeChild(node);
    node.setAttribute("data-easier-gpt-collapsed", "1");

    STATE.collapsedById.set(item.id, { node, placeholder });

    item.el = placeholder;
    item.isPlaceholder = true;
  }

  function restoreMessage(id) {
    const item = STATE.messageById.get(id);
    const record = STATE.collapsedById.get(id);

    if (!item || !record) {
      return;
    }

    if (record.placeholder.isConnected) {
      record.placeholder.replaceWith(record.node);
    }

    if (!STATE.heightById.has(id) && record.node.isConnected) {
      const measured = Math.max(record.node.offsetHeight, CONFIG.minPlaceholderHeight);
      STATE.heightById.set(id, measured);
    }

    record.node.removeAttribute("data-easier-gpt-collapsed");
    STATE.collapsedById.delete(id);

    item.el = record.node;
    item.isPlaceholder = false;

    // Restored turns are likely to become visible immediately while scrolling/jumping.
    // Queue inline math render for the restored subtree so old messages render too.
    queueInlineLatexRender(record.node);
  }

  function activateConversationFeatures() {
    if (STATE.conversationActive) {
      return;
    }
    if (!isConversationPage()) {
      return;
    }

    STATE.conversationActive = true;
    ensureKatexStyles();
    ensureMiniMap();
    ensureQuestionDock();
    ensureFavoriteQuestionsLoaded();
    initLatexCopyButtons();
    initInlineLatexRenderer();
    initComposerExpand();
    scheduleBootstrapSync();
    if (STATE.statsEnabled) {
      ensureStatsBadge();
    }
  }

  function deactivateConversationFeatures() {
    if (!STATE.conversationActive) {
      cleanupLegacyUi();
      return;
    }

    STATE.conversationActive = false;
    cleanupLegacyUi();
  }

  function isConversationPage() {
    return /^\/c\//.test(location.pathname);
  }

  function scheduleBootstrapSync() {
    if (!isConversationPage()) {
      return;
    }

    if (STATE.bootstrapSyncAttempts >= CONFIG.bootstrapModelMaxRetries) {
      return;
    }

    if (STATE.bootstrapSyncTimer !== 0) {
      return;
    }

    STATE.bootstrapSyncTimer = window.setTimeout(() => {
      STATE.bootstrapSyncTimer = 0;
      STATE.bootstrapSyncAttempts += 1;
      STATE.modelDirty = true;
      scheduleSync();
    }, CONFIG.bootstrapModelRetryMs);
  }

  function cancelBootstrapSync() {
    if (STATE.bootstrapSyncTimer !== 0) {
      clearTimeout(STATE.bootstrapSyncTimer);
      STATE.bootstrapSyncTimer = 0;
    }

    STATE.bootstrapSyncAttempts = 0;
  }

  function restoreAllCollapsedMessages() {
    if (STATE.collapsedById.size === 0) {
      return;
    }

    muteObserver(true);
    for (const id of Array.from(STATE.collapsedById.keys())) {
      restoreMessage(id);
    }
    muteObserver(false);

    STATE.modelDirty = true;
  }

  function cleanupCollapsedRecords() {
    for (const [id, record] of Array.from(STATE.collapsedById.entries())) {
      const item = STATE.messageById.get(id);
      if (!item || !item.isPlaceholder) {
        STATE.collapsedById.delete(id);
        continue;
      }

      if (item.el !== record.placeholder) {
        record.placeholder = item.el;
      }
    }
  }

  function findAnchorTurn() {
    if (STATE.totalTurns <= 0) {
      return 0;
    }

    if (isPinnedToBottom()) {
      return STATE.totalTurns - 1;
    }

    const viewport = getViewportRect();
    const centerX = Math.floor(viewport.left + viewport.width * 0.5);
    const ySamples = [0.5, 0.35, 0.65, 0.2, 0.8];
    for (const ratio of ySamples) {
      const y = Math.floor(viewport.top + viewport.height * ratio);
      const hitTurn = findTurnFromPoint(centerX, y);
      if (hitTurn >= 0) {
        return hitTurn;
      }
    }

    const scrollRange = Math.max(getScrollHeight() - getViewportHeight(), 1);
    const ratio = clamp(getScrollTop() / scrollRange, 0, 1);

    return clamp(Math.round(ratio * (STATE.totalTurns - 1)), 0, STATE.totalTurns - 1);
  }

  function findTurnFromPoint(x, y) {
    const hitNode = document.elementFromPoint(x, y);
    if (!(hitNode instanceof HTMLElement)) {
      return -1;
    }

    const itemNode = hitNode.closest("[data-easier-gpt-item='1']");
    if (!(itemNode instanceof HTMLElement)) {
      return -1;
    }

    const turn = Number.parseInt(itemNode.getAttribute("data-easier-gpt-turn") || "", 10);
    if (!Number.isFinite(turn)) {
      return -1;
    }

    return clamp(turn, 0, STATE.totalTurns - 1);
  }

  function getViewportRect() {
    const root = STATE.scrollRoot;

    if (root instanceof HTMLElement && root !== document.documentElement && root !== document.body) {
      const rect = root.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      };
    }

    return {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  function isPinnedToBottom() {
    const maxTop = Math.max(getScrollHeight() - getViewportHeight(), 0);
    if (maxTop <= 0) {
      return true;
    }

    return maxTop - getScrollTop() <= CONFIG.pinToBottomThresholdPx;
  }

  function getScrollTop() {
    const root = STATE.scrollRoot;
    if (root instanceof HTMLElement && root !== document.documentElement && root !== document.body) {
      return root.scrollTop;
    }

    return window.scrollY || document.documentElement.scrollTop || 0;
  }

  function getScrollHeight() {
    const root = STATE.scrollRoot;
    if (root instanceof HTMLElement && root !== document.documentElement && root !== document.body) {
      return root.scrollHeight;
    }

    return document.documentElement.scrollHeight;
  }

  function getViewportHeight() {
    const root = STATE.scrollRoot;
    if (root instanceof HTMLElement && root !== document.documentElement && root !== document.body) {
      return root.clientHeight;
    }

    return window.innerHeight;
  }

  function scrollToPosition(top) {
    const root = STATE.scrollRoot;
    if (root instanceof HTMLElement && root !== document.documentElement && root !== document.body) {
      root.scrollTo({ top, behavior: "auto" });
      return;
    }

    window.scrollTo({ top, behavior: "auto" });
  }

  function getElementTopInScrollContext(el) {
    const root = STATE.scrollRoot;

    if (root instanceof HTMLElement && root !== document.documentElement && root !== document.body) {
      const rootRect = root.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      return elRect.top - rootRect.top + root.scrollTop;
    }

    return el.getBoundingClientRect().top + window.scrollY;
  }

  function ensureMessageId(node) {
    const existing = node.getAttribute("data-easier-gpt-id");
    if (existing) {
      return existing;
    }

    const next = String(STATE.nextMessageId++);
    node.setAttribute("data-easier-gpt-id", next);
    return next;
  }

  function ensureMiniMap() {
    if (!isConversationPage()) {
      return;
    }

    if (getMinimapEl()) {
      return;
    }

    const minimap = document.createElement("div");
    minimap.id = "easier-gpt-minimap";
    minimap.setAttribute("data-easier-gpt-minimap", "1");

    const track = document.createElement("div");
    track.className = "easier-gpt-minimap-track";

    const actions = document.createElement("div");
    actions.className = "easier-gpt-minimap-actions";

    const exportBtn = document.createElement("button");
    exportBtn.type = "button";
    exportBtn.className = "easier-gpt-minimap-action";
    exportBtn.setAttribute("data-easier-gpt-export", "1");
    exportBtn.setAttribute("aria-label", "Export chat as JSON");
    exportBtn.textContent = "JSON";
    exportBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      exportChatAsJson();
    });
    actions.appendChild(exportBtn);

    const menuBtn = document.createElement("button");
    menuBtn.type = "button";
    menuBtn.className = "easier-gpt-minimap-action";
    menuBtn.setAttribute("data-easier-gpt-menu", "1");
    menuBtn.setAttribute("aria-label", "Open Easier-GPT menu");
    menuBtn.textContent = "⋯";
    menuBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleMinimapPanel();
    });
    actions.appendChild(menuBtn);

    ensureMinimapPanel();
    ensureFloatingPdfButton();

    const preview = document.createElement("div");
    preview.className = "easier-gpt-dot-preview";
    preview.setAttribute("data-easier-gpt-preview", "1");
    preview.addEventListener("mouseenter", () => {
      cancelDotPreviewHide();
    });
    preview.addEventListener("mouseleave", () => {
      scheduleDotPreviewHide();
    });

    track.addEventListener("click", (event) => {
      const directTarget = event.target;
      if (directTarget instanceof HTMLElement) {
        const dot = directTarget.closest("[data-turn-index]");
        if (dot instanceof HTMLElement) {
          const turn = Number.parseInt(dot.getAttribute("data-turn-index") || "", 10);
          if (Number.isFinite(turn)) {
            if (dot instanceof HTMLButtonElement && dot.classList.contains("easier-gpt-minimap-dot")) {
              showDotPreviewForTurn(turn, dot, { pin: true });
            }
            jumpToTurn(turn);
            return;
          }
        }
      }

      const total = STATE.totalTurns;
      if (total <= 0) {
        return;
      }

      const rect = track.getBoundingClientRect();
      const localY = clamp(event.clientY - rect.top, 0, rect.height);
      const ratio = rect.height > 0 ? localY / rect.height : 0;

      const start = Number.parseInt(track.getAttribute("data-window-start") || "0", 10);
      const visible = Number.parseInt(track.getAttribute("data-window-size") || "1", 10);

      const localIndex = Math.round(ratio * Math.max(visible - 1, 0));
      const turn = clamp(start + localIndex, 0, total - 1);

      jumpToTurn(turn);
    });

    track.addEventListener("mouseover", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const dot = target.closest(".easier-gpt-minimap-dot");
      if (!(dot instanceof HTMLButtonElement)) {
        return;
      }

      const turn = Number.parseInt(dot.getAttribute("data-turn-index") || "", 10);
      if (!Number.isFinite(turn)) {
        return;
      }

      if (!showDotPreviewForTurn(turn, dot)) {
        hideDotPreview();
        return;
      }
      dot.setAttribute("aria-label", `Turn ${turn + 1}`);
    });

    track.addEventListener("mousemove", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const dot = target.closest(".easier-gpt-minimap-dot");
      if (!(dot instanceof HTMLButtonElement)) {
        scheduleDotPreviewHide();
        return;
      }

      cancelDotPreviewHide();
      positionDotPreview(dot);
    });

    track.addEventListener("mouseleave", () => {
      scheduleDotPreviewHide();
    });

    track.addEventListener("mouseenter", () => {
      cancelDotPreviewHide();
    });

    minimap.appendChild(track);
    minimap.appendChild(actions);
    document.body.appendChild(minimap);
    document.body.appendChild(preview);
    STATE.minimapEl = minimap;
    STATE.minimapTrackEl = track;
    STATE.minimapPreviewEl = preview;
    updateSidebarOffset(true);
  }

  function updateMiniMap(force = false) {
    if (!isConversationPage()) {
      return;
    }

    const root = getMinimapEl();
    if (!(root instanceof HTMLElement)) return;

    const track = getMinimapTrackEl();
    if (!(track instanceof HTMLElement)) return;

    if (force && STATE.minimapDeferredTimer !== 0) {
      clearTimeout(STATE.minimapDeferredTimer);
      STATE.minimapDeferredTimer = 0;
    }

    const now = performance.now();
    const typingHot = isTypingHot();
    const scrollingHot = Date.now() - STATE.lastScrollAt < CONFIG.fastScrollWindowMs;
    const throttleMs = typingHot ? CONFIG.typingMinimapThrottleMs : CONFIG.minimapThrottleMs;
    if (!force && (scrollingHot || typingHot) && now - STATE.lastMiniMapRenderAt < throttleMs) {
      if (STATE.minimapDeferredTimer === 0) {
        const wait = Math.max(
          16,
          Math.ceil(throttleMs - (now - STATE.lastMiniMapRenderAt))
        );
        STATE.minimapDeferredTimer = window.setTimeout(() => {
          STATE.minimapDeferredTimer = 0;
          scheduleSync();
        }, wait);
      }
      return;
    }

    const total = STATE.totalTurns;
    if (total <= 0) {
      if (STATE.lastMiniMapSignature !== "empty") {
        track.replaceChildren();
        hideDotPreview();
        STATE.lastMiniMapSignature = "empty";
        STATE.lastMiniMapAnchorTurn = -1;
        STATE.lastMiniMapRenderAt = now;
      }
      return;
    }

    const visible = Math.min(CONFIG.minimapVisibleDots, total);
    const half = Math.floor(visible / 2);
    const maxStart = Math.max(0, total - visible);
    const start = clamp(STATE.currentAnchorTurn - half, 0, maxStart);
    const signature = `${total}|${visible}|${start}|${STATE.currentAnchorTurn}`;
    if (signature === STATE.lastMiniMapSignature) {
      return;
    }

    hideDotPreview();

    if (track.getAttribute("data-window-start") !== String(start)) {
      track.setAttribute("data-window-start", String(start));
    }
    if (track.getAttribute("data-window-size") !== String(visible)) {
      track.setAttribute("data-window-size", String(visible));
    }

    const dots = ensureMiniMapDotPool(track, visible);
    for (let index = 0; index < visible; index += 1) {
      const dot = dots[index];
      const turn = start + index;
      // 8%–92% keeps dots away from track edges for visual breathing room.
      const raw = visible === 1 ? 0.5 : index / (visible - 1);
      const slot = 0.08 + raw * 0.84;
      const topPct = `${slot * 100}%`;
      const isActive = turn === STATE.currentAnchorTurn;
      // A turn is collapsed when ALL its messages are placeholders.
      const isCollapsed = isTurnCollapsed(turn);

      if (dot.style.top !== topPct) {
        dot.style.top = topPct;
      }

      const turnAttr = String(turn);
      if (dot.getAttribute("data-turn-index") !== turnAttr) {
        dot.setAttribute("data-turn-index", turnAttr);
      }

      if (dot.hasAttribute("title")) {
        dot.removeAttribute("title");
      }

      const label = `Turn ${turn + 1}`;
      if (dot.getAttribute("aria-label") !== label) {
        dot.setAttribute("aria-label", label);
      }

      const wasActive = dot.classList.contains("is-active");
      dot.classList.toggle("is-active", isActive);
      dot.classList.toggle("is-collapsed", isCollapsed && !isActive);
      const allowPulse = Date.now() - STATE.lastScrollAt > CONFIG.fastScrollWindowMs;

      if (isActive && !wasActive && STATE.lastMiniMapAnchorTurn !== -1 && allowPulse) {
        dot.classList.remove("is-active-pulse");
        dot.offsetTop; // eslint-disable-line no-unused-expressions
        dot.classList.add("is-active-pulse");
      } else if (!isActive) {
        dot.classList.remove("is-active-pulse");
      }
    }

    restorePinnedDotPreview(dots, start, visible);

    STATE.lastMiniMapAnchorTurn = STATE.currentAnchorTurn;
    STATE.lastMiniMapSignature = signature;
    STATE.lastMiniMapRenderAt = now;
  }

  function refreshAuxUi(force = false) {
    updateMiniMap(force);
    updateQuestionDock();
    updateMessageFavoriteButtons();
  }

  function ensureMiniMapDotPool(track, visible) {
    const current = Array.from(track.querySelectorAll(".easier-gpt-minimap-dot"));
    if (current.length === visible) {
      return current;
    }

    track.replaceChildren();
    const dots = [];
    for (let i = 0; i < visible; i += 1) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "easier-gpt-minimap-dot is-entered";
      dot.setAttribute("data-turn-index", "0");
      track.appendChild(dot);
      dots.push(dot);
    }

    return dots;
  }

  function exportChatAsJson() {
    if (!isConversationPage()) {
      return;
    }

    if (STATE.modelDirty && !isTypingHot()) {
      rebuildModel();
    }

    const payload = buildExportPayload();
    if (!payload) {
      return;
    }

    const filename = buildExportFilename(payload);
    downloadJson(payload, filename);
  }

  function scheduleSearch(query) {
    const value = String(query || "").trim();
    STATE.searchQuery = value;

    if (STATE.searchTimer !== 0) {
      clearTimeout(STATE.searchTimer);
    }

    STATE.searchTimer = window.setTimeout(() => {
      STATE.searchTimer = 0;
      refreshSearchMatches();
    }, CONFIG.searchDebounceMs);
  }

  function refreshSearchMatches() {
    const needle = STATE.searchQuery;
    const meta = getSearchMetaEl();

    if (!needle || needle.length < CONFIG.searchMinChars) {
      STATE.searchMatches = [];
      STATE.searchIndex = -1;
      if (meta) {
        meta.textContent = "0/0";
      }
      return;
    }

    const matches = buildSearchMatches(needle);
    STATE.searchMatches = matches;

    if (matches.length === 0) {
      STATE.searchIndex = -1;
      if (meta) {
        meta.textContent = "0/0";
      }
      return;
    }

    const anchor = STATE.currentAnchorTurn || 0;
    const nextIdx = matches.findIndex((turn) => turn >= anchor);
    STATE.searchIndex = nextIdx >= 0 ? nextIdx : 0;

    updateSearchMeta();
  }

  function buildSearchMatches(query) {
    const needle = String(query || "").toLowerCase();
    const matches = [];

    for (let turn = 0; turn < STATE.totalTurns; turn += 1) {
      const ids = STATE.turnToIds.get(turn) || [];
      let combined = "";
      for (const id of ids) {
        const item = STATE.messageById.get(id);
        if (!item) continue;
        const text = getSearchTextForItem(item);
        if (text) {
          combined += ` ${text}`;
        }
      }
      if (combined && combined.toLowerCase().includes(needle)) {
        matches.push(turn);
      }
    }

    return matches;
  }

  function getSearchTextForItem(item) {
    const root = getExportRootForItem(item);
    if (root instanceof HTMLElement) {
      const text = normalizeSearchText(extractTextFromRoot(root));
      if (text) {
        return text;
      }
    }

    if (item?.snippet) {
      return normalizeSearchText(item.snippet);
    }

    return "";
  }

  function normalizeSearchText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function searchNext() {
    if (!STATE.searchMatches.length) {
      refreshSearchMatches();
    }
    if (!STATE.searchMatches.length) {
      return;
    }

    STATE.searchIndex = (STATE.searchIndex + 1) % STATE.searchMatches.length;
    jumpToTurn(STATE.searchMatches[STATE.searchIndex]);
    updateSearchMeta();
  }

  function searchPrev() {
    if (!STATE.searchMatches.length) {
      refreshSearchMatches();
    }
    if (!STATE.searchMatches.length) {
      return;
    }

    STATE.searchIndex = (STATE.searchIndex - 1 + STATE.searchMatches.length) % STATE.searchMatches.length;
    jumpToTurn(STATE.searchMatches[STATE.searchIndex]);
    updateSearchMeta();
  }

  function updateSearchMeta() {
    const meta = getSearchMetaEl();
    if (!meta) {
      return;
    }

    if (!STATE.searchMatches.length || STATE.searchIndex < 0) {
      meta.textContent = "0/0";
      return;
    }

    meta.textContent = `${STATE.searchIndex + 1}/${STATE.searchMatches.length}`;
  }

  function getSearchMetaEl() {
    const panel = document.querySelector("[data-easier-gpt-panel='1']");
    if (!(panel instanceof HTMLElement)) {
      return null;
    }
    const meta = panel.querySelector("[data-easier-gpt-search-meta='1']");
    return meta instanceof HTMLElement ? meta : null;
  }

  function exportChatAsMarkdown() {
    if (!isConversationPage()) {
      return;
    }

    if (STATE.modelDirty && !isTypingHot()) {
      rebuildModel();
    }

    const payload = buildExportPayload();
    if (!payload) {
      return;
    }

    const markdown = buildMarkdownFromPayload(payload);
    const filename = buildExportFilenameWithExt(payload, "md");
    downloadText(markdown, "text/markdown;charset=utf-8", filename);
  }

  function exportChatAsText() {
    if (!isConversationPage()) {
      return;
    }

    if (STATE.modelDirty && !isTypingHot()) {
      rebuildModel();
    }

    const payload = buildExportPayload();
    if (!payload) {
      return;
    }

    const text = buildPlainTextFromPayload(payload);
    const filename = buildExportFilenameWithExt(payload, "txt");
    downloadText(text, "text/plain;charset=utf-8", filename);
  }

  function exportChatAsCsv() {
    if (!isConversationPage()) {
      return;
    }

    if (STATE.modelDirty && !isTypingHot()) {
      rebuildModel();
    }

    const payload = buildExportPayload();
    if (!payload) {
      return;
    }

    const csv = buildCsvFromPayload(payload);
    const filename = buildExportFilenameWithExt(payload, "csv");
    downloadText(csv, "text/csv;charset=utf-8", filename);
  }

  function exportChatAsPdf() {
    if (!isConversationPage()) {
      return;
    }

    if (STATE.modelDirty && !isTypingHot()) {
      rebuildModel();
    }

    const payload = buildExportPayload();
    if (!payload) {
      return;
    }

    if (!chrome?.runtime?.getURL || !chrome?.storage?.local) {
      console.error("Easier-GPT PDF export requires chrome.runtime.getURL and chrome.storage.local");
      return;
    }

    const exportId = buildPdfExportId();
    const storageKey = buildPdfExportStorageKey(exportId);
    const exportEntry = {
      payload,
      filename: buildExportFilenameWithExt(payload, "pdf"),
      createdAt: Date.now()
    };

    chrome.storage.local.set({ [storageKey]: exportEntry }, () => {
      if (chrome.runtime?.lastError) {
        console.error("Easier-GPT PDF export storage failed:", chrome.runtime.lastError.message);
        return;
      }

      const printUrl = chrome.runtime.getURL(`print.html?exportId=${encodeURIComponent(exportId)}`);
      window.open(printUrl, "_blank", "noopener,noreferrer");
    });
  }

  function getConversationFavoriteStorageKey() {
    const conversationKey = `${location.pathname}${location.search || ""}`;
    return `${CONFIG.questionFavoritesStoragePrefix}${conversationKey}`;
  }

  function ensureFavoriteQuestionsLoaded() {
    if (!isConversationPage()) {
      return;
    }

    const storageKey = getConversationFavoriteStorageKey();
    if (STATE.favoriteConversationKey !== storageKey) {
      STATE.favoriteConversationKey = storageKey;
      STATE.favoriteQuestionKeys = new Set();
      STATE.favoriteQuestionsLoaded = false;
      STATE.favoriteQuestionsLoadPromise = null;
    }

    if (STATE.favoriteQuestionsLoaded || STATE.favoriteQuestionsLoadPromise) {
      return;
    }

    if (!chrome?.storage?.local) {
      STATE.favoriteQuestionsLoaded = true;
      return;
    }

    let requestPromise = null;
    requestPromise = new Promise((resolve) => {
      chrome.storage.local.get([storageKey], (result) => {
        if (STATE.favoriteConversationKey !== storageKey) {
          resolve();
          return;
        }

        if (chrome.runtime?.lastError) {
          console.error("Easier-GPT favorites load failed:", chrome.runtime.lastError.message);
        }

        const values = Array.isArray(result?.[storageKey]) ? result[storageKey] : [];
        STATE.favoriteQuestionKeys = new Set(
          values.filter((value) => typeof value === "string" && value)
        );
        STATE.favoriteQuestionsLoaded = true;
        if (STATE.favoriteQuestionsLoadPromise === requestPromise) {
          STATE.favoriteQuestionsLoadPromise = null;
        }
        scheduleSync();
        resolve();
      });
    });

    STATE.favoriteQuestionsLoadPromise = requestPromise;
  }

  function persistFavoriteQuestions() {
    if (!STATE.favoriteConversationKey || !chrome?.storage?.local) {
      return;
    }

    chrome.storage.local.set(
      { [STATE.favoriteConversationKey]: Array.from(STATE.favoriteQuestionKeys) },
      () => {
        if (chrome.runtime?.lastError) {
          console.error("Easier-GPT favorites save failed:", chrome.runtime.lastError.message);
        }
      }
    );
  }

  function buildFavoriteKeyForItem(item, textOverride = "") {
    if (!item || item.role !== CONFIG.userRole) {
      return "";
    }

    const favoriteApi = globalThis.EasierGPTQuestionFavorites;
    if (!favoriteApi || typeof favoriteApi.buildQuestionFavoriteKey !== "function") {
      return "";
    }

    const normalizeText =
      typeof favoriteApi.normalizeFavoriteQuestionText === "function"
        ? favoriteApi.normalizeFavoriteQuestionText
        : (value) => String(value || "").trim();

    const normalizedText = normalizeText(textOverride || getItemText(item));
    if (!normalizedText) {
      return "";
    }

    return favoriteApi.buildQuestionFavoriteKey(location.pathname, item.turnIndex, normalizedText);
  }

  function getFavoriteToggleIcon(isFavorited) {
    return isFavorited
      ? [
          '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
          '<path fill="currentColor" d="M12 2.6l2.78 5.64 6.22.9-4.5 4.39 1.06 6.2L12 16.8 6.44 19.73l1.06-6.2L3 9.14l6.22-.9L12 2.6Z" />',
          '</svg>'
        ].join("")
      : [
          '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
          '<path d="M12 2.6l2.78 5.64 6.22.9-4.5 4.39 1.06 6.2L12 16.8 6.44 19.73l1.06-6.2L3 9.14l6.22-.9L12 2.6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />',
          '</svg>'
        ].join("");
  }

  function updateFavoriteToggleButton(button, isFavorited, title, disabled = false) {
    button.classList.toggle("is-active", isFavorited);
    button.disabled = disabled;
    button.setAttribute("aria-pressed", isFavorited ? "true" : "false");
    button.setAttribute("aria-label", title);
    button.title = title;
    button.innerHTML = getFavoriteToggleIcon(isFavorited);
  }

  function buildFavoriteToggleButton(isFavorited, options = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `easier-gpt-question-favorite-toggle ${options.className || ""}`.trim();
    updateFavoriteToggleButton(button, isFavorited, options.title || "收藏问题", Boolean(options.disabled));
    if (typeof options.onClick === "function") {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        options.onClick(event);
      });
    }
    return button;
  }

  function toggleFavoriteQuestion(favoriteKey) {
    if (!favoriteKey || !STATE.favoriteQuestionsLoaded) {
      return;
    }

    if (STATE.favoriteQuestionKeys.has(favoriteKey)) {
      STATE.favoriteQuestionKeys.delete(favoriteKey);
    } else {
      STATE.favoriteQuestionKeys.add(favoriteKey);
    }

    persistFavoriteQuestions();
    refreshAuxUi(true);
  }

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

  function updateMessageFavoriteButtons() {
    for (const item of STATE.messages) {
      if (!item || item.role !== CONFIG.userRole || item.isPlaceholder) {
        continue;
      }

      const host = getFavoriteButtonHost(item);
      if (!(host instanceof HTMLElement)) {
        continue;
      }

      host.classList.add("easier-gpt-question-favorite-host");

      const favoriteKey = buildFavoriteKeyForItem(item);
      const isFavorited = favoriteKey ? STATE.favoriteQuestionKeys.has(favoriteKey) : false;
      let button = host.querySelector("[data-easier-gpt-question-favorite='1']");
      if (!(button instanceof HTMLButtonElement)) {
        button = buildFavoriteToggleButton(isFavorited, {
          className: "easier-gpt-question-favorite-message",
          title: "收藏问题",
          disabled: true
        });
        button.setAttribute("data-easier-gpt-question-favorite", "1");
        host.appendChild(button);
      }

      updateFavoriteToggleButton(
        button,
        isFavorited,
        isFavorited ? "取消收藏问题" : "收藏问题",
        !STATE.favoriteQuestionsLoaded || !favoriteKey
      );
      button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavoriteQuestion(favoriteKey);
      };
    }
  }

  function buildExportPayload() {
    const title = getConversationTitle();
    const exportedAt = new Date().toISOString();
    const url = location.href;

    if (!Array.isArray(STATE.messages) || STATE.messages.length === 0) {
      return {
        exporter: "Easier-GPT",
        format: "easier-gpt-chat-json",
        exportedAt,
        title,
        url,
        totalTurns: 0,
        totalMessages: 0,
        turns: []
      };
    }

    const ordered = STATE.messages
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        if (a.item.turnIndex !== b.item.turnIndex) {
          return a.item.turnIndex - b.item.turnIndex;
        }
        return a.index - b.index;
      });

    const turns = [];
    const turnMap = new Map();

    let sequence = 0;
    for (const entry of ordered) {
      const item = entry.item;
      if (!item) continue;
      const message = buildExportMessage(item, sequence);
      sequence += 1;

      let turn = turnMap.get(item.turnIndex);
      if (!turn) {
        turn = {
          turnIndex: item.turnIndex,
          messages: []
        };
        turnMap.set(item.turnIndex, turn);
        turns.push(turn);
      }
      turn.messages.push(message);
    }

    return {
      exporter: "Easier-GPT",
      format: "easier-gpt-chat-json",
      exportedAt,
      title,
      url,
      totalTurns: STATE.totalTurns,
      totalMessages: sequence,
      turns
    };
  }

  function buildExportMessage(item, sequence) {
    const root = getExportRootForItem(item);
    const meta = extractExportMeta(root, item);
    const textInfo = extractExportText(root, item);
    const printBlocks = extractExportPrintBlocks(root);
    const printHtml = extractExportPrintHtml(root);

    return {
      sequence,
      turnIndex: item.turnIndex,
      role: item.role,
      easierGptId: item.id,
      messageId: meta.messageId,
      turnId: meta.turnId,
      model: meta.model,
      text: textInfo.text,
      printBlocks,
      printHtml,
      isPlaceholder: !!item.isPlaceholder,
      isTruncated: textInfo.isTruncated,
      source: textInfo.source
    };
  }

  function getExportRootForItem(item) {
    if (!item) {
      return null;
    }

    if (item.isPlaceholder) {
      const record = STATE.collapsedById.get(item.id);
      if (record && record.node instanceof HTMLElement) {
        return record.node;
      }
    }

    if (item.el instanceof HTMLElement) {
      return findExpandedExportRoot(item.el);
    }

    return null;
  }

  function findExpandedExportRoot(root) {
    if (!(root instanceof HTMLElement)) {
      return root;
    }

    let best = root;
    let bestTextLength = normalizeExportText(extractTextFromRoot(root)).length;
    const baseRoleCount = root.querySelectorAll("[data-message-author-role]").length;

    let cursor = root.parentElement;
    while (cursor && cursor !== document.body && cursor !== document.documentElement) {
      const roleCount = cursor.querySelectorAll("[data-message-author-role]").length;
      if (roleCount !== baseRoleCount) {
        break;
      }

      const textLength = normalizeExportText(extractTextFromRoot(cursor)).length;
      if (textLength > bestTextLength + 24) {
        best = cursor;
        bestTextLength = textLength;
      }

      cursor = cursor.parentElement;
    }

    return best;
  }

  function extractExportMeta(root, item) {
    let messageId = "";
    let turnId = "";
    let model = "";

    if (root instanceof HTMLElement) {
      turnId = root.getAttribute("data-turn-id") || "";

      const msgNode = root.querySelector("[data-message-author-role]");
      if (msgNode instanceof HTMLElement) {
        messageId = msgNode.getAttribute("data-message-id") || "";
        model = msgNode.getAttribute("data-message-model-slug") || "";
      }
    }

    if (!turnId && item && item.el instanceof HTMLElement) {
      turnId = item.el.getAttribute("data-turn-id") || "";
    }

    return { messageId, turnId, model };
  }

  function extractExportText(root, item) {
    if (root instanceof HTMLElement) {
      const text = normalizeExportText(extractTextFromRoot(root));
      if (text) {
        return { text, isTruncated: false, source: "full" };
      }
    }

    const snippet = item?.snippet || "";
    if (snippet) {
      return { text: snippet, isTruncated: true, source: "snippet" };
    }

    return { text: "", isTruncated: false, source: "empty" };
  }

  function extractExportPrintBlocks(root) {
    const printApi = globalThis.EasierGPTPrintStructure;
    if (!printApi || typeof printApi.extractPrintBlocks !== "function") {
      return [];
    }

    try {
      const blocks = printApi.extractPrintBlocks(root);
      return Array.isArray(blocks) ? blocks : [];
    } catch {
      return [];
    }
  }

  function extractExportPrintHtml(root) {
    if (!(root instanceof HTMLElement)) {
      return "";
    }

    try {
      const markdownRegions = collectDistinctRegions(root, ".markdown");
      const sources = markdownRegions.length ? markdownRegions : [root];
      const parts = [];

      for (const source of sources) {
        const clone = source.cloneNode(true);
        if (!(clone instanceof HTMLElement)) {
          continue;
        }

        sanitizePrintHtmlClone(clone);
        const inner = clone.innerHTML.trim();
        if (!inner) {
          continue;
        }

        parts.push(`<div class="easier-gpt-print-rich-region">${inner}</div>`);
      }

      return parts.join("");
    } catch {
      return "";
    }
  }

  function sanitizePrintHtmlClone(root) {
    if (!(root instanceof HTMLElement)) {
      return;
    }

    removeCitationLikeNodes(root);

    const removableSelector = [
      ".sr-only",
      "button",
      "script",
      "style",
      "noscript",
      "textarea",
      "input",
      "select",
      "option"
    ].join(", ");

    if (root.matches(removableSelector)) {
      root.remove();
      return;
    }

    root.querySelectorAll(removableSelector).forEach((el) => el.remove());
    root.querySelectorAll("[data-easier-gpt-latex-copy]").forEach((el) => {
      el.removeAttribute("data-easier-gpt-latex-copy");
      el.removeAttribute("data-easier-gpt-copy-state");
    });
  }

  function extractTextFromRoot(root) {
    try {
      if (!(root instanceof HTMLElement)) {
        return root.textContent || "";
      }

      const regionText = extractTextFromContentRegions(root);
      if (regionText) {
        return regionText;
      }

      if (root.isConnected && typeof root.innerText === "string" && root.innerText.trim()) {
        return root.innerText;
      }

      const clone = root.cloneNode(true);
      if (!(clone instanceof HTMLElement)) {
        return root.textContent || "";
      }

      clone.querySelectorAll(
        ".sr-only, button, svg, path, use, script, style, noscript"
      ).forEach((el) => el.remove());

      return extractStructuredText(clone);
    } catch {
      return root instanceof HTMLElement
        ? (root.innerText || root.textContent || "")
        : (root.textContent || "");
    }
  }

  function extractTextFromContentRegions(root) {
    if (!(root instanceof HTMLElement)) {
      return "";
    }

    const blockText = extractTextFromSemanticBlocks(root);
    if (blockText) {
      return blockText;
    }

    const markdownRegions = collectDistinctRegions(root, ".markdown");
    const parts = [];
    for (const region of markdownRegions) {
      const text = extractTextFromSingleRegion(region);
      if (text) {
        parts.push(text);
      }
    }

    return parts.join("\n\n").trim();
  }

  function extractTextFromSemanticBlocks(root) {
    const selector = [
      "p",
      "li",
      "pre",
      "blockquote",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "td",
      "th",
      "details",
      "summary"
    ].join(", ");

    const blocks = collectDistinctRegions(root, selector);
    if (blocks.length === 0) {
      return "";
    }

    const parts = [];
    for (const block of blocks) {
      const text = extractTextFromSingleRegion(block);
      if (!text) {
        continue;
      }

      if (block.tagName === "LI") {
        parts.push(`${getListItemPrefix(block)}${text}`);
      } else {
        parts.push(text);
      }
    }

    return parts.join("\n\n").trim();
  }

  function collectDistinctRegions(root, selector) {
    const nodes = [];
    if (root.matches(selector)) {
      nodes.push(root);
    }

    root.querySelectorAll(selector).forEach((node) => {
      if (node instanceof HTMLElement) {
        nodes.push(node);
      }
    });

    return nodes.filter((node, index) => {
      return !nodes.some((other, otherIndex) => {
        return otherIndex !== index && other.contains(node);
      });
    });
  }

  function extractTextFromSingleRegion(region) {
    if (!(region instanceof HTMLElement)) {
      return "";
    }

    const clone = region.cloneNode(true);
    if (!(clone instanceof HTMLElement)) {
      return "";
    }

    removeCitationLikeNodes(clone);
    clone.querySelectorAll(
      ".sr-only, button, svg, path, use, script, style, noscript"
    ).forEach((el) => el.remove());

    if (typeof clone.innerText === "string" && clone.innerText.trim()) {
      return normalizeExportText(clone.innerText);
    }

    return normalizeExportText(extractStructuredText(clone));
  }

  function removeCitationLikeNodes(root) {
    if (!(root instanceof HTMLElement)) {
      return;
    }

    const nodes = Array.from(root.querySelectorAll("*"));
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) {
        continue;
      }

      if (!shouldRemoveCitationLikeNode(node)) {
        continue;
      }

      node.remove();
    }
  }

  function shouldRemoveCitationLikeNode(node) {
    if (!(node instanceof HTMLElement)) {
      return false;
    }

    if (node.closest("pre, code")) {
      return false;
    }

    const text = normalizeExportText(node.innerText || node.textContent || "");
    if (!text) {
      return false;
    }

    if (!isLeafLikeElement(node)) {
      return false;
    }

    const cleanupApi = globalThis.EasierGPTExportCleanup;
    if (!cleanupApi || typeof cleanupApi.isLikelyCitationChip !== "function") {
      return false;
    }

    return cleanupApi.isLikelyCitationChip({
      text,
      tagName: node.tagName,
      role: node.getAttribute("role") || "",
      hasHref: node.hasAttribute("href"),
      inCode: false
    });
  }

  function isLeafLikeElement(node) {
    if (!(node instanceof HTMLElement)) {
      return false;
    }

    return !Array.from(node.children).some((child) => {
      return child instanceof HTMLElement && normalizeExportText(child.innerText || child.textContent || "");
    });
  }

  function extractStructuredText(root) {
    const parts = [];
    serializeTextNode(root, parts, false);
    return parts.join("");
  }

  function serializeTextNode(node, parts, inPre) {
    if (!node) {
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      appendStructuredText(parts, node.textContent || "", inPre);
      return;
    }

    if (!(node instanceof HTMLElement)) {
      return;
    }

    const tag = node.tagName;
    if (tag === "BR") {
      appendLineBreak(parts, 1);
      return;
    }

    if (tag === "PRE") {
      appendBlockBoundary(parts);
      appendStructuredText(parts, node.textContent || "", true);
      appendBlockBoundary(parts);
      return;
    }

    const isBlock = isStructuredBlockElement(node);
    if (isBlock) {
      appendBlockBoundary(parts);
      if (tag === "LI") {
        appendStructuredText(parts, getListItemPrefix(node), false);
      }
    }

    for (const child of Array.from(node.childNodes)) {
      serializeTextNode(child, parts, inPre || tag === "CODE");
    }

    if (isBlock) {
      appendBlockBoundary(parts);
    }
  }

  function appendStructuredText(parts, text, preserveWhitespace) {
    const value = preserveWhitespace
      ? String(text || "").replace(/\r\n/g, "\n")
      : String(text || "").replace(/\s+/g, " ");

    if (!value) {
      return;
    }

    if (!preserveWhitespace && parts.length > 0) {
      const previous = parts[parts.length - 1];
      if (needsJoinSpace(previous, value)) {
        parts.push(" ");
      }
    }

    parts.push(value);
  }

  function needsJoinSpace(previous, next) {
    const left = String(previous || "");
    const right = String(next || "");
    if (!left || !right) {
      return false;
    }

    if (/\s$/.test(left) || /^\s/.test(right)) {
      return false;
    }

    if (/\n$/.test(left)) {
      return false;
    }

    return /[A-Za-z0-9)\]]$/.test(left) && /^[A-Za-z0-9([\-]/.test(right);
  }

  function appendLineBreak(parts, count) {
    const breaks = "\n".repeat(Math.max(1, count || 1));
    if (parts.length === 0) {
      parts.push(breaks);
      return;
    }

    const previous = parts[parts.length - 1];
    const trimmed = String(previous || "").replace(/\n+$/, "");
    parts[parts.length - 1] = trimmed;
    parts.push(breaks);
  }

  function appendBlockBoundary(parts) {
    if (parts.length === 0) {
      return;
    }

    const previous = parts[parts.length - 1];
    const normalized = String(previous || "").replace(/\s+$/, "");
    parts[parts.length - 1] = normalized;

    if (!normalized) {
      return;
    }

    if (/\n\n$/.test(normalized)) {
      return;
    }

    if (/\n$/.test(normalized)) {
      parts.push("\n");
      return;
    }

    parts.push("\n\n");
  }

  function isStructuredBlockElement(node) {
    return /^(P|LI|UL|OL|PRE|BLOCKQUOTE|H1|H2|H3|H4|H5|H6|TABLE|TR|DETAILS|SUMMARY)$/.test(node.tagName);
  }

  function getListItemPrefix(node) {
    if (!(node instanceof HTMLElement) || node.tagName !== "LI") {
      return "";
    }

    const parent = node.parentElement;
    if (parent instanceof HTMLOListElement) {
      const items = Array.from(parent.children).filter((child) => child.tagName === "LI");
      const index = items.indexOf(node);
      return `${index + 1}. `;
    }

    return "- ";
  }

  function normalizeExportText(text) {
    if (!text) {
      return "";
    }

    const normalized = String(text)
      .replace(/\r\n/g, "\n")
      .replace(/\u00a0/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return stripExportNoiseLines(normalized);
  }

  function stripExportNoiseLines(text) {
    const lines = String(text || "").split("\n");
    const filtered = lines.filter((line) => !isLikelyExportNoiseLine(line));
    return filtered
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function isLikelyExportNoiseLine(line) {
    const value = String(line || "").trim();
    if (!value) {
      return false;
    }

    if (/^(ASSISTANT|USER)$/i.test(value)) {
      return true;
    }

    if (/^GPT-[A-Za-z0-9.-]+(?:-THINKING)?$/i.test(value)) {
      return true;
    }

    if (/^\+\d+$/.test(value)) {
      return true;
    }

    if (/^OpenAI\s*开发者(?:\s*\+\d+)?$/i.test(value)) {
      return true;
    }

    if (/^OpenAI\s*Developers?(?:\s*\+\d+)?$/i.test(value)) {
      return true;
    }

    return false;
  }

  function getConversationTitle() {
    const title = document.title || "";
    if (title && title.toLowerCase() !== "chatgpt") {
      return title.trim();
    }

    const headerTitle = document.querySelector("h1, h2");
    if (headerTitle instanceof HTMLElement) {
      const text = headerTitle.textContent || "";
      if (text.trim()) {
        return text.trim();
      }
    }

    return "chatgpt";
  }

  function buildExportFilename(payload) {
    const stamp = formatDateForFilename(new Date());
    const title = sanitizeFilename(payload?.title || "chatgpt");
    return `easier-gpt-${stamp}-${title}.json`;
  }

  function buildExportFilenameWithExt(payload, ext) {
    const stamp = formatDateForFilename(new Date());
    const title = sanitizeFilename(payload?.title || "chatgpt");
    const safeExt = String(ext || "json").replace(/[^a-z0-9]/gi, "");
    return `easier-gpt-${stamp}-${title}.${safeExt || "json"}`;
  }

  function buildPdfExportId() {
    const stamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `${stamp}-${random}`;
  }

  function buildPdfExportStorageKey(exportId) {
    return `${CONFIG.pdfExportStoragePrefix}${exportId}`;
  }

  function formatDateForFilename(date) {
    const pad = (num) => String(num).padStart(2, "0");
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join("") + "-" + [
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds())
    ].join("");
  }

  function sanitizeFilename(text) {
    const value = String(text || "chatgpt").trim() || "chatgpt";
    return value.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80);
  }

  function downloadJson(payload, filename) {
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.position = "fixed";
    link.style.left = "-9999px";
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function downloadText(text, mimeType, filename) {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.position = "fixed";
    link.style.left = "-9999px";
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function toggleStats() {
    STATE.statsEnabled = !STATE.statsEnabled;
    updateStatsToggleLabel();

    if (STATE.statsEnabled) {
      ensureStatsBadge();
      updatePerfStats(true);
    } else {
      removeStatsBadge();
    }
  }

  function updateStatsToggleLabel() {
    const panel = getMinimapPanelEl();
    if (!(panel instanceof HTMLElement)) {
      return;
    }
    const toggle = panel.querySelector("[data-easier-gpt-stats-toggle='1']");
    if (toggle instanceof HTMLElement) {
      toggle.textContent = STATE.statsEnabled ? "Perf: On" : "Perf: Off";
    }
  }

  function ensureStatsBadge() {
    if (getStatsBadgeEl()) {
      return;
    }

    const badge = document.createElement("div");
    badge.className = "easier-gpt-stats";
    badge.setAttribute("data-easier-gpt-stats", "1");
    badge.textContent = "Stats: --";
    document.body.appendChild(badge);
    STATE.statsBadgeEl = badge;
  }

  function removeStatsBadge() {
    getStatsBadgeEl()?.remove();
    STATE.statsBadgeEl = null;
  }

  function updatePerfStats(force = false) {
    if (!STATE.statsEnabled) {
      return;
    }

    const now = performance.now();
    if (!force && now - STATE.statsLastUpdateAt < CONFIG.statsUpdateThrottleMs) {
      return;
    }
    STATE.statsLastUpdateAt = now;

    const badge = getStatsBadgeEl();
    if (!(badge instanceof HTMLElement)) {
      return;
    }

    const totalMessages = STATE.messages.length;
    let placeholders = 0;
    for (const item of STATE.messages) {
      if (item.isPlaceholder) {
        placeholders += 1;
      }
    }

    const full = Math.max(totalMessages - placeholders, 0);
    const syncMs = Math.round(STATE.lastSyncDurationMs || 0);
    badge.textContent = `Turns ${STATE.totalTurns} · Full ${full} · Collapsed ${placeholders} · Sync ${syncMs}ms`;
  }

  function finalizeSync(startTime) {
    STATE.lastSyncDurationMs = performance.now() - startTime;
    STATE.lastSyncAt = Date.now();
    updatePerfStats();
  }

  function ensureMinimapPanel() {
    if (getMinimapPanelEl()) {
      return;
    }

    const panel = document.createElement("div");
    panel.className = "easier-gpt-minimap-panel";
    panel.setAttribute("data-easier-gpt-panel", "1");
    panel.setAttribute("aria-hidden", "true");

    panel.appendChild(buildPanelSearchSection());
    panel.appendChild(buildPanelExportSection());
    panel.appendChild(buildPanelStatsSection());

    panel.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    document.body.appendChild(panel);
    STATE.minimapPanelEl = panel;
    updateStatsToggleLabel();

    if (!STATE.panelBound) {
      STATE.panelBound = true;
      document.addEventListener("click", (event) => {
        if (!(event.target instanceof Element)) {
          return;
        }

        if (event.target.closest("[data-easier-gpt-panel='1']")) {
          return;
        }

        if (event.target.closest("[data-easier-gpt-menu='1']")) {
          return;
        }

        closeMinimapPanel();
      }, { capture: true });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeMinimapPanel();
        }
      }, { capture: true });

      window.addEventListener("resize", () => {
        if (isMinimapPanelOpen()) {
          positionMinimapPanel();
        }
      }, { passive: true });
    }
  }

  function buildPanelSearchSection() {
    const section = document.createElement("div");
    section.className = "easier-gpt-panel-section";

    const title = document.createElement("div");
    title.className = "easier-gpt-panel-title";
    title.textContent = "Search";

    const row = document.createElement("div");
    row.className = "easier-gpt-panel-search";

    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = "Find in chat…";
    input.className = "easier-gpt-panel-input";
    input.setAttribute("data-easier-gpt-search-input", "1");
    input.addEventListener("input", () => {
      scheduleSearch(input.value);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (event.shiftKey) {
          searchPrev();
        } else {
          searchNext();
        }
      }
    });

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "easier-gpt-panel-btn";
    prevBtn.textContent = "↑";
    prevBtn.setAttribute("aria-label", "Previous match");
    prevBtn.addEventListener("click", () => searchPrev());

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "easier-gpt-panel-btn";
    nextBtn.textContent = "↓";
    nextBtn.setAttribute("aria-label", "Next match");
    nextBtn.addEventListener("click", () => searchNext());

    row.appendChild(input);
    row.appendChild(prevBtn);
    row.appendChild(nextBtn);

    const meta = document.createElement("div");
    meta.className = "easier-gpt-panel-meta";
    meta.setAttribute("data-easier-gpt-search-meta", "1");
    meta.textContent = "0/0";

    section.appendChild(title);
    section.appendChild(row);
    section.appendChild(meta);
    return section;
  }

  function buildPanelExportSection() {
    const section = document.createElement("div");
    section.className = "easier-gpt-panel-section";

    const title = document.createElement("div");
    title.className = "easier-gpt-panel-title";
    title.textContent = "Export";

    const row = document.createElement("div");
    row.className = "easier-gpt-panel-buttons";

    const jsonBtn = createPanelButton("JSON", "Export JSON", exportChatAsJson);
    const mdBtn = createPanelButton("MD", "Export Markdown", exportChatAsMarkdown);
    const txtBtn = createPanelButton("TXT", "Export Text", exportChatAsText);
    const csvBtn = createPanelButton("CSV", "Export CSV", exportChatAsCsv);
    const pdfBtn = createPanelButton("PDF", "Export PDF", exportChatAsPdf);

    row.appendChild(jsonBtn);
    row.appendChild(mdBtn);
    row.appendChild(txtBtn);
    row.appendChild(csvBtn);
    row.appendChild(pdfBtn);

    section.appendChild(title);
    section.appendChild(row);
    return section;
  }

  function buildPanelStatsSection() {
    const section = document.createElement("div");
    section.className = "easier-gpt-panel-section";

    const title = document.createElement("div");
    title.className = "easier-gpt-panel-title";
    title.textContent = "Performance";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "easier-gpt-panel-toggle";
    toggle.setAttribute("data-easier-gpt-stats-toggle", "1");
    toggle.textContent = "Perf: Off";
    toggle.addEventListener("click", () => toggleStats());

    section.appendChild(title);
    section.appendChild(toggle);
    return section;
  }

  function createPanelButton(label, ariaLabel, handler) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "easier-gpt-panel-btn";
    btn.textContent = label;
    btn.setAttribute("aria-label", ariaLabel);
    btn.addEventListener("click", () => handler());
    return btn;
  }

  function toggleMinimapPanel() {
    if (isMinimapPanelOpen()) {
      closeMinimapPanel();
      return;
    }
    openMinimapPanel();
  }

  function openMinimapPanel() {
    const panel = getMinimapPanelEl();
    if (!(panel instanceof HTMLElement)) {
      return;
    }
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    positionMinimapPanel();

    const input = panel.querySelector("[data-easier-gpt-search-input='1']");
    if (input instanceof HTMLInputElement) {
      input.focus();
      input.select();
    }
  }

  function closeMinimapPanel() {
    const panel = getMinimapPanelEl();
    if (!(panel instanceof HTMLElement)) {
      return;
    }
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
  }

  function isMinimapPanelOpen() {
    const panel = getMinimapPanelEl();
    return !!(panel instanceof HTMLElement && panel.classList.contains("is-open"));
  }

  function positionMinimapPanel() {
    const panel = getMinimapPanelEl();
    const anchor = getMinimapEl();
    if (!(panel instanceof HTMLElement) || !(anchor instanceof HTMLElement)) {
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const left = rect.right + 10;
    const top = Math.min(
      Math.max(12, rect.bottom - panel.offsetHeight - 8),
      window.innerHeight - panel.offsetHeight - 12
    );

    panel.style.left = `${Math.max(12, left)}px`;
    panel.style.top = `${top}px`;
  }

  function handleLayoutTransitionEvent(event) {
    if (!isConversationPage()) {
      return;
    }

    if (!(event.target instanceof HTMLElement)) {
      return;
    }

    if (event.target.closest("[data-easier-gpt-minimap], [data-easier-gpt-panel], [data-easier-gpt-preview]")) {
      return;
    }

    const propertyName = String(event.propertyName || "");
    if (propertyName && !/(width|left|right|transform|margin|padding|flex|grid)/i.test(propertyName)) {
      return;
    }

    const rect = event.target.getBoundingClientRect();
    if (rect.right <= 0 || rect.left > Math.max(24, window.innerWidth * 0.4)) {
      return;
    }

    requestLayoutFollow();
  }

  function requestLayoutFollow(durationMs = CONFIG.sidebarFollowDurationMs) {
    if (!isConversationPage()) {
      return;
    }

    STATE.layoutFollowUntil = Math.max(
      STATE.layoutFollowUntil,
      performance.now() + durationMs
    );

    if (STATE.layoutFollowRaf !== 0) {
      return;
    }

    const tick = () => {
      STATE.layoutFollowRaf = 0;
      updateSidebarOffset(false);
      if (performance.now() < STATE.layoutFollowUntil) {
        STATE.layoutFollowRaf = requestAnimationFrame(tick);
      } else {
        STATE.layoutFollowUntil = 0;
      }
    };

    STATE.layoutFollowRaf = requestAnimationFrame(tick);
  }

  function updateSidebarOffset(force = false) {
    const nextOffsetPx = measureSidebarOffsetPx(force);
    if (!force && nextOffsetPx === STATE.lastSidebarOffsetPx) {
      if (isMinimapPanelOpen()) {
        positionMinimapPanel();
      }
      positionFloatingPdfButton();
      return;
    }

    STATE.lastSidebarOffsetPx = nextOffsetPx;
    document.documentElement.style.setProperty("--easier-gpt-sidebar-width", `${nextOffsetPx}px`);

    if (isMinimapPanelOpen()) {
      positionMinimapPanel();
    }
    positionFloatingPdfButton();
  }

  function measureSidebarOffsetPx(forceResolve = false) {
    const mainLeft = getMainContentLeftPx();
    if (mainLeft > 0) {
      return Math.round(mainLeft + CONFIG.sidebarOffsetGapPx);
    }

    const maxCandidateRight = Math.max(
      180,
      Math.min(window.innerWidth * 0.48, 720)
    );
    const cachedRight = getSidebarRightFromElement(STATE.sidebarAnchorEl, maxCandidateRight);
    if (cachedRight > 0 && !forceResolve) {
      return Math.round(cachedRight + CONFIG.sidebarOffsetGapPx);
    }

    const anchor = resolveSidebarAnchor(maxCandidateRight, forceResolve);
    const anchorRight = getSidebarRightFromElement(anchor, maxCandidateRight);
    if (anchorRight > 0) {
      return Math.round(anchorRight + CONFIG.sidebarOffsetGapPx);
    }

    if (cachedRight > 0) {
      return Math.round(cachedRight + CONFIG.sidebarOffsetGapPx);
    }

    if (STATE.lastSidebarOffsetPx > 0) {
      return STATE.lastSidebarOffsetPx;
    }

    if (!anchorRight) {
      return window.innerWidth < 900 ? 96 : 268;
    }
    return Math.round(anchorRight + CONFIG.sidebarOffsetGapPx);
  }

  function getMainContentLeftPx() {
    const main = document.querySelector("main");
    if (!(main instanceof HTMLElement)) {
      return 0;
    }

    const rect = main.getBoundingClientRect();
    if (
      rect.width < 240 ||
      rect.height < 160 ||
      rect.left < 32 ||
      rect.left > window.innerWidth * 0.55
    ) {
      return 0;
    }

    const style = window.getComputedStyle(main);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number.parseFloat(style.opacity || "1") === 0
    ) {
      return 0;
    }

    return Math.round(rect.left);
  }

  function buildSidebarSamplePoints() {
    const height = window.innerHeight;
    const topInset = 72;
    const bottomInset = 72;
    return [
      clamp(topInset, 8, Math.max(8, height - 8)),
      clamp(Math.round(height * 0.28), 8, Math.max(8, height - 8)),
      clamp(Math.round(height * 0.5), 8, Math.max(8, height - 8)),
      clamp(Math.round(height * 0.72), 8, Math.max(8, height - 8)),
      clamp(height - bottomInset, 8, Math.max(8, height - 8))
    ];
  }

  function measureSidebarCandidateTree(startEl, maxCandidateRight) {
    let bestEl = null;
    let bestRight = 0;
    let node = startEl;

    while (node instanceof HTMLElement) {
      if (isSidebarCandidate(node, maxCandidateRight)) {
        const right = Math.round(node.getBoundingClientRect().right);
        if (right > bestRight) {
          bestRight = right;
          bestEl = node;
        }
      }
      node = node.parentElement;
    }

    return bestEl;
  }

  function resolveSidebarAnchor(maxCandidateRight, forceResolve = false) {
    const cached = STATE.sidebarAnchorEl;
    if (getSidebarRightFromElement(cached, maxCandidateRight) > 0) {
      return cached;
    }

    const now = performance.now();
    if (!forceResolve && now - STATE.lastSidebarResolveAt < CONFIG.sidebarResolveMinIntervalMs) {
      return cached;
    }

    STATE.lastSidebarResolveAt = now;

    const samplePoints = buildSidebarSamplePoints();
    let bestEl = null;
    let bestRight = 0;
    for (const y of samplePoints) {
      const stack = document.elementsFromPoint(12, y);
      for (const el of stack) {
        const candidate = measureSidebarCandidateTree(el, maxCandidateRight);
        const right = getSidebarRightFromElement(candidate, maxCandidateRight);
        if (right > bestRight) {
          bestRight = right;
          bestEl = candidate;
        }
      }
    }

    const queried = querySidebarCandidateElement(maxCandidateRight);
    const queriedRight = getSidebarRightFromElement(queried, maxCandidateRight);
    if (queriedRight > bestRight) {
      bestEl = queried;
      bestRight = queriedRight;
    }

    STATE.sidebarAnchorEl = bestEl;
    return bestEl;
  }

  function querySidebarCandidateElement(maxCandidateRight) {
    let bestEl = null;
    let bestRight = 0;
    const selectors = [
      "aside",
      "nav",
      "[role='navigation']",
      "[data-testid*='sidebar']",
      "[data-sidebar]",
      "[class*='sidebar']",
      "[class*='Sidebar']"
    ];

    for (const el of document.querySelectorAll(selectors.join(","))) {
      if (!(el instanceof HTMLElement)) {
        continue;
      }
      const right = getSidebarRightFromElement(el, maxCandidateRight);
      if (right > bestRight) {
        bestRight = right;
        bestEl = el;
      }
    }

    return bestEl;
  }

  function getSidebarRightFromElement(el, maxCandidateRight) {
    if (!isSidebarCandidate(el, maxCandidateRight)) {
      return 0;
    }

    return Math.round(el.getBoundingClientRect().right);
  }

  function isSidebarCandidate(el, maxCandidateRight) {
    if (!(el instanceof HTMLElement)) {
      return false;
    }

    if (
      el === document.body ||
      el === document.documentElement ||
      el.matches("[data-easier-gpt-minimap], [data-easier-gpt-panel], [data-easier-gpt-preview], [data-easier-gpt-stats]") ||
      el.closest("[data-easier-gpt-minimap], [data-easier-gpt-panel], [data-easier-gpt-preview], [data-easier-gpt-stats]")
    ) {
      return false;
    }

    const rect = el.getBoundingClientRect();
    if (
      rect.width < 44 ||
      rect.height < 120 ||
      rect.left > 24 ||
      rect.right < 44 ||
      rect.right > maxCandidateRight
    ) {
      return false;
    }

    const style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number.parseFloat(style.opacity || "1") === 0
    ) {
      return false;
    }

    return true;
  }

  function buildMarkdownFromPayload(payload) {
    const title = payload?.title ? `# ${payload.title}\n\n` : "";
    const meta = payload
      ? `> Exported: ${payload.exportedAt}\n> URL: ${payload.url}\n\n`
      : "";

    const parts = [title, meta];
    for (const turn of payload.turns || []) {
      const messages = turn.messages || [];
      for (const msg of messages) {
        const role = msg.role === CONFIG.userRole ? "You" : "Assistant";
        const header = `## ${role}\n\n`;
        const body = msg.text ? `${msg.text}\n\n` : "_(empty)_\n\n";
        parts.push(header, body);
      }
    }
    return parts.join("");
  }

  function buildPlainTextFromPayload(payload) {
    const lines = [];
    if (payload?.title) {
      lines.push(payload.title);
      lines.push("".padEnd(payload.title.length, "="));
    }
    if (payload?.exportedAt) {
      lines.push(`Exported: ${payload.exportedAt}`);
    }
    if (payload?.url) {
      lines.push(`URL: ${payload.url}`);
    }
    lines.push("");

    for (const turn of payload.turns || []) {
      const messages = turn.messages || [];
      for (const msg of messages) {
        const role = msg.role === CONFIG.userRole ? "You" : "Assistant";
        lines.push(`[${role}]`);
        lines.push(msg.text || "");
        lines.push("");
      }
    }
    return lines.join("\n");
  }

  function buildCsvFromPayload(payload) {
    const rows = [
      ["sequence", "turnIndex", "role", "text", "messageId", "turnId", "model"].join(",")
    ];

    for (const turn of payload.turns || []) {
      const messages = turn.messages || [];
      for (const msg of messages) {
        const row = [
          msg.sequence,
          msg.turnIndex,
          escapeCsv(msg.role),
          escapeCsv(msg.text || ""),
          escapeCsv(msg.messageId || ""),
          escapeCsv(msg.turnId || ""),
          escapeCsv(msg.model || "")
        ];
        rows.push(row.join(","));
      }
    }

    return rows.join("\n");
  }

  function escapeCsv(value) {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, "\"\"")}"`;
    }
    return text;
  }

  function jumpToTurn(turnIndex) {
    if (STATE.totalTurns <= 0) {
      return;
    }

    const turn = clamp(turnIndex, 0, STATE.totalTurns - 1);
    STATE.currentAnchorTurn = turn;
    STATE.previousAnchorTurn = turn;

    const minTurn = clamp(turn - CONFIG.jumpPreloadTurns, 0, STATE.totalTurns - 1);
    const maxTurn = clamp(turn + CONFIG.jumpPreloadTurns, 0, STATE.totalTurns - 1);

    restoreTurnsImmediately(minTurn, maxTurn);
    requestBackgroundCollapse(minTurn, maxTurn);
    refreshAuxUi(true);
    STATE.allowCollapseAt = performance.now() + 320;
    STATE.lastScrollAt = Date.now();

    const target = getTurnElement(turn);
    if (target instanceof HTMLElement) {
      const top = getElementTopInScrollContext(target) - getViewportHeight() * 0.35;
      scrollToPosition(Math.max(0, top));
    } else {
      const scrollRange = Math.max(getScrollHeight() - getViewportHeight(), 0);
      const ratio = STATE.totalTurns > 1 ? turn / (STATE.totalTurns - 1) : 0;
      scrollToPosition(Math.round(scrollRange * ratio));
    }

    scheduleSync();
    window.setTimeout(scheduleSync, 40);
    window.setTimeout(scheduleSync, 120);
  }

  function ensureQuestionDock() {
    if (!isConversationPage()) {
      return;
    }

    if (getQuestionDockEl()) {
      return;
    }

    const dock = document.createElement("aside");
    dock.className = "easier-gpt-question-dock";
    dock.setAttribute("data-easier-gpt-question-dock", "1");

    const header = document.createElement("div");
    header.className = "easier-gpt-question-dock-header";

    const title = document.createElement("div");
    title.className = "easier-gpt-question-dock-title";
    title.textContent = "问题栏";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "easier-gpt-question-dock-toggle";
    toggle.setAttribute("data-easier-gpt-question-toggle", "1");
    toggle.addEventListener("click", () => {
      STATE.questionDockCollapsed = !STATE.questionDockCollapsed;
      updateQuestionDock();
    });

    header.appendChild(title);
    header.appendChild(toggle);

    const list = document.createElement("div");
    list.className = "easier-gpt-question-dock-list";
    list.setAttribute("data-easier-gpt-question-list", "1");

    dock.appendChild(header);
    dock.appendChild(list);
    document.body.appendChild(dock);
    STATE.questionDockEl = dock;
  }

  function updateQuestionDock() {
    const dock = getQuestionDockEl();
    if (!(dock instanceof HTMLElement)) {
      return;
    }

    const questionApi = globalThis.EasierGPTQuestionDock;
    if (!questionApi || typeof questionApi.buildQuestionItems !== "function") {
      return;
    }

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

    const forceCollapsed = window.innerWidth <= CONFIG.questionDockAutoCollapseWidth;
    const isCollapsed = forceCollapsed || STATE.questionDockCollapsed;

    dock.classList.toggle("is-collapsed", isCollapsed);
    dock.classList.toggle("is-empty", items.length === 0);

    const title = dock.querySelector(".easier-gpt-question-dock-title");
    if (title instanceof HTMLElement) {
      title.textContent = items.length > 0 ? `问题栏 (${items.length})` : "问题栏";
    }

    const toggle = dock.querySelector("[data-easier-gpt-question-toggle='1']");
    if (toggle instanceof HTMLButtonElement) {
      toggle.innerHTML = getQuestionDockToggleIcon(isCollapsed);
      toggle.setAttribute("aria-label", isCollapsed ? "展开问题栏" : "折叠问题栏");
      toggle.title = isCollapsed ? "展开问题栏" : "折叠问题栏";
    }

    const list = dock.querySelector("[data-easier-gpt-question-list='1']");
    if (!(list instanceof HTMLElement)) {
      return;
    }

    if (items.length === 0) {
      list.replaceChildren(buildQuestionDockEmptyState());
      return;
    }

    const activeTurn = findActiveQuestionTurn(items);
    list.replaceChildren(...items.map((item) => buildQuestionDockItem(item, activeTurn)));
  }

  function buildQuestionDockItem(item, activeTurn) {
    const row = document.createElement("div");
    row.className = "easier-gpt-question-dock-item";
    row.setAttribute("data-turn-index", String(item.turnIndex));
    row.classList.toggle("is-active", item.turnIndex === activeTurn);
    row.addEventListener("click", () => {
      jumpToTurn(item.turnIndex);
    });

    const meta = document.createElement("div");
    meta.className = "easier-gpt-question-dock-item-meta";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "easier-gpt-question-dock-main";
    button.setAttribute("title", item.fullText);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      jumpToTurn(item.turnIndex);
    });

    const label = document.createElement("span");
    label.className = "easier-gpt-question-dock-item-label";
    label.textContent = item.label;

    const favoriteButton = buildFavoriteToggleButton(item.isFavorited, {
      className: "easier-gpt-question-dock-favorite",
      title: item.isFavorited ? "取消收藏问题" : "收藏问题",
      disabled: !STATE.favoriteQuestionsLoaded || !item.favoriteKey,
      onClick: () => toggleFavoriteQuestion(item.favoriteKey)
    });

    const text = document.createElement("span");
    text.className = "easier-gpt-question-dock-item-text";
    text.textContent = item.shortText;

    meta.appendChild(label);
    meta.appendChild(favoriteButton);
    button.appendChild(text);
    row.appendChild(meta);
    row.appendChild(button);
    return row;
  }

  function buildQuestionDockEmptyState() {
    const empty = document.createElement("div");
    empty.className = "easier-gpt-question-dock-empty";
    empty.textContent = "暂无用户问题";
    return empty;
  }

  function findActiveQuestionTurn(items) {
    let activeTurn = -1;
    for (const item of items) {
      if (item.turnIndex <= STATE.currentAnchorTurn) {
        activeTurn = item.turnIndex;
      } else {
        break;
      }
    }
    return activeTurn;
  }

  function getQuestionDockEl() {
    if (STATE.questionDockEl instanceof HTMLElement && STATE.questionDockEl.isConnected) {
      return STATE.questionDockEl;
    }

    const el = document.querySelector("[data-easier-gpt-question-dock='1']");
    STATE.questionDockEl = el instanceof HTMLElement ? el : null;
    return STATE.questionDockEl;
  }

  function getQuestionDockToggleIcon(collapsed) {
    return collapsed
      ? [
          '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
          '<path d="M3 3l18 18" />',
          '<path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c4.7 0 8.6 2.8 10 6-0.55 1.26-1.45 2.47-2.62 3.48" />',
          '<path d="M6.2 6.7C4.87 7.82 3.84 9.3 3 12c1.4 3.2 5.3 6 9 6 1.5 0 2.92-.3 4.2-.85" />',
          '<path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />',
          '</svg>'
        ].join("")
      : [
          '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
          '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />',
          '<circle cx="12" cy="12" r="3" />',
          '</svg>'
        ].join("");
  }

  function getTurnElement(turn) {
    const ids = STATE.turnToIds.get(turn) || [];

    for (const id of ids) {
      const item = STATE.messageById.get(id);
      if (!item || item.isPlaceholder) {
        continue;
      }

      if (item.el instanceof HTMLElement && item.el.isConnected) {
        return item.el;
      }
    }

    for (const id of ids) {
      const item = STATE.messageById.get(id);
      if (!item) {
        continue;
      }

      if (item.el instanceof HTMLElement && item.el.isConnected) {
        return item.el;
      }
    }

    return null;
  }

  function buildTurnSnapshot(turn) {
    const prevAssistant = clampSnippet(
      getNearestRoleText(turn - 1, CONFIG.assistantRole, -1, 3),
      84
    );
    const userText = clampSnippet(
      getNearestRoleText(turn, CONFIG.userRole, 0, 1) ||
        getNearestRoleText(turn - 1, CONFIG.userRole, -1, 2),
      96
    );
    const nextAssistant = clampSnippet(
      getNearestRoleText(turn, CONFIG.assistantRole, 1, 3),
      72
    );

    return {
      prevAssistant: prevAssistant || "\u2026",
      userText: userText || "\u2026",
      nextAssistant: nextAssistant || "\u2026"
    };
  }

  function getRoleTextForTurn(turn, role) {
    if (turn < 0 || turn >= STATE.totalTurns) {
      return "";
    }

    const ids = STATE.turnToIds.get(turn) || [];
    for (const id of ids) {
      const item = STATE.messageById.get(id);
      if (!item || item.role !== role) {
        continue;
      }

      const text = getItemText(item);
      if (text) {
        return text;
      }
    }

    return "";
  }

  function getNearestRoleText(baseTurn, role, direction, maxSteps) {
    if (STATE.totalTurns <= 0) {
      return "";
    }

    if (direction === 0) {
      return getRoleTextForTurn(baseTurn, role);
    }

    let turn = baseTurn;
    for (let step = 0; step < maxSteps; step += 1) {
      if (turn < 0 || turn >= STATE.totalTurns) {
        break;
      }

      const text = getRoleTextForTurn(turn, role);
      if (text) {
        return text;
      }

      turn += direction;
    }

    return "";
  }

  function renderDotPreview(snapshot, dot) {
    const preview = getMinimapPreviewEl();
    if (!(preview instanceof HTMLDivElement)) return;

    const previewApi = globalThis.EasierGPTTurnPreview;
    const rows = previewApi && typeof previewApi.buildTurnPreviewItems === "function"
      ? previewApi.buildTurnPreviewItems(snapshot)
      : [
          { text: snapshot.prevAssistant },
          { text: snapshot.userText },
          { text: snapshot.nextAssistant }
        ];

    cancelDotPreviewHide();
    preview.replaceChildren(
      ...rows.map((row) => buildPreviewRow(row.text))
    );
    preview.classList.add("is-visible");
    positionDotPreview(dot);
  }

  function showDotPreviewForTurn(turn, dot, options = {}) {
    if (!(dot instanceof HTMLButtonElement) || !Number.isFinite(turn)) {
      return false;
    }

    if (STATE.mode === "dynamic") {
      const minTurn = clamp(turn - 1, 0, Math.max(STATE.totalTurns - 1, 0));
      const maxTurn = clamp(turn + 1, 0, Math.max(STATE.totalTurns - 1, 0));
      restoreTurnsImmediately(minTurn, maxTurn);
    }

    const snapshot = buildTurnSnapshot(turn);
    if (!snapshot) {
      if (!options.pin) {
        clearPinnedDotPreview();
      }
      return false;
    }

    if (options.pin) {
      STATE.minimapPinnedPreviewTurn = turn;
      STATE.minimapPinnedPreviewUntil = Date.now() + CONFIG.previewClickPinMs;
    } else {
      clearPinnedDotPreview();
    }

    cancelDotPreviewHide();
    renderDotPreview(snapshot, dot);

    if (options.pin) {
      scheduleDotPreviewHide();
    }

    return true;
  }

  function buildPreviewRow(text) {
    const row = document.createElement("div");
    row.className = "easier-gpt-dot-preview-row";

    const textEl = document.createElement("span");
    textEl.className = "easier-gpt-dot-preview-text";
    textEl.textContent = text;

    row.appendChild(textEl);

    return row;
  }

  function hideDotPreview() {
    cancelDotPreviewHide();
    const preview = getMinimapPreviewEl();
    if (!(preview instanceof HTMLDivElement)) {
      return;
    }

    preview.classList.remove("is-visible");
  }

  function scheduleDotPreviewHide() {
    cancelDotPreviewHide();

    const preview = getMinimapPreviewEl();
    if (!(preview instanceof HTMLDivElement) || !preview.classList.contains("is-visible")) {
      return;
    }

    const pinnedTurn = getPinnedDotPreviewTurn();
    const pinRemainingMs = pinnedTurn === -1
      ? 0
      : Math.max(0, STATE.minimapPinnedPreviewUntil - Date.now());
    const delayMs = Math.max(CONFIG.previewHideDelayMs, pinRemainingMs);

    STATE.minimapPreviewHideTimer = window.setTimeout(() => {
      STATE.minimapPreviewHideTimer = 0;
      clearPinnedDotPreview();
      const currentPreview = getMinimapPreviewEl();
      if (!(currentPreview instanceof HTMLDivElement)) {
        return;
      }
      currentPreview.classList.remove("is-visible");
    }, delayMs);
  }

  function cancelDotPreviewHide() {
    if (STATE.minimapPreviewHideTimer !== 0) {
      clearTimeout(STATE.minimapPreviewHideTimer);
      STATE.minimapPreviewHideTimer = 0;
    }
  }

  function clearPinnedDotPreview() {
    STATE.minimapPinnedPreviewTurn = -1;
    STATE.minimapPinnedPreviewUntil = 0;
  }

  function getPinnedDotPreviewTurn() {
    if (!Number.isFinite(STATE.minimapPinnedPreviewTurn) || STATE.minimapPinnedPreviewTurn < 0) {
      return -1;
    }

    if (STATE.minimapPinnedPreviewUntil <= Date.now()) {
      clearPinnedDotPreview();
      return -1;
    }

    return STATE.minimapPinnedPreviewTurn;
  }

  function restorePinnedDotPreview(dots, start, visible) {
    const pinnedTurn = getPinnedDotPreviewTurn();
    if (pinnedTurn === -1) {
      return;
    }

    if (pinnedTurn < start || pinnedTurn >= start + visible) {
      return;
    }

    const dot = dots[pinnedTurn - start];
    if (!(dot instanceof HTMLButtonElement)) {
      return;
    }

    showDotPreviewForTurn(pinnedTurn, dot, { pin: true });
  }

  function positionDotPreview(dot) {
    const preview = getMinimapPreviewEl();
    if (!(preview instanceof HTMLDivElement)) {
      return;
    }

    if (!preview.classList.contains("is-visible")) {
      return;
    }

    const dotRect = dot.getBoundingClientRect();
    const previewRect = preview.getBoundingClientRect();

    const centerY = dotRect.top + dotRect.height / 2;
    const top = clamp(
      centerY - previewRect.height / 2,
      8,
      window.innerHeight - previewRect.height - 8
    );

    const showOnRight = dotRect.left < window.innerWidth / 2;
    const left = showOnRight ? dotRect.right + 8 : dotRect.left - previewRect.width - 8;

    preview.style.top = `${top}px`;
    preview.style.left = `${Math.max(8, left)}px`;
  }

  function getMinimapEl() {
    if (STATE.minimapEl instanceof HTMLElement && STATE.minimapEl.isConnected) {
      return STATE.minimapEl;
    }

    const el = document.querySelector("[data-easier-gpt-minimap]");
    STATE.minimapEl = el instanceof HTMLElement ? el : null;
    return STATE.minimapEl;
  }

  function getMinimapTrackEl() {
    if (STATE.minimapTrackEl instanceof HTMLElement && STATE.minimapTrackEl.isConnected) {
      return STATE.minimapTrackEl;
    }

    const root = getMinimapEl();
    const el = root?.querySelector(".easier-gpt-minimap-track");
    STATE.minimapTrackEl = el instanceof HTMLElement ? el : null;
    return STATE.minimapTrackEl;
  }

  function getMinimapPanelEl() {
    if (STATE.minimapPanelEl instanceof HTMLElement && STATE.minimapPanelEl.isConnected) {
      return STATE.minimapPanelEl;
    }

    const el = document.querySelector("[data-easier-gpt-panel='1']");
    STATE.minimapPanelEl = el instanceof HTMLElement ? el : null;
    return STATE.minimapPanelEl;
  }

  function getMinimapPreviewEl() {
    if (STATE.minimapPreviewEl instanceof HTMLDivElement && STATE.minimapPreviewEl.isConnected) {
      return STATE.minimapPreviewEl;
    }

    const el = document.querySelector("[data-easier-gpt-preview='1']");
    STATE.minimapPreviewEl = el instanceof HTMLDivElement ? el : null;
    return STATE.minimapPreviewEl;
  }

  function getStatsBadgeEl() {
    if (STATE.statsBadgeEl instanceof HTMLElement && STATE.statsBadgeEl.isConnected) {
      return STATE.statsBadgeEl;
    }

    const el = document.querySelector("[data-easier-gpt-stats='1']");
    STATE.statsBadgeEl = el instanceof HTMLElement ? el : null;
    return STATE.statsBadgeEl;
  }

  function getItemText(item) {
    if (item.snippet) {
      return item.snippet;
    }

    let source = item.el.getAttribute("data-easier-gpt-snippet") || "";

    if (!source && !item.isPlaceholder && item.el.isConnected) {
      source = item.el.textContent || "";
    }

    if (!source && item.isPlaceholder) {
      const record = STATE.collapsedById.get(item.id);
      if (record && record.node) {
        source = record.node.textContent || "";
      }
    }

    const snippet = makeSnippet(source);
    if (!snippet) {
      return "";
    }

    item.snippet = snippet;
    item.el.setAttribute("data-easier-gpt-snippet", snippet);
    return snippet;
  }

  function muteObserver(value) {
    STATE.observerMuted = value;
  }

  function normalizeRole(value) {
    const role = (value || "").trim().toLowerCase();
    if (role === CONFIG.userRole || role === CONFIG.assistantRole) {
      return role;
    }

    return CONFIG.assistantRole;
  }

  function makeSnippet(text) {
    const cleaned = (text || "").replace(/\s+/g, " ").trim();
    if (!cleaned) {
      return "";
    }

    return cleaned.slice(0, CONFIG.maxSnippetLength);
  }

  function clampSnippet(text, maxLength) {
    if (!text) {
      return "";
    }

    if (text.length <= maxLength) {
      return text;
    }

    return `${text.slice(0, maxLength)}...`;
  }

  // A turn is considered collapsed when every message in it is a placeholder.
  function isTurnCollapsed(turn) {
    const ids = STATE.turnToIds.get(turn);
    if (!ids || ids.length === 0) return false;
    return ids.every(id => {
      const item = STATE.messageById.get(id);
      return item && item.isPlaceholder;
    });
  }

  // ── LaTeX copy interaction ───────────────────────────────────────────────────
  // ChatGPT renders KaTeX into <annotation encoding="application/x-tex">.
  // We bind copy-on-click directly on the rendered formula for cleaner UI.

  function initLatexCopyButtons() {
    ensureLatexCopyDelegate();

    // Inject buttons into any math already on the page, then watch for new ones.
    document.querySelectorAll("annotation[encoding='application/x-tex']")
      .forEach(injectLatexCopyBtn);

    const obs = new MutationObserver((records) => {
      for (const r of records) {
        for (const node of r.addedNodes) {
          if (!(node instanceof Element)) continue;
          node.querySelectorAll("annotation[encoding='application/x-tex']")
            .forEach(injectLatexCopyBtn);
          if (node.matches("annotation[encoding='application/x-tex']")) {
            injectLatexCopyBtn(node);
          }
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  function injectLatexCopyBtn(annotation) {
    const formulaApi = globalThis.EasierGPTFormulaCopy;
    const binding = formulaApi && typeof formulaApi.getLatexCopyBinding === "function"
      ? formulaApi.getLatexCopyBinding(annotation)
      : null;
    if (!binding) return;

    const { target, latex, isDisplay } = binding;
    if (target.closest("[data-easier-gpt-inline-math='1']")) {
      return;
    }

    if (isDisplay) {
      target.querySelectorAll("[data-easier-gpt-latex-btn='1']").forEach((el) => el.remove());
      bindLatexCopyTarget(target, latex);
      return;
    }

    const next = target.nextElementSibling;
    if (next instanceof HTMLElement && next.getAttribute("data-easier-gpt-latex-inline-btn") === "1") {
      next.remove();
    }
    bindLatexCopyTarget(target, latex);
  }

  function bindLatexCopyTarget(target, latex) {
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const value = String(latex || "").trim();
    if (!value) {
      return;
    }

    target.setAttribute("data-easier-gpt-latex-copy", "1");
    target.setAttribute("data-easier-gpt-latex-source", value);
    target.setAttribute("data-easier-gpt-copy-label", "LaTeX");
    target.style.cursor = "copy";
  }

  function ensureLatexCopyDelegate() {
    if (STATE.latexCopyDelegateBound) {
      return;
    }

    document.addEventListener(
      "click",
      (event) => {
        if (!(event.target instanceof Element)) {
          return;
        }

        const target = event.target.closest("[data-easier-gpt-latex-copy='1']");
        if (!(target instanceof HTMLElement)) {
          return;
        }

        const latex = target.getAttribute("data-easier-gpt-latex-source") || "";
        if (!latex) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        copyTextToClipboard(latex).then((ok) => {
          if (!ok) return;
          target.classList.add("is-copied");
          window.setTimeout(() => {
            target.classList.remove("is-copied");
          }, 900);
        });
      },
      { capture: true }
    );

    STATE.latexCopyDelegateBound = true;
  }

  function copyTextToClipboard(text) {
    const value = String(text || "");
    if (!value) {
      return Promise.resolve(false);
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      return navigator.clipboard.writeText(value).then(() => true).catch(() => legacyCopy(value));
    }

    return legacyCopy(value);
  }

  function legacyCopy(text) {
    return new Promise((resolve) => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "true");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      ta.style.pointerEvents = "none";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      ta.remove();
      resolve(ok);
    });
  }

  // ── Composer expand button ───────────────────────────────────────────────────
  // Injects a resize button into ChatGPT's composer toolbar.
  // The button expands the textarea to 5× its natural height; clicking again
  // or sending a message collapses it back.

  function initComposerExpand() {
    if (STATE.composerInitStarted) {
      return;
    }

    STATE.composerInitStarted = true;
    runAfterWindowLoad(CONFIG.composerInitDelayMs, () => {
      tryInjectExpandBtn();
      // Composer may not exist yet on first paint; keep watching for late mounts.
      const obs = new MutationObserver(() => tryInjectExpandBtn());
      obs.observe(document.body, { childList: true, subtree: true });
    });

    if (!STATE.composerSubmitListenerBound) {
      document.addEventListener(
        "click",
        (event) => {
          if (!(event.target instanceof Element)) return;
          if (
            event.target.closest(
              "[data-testid='send-button'], [aria-label='发送消息'], [aria-label='Send message']"
            )
          ) {
            collapseAllExpandedComposers();
          }
        },
        { capture: true }
      );
      STATE.composerSubmitListenerBound = true;
    }
  }

  function tryInjectExpandBtn() {
    const surfaces = document.querySelectorAll("[data-composer-surface='true']");
    for (const surface of surfaces) {
      if (!(surface instanceof HTMLElement)) continue;

      const trailing = surface.querySelector("[grid-area='trailing'], .\\[grid-area\\:trailing\\]");
      if (!(trailing instanceof HTMLElement)) continue;
      if (trailing.querySelector("[data-easier-gpt-expand-btn='1']")) continue;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "easier-gpt-expand-btn composer-btn";
      btn.setAttribute("data-easier-gpt-expand-btn", "1");
      btn.setAttribute("aria-label", "Expand composer");
      btn.setAttribute("aria-pressed", "false");
      btn.innerHTML =
        `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;

      btn.addEventListener("click", () => toggleComposerExpand(btn));
      trailing.insertBefore(btn, trailing.firstChild);

      if (surface.getAttribute("data-easier-gpt-expand-keybound") !== "1") {
        surface.addEventListener(
          "keydown",
          (event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
              collapseAllExpandedComposers();
            }
          },
          { capture: true }
        );
        surface.setAttribute("data-easier-gpt-expand-keybound", "1");
      }
    }
  }

  function ensureFloatingPdfButton() {
    if (!isConversationPage()) {
      return;
    }

    if (document.querySelector("[data-easier-gpt-pdf-float='1']")) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "easier-gpt-floating-pdf-btn";
    button.setAttribute("data-easier-gpt-pdf-float", "1");
    button.setAttribute("aria-label", "PDF");
    button.title = "PDF";
    button.style.visibility = "hidden";
    button.innerHTML = [
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
      '<path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />',
      '<path d="M14 2v5h5" />',
      '<path d="M8.5 15.5h1.5a1.5 1.5 0 1 0 0-3H8.5v5" />',
      '<path d="M13 17.5v-5h1.25a1.75 1.75 0 1 1 0 3.5H13" />',
      '<path d="M18 12.5h-2.5v5" />',
      '</svg>',
      '<span class="easier-gpt-floating-pdf-btn-text">PDF</span>'
    ].join("");
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      exportChatAsPdf();
    });

    document.body.appendChild(button);
    positionFloatingPdfButton();
  }

  function getFloatingPdfAnchorRect() {
    const maxCandidateRight = Math.max(
      180,
      Math.min(window.innerWidth * 0.48, 720)
    );
    const anchor = resolveSidebarAnchor(maxCandidateRight, true);
    if (anchor instanceof HTMLElement) {
      const sidebarRect = anchor.getBoundingClientRect();
      if (sidebarRect.width > 0 && sidebarRect.height > 0) {
        const footerRect = findSidebarFooterAnchorRect(anchor, sidebarRect);
        if (footerRect) {
          return {
            left: sidebarRect.left,
            right: sidebarRect.right,
            bottom: footerRect.bottom
          };
        }

        return sidebarRect;
      }
    }

    if (STATE.lastSidebarOffsetPx > 0) {
      const right = Math.max(48, STATE.lastSidebarOffsetPx - CONFIG.sidebarOffsetGapPx);
      return {
        left: 0,
        right,
        bottom: Math.round(window.innerHeight * 0.82)
      };
    }

    return null;
  }

  function findSidebarFooterAnchorRect(sidebar, sidebarRect) {
    const candidates = sidebar.querySelectorAll("a, button, [role='button'], li, div, section");
    let bestRect = null;
    let bestBottom = -1;
    let bestWidth = -1;

    for (const candidate of candidates) {
      if (!(candidate instanceof HTMLElement)) {
        continue;
      }

      const rect = candidate.getBoundingClientRect();
      if (
        rect.width < 42 ||
        rect.height < 16 ||
        rect.bottom > sidebarRect.bottom + 4 ||
        rect.top < sidebarRect.top - 4 ||
        rect.left < sidebarRect.left - 8 ||
        rect.right > sidebarRect.right + 8
      ) {
        continue;
      }

      const style = window.getComputedStyle(candidate);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number.parseFloat(style.opacity || "1") === 0
      ) {
        continue;
      }

      if (rect.bottom > bestBottom || (rect.bottom === bestBottom && rect.width > bestWidth)) {
        bestRect = rect;
        bestBottom = rect.bottom;
        bestWidth = rect.width;
      }
    }

    return bestRect;
  }

  function positionFloatingPdfButton() {
    const button = document.querySelector("[data-easier-gpt-pdf-float='1']");
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const layoutApi = globalThis.EasierGPTFloatingPdfLayout;
    if (!layoutApi || typeof layoutApi.computeFloatingPdfPosition !== "function") {
      return;
    }

    const anchorRect = getFloatingPdfAnchorRect();
    if (!anchorRect) {
      button.style.visibility = "hidden";
      return;
    }

    const position = layoutApi.computeFloatingPdfPosition(
      anchorRect,
      {
        width: button.offsetWidth || 92,
        height: button.offsetHeight || 34
      },
      {
        width: window.innerWidth,
        height: window.innerHeight
      }
    );

    button.style.left = `${position.left}px`;
    button.style.top = `${position.top}px`;
    button.style.visibility = "visible";
  }

  function collapseAllExpandedComposers() {
    const buttons = document.querySelectorAll("[data-easier-gpt-expand-btn='1'][aria-pressed='true']");
    for (const btn of buttons) {
      if (btn instanceof HTMLButtonElement) {
        collapseComposer(btn);
      }
    }
  }

  function toggleComposerExpand(btn) {
    const expanded = btn.getAttribute("aria-pressed") === "true";
    expanded ? collapseComposer(btn) : expandComposer(btn);
  }

  function expandComposer(btn) {
    const surface = btn.closest("[data-composer-surface='true']");
    if (!surface) return;
    setComposerExpandedState(surface, true);
    const scrollable = findComposerScrollable(surface);
    if (!scrollable) return;

    const base = getComposerBaseHeight(scrollable);
    const maxByViewport = Math.floor(window.innerHeight * CONFIG.composerExpandViewportCap);
    const targetByFactor = Math.round(base * CONFIG.composerExpandFactor);
    const target = Math.max(
      base + CONFIG.composerExpandMinExtraPx,
      Math.min(maxByViewport, targetByFactor)
    );
    const extraHeight = Math.max(0, target - base);

    surface.style.setProperty("--deep-research-composer-extra-height", `${extraHeight}px`);
    scrollable.style.setProperty("max-height", `${target}px`, "important");
    scrollable.style.setProperty("overflow-y", "auto", "important");

    btn.setAttribute("aria-pressed", "true");
    btn.setAttribute("aria-label", "Collapse composer");
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></svg>`;
  }

  function collapseComposer(btn) {
    const surface = btn.closest("[data-composer-surface='true']");
    if (!surface) return;
    setComposerExpandedState(surface, false);
    const scrollable = findComposerScrollable(surface);
    if (scrollable) {
      scrollable.style.removeProperty("max-height");
      scrollable.style.removeProperty("overflow-y");
    }
    surface.style.removeProperty("--deep-research-composer-extra-height");

    btn.setAttribute("aria-pressed", "false");
    btn.setAttribute("aria-label", "Expand composer");
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
  }

  function findComposerScrollable(surface) {
    const direct = surface.querySelector(".wcDTda_prosemirror-parent");
    if (direct instanceof HTMLElement) {
      return direct;
    }

    const prose = surface.querySelector("#prompt-textarea, .ProseMirror");
    if (prose instanceof HTMLElement) {
      const container = prose.closest(
        ".wcDTda_prosemirror-parent, [class*='prosemirror-parent'], [class*='overflow-auto']"
      );
      if (container instanceof HTMLElement) {
        return container;
      }
    }

    const fallback = surface.querySelector("[class*='prosemirror-parent'], [class*='overflow-auto']");
    return fallback instanceof HTMLElement ? fallback : null;
  }

  function getComposerBaseHeight(scrollable) {
    const cached = Number.parseFloat(scrollable.getAttribute("data-easier-gpt-base-height") || "");
    if (Number.isFinite(cached) && cached > 0) {
      return cached;
    }

    const rectHeight = scrollable.getBoundingClientRect().height;
    const computed = window.getComputedStyle(scrollable);
    const computedMax = Number.parseFloat(computed.maxHeight || "");
    let base = Number.isFinite(rectHeight) && rectHeight > 0 ? rectHeight : 0;

    if (Number.isFinite(computedMax) && computedMax > 0) {
      base = Math.max(base, computedMax);
    }

    if (!Number.isFinite(base) || base <= 0) {
      base = 160;
    }

    scrollable.setAttribute("data-easier-gpt-base-height", String(Math.round(base)));
    return base;
  }

  function setComposerExpandedState(surface, expanded) {
    const form = surface.closest("form");
    const trailing = surface.querySelector("[grid-area='trailing'], .\\[grid-area\\:trailing\\]");

    if (expanded) {
      if (form instanceof HTMLFormElement) {
        form.setAttribute("data-expanded", "true");
      }
      surface.setAttribute("data-easier-gpt-expanded", "1");
      surface.style.setProperty(
        "grid-template-areas",
        "'header header header' 'primary primary primary' 'leading footer trailing'",
        "important"
      );
      if (trailing instanceof HTMLElement) {
        trailing.style.setProperty("align-self", "end", "important");
      }
      return;
    }

    if (form instanceof HTMLFormElement) {
      form.removeAttribute("data-expanded");
    }
    surface.removeAttribute("data-easier-gpt-expanded");
    surface.style.removeProperty("grid-template-areas");
    if (trailing instanceof HTMLElement) {
      trailing.style.removeProperty("align-self");
    }
  }

  function ensureKatexRuntime() {
    return Promise.resolve(!!(window.katex && typeof window.katex.render === "function"));
  }

  function ensureKatexStyles() {
    if (document.getElementById("easier-gpt-katex-local-css")) {
      return;
    }

    if (!chrome?.runtime?.getURL) {
      return;
    }

    const href = chrome.runtime.getURL("vendor/katex/katex.min.css");
    const link = document.createElement("link");
    link.id = "easier-gpt-katex-local-css";
    link.rel = "stylesheet";
    link.href = href;
    (document.head || document.documentElement).appendChild(link);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function runAfterWindowLoad(delayMs, callback) {
    const run = () => {
      window.setTimeout(() => {
        callback();
      }, Math.max(0, delayMs));
    };

    if (document.readyState === "complete") {
      run();
      return;
    }

    window.addEventListener("load", run, { once: true });
  }

  // ── Inline LaTeX renderer ────────────────────────────────────────────────────
  // ChatGPT sometimes leaves $...$ inline math as raw text instead of rendering
  // it with KaTeX. We scan assistant message paragraphs and render them ourselves.

  function initInlineLatexRenderer() {
    ensureKatexStyles();
    ensureKatexRuntime();

    const now = performance.now();
    STATE.inlineLatexReadyAt = now + CONFIG.inlineLatexInitialReadyDelayMs;
    runAfterWindowLoad(CONFIG.inlineLatexPostLoadReadyDelayMs, () => {
      STATE.inlineLatexReadyAt = Math.min(
        STATE.inlineLatexReadyAt,
        performance.now() + CONFIG.inlineLatexPostLoadReadyDelayMs
      );
      queueInlineLatexForViewportTurns(4, CONFIG.inlineLatexLiveAssistantScanLimit);
    });

    if (STATE.inlineLatexObserver instanceof MutationObserver) {
      return;
    }

    STATE.inlineLatexObserver = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "characterData") {
          const parent = r.target && r.target.parentElement;
          if (parent instanceof Element) {
            const inlineHost = parent.closest(".markdown p, .markdown li, .markdown td");
            if (inlineHost) {
              queueInlineLatexRender(inlineHost);
            }
          }
          continue;
        }

        if (r.target instanceof Element) {
          const host = r.target.closest(".markdown p, .markdown li, .markdown td");
          if (host) {
            queueInlineLatexRender(host);
          }
        }

        for (const node of r.addedNodes) {
          if (node instanceof Element) {
            const host = node.closest(".markdown p, .markdown li, .markdown td");
            if (host) {
              queueInlineLatexRender(host);
            }
          }
        }
      }
    });
    STATE.inlineLatexObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    if (STATE.inlineLatexSafetyTimer === 0) {
      STATE.inlineLatexSafetyTimer = window.setInterval(() => {
        if (document.visibilityState !== "visible") {
          return;
        }
        ensureKatexRuntime();
        queueInlineLatexForViewportTurns(2, CONFIG.inlineLatexLiveAssistantScanLimit);
      }, 900);
    }

    startInlineLatexBootstrapTimer();
  }

  function startInlineLatexBootstrapTimer() {
    if (STATE.inlineLatexBootstrapTimer !== 0) {
      return;
    }

    STATE.inlineLatexBootstrapTimer = window.setInterval(() => {
      if (STATE.inlineLatexBootstrapRuns >= CONFIG.inlineLatexBootstrapScanMaxRuns) {
        clearInterval(STATE.inlineLatexBootstrapTimer);
        STATE.inlineLatexBootstrapTimer = 0;
        return;
      }

      if (document.visibilityState !== "visible") {
        return;
      }

      STATE.inlineLatexBootstrapRuns += 1;
      queueInlineLatexForViewportTurns(5, CONFIG.inlineLatexLiveAssistantScanLimit);
    }, CONFIG.inlineLatexBootstrapScanMs);
  }

  function queueInlineLatexRender(root) {
    const key = root instanceof Element ? root : document.body;
    STATE.inlineLatexPendingRoots.set(key, performance.now());
    scheduleInlineLatexFlush();
  }

  function scheduleInlineLatexFlush() {
    const now = performance.now();
    const waitForReady = Math.max(0, STATE.inlineLatexReadyAt - now);
    const delay = Math.max(CONFIG.inlineLatexDebounceMs, Math.ceil(waitForReady));

    if (STATE.inlineLatexFlushTimer !== 0) {
      clearTimeout(STATE.inlineLatexFlushTimer);
    }

    STATE.inlineLatexFlushTimer = window.setTimeout(() => {
      STATE.inlineLatexFlushTimer = 0;
      flushInlineLatexQueue();
    }, delay);
  }

  function flushInlineLatexQueue() {
    if (STATE.inlineLatexPendingRoots.size === 0) {
      return;
    }

    if (performance.now() < STATE.inlineLatexReadyAt) {
      scheduleInlineLatexFlush();
      return;
    }

    const roots = Array.from(STATE.inlineLatexPendingRoots.keys());
    STATE.inlineLatexPendingRoots.clear();

    let deferred = false;
    for (const root of roots) {
      const hosts = getInlineLatexHosts(root);
      for (const host of hosts) {
        if (!isInlineLatexHostStable(host)) {
          STATE.inlineLatexPendingRoots.set(host, performance.now());
          deferred = true;
          continue;
        }

        renderInlineLatexInElement(host);
      }
    }

    if (deferred) {
      scheduleInlineLatexFlush();
    }
  }

  function getInlineLatexHosts(root) {
    if (!(root instanceof Element)) {
      return [];
    }

    if (root.matches(".markdown p, .markdown li, .markdown td")) {
      return [root];
    }

    return Array.from(root.querySelectorAll(".markdown p, .markdown li, .markdown td"));
  }

  function isInlineLatexHostStable(host) {
    if (!(host instanceof Element) || !host.isConnected) {
      return false;
    }

    if (host.closest("[data-writing-block]")) {
      return false;
    }

    if (host.closest("pre, code")) {
      return false;
    }

    return true;
  }

  function queueInlineLatexForViewportTurns(extraTurns = 0, limit = CONFIG.inlineLatexLiveAssistantScanLimit) {
    if (STATE.totalTurns <= 0 || STATE.messages.length === 0) {
      return;
    }

    const anchor = clamp(STATE.currentAnchorTurn, 0, STATE.totalTurns - 1);
    const around = CONFIG.turnsAroundViewport + Math.max(0, extraTurns);
    const minTurn = clamp(anchor - around, 0, STATE.totalTurns - 1);
    const maxTurn = clamp(anchor + around, 0, STATE.totalTurns - 1);
    queueInlineLatexForTurnRange(minTurn, maxTurn, limit);
  }

  function queueInlineLatexForTurnRange(minTurn, maxTurn, limit) {
    let queued = 0;
    for (let turn = minTurn; turn <= maxTurn; turn += 1) {
      const ids = STATE.turnToIds.get(turn) || [];
      for (const id of ids) {
        const item = STATE.messageById.get(id);
        if (!item || item.isPlaceholder || item.role !== CONFIG.assistantRole) {
          continue;
        }

        if (item.el instanceof Element && item.el.isConnected) {
          queueInlineLatexRender(item.el);
          queued += 1;
        }

        if (queued >= limit) {
          return;
        }
      }
    }
  }

  function processInlineLatex(root) {
    const containers = root.querySelectorAll
      ? root.querySelectorAll(".markdown p, .markdown li, .markdown td")
      : [];
    for (const el of containers) {
      renderInlineLatexInElement(el);
    }
    if (root instanceof Element && root.matches(".markdown p, .markdown li, .markdown td")) {
      renderInlineLatexInElement(root);
    }
  }

  function renderInlineLatexInElement(el) {
    const textSnapshot = el.textContent || "";
    if (!textSnapshot.includes("$")) {
      STATE.inlineLatexSourceByHost.set(el, textSnapshot);
      return;
    }

    if (STATE.inlineLatexSourceByHost.get(el) === textSnapshot) {
      return;
    }

    const inStreamingBlock = !!el.closest("[data-writing-block]");
    if (inStreamingBlock) {
      const lastRenderAt = STATE.inlineLatexLastRenderAt.get(el) || 0;
      if (performance.now() - lastRenderAt < CONFIG.inlineLatexStreamRenderMinIntervalMs) {
        return;
      }
    }

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);

    let changed = false;
    for (const textNode of textNodes) {
      if (textNode.parentElement?.closest(".katex, code, pre, [data-easier-gpt-inline-math='1']")) continue;
      const text = textNode.textContent || "";
      if (!text.includes("$")) continue;

      const parts = splitInlineMathSegments(text);
      if (!parts.some(part => part.type === "math")) continue;

      const frag = document.createDocumentFragment();
      for (const part of parts) {
        if (part.type === "math") {
          frag.appendChild(buildInlineMathNode(part.value));
        } else {
          frag.appendChild(document.createTextNode(part.value));
        }
      }
      textNode.replaceWith(frag);
      changed = true;
    }

    if (changed) {
      STATE.inlineLatexSourceByHost.set(el, el.textContent || "");
      STATE.inlineLatexLastRenderAt.set(el, performance.now());
    } else {
      STATE.inlineLatexSourceByHost.set(el, textSnapshot);
    }
  }

  function splitInlineMathSegments(text) {
    const result = [];
    let buffer = "";
    let mathBuffer = "";
    let inMath = false;

    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      const next = i + 1 < text.length ? text[i + 1] : "";

      if (ch === "\\" && next === "$") {
        if (inMath) {
          mathBuffer += "$";
        } else {
          buffer += "$";
        }
        i += 1;
        continue;
      }

      if (ch === "$") {
        if (inMath) {
          const latex = mathBuffer.trim();
          if (latex) {
            result.push({ type: "math", value: latex });
          } else {
            buffer += "$$";
          }
          mathBuffer = "";
          inMath = false;
        } else {
          if (buffer) {
            result.push({ type: "text", value: buffer });
            buffer = "";
          }
          inMath = true;
        }
        continue;
      }

      if (inMath && (ch === "\n" || ch === "\r")) {
        buffer += `$${mathBuffer}${ch}`;
        mathBuffer = "";
        inMath = false;
        continue;
      }

      if (inMath) {
        mathBuffer += ch;
      } else {
        buffer += ch;
      }
    }

    if (inMath) {
      buffer += `$${mathBuffer}`;
    }
    if (buffer) {
      result.push({ type: "text", value: buffer });
    }

    return result;
  }

  function buildInlineMathNode(latex) {
    const wrap = document.createElement("span");
    wrap.className = "easier-gpt-inline-math-wrap";
    wrap.setAttribute("data-easier-gpt-inline-math", "1");

    const rendered = document.createElement("span");
    rendered.className = "easier-gpt-inline-math";
    renderInlineMathToNode(rendered, latex);

    wrap.appendChild(rendered);
    bindLatexCopyTarget(wrap, latex);
    return wrap;
  }

  function renderInlineMathToNode(target, latex) {
    const source = String(latex || "").trim();
    const normalized = normalizeInlineLatexForRetry(source);
    const candidates = normalized && normalized !== source ? [source, normalized] : [source];

    if (window.katex && typeof window.katex.render === "function") {
      for (const expr of candidates) {
        try {
          window.katex.render(expr, target, {
            throwOnError: true,
            displayMode: false,
            strict: "ignore"
          });
          target.classList.remove("is-fallback");
          return;
        } catch {
          // Try next candidate.
        }
      }
    }

    target.classList.add("is-fallback");
    target.textContent = formatInlineLatexFallback(normalized || source);
  }

  function normalizeInlineLatexForRetry(latex) {
    let text = String(latex || "").trim();
    if (!text) {
      return text;
    }

    text = text
      .replace(/\\([，。；：、])/g, "$1")
      .replace(/[，]/g, ",")
      .replace(/[；]/g, ";")
      .replace(/[：]/g, ":")
      .replace(/[（]/g, "(")
      .replace(/[）]/g, ")")
      .replace(/[【]/g, "[")
      .replace(/[】]/g, "]");

    // Recover missing leading backslash for common environments.
    text = text
      .replace(/(^|[^\\])begin\{(cases|matrix|pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|array)\}/g, "$1\\\\begin{$2}")
      .replace(/(^|[^\\])end\{(cases|matrix|pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|array)\}/g, "$1\\\\end{$2}");

    // Common LLM slip: row break in cases/matrix is emitted as "\-x" or "\3".
    text = text.replace(/([0-9A-Za-z\}\)])\\(?=\s*[-+0-9])/g, "$1\\\\");

    return text;
  }

  function formatInlineLatexFallback(latex) {
    let text = String(latex || "").trim();
    if (!text) {
      return text;
    }

    text = replaceFractionLike(text);
    text = text
      .replace(/\\?sqrt\s*\{([^{}]+)\}/g, "√($1)")
      .replace(/\\?operatorname\s*\{([^{}]+)\}/g, "$1")
      .replace(/\\?mathrm\s*\{([^{}]+)\}/g, "$1")
      .replace(/\\?mathbb\s*\{([RNCQZ])\}/g, (_, setName) => {
        const map = { R: "ℝ", N: "ℕ", C: "ℂ", Q: "ℚ", Z: "ℤ" };
        return map[setName] || setName;
      });

    const macros = [
      ["\\to", "→"],
      ["\\rightarrow", "→"],
      ["\\leftarrow", "←"],
      ["\\approx", "≈"],
      ["\\neq", "≠"],
      ["\\leq", "≤"],
      ["\\geq", "≥"],
      ["\\infty", "∞"],
      ["\\partial", "∂"],
      ["\\sum", "∑"],
      ["\\int", "∫"],
      ["\\lambda", "λ"],
      ["\\theta", "θ"],
      ["\\pi", "π"],
      ["\\sin", "sin"],
      ["\\cos", "cos"],
      ["\\tan", "tan"],
      ["\\ln", "ln"],
      ["\\det", "det"],
      ["\\cdot", "·"],
      ["\\times", "×"]
    ];

    for (const [token, value] of macros) {
      text = text.split(token).join(value);
    }

    const bareGreek = [
      ["alpha", "α"],
      ["beta", "β"],
      ["gamma", "γ"],
      ["delta", "δ"],
      ["epsilon", "ε"],
      ["lambda", "λ"],
      ["mu", "μ"],
      ["pi", "π"],
      ["sigma", "σ"],
      ["theta", "θ"],
      ["rho", "ρ"],
      ["omega", "ω"]
    ];

    for (const [word, symbol] of bareGreek) {
      text = text.replace(new RegExp(`\\\\?${word}\\b`, "g"), symbol);
      text = text.replace(new RegExp(`\\\\?${capitalize(word)}\\b`, "g"), symbol);
    }

    text = text
      .replace(/([A-Za-z0-9)\]])in(ℝ|ℕ|ℂ|ℚ|ℤ)/g, "$1∈$2")
      .replace(/([A-Za-z0-9)\]])\\in(ℝ|ℕ|ℂ|ℚ|ℤ)/g, "$1∈$2");

    text = text.replace(/\^([A-Za-z0-9+\-()])/g, (_, value) => toSuperscript(value));
    text = text.replace(/_([A-Za-z0-9+\-()])/g, (_, value) => toSubscript(value));

    text = text
      .replace(/\^\{([^{}]+)\}/g, (_, value) => toSuperscript(value))
      .replace(/_\{([^{}]+)\}/g, (_, value) => toSubscript(value))
      .replace(/\\,/g, " ")
      .replace(/\\left/g, "")
      .replace(/\\right/g, "")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\[/g, "[")
      .replace(/\\\]/g, "]")
      .replace(/\\([a-zA-Z]+)/g, "$1")
      .replace(/\s+/g, " ")
      .trim();

    return text;
  }

  function replaceFractionLike(input) {
    let text = String(input || "");
    let previous = "";

    // Handle both \frac{a}{b} and frac{a}{b}; repeat to reduce nested cases.
    while (text !== previous) {
      previous = text;
      text = text.replace(/\\?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "($1)/($2)");
    }

    return text;
  }

  function toSuperscript(value) {
    const map = {
      "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
      "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
      "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",
      "n": "ⁿ", "i": "ⁱ"
    };
    let out = "";
    for (const ch of String(value || "")) {
      if (!map[ch]) {
        return `^(${value})`;
      }
      out += map[ch];
    }
    return out || `^(${value})`;
  }

  function toSubscript(value) {
    const map = {
      "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
      "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
      "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎",
      "a": "ₐ", "e": "ₑ", "h": "ₕ", "i": "ᵢ", "j": "ⱼ",
      "k": "ₖ", "l": "ₗ", "m": "ₘ", "n": "ₙ", "o": "ₒ",
      "p": "ₚ", "r": "ᵣ", "s": "ₛ", "t": "ₜ", "u": "ᵤ",
      "v": "ᵥ", "x": "ₓ"
    };
    let out = "";
    for (const ch of String(value || "")) {
      const key = ch.toLowerCase();
      if (!map[key]) {
        return `_(${value})`;
      }
      out += map[key];
    }
    return out || `_(${value})`;
  }

  function capitalize(text) {
    const s = String(text || "");
    if (!s) return s;
    return s[0].toUpperCase() + s.slice(1);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
