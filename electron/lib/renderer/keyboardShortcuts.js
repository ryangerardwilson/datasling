/* lib/renderer/keyboardShortcuts.js */
"use strict";

const { updateTabTitle } = require("./tabManager");

function registerKeyboardShortcuts({ createNewTab, switchTab, closeCurrentTab, refreshCurrentTab, createHelpTab }) {
  // Zoom in/out...
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && (e.key === "+" || e.key === "=")) {
      e.preventDefault();
      document.body.style.zoom = (parseFloat(document.body.style.zoom || 1) + 0.2).toString();
    }
    if (e.ctrlKey && e.key === "-") {
      e.preventDefault();
      const newZoom = Math.max(0.6, parseFloat(document.body.style.zoom || 1) - 0.2);
      document.body.style.zoom = newZoom.toString();
    }
  });

  // Create new tab with Ctrl+T.
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && (e.key === "T" || e.key === "t")) {
      e.preventDefault();
      createNewTab();
    }
  });

  // Create help tab with Ctrl+H.
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && (e.key === "H" || e.key === "h")) {
      e.preventDefault();
      createHelpTab(); // New function to create the help tab
    }
  });

  // Switch tabs with Ctrl+LeftArrow / Ctrl+RightArrow.
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

  // Close current tab with Ctrl+Shift+W.
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === "W" || e.key === "w")) {
      e.preventDefault();
      closeCurrentTab();
    }
  });

  // Refresh current tab with Ctrl+R.
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && (e.key === "R" || e.key === "r")) {
      e.preventDefault();
      refreshCurrentTab();
    }
  });

  // Tab key in textarea for indent.
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

  // Ctrl+Shift+Enter in textarea to update tab title from comment.
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
