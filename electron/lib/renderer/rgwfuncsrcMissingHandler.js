// lib/renderer/rgwfuncsrcMissingHandler.js
const { ipcRenderer } = require("electron");

const runRgwfuncsrcMissingHandler = () => {
  // Instructions and example JSON
  const instructions = `
================================================================================
[ALERT] No ~/.rgwfuncsrc file found! This file is required to configure presets.

[INFO] Steps to create ~/.rgwfuncsrc:

  1. Open a terminal.
  2. Run: touch ~/.rgwfuncsrc
  3. Open ~/.rgwfuncsrc in a text editor (e.g., vi ~/.rgwfuncsrc).
  4. Copy and paste the example JSON below.
  5. Edit the preset details (username, password, host, etc.) as needed.
  6. Save and close the file.
  7. Restart the app to continue.

[INFO] Example ~/.rgwfuncsrc content. Note that the first preset, will be deemed
to be your default.

{
  "db_presets": [
    {
      "name": "customers",
      "db_type": "mssql",
      "username": "your_username",
      "password": "your_password",
      "host": "host",
      "database": "your_database"
    },
    {
      "name": "partners",
      "db_type": "mysql",
      "username": "your_username",
      "password": "your_password",
      "host": "host",
      "database": "your_database"
    } 
  ]
}

[INFO] Restart the app, after creating the file.
================================================================================
  `.split("\n");

  // Create a full-screen container
  const container = document.createElement("div");
  container.id = "rgwfuncsrc-missing-container";
  Object.assign(container.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "black",
    color: "lime",
    fontFamily: "monospace",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    zIndex: "10000",
  });
  document.body.appendChild(container);

  // Inner container for lines with pre tag
  const linesContainer = document.createElement("pre");
  linesContainer.style.color = "lime";
  linesContainer.style.fontFamily = "monospace";
  // Removed textAlign: "center" to keep text left-aligned
  container.appendChild(linesContainer);

  // Animate lines one-by-one
  let currentLine = 0;
  const lineDelay = 50;
  const timer = setInterval(() => {
    if (currentLine < instructions.length) {
      linesContainer.textContent += instructions[currentLine] + "\n";
      currentLine++;
    } else {
      clearInterval(timer);
      // No fade-out; message stays on screen
    }
  }, lineDelay);
};

module.exports = { runRgwfuncsrcMissingHandler };
