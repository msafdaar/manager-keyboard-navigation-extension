# Command Bar for Manager.io

A keyboard-first browser extension for Manager.io that enables instant search and fast navigation using short command aliases.
## Supported Environment

* **Supported Edition**: Tested on Manager v26.9.1.0 Desktop & 25.7.12.2494 Desktop
* **Tested Browsers**: Google Chrome, Microsoft Edge

## What It Does

Instant Keyboard Focus: The command bar automatically gains focus on page load. Start typing immediately to search the current page, or type / to trigger navigation commands—no mouse clicks required.

Short Alias Navigation: Jump between core modules using keyboard shortcodes (e.g., /r for Receipts, /si for Sales Invoices, /p for Payments, /c for Customers).

Combined Search & Jump: Pass a search term directly with an alias (e.g., /si Inv-1002) to navigate to that section and execute the search in a single step.

Optional Features: Enable or disable opt-in tools from the "Optional features" link on the command bar. Settings persist, but any marks they produce are session-only.

* Row Highlighter: Click a table row to cycle its background color while comparing against physical books — green once it matches, red if it needs fixing, and a third click resets the row. Disabling the feature clears all current marks.
* Open links in new tabs: Clicking any link on the page opens it in a new tab instead of navigating the current page away, keeping the page and any Row Highlighter marks in place. Toggle the checkbox to enable it in every tab (saved), or use "Activate on current tab only" for a one-off activation that lasts just for the current tab.


## Why It Does That

Default navigation in Manager.io requires frequent mouse usage to switch sections via the sidebar. This extension streamlines daily accounting workflows by providing a keyboard based interface that handles route jumping, search parameter passing.

## How to Load It

1. Open Chrome or Edge and navigate to `chrome://extensions`.
2. Toggle **Developer mode** on in the top-right corner.
3. Click **Load unpacked**.
4. Select the directory containing `manifest.json`, `content.js`, and `content.css`.