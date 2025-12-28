# Copilot instructions for Web-Bible-Paragragh-4.0

This repository is a small client-side web app (no build). Key files:
- [index.html](index.html): single-page UI and styles.
- [app.js](app.js): the entire application logic (UI behaviors, editors, persistence).
- [bible-paragraphs.json](bible-paragraphs.json): canonical data source (very large JSON).

High-level architecture
- Single-page, static app. All behavior lives in `app.js` and is executed in the browser.
- Data is read from `bible-paragraphs.json` and dynamic state is persisted in `localStorage`.
- UI uses native `<details>`/`<summary>` nodes to represent books → chapters → paragraphs.

Important runtime conventions and namespaces
- LocalStorage keys use explicit namespaces: `WBP3_FMT` (formats), `WBP3_UNIT` (unit/editor), `WBP3_BOOKUNIT` (book-unit). Search for `FMT_NS`, `UNIT_NS`, `BOOK_UNIT_NS` in `app.js`.
- Paragraph and book metadata are stored as dataset attributes on summary/ptitle elements: `data-book`, `data-ch`, `data-idx`.
- Editors are DOM-hosted elements with stable IDs: `unitEditor` (unit editor popup), buttons like `btnFmtSave`, `btnFmtLoad` exist as anchors for UI injection.

Common code patterns to follow when editing
- Prefer adding small, focused functions to `app.js` rather than complex refactors — the app is intentionally a single-file SPA.
- When working with paragraph/book context, locate the current open element via selectors used by the app: `document.querySelector('details.para[open]')` and `details.book[open]`.
- For persistence use the existing `saveState/loadState` helpers (search `saveState(`) so data remains compatible with existing keys.

How to run and test locally
- No build step. Serve files with a static server to avoid file:// restrictions. From repo root:

```powershell
python -m http.server 8000
# then open http://localhost:8000/index.html
```

Quick tasks examples (prompts for an AI agent)
- "Add a new button in the header that toggles a `reading` CSS class on the currently open paragraph; use existing helpers to find the open paragraph and persist a flag in localStorage under `WBP3_UNIT`." — reference `openUnitEditor()` and `getOpenParaKeyAndEls()` in `app.js`.
- "Find where runs-based format serialization is implemented and add a compatibility shim for v3→v4 saved payloads." — search for `_collectTextAndRuns`, `_wrapRunsToHTML`, and `saveFormatForOpenPara`.
- "Add a small unit test page or snippet that simulates `details.para[open]` and validates `saveFormatForOpenPara()`" — prefer manual browser testing since there is no test runner.

Notes and gotchas discovered
- `bible-paragraphs.json` is very large; avoid embedding duplicates into other files. Load it lazily if adding features that parse it frequently.
- Many functions are exposed or expected globally (attached to `window`); when adding modules maintain backward compatibility by assigning to `window` where appropriate.
- UI injection assumes certain element IDs/text (e.g., `btnFmtLoad`, `btnImportAll`); if renaming anchors update the injection points in `app.js`.

If anything here is unclear or you want examples added (e.g., common edit snippets, suggested lint rules, or a recommended PR checklist), tell me which section to expand.
