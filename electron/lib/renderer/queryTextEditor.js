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
    textarea.style.height = "40vh"; // Initial height
    textarea.style.minHeight = "2rem"; // Minimum height to avoid collapsing too small
    inputRow.appendChild(textarea);

    const autoResize = () => {
      // Force a reflow by briefly setting height to 0px
      textarea.style.height = "0px";
      // Then set it to the actual scrollHeight
      textarea.style.height = `${textarea.scrollHeight}px`;
      // Sync line numbers height and content
      lineNumbers.style.height = `${textarea.scrollHeight}px`;
      const lineCount = textarea.value.split("\n").length;
      lineNumbers.textContent = Array.from({ length: lineCount }, (_, i) => i + 1).join("\n");
    };

    // Trigger resize on input (typing, pasting, deleting)
    textarea.addEventListener("input", autoResize);
    // Sync scrolling between textarea and line numbers
    textarea.addEventListener("scroll", () => (lineNumbers.scrollTop = textarea.scrollTop));

    const output = document.createElement("div");
    output.className = "output mt-4 space-y-4";

    editor.appendChild(inputRow);
    editor.appendChild(output);
    notebookEl.appendChild(editor);

    // Initial focus and resize
    setTimeout(() => {
      textarea.focus();
      autoResize(); // Ensure initial height matches content
    }, 50);
  }
  return editor;
};

module.exports = { createQueryTextEditor };
