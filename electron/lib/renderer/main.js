/* lib/renderer/main.js */
console.log("[INFO] main.js loaded");

const { ipcRenderer } = require("electron");
const { runAsciiIntro } = require("./lib/renderer/asciiIntro.js");
const { registerKeyboardShortcuts } = require("./lib/renderer/keyboardShortcuts.js");
const { createNewTab, switchTab, closeCurrentTab, refreshCurrentTab, createHelpTab } = require("./lib/renderer/tabManager.js");
const { createQueryTextEditor } = require("./lib/renderer/queryTextEditor.js");
const { setupPresetListener } = require("./lib/renderer/presetSelector.js");
const { setupQueryListener } = require("./lib/renderer/queryRunner.js");
const { runRgwfuncsrcMissingHandler } = require("./lib/renderer/rgwfuncsrcMissingHandler.js");

runAsciiIntro();

registerKeyboardShortcuts({
  createNewTab: () => {
    console.log("[INFO] Creating new tab via keyboard shortcut");
    const notebookEl = createNewTab(createQueryTextEditor);
    const textarea = notebookEl.querySelector("textarea");
    setupPresetListener(textarea, (preset) => console.log(`Preset selected: ${preset}`));
    setupQueryListener(notebookEl.querySelector(".query-text-editor"), textarea);
  },
  switchTab,
  closeCurrentTab,
  refreshCurrentTab: () => {
    const notebookEl = refreshCurrentTab(createQueryTextEditor);
    const textarea = notebookEl.querySelector("textarea");
    setupPresetListener(textarea, (preset) => console.log(`Preset selected: ${preset}`));
    setupQueryListener(notebookEl.querySelector(".query-text-editor"), textarea);
  },
  createHelpTab, // Pass the new function
});

window.onload = () => {
  console.log("[INFO] Window loaded. Creating default tab...");
  const notebookEl = createNewTab(createQueryTextEditor);
  const textarea = notebookEl.querySelector("textarea");
  setupPresetListener(textarea, (preset) => console.log(`Preset selected: ${preset}`));
  setupQueryListener(notebookEl.querySelector(".query-text-editor"), textarea);
};

ipcRenderer.on("show-rgwfuncsrc-missing", () => {
  console.log("[INFO] Showing .rgwfuncsrc missing handler");
  runRgwfuncsrcMissingHandler();
});
