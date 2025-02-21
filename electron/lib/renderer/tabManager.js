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
  tabButton.className = "px-3 py-1 text-lg border border-green-500 rounded hover:bg-green-500 hover:text-black focus:outline-none";
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
  tabButton.className = "px-3 py-1 text-lg border border-green-500 rounded hover:bg-green-500 hover:text-black focus:outline-none";
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

  // Add help content
  const helpContent = document.createElement("div");
  helpContent.className = "bg-black/80 text-green-500 font-mono p-4 rounded text-xl";
  helpContent.innerHTML = `
    <h2 class="text-2xl mb-2">How to Use DataSling</h2>
    <pre class="whitespace-pre-wrap">
Welcome to DataSling, your SQL query tool!

Key Commands:
- Ctrl + T: Open a new query tab
- Ctrl + H: Open this help tab
- Ctrl + Left/Right Arrow: Switch between tabs
- Ctrl + Shift + W: Close the current tab
- Ctrl + R: Refresh the current tab
- Ctrl + Enter: Run the query in the current tab
- Ctrl + +/-: Zoom in/out
- Tab (in textarea): Insert 2 spaces
- Ctrl + Shift + Enter (in textarea): Set tab title from selected comment (e.g., "-- My Query")

Query Tips:
- Type "@preset::" to select a database preset (e.g., MSSQL, MySQL)
- Use multiple presets in one tab by separating queries with blank lines
- Results can be downloaded as ODS or opened in LibreOffice

Enjoy querying!
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
    tab.tabButton.classList.remove("bg-green-500", "text-black");
  });
  currentTabIndex = newIndex;
  tabs[newIndex].notebookEl.style.display = "block";
  tabs[newIndex].tabButton.classList.add("bg-green-500", "text-black");

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

function refreshCurrentTab(ensureInputCell) {
  if (currentTabIndex < 0) return;
  const tab = tabs[currentTabIndex];
  tab.notebookEl.innerHTML = "";
  ensureInputCell(tab.notebookEl);
  const editor = tab.notebookEl.querySelector(".query-text-editor");
  if (editor) {
    const txt = editor.querySelector("textarea");
    if (txt) setTimeout(() => txt.focus(), 50);
  }
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
  createHelpTab, // Export the new function
  switchTab,
  closeCurrentTab,
  refreshCurrentTab,
  updateTabTitle,
  getCurrentTab,
};
