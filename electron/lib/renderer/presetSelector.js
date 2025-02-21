/* lib/renderer/presetSelector.js */
const { ipcRenderer } = require("electron");

const supportedDbTypes = ["mssql", "mysql"]; // Add more as needed

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
    dropdown.className = "absolute bg-black/60 rounded shadow-lg z-50";
    document.body.appendChild(dropdown);
  }

  const rect = textarea.getBoundingClientRect();
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.top = `${rect.bottom}px`;
  dropdown.style.width = `${rect.width}px`;

  dropdown.innerHTML = "";
  if (presets.length === 0) {
    const noItems = document.createElement("div");
    noItems.className = "px-2 py-1 text-gray-500";
    noItems.textContent = "No compatible presets found";
    dropdown.appendChild(noItems);
  } else {
    let selectedIndex = 0;
    presets.forEach((preset, index) => {
      const item = document.createElement("div");
      item.className = "preset-item px-2 py-1 cursor-pointer text-green-500";
      item.textContent = preset;
      item.dataset.index = index;
      item.addEventListener("click", () => {
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
        item.classList.toggle("bg-black/80", idx === selectedIndex);
        item.classList.toggle("text-green-200", idx === selectedIndex);
        item.classList.toggle("text-green-500", idx !== selectedIndex);
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
        callback(selectedPreset);
        replacePresetDirective(textarea, selectedPreset);
        dropdown.style.display = "none";
        textarea.removeEventListener("keydown", keyHandler);
      } else if (e.key === "Escape") {
        e.preventDefault();
        dropdown.style.display = "none";
        textarea.removeEventListener("keydown", keyHandler);
      }
    };

    textarea.removeEventListener("keydown", dropdown._keyHandler || (() => {}));
    textarea.addEventListener("keydown", keyHandler);
    dropdown._keyHandler = keyHandler;
  }

  dropdown.style.display = "block";
};

const setupPresetListener = async (textarea, onPresetSelected) => {
  const getCurrentLine = () => {
    const selectionStart = textarea.selectionStart;
    const value = textarea.value;
    const lastNewline = value.lastIndexOf("\n", selectionStart - 1);
    const nextNewline = value.indexOf("\n", selectionStart);
    return value.substring(lastNewline + 1, nextNewline === -1 ? value.length : nextNewline).trim();
  };

  textarea.addEventListener("input", async () => {
    const currentLine = getCurrentLine();
    if (currentLine === "@preset::") {
      try {
        const allPresets = await ipcRenderer.invoke("get-presets");
        const filteredPresets = allPresets.filter((preset) => supportedDbTypes.includes(preset.db_type)).map((preset) => preset.name);
        showPresetDropdown(filteredPresets, onPresetSelected, textarea);
      } catch (err) {
        console.error("Error loading presets:", err);
      }
    } else {
      const dropdown = document.getElementById("presetDropdown");
      if (dropdown) dropdown.style.display = "none";
    }
  });
};

module.exports = { showPresetDropdown, setupPresetListener };
