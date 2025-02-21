// lib/renderer/main.js
console.log("[INFO] main.js loaded");

const { ipcRenderer } = require("electron");
const { runAsciiIntro } = require("./lib/renderer/asciiIntro.js");
const { registerKeyboardShortcuts } = require("./lib/renderer/keyboardShortcuts.js");
const { createNewTab, switchTab, closeCurrentTab, refreshCurrentTab } = require("./lib/renderer/tabManager.js");
const { ensureSingleInputCell } = require("./lib/renderer/cellManager.js");
const { runRgwfuncsrcMissingHandler } = require("./lib/renderer/rgwfuncsrcMissingHandler.js");

runAsciiIntro();

registerKeyboardShortcuts({
  createNewTab: () => {
    console.log("[INFO] Creating new tab via keyboard shortcut");
    createNewTab(ensureSingleInputCell);
  },
  switchTab,
  closeCurrentTab,
  refreshCurrentTab: () => refreshCurrentTab(ensureSingleInputCell),
});

window.onload = () => {
  console.log("[INFO] Window loaded. Creating default tab...");
  createNewTab(ensureSingleInputCell);
};

// Listen for missing .rgwfuncrc signal
ipcRenderer.on("show-rgwfuncsrc-missing", () => {
  console.log("[INFO] Showing .rgwfuncsrc missing handler");
  runRgwfuncsrcMissingHandler();
});
