# Tauri + Vanilla TS

This template should help get you started developing with Tauri in vanilla HTML, CSS and Typescript.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

# 2026-06-23

## 修复书籍编辑页面章节内容滚动问题

- 文件：`src/views/EditorView.vue`
- 问题：章节编辑器内容区域无法上下滚动
- 原因：`.editor-textarea` 设置了 `height: 100%`，使其撑满父容器而不溢出；同时 `.editor-content-area` 缺少 `min-height: 0`，导致 flex 子元素无法收缩触发滚动
- 修复：
  1. `.editor-textarea` 改为 `height: auto`（随内容伸展），添加 `box-sizing: border-box`
  2. `.editor-content-area` 添加 `min-height: 0`（允许 flex 子元素收缩，使 `overflow-y: auto` 生效）