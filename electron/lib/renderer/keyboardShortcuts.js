"use strict";

const { updateTabTitle } = require("./tabManager");

function registerKeyboardShortcuts({ createNewTab, switchTab, closeCurrentTab, backspaceCurrentTab, createHelpTab }) {
  document.addEventListener("keydown", (e) => {
    // Target the query editor's flex container in the active notebook
    const activeNotebook = document.querySelector(".notebook[style*='display: block']");
    const activeInputRow = activeNotebook ? activeNotebook.querySelector(".query-text-editor .flex") : document.querySelector(".query-text-editor .flex");

    if (!activeInputRow) {
      console.log("[DEBUG] No active inputRow found");
      return;
    }

    console.log("[DEBUG] Zoom event triggered. Key:", e.key, "Ctrl:", e.ctrlKey);

    let currentScale = parseFloat(activeInputRow.style.transform.replace("scale(", "").replace(")", "") || 1);
    if (e.ctrlKey && (e.key === "+" || e.key === "=")) {
      e.preventDefault();
      currentScale = Math.min(3.0, currentScale + 0.2);
      activeInputRow.style.transform = `scale(${currentScale})`;
      activeInputRow.style.transformOrigin = "top left";
      console.log("[DEBUG] Zoom in. New scale:", currentScale);
    } else if (e.ctrlKey && e.key === "-") {
      e.preventDefault();
      currentScale = Math.max(0.6, currentScale - 0.2);
      activeInputRow.style.transform = `scale(${currentScale})`;
      activeInputRow.style.transformOrigin = "top left";
      console.log("[DEBUG] Zoom out. New scale:", currentScale);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && (e.key === "T" || e.key === "t")) {
      e.preventDefault();
      createNewTab();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && (e.key === "H" || e.key === "h")) {
      e.preventDefault();
      createHelpTab();
    }
  });

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

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && (e.key === "W" || e.key === "w")) {
      e.preventDefault();
      closeCurrentTab();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Backspace") {
      e.preventDefault();
      backspaceCurrentTab();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "TEXTAREA" && e.key === "Tab") {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (e.shiftKey) {
        const before = textarea.value.substring(0, start);
        const lineStart = before.lastIndexOf("\n") + 1;
        if (textarea.value.substring(lineStart, start).startsWith("  ")) {
          textarea.value = textarea.value.substring(0, lineStart) + textarea.value.substring(lineStart + 2);
          textarea.selectionStart = textarea.selectionEnd = start - 2;
        }
      } else {
        const indent = "  ";
        textarea.value = textarea.value.substring(0, start) + indent + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + indent.length;
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.target && e.target.tagName === "TEXTAREA" && e.ctrlKey && e.shiftKey && e.key === "Enter") {
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
