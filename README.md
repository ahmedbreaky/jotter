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

## Install as an app
The site is published to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.
Open the site in Chrome or Edge and click the install icon in the address bar
(on a Mac in Safari: File → Add to Dock). Once installed it opens in its own window and works offline.

One-time setup: in the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
