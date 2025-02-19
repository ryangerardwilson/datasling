/* cellManager.js */
const { ipcRenderer } = require("electron");
const { displayResults, downloadCSV, toggleColumn, setColumnState } = require("./resultsDisplay");
const { updateTabTitle } = require("./tabManager");
const { expandIcon, contractIcon } = require("./icons"); // Import your SVG icon strings

// Global variable to hold the currently selected preset (null = default).
let currentPreset = null;

// Helper: Formats the current time as YYYYMMDDHHMMSS.
function generateTimestamp() {
  const now = new Date();
  const pad = (num) => num.toString().padStart(2, "0");
  return now.getFullYear().toString() + pad(now.getMonth() + 1) + pad(now.getDate()) + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
}

// Helper: Returns the text of the current line where the caret is.
function getCurrentLine(textarea) {
  const selectionStart = textarea.selectionStart;
  const value = textarea.value;
  const lastNewline = value.lastIndexOf("\n", selectionStart - 1);
  const nextNewline = value.indexOf("\n", selectionStart);
  const line = value.substring(lastNewline + 1, nextNewline === -1 ? value.length : nextNewline);
  return line.trim();
}

// Helper: Given a textarea and a preset string, replace the current line (if it starts with "@preset::")
// with "@preset::<preset>" and adjust the caret position accordingly.
function replacePresetDirective(textarea, preset) {
  const value = textarea.value;
  const caretPos = textarea.selectionStart;
  const start = value.lastIndexOf("\n", caretPos - 1) + 1;
  let end = value.indexOf("\n", caretPos);
  if (end === -1) end = value.length;
  const currentLine = value.substring(start, end);
  const prefix = "@preset::";
  if (currentLine.trim().startsWith(prefix)) {
    const newLine = prefix + preset;
    textarea.value = value.substring(0, start) + newLine + value.substring(end);
    // Set caret position directly after the inserted preset.
    textarea.setSelectionRange(start + newLine.length, start + newLine.length);
  }
}

/*
  showPresetDropdown renders a dropdown with a transparent background (no border)
  that displays all preset names. It supports up/down arrow navigation and selection
  with Enter. Each preset item is styled with text-green-500.
  
  When Enter is pressed (or an item is clicked):
    - The selected preset is inserted right after the "@preset::" directive on that line.
    - The callback is called.
    - The dropdown is hidden and its key handler removed.
*/
function showPresetDropdown(presets, callback, textarea) {
  let dropdown = document.getElementById("presetDropdown");
  if (!dropdown) {
    dropdown = document.createElement("div");
    dropdown.id = "presetDropdown";
    // No border; use transparent background, rounded corners, shadow, high z-index.
    dropdown.className = "absolute bg-transparent rounded shadow-lg z-50";
    document.body.appendChild(dropdown);
  }
  // Position dropdown below the textarea.
  const rect = textarea.getBoundingClientRect();
  dropdown.style.left = rect.left + "px";
  dropdown.style.top = rect.bottom + "px";
  dropdown.style.width = rect.width + "px";

  // Clear any existing options.
  dropdown.innerHTML = "";
  let selectedIndex = 0;

  // Create an item for each preset.
  presets.forEach((preset, index) => {
    const item = document.createElement("div");
    // Style each item with text-green-500 and padding. Hover style remains.
    item.className = "preset-item px-2 py-1 cursor-pointer text-green-500 hover:bg-gray-200";
    item.textContent = preset;
    item.dataset.index = index;
    item.addEventListener("click", () => {
      callback(preset);
      replacePresetDirective(textarea, preset);
      dropdown.style.display = "none";
      textarea.removeEventListener("keydown", keyHandler);
    });
    dropdown.appendChild(item);
  });

  // Function to update highlight on items.
  function updateHighlight() {
    const items = dropdown.querySelectorAll(".preset-item");
    items.forEach((item, idx) => {
      if (idx === selectedIndex) {
        // Use a transparent dark gray highlight.
        item.classList.add("bg-gray-800", "bg-opacity-30");
      } else {
        item.classList.remove("bg-gray-800", "bg-opacity-30");
      }
    });
  }
  updateHighlight();

  // Key handler for navigating the dropdown.
  function keyHandler(e) {
    if (dropdown.style.display === "block") {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % presets.length;
        updateHighlight();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + presets.length) % presets.length;
        updateHighlight();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selectedPreset = presets[selectedIndex];
        callback(selectedPreset);
        replacePresetDirective(textarea, selectedPreset);
        dropdown.style.display = "none";
        textarea.removeEventListener("keydown", keyHandler);
      } else if (e.key === "Escape") {
        e.preventDefault();
        dropdown.style.display = "none";
        textarea.removeEventListener("keydown", keyHandler);
      }
    }
  }

  // Remove existing key handler, then attach this one.
  textarea.removeEventListener("keydown", dropdown._keyHandler || (() => {}));
  textarea.addEventListener("keydown", keyHandler);
  dropdown._keyHandler = keyHandler;

  dropdown.style.display = "block";
}

