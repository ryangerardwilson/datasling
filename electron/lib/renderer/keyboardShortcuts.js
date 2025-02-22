/* lib/renderer/keyboardShortcuts.js */
"use strict";

const { updateTabTitle } = require("./tabManager");

function registerKeyboardShortcuts({ createNewTab, switchTab, closeCurrentTab, refreshCurrentTab, createHelpTab }) {
  // Zoom in/out for the active query editor's inputRow (textarea + line numbers)
  document.addEventListener("keydown", (e) => {
    const activeInputRow = document.querySelector(".tab.active .query-text-editor .flex") || document.querySelector(".query-text-editor .flex"); // Fallback selector
    if (!activeInputRow) {
      console.log("[DEBUG] No active inputRow found");
      return;
    }

    let currentScale = parseFloat(activeInputRow.style.transform.replace("scale(", "").replace(")", "") || 1);
    console.log("[DEBUG] Current scale:", currentScale);

    if (e.ctrlKey && (e.key === "+" || e.key === "=")) {
      e.preventDefault();
      console.log("[DEBUG] Zoom in triggered");
      currentScale = Math.min(3.0, currentScale + 0.2); // Max zoom 3x
      activeInputRow.style.transform = `scale(${currentScale})`;
      activeInputRow.style.transformOrigin = "top left";
      console.log("[DEBUG] New scale (zoom in):", currentScale);
    } else if (e.ctrlKey && e.key === "-") {
      e.preventDefault();
      console.log("[DEBUG] Zoom out triggered");
      currentScale = Math.max(0.6, currentScale - 0.2); // Min zoom 0.6x
      activeInputRow.style.transform = `scale(${currentScale})`;
      activeInputRow.style.transformOrigin = "top left";
      console.log("[DEBUG] New scale (zoom out):", currentScale);
    }
  });

  // Create new tab with Ctrl+T
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && (e.key === "T" || e.key === "t")) {
      e.preventDefault();
      createNewTab();
    }
  });

  // Create help tab with Ctrl+H
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && (e.key === "H" || e.key === "h")) {
      e.preventDefault();
      createHelpTab();
    }
  });

  // Switch tabs with Ctrl+LeftArrow / Ctrl+RightArrow
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "ArrowLeft") {
      e.preventDefault();
      switchTab(-1);
    }
    if (e.ctrlKey && e.key === "ArrowRight") {
      e.preventDefault();
      switchTab(1);
    }
  });

  // Close current tab with Ctrl+Shift+W
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === "W" || e.key === "w")) {
      e.preventDefault();
      closeCurrentTab();
    }
  });

  // Refresh current tab with Ctrl+R
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && (e.key === "R" || e.key === "r")) {
      e.preventDefault();
      refreshCurrentTab();
    }
  });

  // Tab key in textarea for indent
  document.addEventListener("keydown", (e) => {
    if (e.target && e.target.tagName === "TEXTAREA" && e.key === "Tab") {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const indent = "  ";
      textarea.value = textarea.value.substring(0, start) + indent + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + indent.length;
    }
  });

  // Ctrl+Shift+Enter in textarea to update tab title from comment
  document.addEventListener("keydown", (e) => {
    if (e.target && e.target.tagName === "TEXTAREA" && e.ctrlKey && e.shiftKey) {
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      if (selectedText.startsWith("--")) {
        e.preventDefault();
        updateTabTitle(selectedText.replace(/^--\s*/, ""));
        textarea.value = textarea.value.substring(0, start) + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start;
      }
    }
  });
}

module.exports = { registerKeyboardShortcuts };
