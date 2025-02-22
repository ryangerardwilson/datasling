/* lib/renderer/queryRunner.js */
const { ipcRenderer } = require("electron");
const { displayResults, downloadODF, setAllColumnsState } = require("./resultsDisplay.js");

let currentPreset = null;
let currentOdsFilePath = null;

const generateTimestamp = () => {
  const now = new Date();
  const pad = (num) => num.toString().padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

const runQuery = async (editor, query) => {
  const output = editor.querySelector(".output");
  const resultContainer = document.createElement("div");
  resultContainer.className = "result-container";

  const queryHeader = document.createElement("div");
  queryHeader.className = "mb-1 text-2xl text-green-500";
  queryHeader.textContent = `query_${generateTimestamp()}`;
  resultContainer.appendChild(queryHeader);

  const status = document.createElement("div");
  status.className = "text-2xl";
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
    errorMsg.className = "text-2xl text-red-500";
    errorMsg.textContent = `Query failed: ${err.message.match(/MSSQL query failed: (.+)/)?.[1] || err.message.match(/Error: (.+)/)?.[1] || "Unknown error"}`;
    resultContainer.appendChild(errorMsg);

    const errorDetails = document.createElement("div");
    errorDetails.className = "text-2xl text-red-300 mt-1";
    errorDetails.textContent = "See console for full stack trace.";
    resultContainer.appendChild(errorDetails);

    const actionsErr = document.createElement("div");
    actionsErr.className = "mt-2 space-x-2 text-2xl flex action-buttons";
    const closeErr = document.createElement("button");
    closeErr.textContent = "Close";
    closeErr.className = "text-green-500 hover:text-green-400";
    closeErr.addEventListener("click", () => resultContainer.remove());
    actionsErr.appendChild(closeErr);
    resultContainer.appendChild(actionsErr);
    return;
  }

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "action-buttons mt-1 space-x-2 text-2xl flex";

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
  collapseButton.style.display = "none"; // Hidden initially
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
  });
};

module.exports = { runQuery, setupQueryListener };
