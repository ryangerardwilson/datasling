/* lib/renderer/queryTextEditor.js */
const { ipcRenderer } = require("electron");

const createQueryTextEditor = (notebookEl) => {
  let editor = notebookEl.querySelector(".query-text-editor");
  if (!editor) {
    editor = document.createElement("div");
    editor.className = "query-text-editor p-4";

    const editorWrapper = document.createElement("div");
    editorWrapper.className = "w-full max-h-[40vh] overflow-auto";

    const inputRow = document.createElement("div");
    inputRow.className = "flex relative w-full";

    const lineNumbers = document.createElement("div");
    lineNumbers.className = "whitespace-pre text-white/20 select-none text-4xl w-8 flex-shrink-0";
    lineNumbers.textContent = "1";
    inputRow.appendChild(lineNumbers);

    const textarea = document.createElement("textarea");
    textarea.className = "w-full bg-transparent border-none text-green-500 focus:outline-none text-4xl ml-4 resize-none overflow-hidden";
    textarea.placeholder = "Type your SQL query here (Ctrl+Enter to run query or open Vim with @vi)...";
    textarea.style.minHeight = "2rem";
    inputRow.appendChild(textarea);

    const autoResize = () => {
      textarea.style.height = "0px";
      textarea.style.height = `${textarea.scrollHeight}px`;
      lineNumbers.style.height = `${textarea.scrollHeight}px`;
      const lineCount = textarea.value.split("\n").length;
      lineNumbers.textContent = Array.from({ length: lineCount }, (_, i) => i + 1).join("\n");
    };

    textarea.autoResize = autoResize;
    textarea.addEventListener("input", autoResize);
    textarea.addEventListener("scroll", () => (lineNumbers.scrollTop = textarea.scrollTop));

    const output = document.createElement("div");
    output.className = "output mt-4 space-y-4";

    editorWrapper.appendChild(inputRow);
    editor.appendChild(editorWrapper);
    editor.appendChild(output);
    notebookEl.appendChild(editor);

    setTimeout(() => {
      textarea.focus();
      autoResize();
    }, 50);
  }
  return editor;
};

module.exports = { createQueryTextEditor };
