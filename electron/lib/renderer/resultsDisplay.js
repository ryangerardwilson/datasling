// resultsDisplay.js
// Contains functions for displaying query results, downloading CSV, and toggling column widths.
const { expandIcon, contractIcon } = require("./icons");

function displayResults(data, container, icons) {
  // icons should include expandIcon and contractIcon.
  const { expandIcon, contractIcon } = icons;

  // If no data or rows, show a message.
  if (!data || !data.rows || data.rows.length === 0) {
    const noData = document.createElement("div");
    noData.className = "text-base text-green-500";
    noData.textContent = "No data returned from the query.";
    container.appendChild(noData);
    return;
  }

  const rows = data.rows;
  // Get header names from first row.
  const headers = Object.keys(rows[0]);
  // Metadata object provided from main process.
  const meta = data.columns || {};

  const tableWrapper = document.createElement("div");
  tableWrapper.className = "overflow-x-auto";

  const table = document.createElement("table");
  // Using table-fixed ensures consistent column width sizing.
  table.className = "table-fixed border-collapse border border-green-500 text-base text-green-500";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headers.forEach((headerText, index) => {
    const th = document.createElement("th");
    // Set collapsed width classes on header cells.
    th.className = "p-1 text-left w-[175px] max-w-[175px] overflow-hidden whitespace-nowrap border border-green-500";

    // Create a flex container for header name and toggle button
    // justify-between pushes the elements to the left and right edges.
    const headerRowWrapper = document.createElement("div");
    headerRowWrapper.className = "flex items-center justify-between";

    // Create a container for the header name and type (stacked vertically)
    const headerTextContainer = document.createElement("div");
    headerTextContainer.className = "flex flex-col overflow-hidden";

    const headerName = document.createElement("div");
    headerName.className = "overflow-hidden text-ellipsis whitespace-nowrap";
    headerName.textContent = headerText;
    headerTextContainer.appendChild(headerName);

    // If column metadata exists, add a small type label.
    if (meta[headerText] && meta[headerText].type && meta[headerText].type.name) {
      const typeLabel = document.createElement("span");
      typeLabel.className = "text-[10px] text-green-600";
      typeLabel.textContent = meta[headerText].type.name;
      headerTextContainer.appendChild(typeLabel);
    }

    // Create the toggle button.
    const toggleButton = document.createElement("button");
    // Apply smaller icon size (w-4 and h-4) and no left margin.
    toggleButton.className = "flex-shrink-0";
    // Set initial state and icon.
    toggleButton.innerHTML = expandIcon;
    toggleButton.dataset.expanded = "false";
    // When clicked, toggle the column state and swap icons.
    toggleButton.addEventListener("click", () => {
      toggleColumn(table, index, toggleButton, { expandIcon, contractIcon });
    });

    // Append header text container to the wrapper.
    headerRowWrapper.appendChild(headerTextContainer);
    // Append toggle button so that it appears at the right edge.
    headerRowWrapper.appendChild(toggleButton);

    th.appendChild(headerRowWrapper);
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((rowData) => {
    const tr = document.createElement("tr");
    headers.forEach(() => {
      const td = document.createElement("td");
      td.className = "p-1 border border-green-500 w-[175px] max-w-[175px]";
      const divContent = document.createElement("div");
      divContent.className = "whitespace-nowrap overflow-hidden text-ellipsis";
      td.appendChild(divContent);
      tr.appendChild(td);
    });
    Object.values(rowData).forEach((val, idx) => {
      tr.children[idx].firstChild.textContent = val;
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  tableWrapper.appendChild(table);
  container.appendChild(tableWrapper);
}

function downloadCSV(data) {
  if (!data || !data.rows || data.rows.length === 0) return;

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

  // Use Node's built-in modules and @electron/remote to get the downloads folder.
  const fs = require("fs");
  const path = require("path");
  const { app, Notification } = require("@electron/remote");

  // Get the user's Downloads folder path
  const downloadsPath = app.getPath("downloads");

  // Format the current timestamp in YYYYMMDDHHMMSS format.
  const now = new Date();
  const timestamp = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, "0") + now.getDate().toString().padStart(2, "0") + now.getHours().toString().padStart(2, "0") + now.getMinutes().toString().padStart(2, "0") + now.getSeconds().toString().padStart(2, "0");

  // Create the file name using the formatted timestamp.
  const fileName = `query_download_${timestamp}.csv`;
  const filePath = path.join(downloadsPath, fileName);

  // Write the CSV content to the file.
  fs.writeFile(filePath, csvContent, "utf8", (err) => {
    if (err) {
      console.error("Error writing CSV file:", err);
      new Notification({
        title: "Download Failed",
        body: "There was an error writing the CSV file.",
      }).show();
    } else {
      new Notification({
        title: "Download Complete",
        body: `CSV file has been saved to: ${filePath}`,
      }).show();
    }
  });
}

function toggleColumn(table, colIndex, button, icons) {
  // Get icons from the passed object.
  const { expandIcon, contractIcon } = icons;

  const isExpanded = button.dataset.expanded === "true";
  const newState = !isExpanded;
  setColumnState(table, colIndex, newState);
  button.dataset.expanded = newState ? "true" : "false";

  // Swap the icon: use contractIcon when expanded, expandIcon when collapsed.
  button.innerHTML = newState ? contractIcon : expandIcon;
}

function setColumnState(table, colIndex, isExpanded) {
  // Classes for column widths.
  const contractedOuter = ["w-[175px]", "max-w-[175px]"];
  const expandedOuter = ["w-[400px]", "max-w-[400px]"];

  // Classes for inner content formatting.
  const contractedInner = ["whitespace-nowrap", "overflow-hidden", "text-ellipsis"];
  const expandedInner = ["whitespace-normal", "overflow-visible", "break-words"];

  // Update header cells.
  table.querySelectorAll("thead tr").forEach((row) => {
    if (row.children[colIndex]) {
      const cell = row.children[colIndex];
      // Always remove both sets of width classes.
      cell.classList.remove(...contractedOuter, ...expandedOuter);
      // Then add the appropriate width classes.
      if (isExpanded) {
        cell.classList.add(...expandedOuter);
      } else {
        cell.classList.add(...contractedOuter);
      }
    }
  });

  // Update body cells and inner content.
  table.querySelectorAll("tbody tr").forEach((row) => {
    if (row.children[colIndex]) {
      const td = row.children[colIndex];
      td.classList.remove(...contractedOuter, ...expandedOuter);
      if (isExpanded) {
        td.classList.add(...expandedOuter);
      } else {
        td.classList.add(...contractedOuter);
      }
      const contentDiv = td.firstChild;
      if (contentDiv) {
        contentDiv.classList.remove(...contractedInner, ...expandedInner);
        if (isExpanded) {
          contentDiv.classList.add(...expandedInner);
        } else {
          contentDiv.classList.add(...contractedInner);
        }
      }
    }
  });
}

module.exports = { displayResults, downloadCSV, toggleColumn, setColumnState };
