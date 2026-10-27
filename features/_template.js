// Copy this file to create a new feature, e.g. features/my-feature.js,
// then add it to manifest.json before content.js and reload the extension.
//
// Only `window.MGX_FEATURES` is shared with the main file. Everything else
// in this file is private to the feature.
(() => {
  (window.MGX_FEATURES = window.MGX_FEATURES || []).push({
    id: 'exampleFeature', // unique and stable; changing it resets saved state
    name: 'Example Feature',
    desc: 'Describe what this feature does in one or two sentences.',
    featureScope: 'localStorageCheckbox', // 'tabOnlyCheckbox' | 'button'

    enable() {
      // Attach listeners / start behavior here.
    },

    disable() {
      // Remove listeners / undo behavior here.
    },
  });
})();

// Button feature (runs once per click, no on/off state):
//
// (window.MGX_FEATURES = window.MGX_FEATURES || []).push({
//   id: 'exampleButton',
//   name: 'Example Button',
//   desc: 'Runs once when clicked.',
//   featureScope: 'button',
//   actionLabel: 'Run Example',
//   action() {
//     // Do the work once.
//   },
// });
