/* lib/renderer/cellManager.js */
const { ipcRenderer } = require("electron");
const { displayResults, downloadODF, toggleColumn, setColumnState } = require("./resultsDisplay.js");
const { updateTabTitle } = require("./tabManager.js");
const { expandIcon, contractIcon } = require("./icons.js");

let currentPreset = null;

// Define supported database types locally
const supportedDbTypes = ["mssql", "mysql"]; // Add more as needed (e.g., "bigquery", "athena")

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
  console.log("[DEBUG] showPresetDropdown called with presets:", presets);
  let dropdown = document.getElementById("presetDropdown");
  if (!dropdown) {
    dropdown = document.createElement("div");
    dropdown.id = "presetDropdown";
    // The dropdown container uses Tailwind's bg-black/50.
    dropdown.className = "absolute bg-black/60 rounded shadow-lg z-50";
    document.body.appendChild(dropdown);
  }

  const rect = textarea.getBoundingClientRect();
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.top = `${rect.bottom}px`;
  dropdown.style.width = `${rect.width}px`;
  console.log("[DEBUG] Dropdown positioned at:", { left: rect.left, top: rect.bottom, width: rect.width });

  dropdown.innerHTML = "";
  if (presets.length === 0) {
    console.log("[DEBUG] No presets to display in dropdown");
    const noItems = document.createElement("div");
    noItems.className = "px-2 py-1 text-gray-500";
    noItems.textContent = "No compatible presets found";
    dropdown.appendChild(noItems);
  } else {
    let selectedIndex = 0;
    presets.forEach((preset, index) => {
      const item = document.createElement("div");
      // preset-item styling. Default text color is green-500.
      item.className = "preset-item px-2 py-1 cursor-pointer text-green-500";
      item.textContent = preset;
      item.dataset.index = index;
      item.addEventListener("click", () => {
        console.log("[DEBUG] Preset clicked:", preset);
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
        if (idx === selectedIndex) {
          // When selected, apply a darker bg and update text to green-200.
          item.classList.add("bg-black/80");
          item.classList.remove("text-green-500");
          item.classList.add("text-green-200");
        } else {
          item.classList.remove("bg-black/80");
          item.classList.remove("text-green-200");
          item.classList.add("text-green-500");
        }
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
        console.log("[DEBUG] Preset selected via Enter:", selectedPreset);
        callback(selectedPreset);
        replacePresetDirective(textarea, selectedPreset);
        dropdown.style.display = "none";
        textarea.removeEventListener("keydown", keyHandler);
      } else if (e.key === "Escape") {
        e.preventDefault();
        console.log("[DEBUG] Dropdown closed via Escape");
        dropdown.style.display = "none";
        textarea.removeEventListener("keydown", keyHandler);
      }
    };

    textarea.removeEventListener("keydown", dropdown._keyHandler || (() => {}));
    textarea.addEventListener("keydown", keyHandler);
    dropdown._keyHandler = keyHandler;
  }

  console.log("[DEBUG] Dropdown should be visible now");
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

    textarea.addEventListener("input", async () => {
      autoResize();
      const lines = textarea.value.split("\n").length;
      lineNumbers.textContent = Array.from({ length: lines }, (_, i) => i + 1).join("\n");

      const currentLine = getCurrentLine(textarea);
      console.log("[DEBUG] Current line:", currentLine);
      if (currentLine === "@preset::") {
        try {
          const allPresets = await ipcRenderer.invoke("get-presets");
          console.log("[DEBUG] All presets fetched:", allPresets);
          const filteredPresets = allPresets
            .filter((preset) => {
              const isSupported = supportedDbTypes.includes(preset.db_type);
              console.log(`[DEBUG] Checking preset ${preset.name}: db_type=${preset.db_type}, supported=${isSupported}`);
              return isSupported;
            })
            .map((preset) => preset.name);
          console.log("[DEBUG] Filtered presets:", filteredPresets);
          showPresetDropdown(
            filteredPresets,
            (selected) => {
              currentPreset = selected;
              console.log(`Preset selected: ${currentPreset}`);
            },
            textarea,
          );
        } catch (err) {
          console.error("Error loading presets:", err);
        }
      } else {
        const dropdown = document.getElementById("presetDropdown");
        if (dropdown) {
          console.log("[DEBUG] Hiding dropdown");
          dropdown.style.display = "none";
        }
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

// This global will keep track of the last downloaded ODF file.
let currentOdsFilePath = null;

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

    const errorMsg = document.createElement("div");
    errorMsg.className = "text-xl text-red-500";
    let errorText = "Unknown error occurred.";
    if (err.message) {
      const match = err.message.match(/MSSQL query failed: (.+)/) || err.message.match(/Error: (.+)/) || [, err.message];
      errorText = match[1] || "Unknown error.";
    }
    errorMsg.textContent = `Query failed: ${errorText}`;
    resultContainer.appendChild(errorMsg);

    const errorDetails = document.createElement("div");
    errorDetails.className = "text-sm text-red-300 mt-1";
    errorDetails.textContent = "See console for full stack trace.";
    resultContainer.appendChild(errorDetails);

    const actionsErr = document.createElement("div");
    actionsErr.className = "mt-2 space-x-2 text-xl flex action-buttons";

    const closeErr = document.createElement("button");
    closeErr.textContent = "Close";
    closeErr.className = "text-green-500 hover:text-green-400";
    closeErr.addEventListener("click", () => resultContainer.remove());
    actionsErr.appendChild(closeErr);

    resultContainer.appendChild(actionsErr);
    return;
  }

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "action-buttons mt-1 space-x-2 text-xl";

  // Download button: downloads data as ODF (converting internally)
  const downloadButton = document.createElement("button");
  downloadButton.textContent = "{download}";
  downloadButton.className = "text-green-500 hover:text-green-400";
  downloadButton.addEventListener("click", async () => {
    try {
      await downloadODF(data);
    } catch (err) {
      console.error("Download ODF failed:", err);
    }
  });
  actionsDiv.appendChild(downloadButton);

  // Open button: simply opens the previously downloaded ODF file.
  const openButton = document.createElement("button");
  openButton.textContent = "{open}";
  openButton.className = "text-green-500 hover:text-green-400";

  openButton.addEventListener("click", async () => {
    try {
      // Always download (and convert) the data to ODF.
      currentOdsFilePath = await downloadODF(data);
      // Now open the newly converted ODS file.
      await ipcRenderer.invoke("open-ods", currentOdsFilePath);
    } catch (err) {
      console.error("Failed to open ODS:", err);
    }
  });

  actionsDiv.appendChild(openButton);

  // Optional: a close result button.
  const closeButton = document.createElement("button");
  closeButton.textContent = "{close}";
  closeButton.className = "text-green-500 hover:text-green-400";
  closeButton.addEventListener("click", () => resultContainer.remove());
  actionsDiv.appendChild(closeButton);

  resultContainer.appendChild(actionsDiv);
};

module.exports = { ensureSingleInputCell, runQuery };
