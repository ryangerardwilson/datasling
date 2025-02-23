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

  // Generate title as "Tab" + (number of tabs + 1)
  const tabNumber = tabs.length + 1;
  const title = `Tab${tabNumber}`;
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
- Ctrl + Enter: Run the query if no "@vi" is present, or open Vim with "@vi"
- Ctrl + +/-: Zoom in/out of the query editor
- Tab (in textarea): Insert 2 spaces for indentation
- Shift + Tab (in textarea): Remove 2 spaces from the start of the line
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
  return tab.notebookEl;
}

function updateTabTitle(newTitle) {
  if (currentTabIndex < 0) return;
  tabs[currentTabIndex].title = newTitle;
  tabs[currentTabIndex].tabButton.textContent = newTitle;
}

function getCurrentTab() {
  return currentTabIndex > -1 ? tabs[currentTabIndex] : null;
}

function getTabsState() {
  return tabs.map((tab, index) => {
    const textarea = tab.notebookEl.querySelector(".query-text-editor textarea");
    const queryText = textarea ? textarea.value : "";

    const resultContainers = tab.notebookEl.querySelectorAll(".result-container");
    const tableData = Array.from(resultContainers).map((container) => {
      const titleEl = container.querySelector(".mb-1.text-base.text-green-500");
      const title = titleEl ? titleEl.textContent : "Untitled";
      const tableWrapper = container.querySelector(".output table")?.parentElement;
      const rows = tableWrapper && tableWrapper.dataset.rows ? JSON.parse(tableWrapper.dataset.rows) : [];
      return { title, rows };
    });

    return {
      id: tab.id,
      title: tab.title,
      isActive: index === currentTabIndex,
      queryText,
      tableData,
    };
  });
}

function restoreTabsState(state, ensureInputCell) {
  tabs = [];
  currentTabIndex = -1;
  const container = document.getElementById("notebookContainer");
  const tabBar = document.getElementById("tabBar");
  container.innerHTML = "";
  tabBar.innerHTML = "";

  state.forEach((tabState, index) => {
    const notebookEl = document.createElement("div");
    notebookEl.className = "notebook";
    container.appendChild(notebookEl);

    const tabButton = document.createElement("button");
    tabButton.className = "px-2 py-1 text-lg border border-green-500/50 bg-black/80 hover:border-green-300/50 hover:bg-green-900/50 text-green-200/50 focus:outline-none font-mono";
    tabButton.textContent = tabState.title;
    tabBar.appendChild(tabButton);

    const tab = {
      id: tabState.id || Date.now(),
      title: tabState.title,
      notebookEl,
      tabButton,
    };
    tabs.push(tab);

    tabButton.addEventListener("click", () => {
      const idx = tabs.findIndex((t) => t.id === tab.id);
      switchTabTo(idx);
    });

    const editor = ensureInputCell(notebookEl);
    const textarea = editor.querySelector("textarea");
    if (tabState.queryText) {
      textarea.value = tabState.queryText;
      textarea.autoResize();
    }

    if (tabState.tableData && tabState.tableData.length > 0) {
      const output = editor.querySelector(".output");
      const { displayResults, downloadODF, setAllColumnsState } = require("./resultsDisplay.js");
      const { ipcRenderer } = require("electron");

      tabState.tableData.forEach((table) => {
        if (table.rows && table.rows.length > 0) {
          const resultContainer = document.createElement("div");
          resultContainer.className = "result-container";

          const queryHeader = document.createElement("div");
          queryHeader.className = "mb-1 text-base text-green-500";
          queryHeader.textContent = table.title;
          resultContainer.appendChild(queryHeader);

          output.appendChild(resultContainer);
          displayResults({ rows: table.rows }, resultContainer);

          const actionsDiv = document.createElement("div");
          actionsDiv.className = "action-buttons mt-1 space-x-2 text-base flex";

          const downloadButton = document.createElement("button");
          downloadButton.textContent = "{download}";
          downloadButton.className = "text-green-500 hover:text-green-400";
          downloadButton.addEventListener("click", async () => {
            try {
              await downloadODF({ rows: table.rows });
            } catch (err) {
              console.error("Download ODF failed:", err);
            }
          });
          actionsDiv.appendChild(downloadButton);

          const openButton = document.createElement("button");
          openButton.textContent = "{open}";
          openButton.className = "text-green-500 hover:text-green-400";
          openButton.addEventListener("click", async () => {
            try {
              const odsFilePath = await downloadODF({ rows: table.rows });
              await ipcRenderer.invoke("open-ods", odsFilePath);
            } catch (err) {
              console.error("Failed to open ODS:", err);
            }
          });
          actionsDiv.appendChild(openButton);

          const closeButton = document.createElement("button");
          closeButton.textContent = "{close}";
          closeButton.className = "text-green-500 hover:text-green-400";
          closeButton.addEventListener("click", () => resultContainer.remove());
          actionsDiv.appendChild(closeButton);

          const expandButton = document.createElement("button");
          expandButton.textContent = "{expand}";
          expandButton.className = "text-green-500 hover:text-green-400";
          expandButton.addEventListener("click", () => {
            const tableEl = resultContainer.querySelector("table");
            if (tableEl) {
              setAllColumnsState(tableEl, true);
              expandButton.style.display = "none";
              collapseButton.style.display = "inline";
            }
          });
          actionsDiv.appendChild(expandButton);

          const collapseButton = document.createElement("button");
          collapseButton.textContent = "{collapse}";
          collapseButton.className = "text-green-500 hover:text-green-400";
          collapseButton.style.display = "none";
          collapseButton.addEventListener("click", () => {
            const tableEl = resultContainer.querySelector("table");
            if (tableEl) {
              setAllColumnsState(tableEl, false);
              collapseButton.style.display = "none";
              expandButton.style.display = "inline";
            }
          });
          actionsDiv.appendChild(collapseButton);

          resultContainer.appendChild(actionsDiv);
        }
      });
    }

    if (tabState.isActive) {
      currentTabIndex = index;
    }
  });

  if (currentTabIndex >= 0) {
    switchTabTo(currentTabIndex);
  }
}

function getTabs() {
  return tabs;
}

module.exports = {
  createNewTab,
  createHelpTab,
  switchTab,
  closeCurrentTab,
  backspaceCurrentTab,
  updateTabTitle,
  getCurrentTab,
  getTabsState,
  restoreTabsState,
  getTabs,
};
