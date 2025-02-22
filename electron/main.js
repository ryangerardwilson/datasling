/* electron/main.js */
const { app, BrowserWindow, ipcMain } = require("electron");
const remoteMain = require("@electron/remote/main");
remoteMain.initialize();
const path = require("path");
const fs = require("fs");
const { spawnSync, spawn } = require("child_process");
const { getConnector } = require("./lib/database/factory");
const { loadPresets, getPresetByName } = require("./lib/database/presetManager");

app.disableHardwareAcceleration();

const createWindow = () => {
  const winConfig = {
    width: 800,
    height: 600,
    icon: path.join(__dirname, "assets", "logo.png"),
    transparent: true,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  };
  const win = new BrowserWindow(winConfig);
  remoteMain.enable(win.webContents);
  win.loadFile(path.join(__dirname, "index.html"));
  win.maximize();

  //win.webContents.setZoomFactor(2);
  console.log("BrowserWindow created, maximized, and index.html loaded.");
  return win;
};

const handleWindowClosed = () => {
  if (process.platform !== "darwin") {
    console.log("All windows closed. Quitting app.");
    app.quit();
  }
};

const handleAppActivation = () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    console.log("App activated and no window found. Creating new BrowserWindow...");
    createWindow();
  }
};

// Load presets at startup
const presetsResult = loadPresets();
let presets;

// Define the default preset as the first one
const getDefaultPreset = () => (presets ? presets[0] || null : null);

app.whenReady().then(() => {
  console.log("App is ready. Creating BrowserWindow...");
  let win;

  if (presetsResult.error) {
    console.log("No presets loaded, showing missing .rgwfuncsrc instructions...");
    win = createWindow();

    win.webContents.on("did-finish-load", () => {
      win.webContents.send("show-rgwfuncsrc-missing");
    });
  } else {
    presets = presetsResult.ok;
    win = createWindow();
  }
});

app.on("window-all-closed", handleWindowClosed);
app.on("activate", handleAppActivation);

// IPC handler for missing .rgwfuncsrc
ipcMain.on("show-rgwfuncsrc-missing", (event) => {
  event.sender.send("show-rgwfuncsrc-missing"); // Relay to renderer
});

// Updated IPC handler to return full preset objects
ipcMain.handle("get-presets", () => {
  if (!presets) throw new Error("Presets not loaded");
  return presets;
});

// Updated IPC handler to execute a query
// Notice that we now expect the property "preset" (instead of presetName) from the renderer.
ipcMain.handle("database-query", async (event, { query, preset }) => {
  if (!presets) throw new Error("Presets not loaded, app should have prompted for .rgwfuncsrc");

  // Use the passed preset name if provided; otherwise, use the default preset.
  const selectedPreset = preset ? getPresetByName(presets, preset) : getDefaultPreset();

  if (!selectedPreset) {
    throw new Error("No presets available in ~/.rgwfuncsrc");
  }

  const connector = getConnector(selectedPreset.db_type);
  if (!connector) throw new Error(`Unsupported database type: ${selectedPreset.db_type}`);

  const connectResult = await connector.connect(selectedPreset);
  if (connectResult.error) throw new Error(connectResult.error);
  const connection = connectResult.ok;

  const queryResult = await connector.query(connection, query);
  await connector.disconnect(connection);
  if (queryResult.error) throw new Error(queryResult.error);

  return queryResult.ok;
});

// This handler converts the CSV file to an ODS file and returns its path.
ipcMain.handle("convert-to-ods", async (event, csvFilePath) => {
  try {
    const outDir = path.dirname(csvFilePath);
    // Use LibreOffice headless conversion. Adjust the command if needed.
    const conversion = spawnSync("libreoffice", ["--headless", "--convert-to", "ods", csvFilePath, "--outdir", outDir], { stdio: "inherit" });

    // Derive the expected ODS file name.
    const baseName = path.basename(csvFilePath, ".csv");
    const odsFilePath = path.join(outDir, baseName + ".ods");

    if (!fs.existsSync(odsFilePath)) {
      throw new Error("Conversion failed. ODS file not found: " + odsFilePath);
    }

    // (Optional) Remove the intermediate CSV file if desired:
    // fs.unlink(csvFilePath, err => { if(err) console.warn("Failed to delete CSV:", err); });

    return odsFilePath;
  } catch (err) {
    console.error("Failed to convert to ODS:", err);
    throw err;
  }
});

// This handler simply opens an already downloaded ODS file.
ipcMain.handle("open-ods", async (event, odsFilePath) => {
  try {
    if (!fs.existsSync(odsFilePath)) {
      throw new Error("ODS file does not exist: " + odsFilePath);
    }
    const child = spawn("libreoffice", ["--calc", odsFilePath], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return { ok: true };
  } catch (err) {
    console.error("Failed to open ODS in LibreOffice Calc:", err);
    throw err;
  }
});
