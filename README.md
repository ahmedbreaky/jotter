# Jotter

A block-based notes and wiki app that runs entirely in your browser. Pages are saved to the browser's local storage.

## Features
- Block editor: type `/` for headings, to-dos, bulleted and numbered lists, quotes, code blocks and dividers
- Markdown shortcuts (`# `, `- `, `1. `, `[] `, `> `, ``` ``` ```), bold and italic with Ctrl/⌘+B and Ctrl/⌘+I
- Move the current block up or down with Alt+Shift+↑/↓
- Nested pages in a sidebar tree, favourites, page icons and breadcrumbs
- Table pages with typed columns (text, number, select, date, checkbox), sorting and filtering
- Search across titles and content (Ctrl/⌘+K)
- Light, dark and system themes; works on phones

## Run
```bash
npm install
npm run dev
```
Build a static site into `dist/` with `npm run build`.

Rename the app in `src/config.ts`.
