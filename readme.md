# Command Bar for Manager.io

A keyboard-first browser extension for Manager.io that enables instant search and fast navigation using short command aliases.

To add your own optional feature, see [FEATURES.md](FEATURES.md).

## Supported Environment

* **Supported Edition**: Tested on Manager v26.9.1.0 Desktop & 25.7.12.2494 Desktop
* **Tested Browsers**: Google Chrome, Microsoft Edge

## What It Does

Instant Keyboard Focus: The command bar automatically gains focus on page load. Start typing immediately to search the current page, or type / to trigger navigation commands—no mouse clicks required.

Short Alias Navigation: Jump between core modules using keyboard shortcodes (e.g., /r for Receipts, /si for Sales Invoices, /p for Payments, /c for Customers).

Combined Search & Jump: Pass a search term directly with an alias (e.g., /si Inv-1002) to navigate to that section and execute the search in a single step.

Optional Features: Enable or disable opt-in tools from the "Optional features" link on the command bar. Settings persist, but any marks they produce are session-only.

* Row Highlighter: Click a table row to cycle its background color while comparing against physical books — green once it matches, red if it needs fixing, and a third click resets the row. Disabling the feature clears all current marks.
* Quick Calculator: Select a number or arithmetic expression on the page or in a same-origin iframe to see its multiplied values and packed division results in a fixed strip at the bottom of the page. Expressions support `+ - * /`, parentheses, and `× ÷`, and display both the expression and evaluated result, for example `24+32+532 = 588`. Commas are always stripped, so `5,06` is parsed as `506`; only `.` marks decimals. Division shows full packs plus leftover, for example `100 / 40` displays as `/40: 2 Mand + 20` when 40 is named Mand. Modifier names are optional; unnamed pack sizes display as `/40: 2 + 20`. The calculation mode and modifiers are configurable in `features/quick-calculator.js`.
* Keep This Page: All links open in new tabs and leaving or refreshing the page asks for confirmation, so anything on the page — highlighted rows, form entries, notes — survives an accidental click or refresh. Active for the current tab only: tick the checkbox to protect this tab; a fresh page load starts unprotected again.
* Date input helper: Asks for your Manager.io date format when enabled. While a date field is focused, press Down to set today, Left to set the previous day, and Right to set the next day.
* Trap Tab Navigation: Keeps Tab and Shift+Tab cycling through the elements inside the form area (`#nonBatchView`) instead of moving focus out of the form.


## Why It Does That

Default navigation in Manager.io requires frequent mouse usage to switch sections via the sidebar. This extension streamlines daily accounting workflows by providing a keyboard based interface that handles route jumping, search parameter passing.

## How to Load It

1. Open Chrome or Edge and navigate to `chrome://extensions`.
2. Toggle **Developer mode** on in the top-right corner.
3. Click **Load unpacked**.
4. Select the directory containing `manifest.json`, `content.js`, `content.css`, and the `features/` folder.