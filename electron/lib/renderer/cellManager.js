/* lib/renderer/cellManager.js */
const { ipcRenderer } = require("electron");
const { displayResults, downloadCSV, toggleColumn, setColumnState } = require("./resultsDisplay.js");
const { updateTabTitle } = require("./tabManager.js");
const { expandIcon, contractIcon } = require("./icons.js");

let currentPreset = null;

const generateTimestamp = () => {
  const now = new Date();
  const pad = (num) => num.toString().padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

const getCurrentLine = (textarea) => {
  const selectionStart = textarea.selectionStart;
  const value = textarea.value;
  const lastNewline = value.lastIndexOf("\n", selectionStart - 1);
  const nextNewline = value.indexOf("\n", selectionStart);
  return value.substring(lastNewline + 1, nextNewline === -1 ? value.length : nextNewline).trim();
};

const replacePresetDirective = (textarea, preset) => {
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
    textarea.setSelectionRange(start + newLine.length, start + newLine.length);
  }
};

const showPresetDropdown = (presets, callback, textarea) => {
  let dropdown = document.getElementById("presetDropdown");
  if (!dropdown) {
    dropdown = document.createElement("div");
    dropdown.id = "presetDropdown";
    dropdown.className = "absolute bg-transparent rounded shadow-lg z-50";
    document.body.appendChild(dropdown);
  }

  const rect = textarea.getBoundingClientRect();
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.top = `${rect.bottom}px`;
  dropdown.style.width = `${rect.width}px`;

  dropdown.innerHTML = "";
  let selectedIndex = 0;
  presets.forEach((preset, index) => {
    const item = document.createElement("div");
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

  const updateHighlight = () => {
    const items = dropdown.querySelectorAll(".preset-item");
    items.forEach((item, idx) => {
      item.classList.toggle("bg-gray-800", idx === selectedIndex);
      item.classList.toggle("bg-opacity-30", idx === selectedIndex);
    });
  };
  updateHighlight();

  const keyHandler = (e) => {
    if (dropdown.style.display !== "block") return;
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
  };

  textarea.removeEventListener("keydown", dropdown._keyHandler || (() => {}));
  textarea.addEventListener("keydown", keyHandler);
  dropdown._keyHandler = keyHandler;

  dropdown.style.display = "block";
};

const ensureSingleInputCell = (notebookEl) => {
  let inputCell = notebookEl.querySelector(".input-cell");
  if (!inputCell) {
    inputCell = document.createElement("div");
    inputCell.className = "cell input-cell";

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
      const newHeight = textarea.scrollHeight;
      textarea.style.height = `${newHeight}px`;
      lineNumbers.style.height = `${newHeight}px`;
    };

    textarea.addEventListener("input", () => {
      autoResize();
      const lines = textarea.value.split("\n").length;
      lineNumbers.textContent = Array.from({ length: lines }, (_, i) => i + 1).join("\n");

      const currentLine = getCurrentLine(textarea);
      if (currentLine === "@preset::") {
        ipcRenderer
          .invoke("get-presets", "mssql")
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
          .catch((err) => console.error("Error getting presets:", err));
      } else {
        const dropdown = document.getElementById("presetDropdown");
        if (dropdown) dropdown.style.display = "none";
      }
    });

    textarea.addEventListener("scroll", () => {
      lineNumbers.scrollTop = textarea.scrollTop;
    });

    textarea.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        const queryText = textarea.value.trim();
        if (!queryText) return;
        currentPreset = null;
        const lines = queryText.split("\n");
        let segment = "";
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith("@preset::")) {
            if (segment.trim()) {
              await runQuery(inputCell, segment.trim());
              segment = "";
            }
            currentPreset = trimmedLine.replace("@preset::", "").split("\n")[0].trim();
            console.log(`Preset updated to "${currentPreset}"`);
          } else if (trimmedLine === "") {
            if (segment.trim()) {
              await runQuery(inputCell, segment.trim());
              segment = "";
            }
          } else {
            segment += " " + trimmedLine;
          }
        }
        if (segment.trim()) await runQuery(inputCell, segment.trim());
        autoResize();
      }
    });

    const output = document.createElement("div");
    output.className = "output mt-4 space-y-4";

    inputCell.appendChild(inputRow);
    inputCell.appendChild(output);
    notebookEl.appendChild(inputCell);

    setTimeout(() => textarea.focus(), 50);
  } else {
    const existingTextarea = inputCell.querySelector("textarea");
    if (existingTextarea) setTimeout(() => existingTextarea.focus(), 50);
  }
  return inputCell;
};

const runQuery = async (inputCell, query) => {
  const output = inputCell.querySelector(".output");
  const resultContainer = document.createElement("div");
  resultContainer.className = "result-container";

  const queryHeader = document.createElement("div");
  queryHeader.className = "mb-1 text-xl text-green-500";
  queryHeader.textContent = `query_${generateTimestamp()}`;
  resultContainer.appendChild(queryHeader);

  const status = document.createElement("div");
  status.className = "text-xl";
  status.textContent = "Running query...";
  resultContainer.appendChild(status);
  output.appendChild(resultContainer);

  let data;
  try {
    data = await ipcRenderer.invoke("database-query", { query, preset: currentPreset });
    if (status.parentNode === resultContainer) resultContainer.removeChild(status);
    displayResults(data, resultContainer, { expandIcon, contractIcon, toggleColumn, setColumnState });
  } catch (err) {
    console.error("Database query failed:", err);
    if (status.parentNode === resultContainer) resultContainer.removeChild(status);

    // Create a detailed error message
    const errorMsg = document.createElement("div");
    errorMsg.className = "text-xl text-red-500";
    // Extract a user-friendly message from the error
    let errorText = "Unknown error occurred.";
    if (err.message) {
      // Check for nested error details (e.g., from main process)
      const match = err.message.match(/MSSQL query failed: (.+)/) || err.message.match(/Error: (.+)/) || [, err.message];
      errorText = match[1] || "Unknown error.";
    }
    errorMsg.textContent = `Query failed: ${errorText}`;
    resultContainer.appendChild(errorMsg);

    // Actions container
    const actionsErr = document.createElement("div");
    actionsErr.className = "mt-2 space-x-2 text-xl flex action-buttons";

    // Close button
    const closeErr = document.createElement("button");
    closeErr.textContent = "{close}";
    closeErr.className = "text-green-500 hover:text-green-400";
    closeErr.addEventListener("click", () => resultContainer.remove());
    actionsErr.appendChild(closeErr);

    resultContainer.appendChild(actionsErr);
    return;
  }

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
};

module.exports = { ensureSingleInputCell, runQuery };
