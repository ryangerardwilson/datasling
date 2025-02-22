/* lib/renderer/queryRunner.js */
const { ipcRenderer } = require("electron");
const { displayResults, downloadODF, setAllColumnsState } = require("./resultsDisplay.js");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("[INFO] queryRunner.js loaded - Version with Ctrl+Enter for selected queries and Vim");

let currentPreset = null;
let currentOdsFilePath = null;

const generateTimestamp = () => {
  const now = new Date();
  const pad = (num) => num.toString().padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

const runQuery = async (editor, query) => {
  console.log("[DEBUG] runQuery called with query:", query);
  const output = editor.querySelector(".output");
  const resultContainer = document.createElement("div");
  resultContainer.className = "result-container";

  const queryHeader = document.createElement("div");
  queryHeader.className = "mb-1 text-base text-green-500";
  queryHeader.textContent = `query_${generateTimestamp()}`;
  resultContainer.appendChild(queryHeader);

  const status = document.createElement("div");
  status.className = "text-base";
  status.textContent = "Running query...";
  resultContainer.appendChild(status);
  output.appendChild(resultContainer);

  let data;
  try {
    data = await ipcRenderer.invoke("database-query", { query, preset: currentPreset });
    if (status.parentNode === resultContainer) resultContainer.removeChild(status);
    displayResults(data, resultContainer);
  } catch (err) {
    console.error("Database query failed:", err);
    if (status.parentNode === resultContainer) resultContainer.removeChild(status);

    const errorMsg = document.createElement("div");
    errorMsg.className = "text-base text-red-500";
    errorMsg.textContent = `Query failed: ${err.message.match(/MSSQL query failed: (.+)/)?.[1] || err.message.match(/Error: (.+)/)?.[1] || "Unknown error"}`;
    resultContainer.appendChild(errorMsg);

    const errorDetails = document.createElement("div");
    errorDetails.className = "text-base text-red-300 mt-1";
    // errorDetails.textContent = "See console for full stack trace.";
    resultContainer.appendChild(errorDetails);

    const actionsErr = document.createElement("div");
    actionsErr.className = "mt-2 space-x-2 text-base flex action-buttons";
    const closeErr = document.createElement("button");
    closeErr.textContent = "Close";
    closeErr.className = "text-green-500 hover:text-green-400";
    closeErr.addEventListener("click", () => resultContainer.remove());
    actionsErr.appendChild(closeErr);
    resultContainer.appendChild(actionsErr);
    return;
  }

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "action-buttons mt-1 space-x-2 text-base flex";

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

  const openButton = document.createElement("button");
  openButton.textContent = "{open}";
  openButton.className = "text-green-500 hover:text-green-400";
  openButton.addEventListener("click", async () => {
    try {
      currentOdsFilePath = await downloadODF(data);
      await ipcRenderer.invoke("open-ods", currentOdsFilePath);
    } catch (err) {
      console.error("Failed to open ODS:", err);
    }
  });
  actionsDiv.appendChild(openButton);

  const closeButton = document.createElement("button");
  closeButton.textContent = "{close}";
  closeButton.className = "text-green-500 hover:text-green-400";
  closeButton.addEventListener("click", () => resultContainer.remove());
  actionsDiv.appendChild(closeButton);

  const expandButton = document.createElement("button");
  expandButton.textContent = "{expand}";
  expandButton.className = "text-green-500 hover:text-green-400";
  expandButton.addEventListener("click", () => {
    const table = resultContainer.querySelector("table");
    if (table) {
      setAllColumnsState(table, true);
      expandButton.style.display = "none";
      collapseButton.style.display = "inline";
    }
  });
  actionsDiv.appendChild(expandButton);

  const collapseButton = document.createElement("button");
  collapseButton.textContent = "{collapse}";
  collapseButton.className = "text-green-500 hover:text-green-400";
  collapseButton.style.display = "none";
  collapseButton.addEventListener("click", () => {
    const table = resultContainer.querySelector("table");
    if (table) {
      setAllColumnsState(table, false);
      collapseButton.style.display = "none";
      expandButton.style.display = "inline";
    }
  });
  actionsDiv.appendChild(collapseButton);

  resultContainer.appendChild(actionsDiv);
};

const setupQueryListener = (editor, textarea) => {
  textarea.addEventListener("keydown", async (e) => {
    console.log("[DEBUG] queryRunner keydown:", e.key, "Ctrl:", e.ctrlKey, "Shift:", e.shiftKey);
    if (e.key === "Enter" && e.ctrlKey && !e.shiftKey) {
      e.preventDefault();

      // Get selected text or full text
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      let queryText;
      if (start !== end) {
        queryText = textarea.value.substring(start, end).trim();
        console.log("[DEBUG] Using selected text:", queryText);
      } else {
        queryText = textarea.value.trim();
        console.log("[DEBUG] No selection, using full text:", queryText);
      }
      if (!queryText) return;

      // Check if "@vi" is in the chosen text
      if (queryText.includes("@vi")) {
        console.log("[DEBUG] @vi detected with Ctrl+Enter, opening Vim");
        const tempFile = path.join(require("os").tmpdir(), `datasling-${Date.now()}.txt`);
        // Remove all instances of "@vi" before writing to file
        const vimContent = queryText.replace(/@vi/g, "");
        fs.writeFileSync(tempFile, vimContent);
        const command = process.platform === "win32" ? `start cmd /c vim ${tempFile}` : `x-terminal-emulator -e vim ${tempFile}`;
        exec(command, (err) => {
          if (err) {
            console.error("[ERROR] Failed to open Vim:", err);
            return;
          }
          let lastContent = vimContent; // Track last known content to detect changes
          const checkFile = setInterval(() => {
            if (fs.existsSync(tempFile)) {
              try {
                const newContent = fs.readFileSync(tempFile, "utf8");
                if (newContent !== lastContent) {
                  console.log("[DEBUG] Temp file content changed, updating textarea");
                  // Replace the selected portion or full text based on original selection
                  if (start !== end) {
                    textarea.value = textarea.value.substring(0, start) + newContent + textarea.value.substring(end);
                  } else {
                    textarea.value = newContent;
                  }
                  textarea.autoResize();
                  lastContent = newContent;
                }
              } catch (readErr) {
                console.error("[ERROR] Reading temp file:", readErr);
                clearInterval(checkFile);
                fs.unlinkSync(tempFile); // Clean up on error
              }
            } else {
              console.log("[DEBUG] Temp file deleted, finalizing update");
              clearInterval(checkFile);
              try {
                // Final check in case Vim deleted the file after saving
                const finalContent = fs.readFileSync(tempFile, "utf8");
                if (finalContent !== lastContent) {
                  if (start !== end) {
                    textarea.value = textarea.value.substring(0, start) + finalContent + textarea.value.substring(end);
                  } else {
                    textarea.value = finalContent;
                  }
                  textarea.autoResize();
                }
              } catch (readErr) {
                // File likely already deleted, which is fine
              } finally {
                if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
              }
            }
          }, 500);
        });
      } else {
        // No @vi, treat as a query
        currentPreset = null;
        const lines = queryText.split("\n");
        let segment = "";
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith("@preset::")) {
            if (segment.trim()) {
              await runQuery(editor, segment.trim());
              segment = "";
            }
            currentPreset = trimmedLine.replace("@preset::", "").split("\n")[0].trim();
            console.log(`Preset updated to "${currentPreset}"`);
          } else if (trimmedLine === "") {
            if (segment.trim()) {
              await runQuery(editor, segment.trim());
              segment = "";
            }
          } else {
            segment += " " + trimmedLine;
          }
        }
        if (segment.trim()) await runQuery(editor, segment.trim());
      }
    }
  });
};

module.exports = { runQuery, setupQueryListener };
