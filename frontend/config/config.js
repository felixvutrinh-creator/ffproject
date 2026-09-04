const CONFIG_URL = "../../shared/config-widget.json";
// der folgende Part ist bisschen vibecoded um ehrlich zu sein. Ich kann nämlich kein Javascript, Leon muss das übernehmen//
const SIZES = {
  small:  { cols: 2, rows: 2 },
  medium: { cols: 4, rows: 2 },
  large:  { cols: 4, rows: 4 },
};
const WIDGET_TYPES = {
  clock: {
    label: "Uhr",
    fields: [
      { key: "format", label: "Format", type: "select", choices: ["24h", "12h"] },
      { key: "showSeconds", label: "Sekunden", type: "boolean" },
      { key: "timezone", label: "Zeitzone", type: "text" },
    ],
  },
  weather: {
    label: "Wetter",
    fields: [
      { key: "location", label: "Ort", type: "text" },
      { key: "units", label: "Einheiten", type: "select", choices: ["metric", "imperial"] },
      { key: "language", label: "Sprache", type: "text" },
    ],
  },
};

let config = null;
let selectedId = null;

async function load() {
  try {
    const res = await fetch(CONFIG_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    config = await res.json();
  } catch (err) {
    // Kaputte oder fehlende Config darf die Oberfläche nicht abraeumen.
    console.error("Config konnte nicht geladen werden:", err);
    document.getElementById("preview-hint").textContent =
      "Config konnte nicht geladen werden. Laeuft ein lokaler Server?";
    return;
  }
  renderAll();
}

function renderAll() {
  renderPreview();
  renderLibrary();
  renderWidgetOptions();
  renderDeviceOptions();
}
function renderPreview() {
  const grid = document.getElementById("preview");
  const hint = document.getElementById("preview-hint");
  const cols = config.grid?.columns ?? 6;
  const rows = config.grid?.rows ?? 4;

  grid.innerHTML = "";
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

   const taken = new Set();
  const skipped = [];

  for (const w of config.widgets ?? []) {
    const size = SIZES[w.size];
    if (!size) {
      skipped.push(`${w.id} (unbekannte Groesse "${w.size}")`);
      continue;
    }

    const col = w.position?.col ?? 1;
    const row = w.position?.row ?? 1;

    if (col < 1 || row < 1 || col + size.cols - 1 > cols || row + size.rows - 1 > rows) {
      skipped.push(`${w.id} (passt nicht ins Raster)`);
      continue;
    }

    const cells = [];
    for (let c = col; c < col + size.cols; c++) {
      for (let r = row; r < row + size.rows; r++) cells.push(`${c}:${r}`);
    }
    if (cells.some(cell => taken.has(cell))) {
      skipped.push(`${w.id} (Platz belegt)`);
      continue;
    }
    cells.forEach(cell => taken.add(cell));

    grid.appendChild(createTile(w, col, row, size));
  }

  hint.textContent = skipped.length
    ? `Nicht angezeigt: ${skipped.join(", ")}`
    : "";
}

function createTile(w, col, row, size) {
  const el = document.createElement("div");
  el.className = "tile" + (w.id === selectedId ? " selected" : "");
  el.style.gridColumn = `${col} / span ${size.cols}`;
  el.style.gridRow = `${row} / span ${size.rows}`;

  const type = document.createElement("span");
  type.className = "tile-type";
  type.textContent = WIDGET_TYPES[w.type]?.label ?? w.type;

  const meta = document.createElement("span");
  meta.className = "tile-meta";
  meta.textContent = `${w.size} · ${col}/${row}`;

  el.append(type, meta);
  el.addEventListener("click", () => {
    selectedId = w.id;
    renderPreview();
    renderWidgetOptions();
  });
  return el;
}

// ---------- Widget-Auswahl ----------

function renderLibrary() {
  const list = document.getElementById("library");
  list.innerHTML = "";

  for (const [type, def] of Object.entries(WIDGET_TYPES)) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.textContent = `+ ${def.label}`;
    // Hinzufuegen braucht freie Platzsuche und Speichern - beides spaeter.
    btn.disabled = true;
    btn.title = "Hinzufuegen kommt, sobald gespeichert werden kann";
    li.appendChild(btn);
    list.appendChild(li);
  }
}

// ---------- Optionen des ausgewaehlten Widgets ----------

function renderWidgetOptions() {
  const box = document.getElementById("widget-options");
  box.innerHTML = "";

  const w = (config.widgets ?? []).find(x => x.id === selectedId);
  if (!w) {
    box.innerHTML = '<p class="hint">Kein Widget ausgewählt.</p>';
    return;
  }

  const def = WIDGET_TYPES[w.type];
  if (!def) {
    box.innerHTML = `<p class="hint">Unbekannter Typ "${w.type}".</p>`;
    return;
  }

  box.appendChild(field({ label: "Größe", type: "select", choices: Object.keys(SIZES) }, w.size));
  for (const f of def.fields) {
    box.appendChild(field(f, w.options?.[f.key]));
  }
}

// ---------- Geraete-Einstellungen ----------

function renderDeviceOptions() {
  const box = document.getElementById("device-options");
  const d = config.device ?? {};
  box.innerHTML = "";

  box.appendChild(field({ label: "Theme", type: "select", choices: ["dark", "light"] }, d.theme));
  box.appendChild(field({ label: "Sprache", type: "text" }, d.language));
  box.appendChild(field({ label: "Helligkeit", type: "number" }, d.brightness));
  box.appendChild(field({ label: "Zeitzone", type: "text" }, d.timezone));
  box.appendChild(field({ label: "Nachtmodus", type: "boolean" }, d.nightMode?.enabled));
  box.appendChild(field({ label: "Nacht von", type: "text" }, d.nightMode?.start));
  box.appendChild(field({ label: "Nacht bis", type: "text" }, d.nightMode?.end));
}

// ---------- Formularzeile ----------
// Alle Felder sind vorerst deaktiviert: anzeigen ja, aendern erst mit Backend.

function field(def, value) {
  const row = document.createElement("div");
  row.className = "field";

  const label = document.createElement("label");
  label.textContent = def.label;

  let input;
  if (def.type === "select") {
    input = document.createElement("select");
    for (const choice of def.choices) {
      const opt = document.createElement("option");
      opt.value = choice;
      opt.textContent = choice;
      input.appendChild(opt);
    }
    input.value = value ?? def.choices[0];
  } else if (def.type === "boolean") {
    input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(value);
  } else {
    input = document.createElement("input");
    input.type = def.type === "number" ? "number" : "text";
    input.value = value ?? "";
  }
  input.disabled = true;

  row.append(label, input);
  return row;
}

load();


// Ich hab kein Bock mehr auf Frontend, Leon muss das jetzt machen. Ich habs nur angefangen, damit wir was haben.//