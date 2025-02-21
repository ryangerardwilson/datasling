/* lib/renderer/queryTextEditor.js */
const createQueryTextEditor = (notebookEl) => {
  let editor = notebookEl.querySelector(".query-text-editor");
  if (!editor) {
    editor = document.createElement("div");
    editor.className = "cell query-text-editor";

    const inputRow = document.createElement("div");
    inputRow.className = "flex relative";

    const lineNumbers = document.createElement("div");
    lineNumbers.className = "whitespace-pre text-gray-600 select-none pr-2 text-xl";
    lineNumbers.style.width = "2rem";
    lineNumbers.textContent = "1";
    inputRow.appendChild(lineNumbers);

    const textarea = document.createElement("textarea");
    textarea.className = "w-full bg-transparent border-none text-green-500 focus:outline-none text-xl resize-none";
    textarea.placeholder = "Type your SQL query here (Ctrl+Enter to run)...";
    textarea.style.height = "40vh";
    inputRow.appendChild(textarea);

    const autoResize = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
      lineNumbers.style.height = `${textarea.scrollHeight}px`;
      lineNumbers.textContent = Array.from({ length: textarea.value.split("\n").length }, (_, i) => i + 1).join("\n");
    };
    textarea.addEventListener("input", autoResize);
    textarea.addEventListener("scroll", () => (lineNumbers.scrollTop = textarea.scrollTop));

    const output = document.createElement("div");
    output.className = "output mt-4 space-y-4";

    editor.appendChild(inputRow);
    editor.appendChild(output);
    notebookEl.appendChild(editor);

    setTimeout(() => textarea.focus(), 50);
  }
  return editor;
};

module.exports = { createQueryTextEditor };