/*
  ensureSingleInputCell ensures that each notebook (tab) has one persistent input cell.
  The cell contains a textarea for SQL queries and an output container.
*/
function ensureSingleInputCell(notebookEl) {
  let inputCell = notebookEl.querySelector(".input-cell");
  if (!inputCell) {
    inputCell = document.createElement("div");
    inputCell.className = "cell input-cell";

    // Create input row: container with line numbers and textarea (set as relative for dropdown positioning).
    const inputRow = document.createElement("div");
    inputRow.className = "flex relative";

    // Line numbers element.
    const lineNumbers = document.createElement("div");
    lineNumbers.className = "whitespace-pre text-gray-600 select-none pr-2 text-xl";
    lineNumbers.style.width = "2rem";
    lineNumbers.textContent = "1";
    inputRow.appendChild(lineNumbers);

    // Create the textarea.
    const textarea = document.createElement("textarea");
    textarea.className = "w-full bg-transparent border-none text-green-500 focus:outline-none text-xl resize-none";
    textarea.placeholder = "Type your SQL query here (Ctrl+Enter to run)...";
    textarea.style.height = "40vh";
    inputRow.appendChild(textarea);

    function autoResize() {
      textarea.style.height = "auto";
      const newHeight = textarea.scrollHeight;
      textarea.style.height = newHeight + "px";
      lineNumbers.style.height = newHeight + "px";
    }

    textarea.addEventListener("input", () => {
      autoResize();
      const lines = textarea.value.split("\n").length;
      let lineNumText = "";
      for (let i = 1; i <= lines; i++) {
        lineNumText += i + "\n";
      }
      lineNumbers.textContent = lineNumText.trim();

      // Show dropdown only if the current line (where the caret is) is exactly "@preset::"
      const currentLine = getCurrentLine(textarea);
      if (currentLine === "@preset::") {
        ipcRenderer
          .invoke("get-mssql-presets")
          .then((presets) => {
            showPresetDropdown(
              presets,
              (selected) => {
                currentPreset = selected;
                console.log(`Preset selected: ${currentPreset}`);
              },
              textarea,
            );
          })
          .catch((err) => {
            console.error("Error getting presets:", err);
          });
      } else {
        const dropdown = document.getElementById("presetDropdown");
        if (dropdown) {
          dropdown.style.display = "none";
        }
      }
    });
    textarea.addEventListener("scroll", () => {
      lineNumbers.scrollTop = textarea.scrollTop;
    }); // When Ctrl+Enter is pressed, process and execute queries.

    textarea.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        const queryText = textarea.value.trim();
        if (!queryText) return; // Reset preset so that if no directive is provided, the default is used.
        currentPreset = null;
        if (queryText.indexOf(";") !== -1) {
          const queries = queryText
            .split(";")
            .map((q) => q.trim())
            .filter((q) => q.length);
          for (const query of queries) {
            if (query.startsWith("@preset::")) {
              let lines = query.split("\n"); // Extract preset (only the first line).
              currentPreset = lines[0].replace("@preset::", "").trim();
              console.log(`Preset updated to "${currentPreset}"`); // If additional query text appears on the same segment, execute it.
              if (lines.length > 1) {
                let remainingQuery = lines.slice(1).join("\n").trim();
                if (remainingQuery.length) {
                  await runQuery(inputCell, remainingQuery);
                }
              }
              continue;
            }
            await runQuery(inputCell, query);
          }
        } else {
          // Newline-based segmentation.
          const lines = queryText.split("\n");
          let segment = "";
          for (const line of lines) {
            const trimmedLine = line.trim(); // If the line is a preset directive…
            if (trimmedLine.startsWith("@preset::")) {
              // Execute any pending query before switching preset.
              if (segment.trim() !== "") {
                await runQuery(inputCell, segment.trim());
                segment = "";
              } // Update currentPreset with the new value.
              currentPreset = trimmedLine.replace("@preset::", "").split("\n")[0].trim();
              console.log(`Preset updated to "${currentPreset}"`);
            } else if (trimmedLine === "") {
              // A blank line marks the end of a segment.
              if (segment.trim() !== "") {
                await runQuery(inputCell, segment.trim());
                segment = "";
              }
            } else {
              // Append non-blank, non-directive lines.
              segment += " " + trimmedLine;
            }
          } // Execute remaining query segment, if any.
          if (segment.trim() !== "") {
            await runQuery(inputCell, segment.trim());
          }
        }
        autoResize();
      }
    });

    // Create an output container below the input row.
    const output = document.createElement("div");
    output.className = "output mt-4 space-y-4";

    inputCell.appendChild(inputRow);
    inputCell.appendChild(output);
    notebookEl.appendChild(inputCell);

    // Focus the textarea after a short delay.
    setTimeout(() => {
      textarea.focus();
    }, 50);
  } else {
    const existingTextarea = inputCell.querySelector("textarea");
    if (existingTextarea) {
      setTimeout(() => {
        existingTextarea.focus();
      }, 50);
    }
  }
  return inputCell;
}

