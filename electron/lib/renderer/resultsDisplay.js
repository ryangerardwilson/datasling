/* lib/renderer/resultsDisplay.js */
const { ipcRenderer } = require("electron");

function renderTableBody(tbody, rows, headers, startIdx, endIdx, isExpanded) {
  tbody.innerHTML = ""; // Clear existing rows
  const contractedInner = "whitespace-nowrap overflow-hidden text-ellipsis";
  const expandedInner = "whitespace-normal overflow-visible break-words text-left min-h-full text-top w-full";

  for (let i = startIdx; i < endIdx && i < rows.length; i++) {
    const rowData = rows[i];
    const tr = document.createElement("tr");
    headers.forEach(() => {
      const td = document.createElement("td");
      td.className = isExpanded ? "p-1 border border-green-500 w-[400px] max-w-[400px] align-top" : "p-1 border border-green-500 w-[175px] max-w-[175px]";
      const divContent = document.createElement("div");
      divContent.className = isExpanded ? expandedInner : contractedInner;
      td.appendChild(divContent);
      tr.appendChild(td);
    });
    Object.values(rowData).forEach((val, idx) => {
      tr.children[idx].firstChild.textContent = val ?? "";
    });
    tbody.appendChild(tr);
  }
}

function displayResults(data, container) {
  if (!data || !data.rows || data.rows.length === 0) {
    const noData = document.createElement("div");
    noData.className = "text-green-500";
    noData.textContent = "No data returned from the query.";
    container.appendChild(noData);
    return;
  }

  const rows = data.rows;
  const headers = Object.keys(rows[0]);
  const meta = data.columns || {};

  // Pagination controls above scrollBox
  const paginationControls = document.createElement("div");
  paginationControls.className = "flex justify-start space-x-2 mb-1 text-green-500"; // Left-aligned

  const prevButton = document.createElement("button");
  prevButton.textContent = "{previous}";
  prevButton.className = "py-1 hover:text-green-400 disabled:text-gray-500 text-base";
  prevButton.disabled = true; // Disabled on page 0

  const nextButton = document.createElement("button");
  nextButton.textContent = "{next}";
  nextButton.className = "py-1 hover:text-green-400 disabled:text-gray-500 text-base";
  nextButton.disabled = rows.length <= 10; // Disabled if ≤10 rows

  paginationControls.appendChild(prevButton);
  paginationControls.appendChild(nextButton);
  container.appendChild(paginationControls);

  const scrollBox = document.createElement("div");
  scrollBox.className = "max-h-[489px] overflow-y-auto overflow-x-scroll w-auto"; // Matches your draft height

  const tableWrapper = document.createElement("div");
  tableWrapper.dataset.rows = JSON.stringify(rows); // Store full data in memory
  tableWrapper.dataset.currentPage = "0"; // Start at page 0
  tableWrapper.dataset.isExpanded = "false"; // Track expanded state

  const table = document.createElement("table");
  table.className = "table-fixed border-collapse border border-green-500 text-base text-green-500";

  const thead = document.createElement("thead");
  thead.className = "bg-black"; // Removed sticky and z-index
  const headerRow = document.createElement("tr");
  headers.forEach((headerText) => {
    const th = document.createElement("th");
    th.className = "p-1 text-left w-[175px] max-w-[175px] overflow-hidden whitespace-nowrap border border-green-500";

    const headerTextContainer = document.createElement("div");
    headerTextContainer.className = "flex flex-col overflow-hidden";

    const headerName = document.createElement("div");
    headerName.className = "overflow-hidden text-ellipsis whitespace-nowrap";
    headerName.textContent = headerText;
    headerTextContainer.appendChild(headerName);

    if (meta[headerText] && meta[headerText].type && meta[headerText].type.name) {
      const typeLabel = document.createElement("span");
      typeLabel.className = "text-xs text-green-300";
      typeLabel.textContent = meta[headerText].type.name;
      headerTextContainer.appendChild(typeLabel);
    }

    th.appendChild(headerTextContainer);
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  renderTableBody(tbody, rows, headers, 0, 10, false); // Initial 10 rows, collapsed
  table.appendChild(tbody);

  tableWrapper.appendChild(table);
  scrollBox.appendChild(tableWrapper);
  container.appendChild(scrollBox);

  // Pagination button event listeners
  prevButton.addEventListener("click", () => {
    let currentPage = parseInt(tableWrapper.dataset.currentPage);
    if (currentPage > 0) {
      currentPage--;
      tableWrapper.dataset.currentPage = currentPage;
      const isExpanded = tableWrapper.dataset.isExpanded === "true";
      renderTableBody(tbody, rows, headers, currentPage * 10, (currentPage + 1) * 10, isExpanded);
      prevButton.disabled = currentPage === 0;
      nextButton.disabled = (currentPage + 1) * 10 >= rows.length;
    }
  });

  nextButton.addEventListener("click", () => {
    let currentPage = parseInt(tableWrapper.dataset.currentPage);
    if ((currentPage + 1) * 10 < rows.length) {
      currentPage++;
      tableWrapper.dataset.currentPage = currentPage;
      const isExpanded = tableWrapper.dataset.isExpanded === "true";
      renderTableBody(tbody, rows, headers, currentPage * 10, (currentPage + 1) * 10, isExpanded);
      prevButton.disabled = currentPage === 0;
      nextButton.disabled = (currentPage + 1) * 10 >= rows.length;
    }
  });
}

function downloadCSV(data) {
  return new Promise((resolve, reject) => {
    if (!data || !data.rows || data.rows.length === 0) {
      return reject("No data to download.");
    }

    const rows = data.rows;
    const headers = Object.keys(rows[0]);
    let csvContent = headers.join(",") + "\n";

    rows.forEach((row) => {
      const rowData = headers.map((header) => {
        let cell = row[header];
        if (cell === null || cell === undefined) cell = "";
        if (typeof cell === "string" && (cell.includes(",") || cell.includes('"'))) {
          return '"' + cell.replace(/"/g, '""') + '"';
        }
        return cell;
      });
      csvContent += rowData.join(",") + "\n";
    });

    const fs = require("fs");
    const path = require("path");
    const { app, Notification } = require("@electron/remote");

    const downloadsPath = app.getPath("downloads");
    const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const fileName = `query_download_${timestamp}.csv`;
    const filePath = path.join(downloadsPath, fileName);

    fs.writeFile(filePath, csvContent, "utf8", (err) => {
      if (err) {
        console.error("Error writing CSV file:", err);
        new Notification({
          title: "Download Failed",
          body: "There was an error writing the CSV file.",
        }).show();
        return reject(err);
      }
      new Notification({
        title: "Download Complete",
        body: `CSV file has been saved to: ${filePath}`,
      }).show();
      return resolve(filePath);
    });
  });
}

const downloadODF = async (data) => {
  try {
    const csvFilePath = await downloadCSV(data);
    const odsFilePath = await ipcRenderer.invoke("convert-to-ods", csvFilePath);
    console.log("ODF file downloaded to:", odsFilePath);
    return odsFilePath;
  } catch (err) {
    console.error("downloadODF error:", err);
    throw err;
  }
};

function setAllColumnsState(table, isExpanded) {
  const contractedOuter = "p-1 text-left w-[175px] max-w-[175px] border border-green-500";
  const expandedOuter = "p-1 text-left w-[400px] max-w-[400px] align-top border border-green-500";
  const tableWrapper = table.parentElement;
  const tbody = table.querySelector("tbody");
  const rows = JSON.parse(tableWrapper.dataset.rows || "[]");
  const headers = Object.keys(rows[0] || {});
  const currentPage = parseInt(tableWrapper.dataset.currentPage || "0");

  tableWrapper.dataset.isExpanded = isExpanded;

  // Adjust table width dynamically based on number of columns
  const tableWidth = isExpanded ? `${headers.length * 400}px` : "auto";
  table.style.width = tableWidth;

  // Update thead columns (no sticky behavior)
  const thElements = table.querySelectorAll("thead th");
  thElements.forEach((th) => {
    th.className = isExpanded ? expandedOuter : contractedOuter;
  });

  // Re-render tbody with current page
  renderTableBody(tbody, rows, headers, currentPage * 10, (currentPage + 1) * 10, isExpanded);
}

module.exports = { displayResults, downloadODF, setAllColumnsState };
