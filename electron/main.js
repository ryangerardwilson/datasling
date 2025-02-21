/* electron/main.js */
const { app, BrowserWindow, ipcMain } = require("electron");
const remoteMain = require("@electron/remote/main");
remoteMain.initialize();
const path = require("path");
const { getConnector } = require("./lib/database/factory");
const { loadPresets, getPresetsByType, getPresetByName } = require("./lib/database/presetManager");

const createWindow = () => {
  const winConfig = {
    width: 800,
    height: 600,
    icon: path.join(__dirname, "assets", "logo.png"),
    transparent: true,
    frame: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  };
  const win = new BrowserWindow(winConfig);
  remoteMain.enable(win.webContents);
  win.loadFile(path.join(__dirname, "index.html"));
  win.maximize();
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

// Start app when ready
app.whenReady().then(() => {
  console.log("App is ready. Creating BrowserWindow...");
  let win;

  if (presetsResult.error) {
    console.log("No presets loaded, prompting user...");
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

// IPC handler to exit the app
ipcMain.on("exit-app", () => {
  app.quit();
});

// IPC handler to return available presets for a db_type
ipcMain.handle("get-presets", (event, dbType) => {
  if (!presets) throw new Error("Presets not loaded");
  return getPresetsByType(presets, dbType);
});

// IPC handler to execute a query
ipcMain.handle("database-query", async (event, { query, presetName }) => {
  if (!presets) throw new Error("Presets not loaded, app should have prompted for .rgwfuncsrc");

  const preset = presetName ? getPresetByName(presets, presetName) : getDefaultPreset();

  if (!preset) {
    throw new Error("No presets available in ~/.rgwfuncsrc");
  }

  const connector = getConnector(preset.db_type);
  if (!connector) throw new Error(`Unsupported database type: ${preset.db_type}`);

  const connectResult = await connector.connect(preset);
  if (connectResult.error) throw new Error(connectResult.error);
  const connection = connectResult.ok;

  const queryResult = await connector.query(connection, query);
  await connector.disconnect(connection);
  if (queryResult.error) throw new Error(queryResult.error);

  return queryResult.ok;
});
