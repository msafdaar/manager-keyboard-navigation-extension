# Browser Extension: Keyboard-First Command Bar for Accounting App

## Overview

We're building a browser extension that injects a persistent, focused command bar at the top of an internal accounting web app. The goal is to eliminate mouse usage for two common actions:

1. **Searching** for records on any page.
2. **Navigating** between pages via short aliases.

The app runs on `localhost:55667`, is server-rendered, and is stable (no planned updates), which lets us make a few targeted assumptions that would otherwise be fragile.

---

## Target Environment

- **App URL:** `http://localhost:55667`
- **Rendering:** Server-rendered (full page reloads on form submit and navigation). No SPA behavior observed.
- **Port:** `55667` — used in the manifest's `matches` field.

---

## Core Behavior

### The Command Bar

- Injected as the **first child of `<body>`** on every page of the app.
- **Pushes content down** (not an overlay) and stays **sticky at the top** while scrolling.
- **Auto-focuses on every page load.**
- Loses focus normally: `Esc` or clicking elsewhere. **No auto-refocus** — a page refresh (`F5`) or a full navigation restores focus naturally.
- Fixed height, one line, high enough `z-index` to sit above the app's own header.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  > [type here.............................]  Search for "hi" │
└─────────────────────────────────────────────────────────────┘
```

- **Left:** the input field.
- **Right:** a live description of what will happen on `Enter`. Updates on every keystroke.
- Optional `>` prompt character on the far left (cosmetic, shell-like feel).

### Command Syntax

| Input | Action |
|---|---|
| *(empty)* | No-op |
| `hi` | Search the app for `"hi"` |
| `/rec` | Navigate to Receipts |
| `/REC` | Same as `/rec` (case-insensitive) |
| `/` | No-op |
| `/dodod` | Invalid — show inline error, do nothing |

**Rule:** if trimmed input starts with `/`, it's a navigation command. Otherwise, it's a search query.

---

## Search Mechanism

The app's search is a **form POST**, not a live filter. Discovered sample of the search bar:

```html
<form action="/receipts?ogYTRmF6... (opaque session token)" method="POST">
  <input type="text" name="Term" value="rohan" placeholder="Search" ...>
  <button>Search</button>
</form>
```

### Approach (Confirmed Working)

Locate the input, set its value, and submit its parent form:

```js
const input = document.querySelector('input[name="Term"]')
           || document.querySelector('input[placeholder="Search"]');

input.value = query;
input.form.requestSubmit();
```

### Key Notes

- **Do not** construct the search URL manually. The action URL contains an opaque session/CSRF token that is validated server-side. Always submit the form that already exists on the page.
- `requestSubmit()` is preferred over `form.submit()` because it fires submit handlers and respects validation.
- After submission, the page reloads with results. The bar re-injects and re-focuses automatically.
- **Fallback selector:** `input[placeholder="Search"]` in case `name="Term"` ever changes.
- **If no search input exists on a page:** typing plain text shows the description "No search bar detected, nothing will happen" and Enter is a no-op.

---

## Navigation Mechanism

### Alias Map (Hardcoded in Extension Source)

Each alias is a triple: **alias → { url, label }**.

```js
{
  rec: { url: '/business/receipts',     label: 'Receipts' },
  pay: { url: '/business/payments',     label: 'Payments' },
  si:  { url: '/business/sale-invoices', label: 'Sale Invoices' },
}
```

### Behavior

- Matching is **case-insensitive**.
- Navigation is a **full page reload** via `window.location.href = origin + url`.
- Navigating to the page you're already on is allowed (it just reloads).
- Unknown alias → **inline error** in the description area, no navigation.

---

## Live Description (Right Side of Bar)

The description updates on every keystroke via an `input` event listener on the bar.

| Input | Description | Style |
|---|---|---|
| *(empty)* | *(blank or subtle hint — TBD)* | hint |
| `hi` | `Search for "hi"` | normal |
| `hi` (no search bar on page) | `No search bar detected, nothing will happen` | error |
| `/` | *(blank)* | hint |
| `/rec` | `Navigate to Receipts` | nav |
| `/dodod` | `Invalid link: dodod` | error |

### Rendering Rules

- Description element is right-aligned inside the bar, `pointer-events: none` so clicking it still focuses the input.
- Long queries are **truncated** in the description at ~40 characters with `…` to keep the bar one line.
- Description is cleared or reset on every keystroke and on load.
- Three style classes: `hint`, `normal`/`search`, `nav`, `error`.

### Description Logic (Pseudocode)

```
describe(input, hasSearchBar, aliases):
  t = input.trim()
  if t === "":
    return { text: "", kind: "hint" }
  if t.startsWith("/"):
    alias = t.slice(1).trim().toLowerCase()
    if alias === "":
      return { text: "", kind: "hint" }
    if alias in aliases:
      return { text: `Navigate to ${aliases[alias].label}`, kind: "nav" }
    return { text: `Invalid link: ${alias}`, kind: "error" }
  if not hasSearchBar:
    return { text: "No search bar detected, nothing will happen", kind: "error" }
  return { text: `Search for "${truncate(t)}"`, kind: "search" }
