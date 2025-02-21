/* electron/database/presetManager.js */
const fs = require("fs");
const path = require("path");
const os = require("os");

const loadPresets = () => {
  try {
    const presetPath = path.join(os.homedir(), ".rgwfuncsrc");
    const presetData = fs.readFileSync(presetPath, "utf8");
    const config = JSON.parse(presetData);
    const presets = config.db_presets || [];
    console.log("Loaded DB presets:", presets);
    return { ok: presets };
  } catch (e) {
    console.error("Failed to load presets from ~/.rgwfuncsrc:", e);
    return { error: "Failed to load presets" };
  }
};

const getPresetByName = (presets, presetName) => presets.find((p) => p.name === presetName) || null;

module.exports = { loadPresets, getPresetByName };
