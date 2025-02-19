// renderer.js
console.log("renderer.js loaded");

const { runAsciiIntro } = require("./renderer-modules/asciiIntro");
runAsciiIntro();

const { registerKeyboardShortcuts } = require("./renderer-modules/keyboardShortcuts");
const { createNewTab, switchTab, closeCurrentTab, refreshCurrentTab } = require("./renderer-modules/tabManager");
const { ensureSingleInputCell } = require("./renderer-modules/cellManager");

registerKeyboardShortcuts({
  createNewTab: () => {
    console.log("Creating new tab via keyboard shortcut");
    createNewTab(ensureSingleInputCell);
  },
  switchTab,
  closeCurrentTab,
  refreshCurrentTab: () => refreshCurrentTab(ensureSingleInputCell),
});

window.onload = () => {
  console.log("Window loaded. Creating default tab...");
  createNewTab(ensureSingleInputCell);
};
