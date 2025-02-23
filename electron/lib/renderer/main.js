console.log("[INFO] main.js loaded");

const { ipcRenderer } = require("electron");
const { runAsciiIntro } = require("./lib/renderer/asciiIntro.js");
const { registerKeyboardShortcuts } = require("./lib/renderer/keyboardShortcuts.js");
const { createNewTab, switchTab, closeCurrentTab, backspaceCurrentTab, createHelpTab, getTabsState, restoreTabsState, getTabs } = require("./lib/renderer/tabManager.js");
const { createQueryTextEditor } = require("./lib/renderer/queryTextEditor.js");
const { setupPresetListener } = require("./lib/renderer/presetSelector.js");
const { setupQueryListener } = require("./lib/renderer/queryRunner.js");
const { runRgwfuncsrcMissingHandler } = require("./lib/renderer/rgwfuncsrcMissingHandler.js");

runAsciiIntro();

// Save state to file via main process
async function saveAppState() {
  const state = getTabsState();
  try {
    await ipcRenderer.invoke("save-state", state);
    console.log("[INFO] App state saved");
  } catch (err) {
    console.error("[ERROR] Failed to save state:", err);
  }
}

// Load and restore state from file
async function loadAppState() {
  try {
    const state = await ipcRenderer.invoke("load-state");
    if (state && Array.isArray(state) && state.length > 0) {
      // Restore state if it exists and has tabs
      restoreTabsState(state, createQueryTextEditor);
      // Reattach listeners to restored textareas
      state.forEach((tabState, index) => {
        const notebookEl = getTabs()[index].notebookEl; // Use getTabs() to access tabs
        const textarea = notebookEl.querySelector("textarea");
        if (textarea) {
          setupPresetListener(textarea, (preset) => console.log(`Preset selected: ${preset}`));
          setupQueryListener(notebookEl.querySelector(".query-text-editor"), textarea);
        }
      });
      console.log("[INFO] App state restored with", state.length, "tabs");
    } else {
      // Only create a default tab if no valid state with tabs is found
      console.log("[INFO] No valid saved state with tabs found. Creating default tab...");
      const notebookEl = createNewTab(createQueryTextEditor);
      const textarea = notebookEl.querySelector("textarea");
      setupPresetListener(textarea, (preset) => console.log(`Preset selected: ${preset}`));
      setupQueryListener(notebookEl.querySelector(".query-text-editor"), textarea);
    }
  } catch (err) {
    console.error("[ERROR] Failed to load state:", err);
    // Fallback to default tab only if no tabs exist after the error
    if (getTabs().length === 0) {
      // Use getTabs() instead of tabs
      console.log("[INFO] State loading failed. Creating default tab as fallback...");
      const notebookEl = createNewTab(createQueryTextEditor);
      const textarea = notebookEl.querySelector("textarea");
      setupPresetListener(textarea, (preset) => console.log(`Preset selected: ${preset}`));
      setupQueryListener(notebookEl.querySelector(".query-text-editor"), textarea);
    }
  }
}

registerKeyboardShortcuts({
  createNewTab: () => {
    console.log("[INFO] Creating new tab via keyboard shortcut");
    const notebookEl = createNewTab(createQueryTextEditor);
    const textarea = notebookEl.querySelector("textarea");
    setupPresetListener(textarea, (preset) => console.log(`Preset selected: ${preset}`));
    setupQueryListener(notebookEl.querySelector(".query-text-editor"), textarea);
    saveAppState();
  },
  switchTab,
  closeCurrentTab: () => {
    closeCurrentTab();
    saveAppState();
  },
  backspaceCurrentTab: () => {
    console.log("[INFO] Backspacing current tab via keyboard shortcut");
    const notebookEl = backspaceCurrentTab(createQueryTextEditor);
    if (notebookEl) {
      const textarea = notebookEl.querySelector("textarea");
      setupPresetListener(textarea, (preset) => console.log(`Preset selected: ${preset}`));
      setupQueryListener(notebookEl.querySelector(".query-text-editor"), textarea);
    }
    saveAppState();
  },
  createHelpTab,
});

window.onload = () => {
  console.log("[INFO] Window loaded. Restoring state...");
  loadAppState();
};

// Save state before window closes
window.onbeforeunload = () => {
  saveAppState();
};

ipcRenderer.on("show-rgwfuncsrc-missing", () => {
  console.log("[INFO] Showing .rgwfuncsrc missing handler");
  runRgwfuncsrcMissingHandler();
});
