"use strict";

const { updateTabTitle } = require('./tabManager');

function registerKeyboardShortcuts({ createNewTab, switchTab, closeCurrentTab, refreshCurrentTab }) {
  // Zoom in/out...
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
      e.preventDefault();
      document.body.style.zoom = (parseFloat(document.body.style.zoom || 1) + 0.2).toString();
    }
    if (e.ctrlKey && e.key === '-') {
      e.preventDefault();
      const newZoom = Math.max(0.6, parseFloat(document.body.style.zoom || 1) - 0.2);
      document.body.style.zoom = newZoom.toString();
    }
  });

  // Create new tab with Ctrl+T.
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && (e.key === 'T' || e.key === 't')) {
      e.preventDefault();
      createNewTab(); // createNewTab here is already a function that calls createNewTab(createNewCell)
    }
  });

  // Switch tabs with Ctrl+LeftArrow / Ctrl+RightArrow.
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      switchTab(-1);
    }
    if (e.ctrlKey && e.key === 'ArrowRight') {
      e.preventDefault();
      switchTab(1);
    }
  });

  // Close current tab with Ctrl+Shift+W.
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'W' || e.key === 'w')) {
      e.preventDefault();
      closeCurrentTab();
    }
  });

  // Refresh current tab with Ctrl+R.
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && (e.key === 'R' || e.key === 'r')) {
      e.preventDefault();
      refreshCurrentTab();
    }
  });

  // Listen for the Tab key in any textarea to insert 2 spaces as an indent.
  document.addEventListener('keydown', e => {
    // Check if the target is a textarea and the Tab key was pressed.
    if (e.target && e.target.tagName === 'TEXTAREA' && e.key === 'Tab') {
      e.preventDefault();
  
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const indent = "  "; // 2 spaces
      
      // Insert the indent at the current cursor position or replace selected text.
      textarea.value = textarea.value.substring(0, start) + indent + textarea.value.substring(end);
      
      // Move the cursor to the new position after the inserted spaces.
      textarea.selectionStart = textarea.selectionEnd = start + indent.length;
    }
  });

  // Listen for Ctrl+Shift+Enter in any textarea to update the tab title
  // if the selected text starts with "--", then remove that text from the textarea.
  document.addEventListener('keydown', e => {
    if (
      e.target &&
      e.target.tagName === 'TEXTAREA' &&
      e.ctrlKey &&
      e.shiftKey
    ) {
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);

      if (selectedText.startsWith('--')) {
        e.preventDefault();
        // Update the tab title by stripping the leading "--" and any extra whitespace.
        updateTabTitle(selectedText.replace(/^--\s*/, ''));
        // Remove the selected text (the comment) from the textarea.
        textarea.value = textarea.value.substring(0, start) + textarea.value.substring(end);
        // Optionally, update the caret position.
        textarea.selectionStart = textarea.selectionEnd = start;
      }
    }
  });


}

module.exports = { registerKeyboardShortcuts };

