/* lib/renderer/queryTextEditor.js */
const createQueryTextEditor = (notebookEl) => {
  let editor = notebookEl.querySelector(".query-text-editor");
  if (!editor) {
    editor = document.createElement("div");
    editor.className = "query-text-editor p-4";

    // Scrollable wrapper for the editor content
    const editorWrapper = document.createElement("div");
    editorWrapper.className = "w-full max-h-[40vh] overflow-auto"; // Tailwind: full width, 50vh height, scrollable

    const inputRow = document.createElement("div");
    inputRow.className = "flex relative w-full"; // This will be scaled

    const lineNumbers = document.createElement("div");
    lineNumbers.className = "whitespace-pre text-white/20 select-none text-4xl w-8 flex-shrink-0";
    lineNumbers.textContent = "1";
    inputRow.appendChild(lineNumbers);

    const textarea = document.createElement("textarea");
    textarea.className = "w-full bg-transparent border-none text-green-500 focus:outline-none text-4xl ml-4 resize-none overflow-hidden"; // No internal scrolling
    textarea.placeholder = "Type your SQL query here (Ctrl+Enter to run)...";
    textarea.style.minHeight = "2rem"; // Minimum height
    inputRow.appendChild(textarea);

    const autoResize = () => {
      textarea.style.height = "0px"; // Force reflow
      textarea.style.height = `${textarea.scrollHeight}px`; // Set to content height
      lineNumbers.style.height = `${textarea.scrollHeight}px`; // Sync height
      const lineCount = textarea.value.split("\n").length;
      lineNumbers.textContent = Array.from({ length: lineCount }, (_, i) => i + 1).join("\n");
    };

    // Trigger resize on input
    textarea.addEventListener("input", autoResize);
    // Sync scrolling (optional, since wrapper handles it now)
    textarea.addEventListener("scroll", () => (lineNumbers.scrollTop = textarea.scrollTop));

    const output = document.createElement("div");
    output.className = "output mt-4 space-y-4";

    editorWrapper.appendChild(inputRow); // Add inputRow to scrollable wrapper
    editor.appendChild(editorWrapper); // Wrapper goes in editor
    editor.appendChild(output); // Output stays outside wrapper
    notebookEl.appendChild(editor);

    // Initial focus and resize
    setTimeout(() => {
      textarea.focus();
      autoResize();
    }, 50);
  }
  return editor;
};

module.exports = { createQueryTextEditor };
