/* main.js */
const { app, BrowserWindow, ipcMain } = require("electron");
const remoteMain = require("@electron/remote/main"); // Import @electron/remote
remoteMain.initialize(); // Initialize the remote module
const path = require("path");
const sql = require("mssql");
const fs = require("fs");
const os = require("os");
const { execSync } = require("child_process");

// Load presets from ~/.rgwfuncsrc
let appPresets = {};
try {
  const presetPath = path.join(os.homedir(), ".rgwfuncsrc");
  const presetData = fs.readFileSync(presetPath, "utf8");
  appPresets = JSON.parse(presetData);
  console.log("Loaded DB presets:", appPresets.db_presets);
} catch (e) {
  console.error("Failed to load presets from ~/.rgwfuncsrc:", e);
  // Optionally, you may exit the app here since no presets could be loaded.
}

// Dynamically choose the first MSSQL preset as the default
const mssqlPresets = (appPresets.db_presets || []).filter((p) => p.db_type === "mssql");
let defaultPreset = null;
if (mssqlPresets.length > 0) {
  defaultPreset = mssqlPresets[0];
  console.log("Default preset set to:", defaultPreset.name);
} else {
  console.warn("No MSSQL preset found. Queries without an explicit preset will throw an error.");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, "assets", "logo.png"),
    transparent: true,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Enable @electron/remote for this window
  remoteMain.enable(win.webContents);

  win.loadFile(path.join(__dirname, "index.html"));
  win.maximize();

  console.log("BrowserWindow created, maximized, and index.html loaded.");
}

app.whenReady().then(() => {
  console.log("App is ready. Creating BrowserWindow...");
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    console.log("All windows closed. Quitting app.");
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    console.log("App activated and no window found. Creating new BrowserWindow...");
    createWindow();
  }
});

// IPC handler to return available MSSQL presets
ipcMain.handle("get-mssql-presets", () => {
  return (appPresets.db_presets || []).filter((p) => p.db_type === "mssql").map((p) => p.name);
});

// IPC handler to execute a query against the database.
ipcMain.handle("database-query", async (event, { query, preset }) => {
  let configToUse;
  if (preset) {
    const found = (appPresets.db_presets || []).find((p) => p.name === preset && p.db_type === "mssql");
    if (!found) {
      throw new Error(`Preset "${preset}" not found or not an MSSQL preset.`);
    }
    configToUse = {
      user: found.username,
      password: found.password,
      server: found.host,
      database: found.database,
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
    };
    console.log(`Running query using preset "${preset}"`);
  } else {
    if (defaultPreset) {
      configToUse = {
        user: defaultPreset.username,
        password: defaultPreset.password,
        server: defaultPreset.host,
        database: defaultPreset.database,
        options: {
          encrypt: true,
          trustServerCertificate: true,
        },
      };
      console.log(`No preset specified. Running query using default preset "${defaultPreset.name}"`);
    } else {
      throw new Error("No preset specified and no MSSQL preset available.");
    }
  }

  try {
    await sql.connect(configToUse);
    console.log("Connected to MSSQL.");
    const result = await sql.query(query);
    sql.close();
    const plainColumns = {};
    if (result.recordset[0] && result.recordset.columns) {
      for (const colName in result.recordset.columns) {
        const meta = result.recordset.columns[colName];
        plainColumns[colName] = {
          type: { name: meta.type && meta.type.name ? meta.type.name : "" },
        };
      }
    }
    return { rows: result.recordset, columns: plainColumns };
  } catch (err) {
    console.error("Error querying database from main process:", err);
    throw err;
  }
});

