// tabManager.js
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

  // Ensure a single input cell is created for this notebook.
  ensureInputCell(notebookEl);
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

  // Ensure the input area is focused.
  const inputCell = tabs[newIndex].notebookEl.querySelector(".input-cell");
  if (inputCell) {
    const txt = inputCell.querySelector("textarea");
    if (txt)
      setTimeout(() => {
        txt.focus();
      }, 50);
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
  // Create a new input cell.
  ensureInputCell(tab.notebookEl);
  const inputCell = tab.notebookEl.querySelector(".input-cell");
  if (inputCell) {
    const txt = inputCell.querySelector("textarea");
    if (txt)
      setTimeout(() => {
        txt.focus();
      }, 50);
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
  switchTab,
  closeCurrentTab,
  refreshCurrentTab,
  updateTabTitle,
  getCurrentTab,
};
