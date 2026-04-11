# Easier-GPT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将仓库对外品牌与内部运行前缀从 SlimGPT / slimgpt 统一改为 Easier-GPT / easier-gpt，并保持功能与测试通过。

**Architecture:** 先用测试锁定品牌边界，再统一替换配置、运行时 DOM/CSS 钩子、导出标识与工作流产物名，最后回归全量测试。历史设计文档保持不改，避免污染过程记录。

**Tech Stack:** Manifest V3, vanilla JavaScript, CSS, Node test runner, GitHub Actions

---
