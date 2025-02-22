/* lib/renderer/tabManager.js */
let tabs = [];
let currentTabIndex = -1;

function createNewTab(ensureInputCell) {
  const notebookEl = document.createElement("div");
  notebookEl.className = "notebook";
  notebookEl.innerHTML = "";
  const container = document.getElementById("notebookContainer");
  container.appendChild(notebookEl);

  const tabBar = document.getElementById("tabBar");
  const tabButton = document.createElement("button");
  tabButton.className = "px-2 py-1 text-lg border border-green-500/50 bg-black/80 hover:border-green-300/50 hover:bg-green-900/50 text-green-200/50 focus:outline-none font-mono";
  const title = tabs.length === 0 ? "Tab1" : "New Tab";
  tabButton.textContent = title;
  tabBar.appendChild(tabButton);

  const tab = {
    id: Date.now(),
    title,
    notebookEl,
    tabButton,
  };
  tabs.push(tab);

  tabButton.addEventListener("click", () => {
    const index = tabs.findIndex((t) => t.id === tab.id);
    switchTabTo(index);
  });

  switchTabTo(tabs.length - 1);
  ensureInputCell(notebookEl);
  return notebookEl;
}

function createHelpTab() {
  const notebookEl = document.createElement("div");
  notebookEl.className = "notebook";
  notebookEl.innerHTML = "";
  const container = document.getElementById("notebookContainer");
  container.appendChild(notebookEl);

  const tabBar = document.getElementById("tabBar");
  const tabButton = document.createElement("button");
  tabButton.className = "px-2 py-1 text-lg border border-green-500 bg-black/20 hover:border-green-300 hover:bg-green-900/50 text-green-500 focus:outline-none font-mono";
  const title = "helpDocs";
  tabButton.textContent = title;
  tabBar.appendChild(tabButton);

  const tab = {
    id: Date.now(),
    title,
    notebookEl,
    tabButton,
  };
  tabs.push(tab);

  tabButton.addEventListener("click", () => {
    const index = tabs.findIndex((t) => t.id === tab.id);
    switchTabTo(index);
  });

  const helpContent = document.createElement("div");
  helpContent.className = "bg-black/80 text-green-500 font-mono p-4 rounded text-lg";
  helpContent.innerHTML = `
    <h2 class="text-lg mb-2">How to Use DataSling</h2>
    <pre class="whitespace-pre-wrap">
Welcome to DataSling, your SQL query tool!

Key Commands:
- Ctrl + T: Open a new query tab
- Ctrl + H: Open this help tab
- Ctrl + Left/Right Arrow: Switch between tabs
- Ctrl + W: Close the current tab
- Ctrl + Backspace: Backspace the current tab (clears content)
- Ctrl + Enter: Run the query if no "@vi" is present, or open Vim with "@vi" (see below)
- Ctrl + +/-: Zoom in/out of the query editor
- Tab (in textarea): Insert 2 spaces for indentation
- Shift + Tab (in textarea): Remove 2 spaces from the start of the line (unindent)
- Ctrl + Shift + Enter (in textarea): Set tab title from selected comment (e.g., "-- My Query")

Vim Integration:
- Include "@vi" anywhere in your query text (e.g., "SELECT * FROM table @vi") and press Ctrl + Enter to open the full text in Vim.
- All "@vi" instances are removed before opening Vim.
- Edit in Vim, save with :wq, and the updated content replaces the textarea content.

Query Tips:
- Type "@preset::" to select a database preset (e.g., "@preset::MSSQL")
- Use multiple presets in one tab by separating queries with blank lines
- Results can be downloaded as ODS or opened in LibreOffice
    </pre>
  `;
  notebookEl.appendChild(helpContent);

  switchTabTo(tabs.length - 1);
  return notebookEl;
}

function switchTabTo(newIndex) {
  if (newIndex < 0 || newIndex >= tabs.length) return;
  tabs.forEach((tab) => {
    tab.notebookEl.style.display = "none";
    tab.tabButton.classList.remove("bg-green-900/50", "text-green-200");
  });
  currentTabIndex = newIndex;
  tabs[newIndex].notebookEl.style.display = "block";
  tabs[newIndex].tabButton.classList.add("bg-green-900/50", "text-green-200");

  const editor = tabs[newIndex].notebookEl.querySelector(".query-text-editor");
  if (editor) {
    const txt = editor.querySelector("textarea");
    if (txt) setTimeout(() => txt.focus(), 50);
  }
}

function switchTab(direction) {
  if (tabs.length === 0) return;
  const newIndex = (currentTabIndex + direction + tabs.length) % tabs.length;
  switchTabTo(newIndex);
}

function closeCurrentTab() {
  if (tabs.length === 0 || currentTabIndex < 0) return;
  const tab = tabs[currentTabIndex];
  tab.notebookEl.remove();
  tab.tabButton.remove();
  tabs.splice(currentTabIndex, 1);
  if (tabs.length) {
    currentTabIndex = Math.max(0, currentTabIndex - 1);
    switchTabTo(currentTabIndex);
  } else {
    currentTabIndex = -1;
  }
}

function backspaceCurrentTab(ensureInputCell) {
  if (currentTabIndex < 0) return;
  const tab = tabs[currentTabIndex];
  tab.notebookEl.innerHTML = "";
  ensureInputCell(tab.notebookEl);
  const editor = tab.notebookEl.querySelector(".query-text-editor");
  if (editor) {
    const txt = editor.querySelector("textarea");
    if (txt) setTimeout(() => txt.focus(), 50);
  }
  return tab.notebookEl; // Return the modified notebookEl
}

function updateTabTitle(newTitle) {
  if (currentTabIndex < 0) return;
  tabs[currentTabIndex].title = newTitle;
  tabs[currentTabIndex].tabButton.textContent = newTitle;
}

function getCurrentTab() {
  return currentTabIndex > -1 ? tabs[currentTabIndex] : null;
}

module.exports = {
  createNewTab,
  createHelpTab,
  switchTab,
  closeCurrentTab,
  backspaceCurrentTab,
  updateTabTitle,
  getCurrentTab,
};