/*
  runQuery executes the given query and appends the result to the output container.
  The query header is stamped with a timestamp.
  The query is sent along with the currentPreset.
*/
async function runQuery(inputCell, query) {
  const output = inputCell.querySelector(".output");

  const resultContainer = document.createElement("div");
  resultContainer.className = "result-container";

  const queryHeader = document.createElement("div");
  queryHeader.className = "mb-1 text-xl text-green-500";
  queryHeader.textContent = "query_" + generateTimestamp();
  resultContainer.appendChild(queryHeader);

  const status = document.createElement("div");
  status.className = "text-xl";
  status.textContent = "Running query...";
  resultContainer.appendChild(status);
  output.appendChild(resultContainer);

  // Declare data here so it is available in the event listener later.
  let data;

  try {
    data = await ipcRenderer.invoke("database-query", { query, preset: currentPreset });
    if (status.parentNode === resultContainer) {
      resultContainer.removeChild(status);
    }
    displayResults(data, resultContainer, { expandIcon, contractIcon, toggleColumn, setColumnState });
  } catch (err) {
    console.error("Database query failed:", err);
    if (status.parentNode === resultContainer) {
      resultContainer.removeChild(status);
    }
    const errorMsg = document.createElement("div");
    errorMsg.className = "text-xl text-red-500";
    errorMsg.textContent = "Error querying database. Check console for details.";
    resultContainer.appendChild(errorMsg);
    const actionsErr = document.createElement("div");
    actionsErr.className = "mt-1 space-x-2 text-xl action-buttons";
    const closeErr = document.createElement("button");
    closeErr.textContent = "Close";
    closeErr.className = "text-green-500 hover:text-green-400";
    closeErr.addEventListener("click", () => resultContainer.remove());
    actionsErr.appendChild(closeErr);
    resultContainer.appendChild(actionsErr);
  }

  if (!resultContainer.querySelector(".action-buttons")) {
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "action-buttons mt-1 space-x-2 text-xl";
    const closeButton = document.createElement("button");
    closeButton.textContent = "{close}";
    closeButton.className = "text-green-500 hover:text-green-400";
    closeButton.addEventListener("click", () => resultContainer.remove());
    actionsDiv.appendChild(closeButton);

    const downloadButton = document.createElement("button");
    downloadButton.textContent = "{downloadCSV}";
    downloadButton.className = "text-green-500 hover:text-green-400";
    downloadButton.addEventListener("click", () => downloadCSV(data));
    actionsDiv.appendChild(downloadButton);

    resultContainer.appendChild(actionsDiv);
  }
}

module.exports = {
  ensureSingleInputCell,
  runQuery,
};