```

**Note:** `hasSearchBar` is determined **once on page load** and cached. The app is server-rendered, so the search bar's presence does not change during a session.

---

## Focus Model — Summary

- **On page load:** bar auto-focuses.
- **`Esc` or click elsewhere:** bar blurs; behaves like a normal input.
- **No auto-refocus.**
- **`F5` or any navigation:** fresh page load → bar re-injects and auto-focuses.
- **After a search or navigation:** page reloads → bar re-injects and auto-focuses.

---

## Decisions Locked In

| Decision | Choice |
|---|---|
| Search trigger | Set input value + `form.requestSubmit()` |
| Navigation | Full page reload via `window.location.href` |
| Command bar placement | First child of `<body>`, sticky at top, pushes content down |
| Focus on load | Auto-focus |
| Focus on `Esc` / click | Blur, no auto-refocus |
| Alias storage | Hardcoded in extension source |
| Alias matching | Case-insensitive |
| Unknown alias | Inline error, no navigation |
| Navigating to current page | Allowed (reloads) |
| Search bar detection | Cached once on page load |
| Manifest matches | `http://localhost:55667/*` |

---

## Open Items for the Dev Team

1. **Empty-state hint text** — blank, or a subtle hint like `Type to search · /alias to navigate`. Recommend a subtle hint to teach syntax without docs.
2. **Inline error styling** — recommend muted red, right-aligned inside the bar, cleared on next keystroke.
3. **Z-index and styling** — will likely need tuning once the bar is injected into a live page to sit above the app's own header/modals without covering its dropdowns.
4. **`>` prompt character** — optional cosmetic shell-style prefix on the left of the bar. Low priority.
5. **Alias hints on `/`** — a nice-to-have: when the user types just `/`, list available aliases in the description area. Not v1.

---

## Suggested Build Order

1. **v0** — Inject the bar (sticky, pushes content, auto-focused). Enter does nothing. Verify layout and focus model on a real page.
2. **v1** — Hardcoded alias map. `/rec` navigates. Unknown alias shows inline error. Live description reflects state.
3. **v2** — Plain-text Enter triggers search on `input[name="Term"]` via `form.requestSubmit()`. Verify search results load.
4. **v3** — Polish: empty-state hint, description truncation, color coding, z-index tuning.

---

## Edge Cases Handled

| Case | Behavior |
|---|---|
| Empty Enter | No-op |
| `/` alone | No-op |
| `/unknownalias` | Inline error `Invalid link: unknownalias`, no navigation |
| Plain text on a page with no search bar | Inline message `No search bar detected, nothing will happen`, no-op on Enter |
| Very long query | Description truncated at ~40 chars with `…` |
| Query contains quotes | Rendered raw in the description (no escaping needed for preview) |
| Case sensitivity | Alias matching is lowercase-insensitive |
| Whitespace | Trim whole input first, then trim after `/` |

---

## Deliverables

- `manifest.json` — with `matches: ["http://localhost:55667/*"]`
- `content.js` — injects bar, manages focus, parses input, renders description, executes search/navigation
- `content.css` — bar styling, sticky positioning, z-index, description color classes

---

## Why This Design Works

- **No input-detection hacks.** By always focusing our own bar on page load, we sidestep the entire "is the user typing in an input?" problem. The bar *is* the input.
- **No fragile event synthesis.** The app's own form does the search — we just trigger it. No React value-setter workarounds needed because the app is server-rendered.
- **No URL reconstruction.** The opaque session token in the form action is preserved because we use the form that's already on the page.
- **Predictable, honest UX.** The live description tells the user exactly what will happen before they press Enter, including error states.
- **Hardcoded aliases are acceptable** because the app is stable and won't be updated. This avoids building a popup UI, storage layer, and sync logic for a v1 that doesn't need them.