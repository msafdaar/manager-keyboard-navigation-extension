# Adding a Feature

An optional feature is one self-contained file in `features/`. The main file
(`content.js`) handles the Settings UI, on/off state, storage, and lifecycle.
You only describe the feature and provide its behavior.

## Mental model

- `content.js` — the app and feature platform. You do not edit it to add a feature.
- `features/*.js` — plugins. Each one registers a descriptor on `window.MGX_FEATURES`.
- `manifest.json` — the list of plugin files. `content.js` must stay last.
- `content.css` — styles for the command bar and all features.

## Quick start

1. Copy `features/_template.js` to `features/my-feature.js`.
2. Fill in the descriptor (see below).
3. Add `"features/my-feature.js"` to the `js` array in `manifest.json`, before `"content.js"`.
4. Go to `chrome://extensions`, reload the extension, then open a Manager.io page.

That's it. No edits to `content.js`, and feature order in the manifest controls
the order shown in Settings.

## Descriptor

```js
(() => {
  (window.MGX_FEATURES = window.MGX_FEATURES || []).push({
    id: 'myFeature',
    name: 'My Feature',
    desc: 'What it does in one or two sentences.',
    featureScope: 'localStorageCheckbox',
    enable() {},
    disable() {},
  });
})();
```

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Unique, stable identifier. Used as the storage key. |
| `name` | yes | Title shown in Settings. |
| `desc` | yes | Description shown in Settings. |
| `featureScope` | yes | `localStorageCheckbox`, `tabOnlyCheckbox`, or `button`. |
| `enable()` | checkbox scopes | Attach listeners and start behavior. |
| `disable()` | checkbox scopes | Remove listeners and undo behavior. |
| `actionLabel` | button scope | Text on the action button. |
| `action()` | button scope | Runs once when the button is clicked. |

## Scopes

| Scope | Rendered as | State |
|---|---|---|
| `localStorageCheckbox` | checkbox | Saved in `localStorage` under `mgx:features`; survives reloads. |
| `tabOnlyCheckbox` | checkbox | In memory only; resets when the page loads. |
| `button` | action button | No state. The action runs once per click. |

`localStorage` is per origin, so `localhost` and `127.0.0.1` keep separate settings.

## Button feature

```js
(() => {
  (window.MGX_FEATURES = window.MGX_FEATURES || []).push({
    id: 'myButtonFeature',
    name: 'My Button Feature',
    desc: 'Runs once when clicked.',
    featureScope: 'button',
    actionLabel: 'Run It',
    action() {
      // Do the work once.
    },
  });
})();
```

The Settings modal closes before `action()` runs.

## Rules

- Keep `id` unique and stable. Renaming it loses the saved on/off state.
- Never attach global listeners at file top level. Do it in `enable()`.
- `disable()` must undo everything `enable()` did, including temporary DOM.
- Keep feature CSS in `content.css` and prefix class names (for example `mgx-myfeature-...`).
- Errors thrown by `enable`, `disable`, or `action` are caught and logged with the
  feature id, so one broken feature cannot break the others.

## Troubleshooting

- **Feature is not in Settings:** check that its file is listed in `manifest.json`
  before `content.js`, then reload the extension.
- **Console says invalid or missing `featureScope`:** use one of the three scopes above.
- **Console says duplicate feature id:** two files use the same `id`.
- **Feature does nothing when toggled:** make sure listener setup is inside `enable()`,
  not at the top level of the file.

## Testing checklist

- Extension reloads without console errors.
- Feature appears in Settings with the correct control.
- `localStorageCheckbox` keeps its state after reload.
- `tabOnlyCheckbox` resets after reload.
- Button action runs and no longer leaves the Settings modal open.
- Turning a checkbox off removes its behavior and cleans up.
