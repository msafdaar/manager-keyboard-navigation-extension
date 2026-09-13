# Command Bar for Manager.io

A keyboard-first browser extension for Manager.io that enables instant search and fast navigation using short command aliases.
## Supported Environment

* **Supported Edition**: Tested on Manager v26.9.1.0 Desktop & 25.7.12.2494 Desktop
* **Tested Browsers**: Google Chrome, Microsoft Edge

## What It Does

Instant Keyboard Focus: The command bar automatically gains focus on page load. Start typing immediately to search the current page, or type / to trigger navigation commands—no mouse clicks required.

Short Alias Navigation: Jump between core modules using keyboard shortcodes (e.g., /r for Receipts, /si for Sales Invoices, /p for Payments, /c for Customers).

Combined Search & Jump: Pass a search term directly with an alias (e.g., /si Inv-1002) to navigate to that section and execute the search in a single step.

Dynamic Business Resolution: Automatically extracts the business key and query parameters from the DOM, allowing seamless switching across different business files, hosts, and ports.

## Why It Does That

Default navigation in Manager.io requires frequent mouse usage to switch sections via the sidebar. This extension streamlines daily accounting workflows by providing a fast command line interface that handles route jumping, search parameter passing.

## How to Load It

1. Open Chrome or Edge and navigate to `chrome://extensions`.
2. Toggle **Developer mode** on in the top-right corner.
3. Click **Load unpacked**.
4. Select the directory containing `manifest.json`, `content.js`, and `content.css`.