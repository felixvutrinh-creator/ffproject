// Konfigurations-Oberflaeche.
//
// Layout und Widget-Darstellung kommen aus ../shared/render.js - derselben
// Schicht, die das Display benutzt. Die Vorschau zeigt deshalb echte Widgets
// und nicht nur graue Kacheln mit Typnamen.
//
// Speichern gibt es noch nicht: dafuer fehlt ein Schreib-Endpunkt im Backend.

import {
  SIZES, WIDGET_TYPES,
  placeWidgets, applyGrid, applyPosition,
  renderWidget, tickClocks, loadJSON,
} from "../shared/render.js";

const CONFIG_URL = "../../shared/config-widget.json";
const STATE_URL = "http://localhost:5001/api/state";
const STATE_INTERVAL = 15000;
const CLOCK_INTERVAL = 1000;

let config = null;
let state = {};
let selectedId = null;
const tiles = new Map();   // Widget-ID -> Kachel-Element

// ---------- Start ----------

async function start() {
  try {
    config = await loadJSON(CONFIG_URL);
  } catch (err) {
    console.error("Config konnte nicht geladen werden:", err);
    document.getElementById("preview-hint").textContent =
      "Config konnte nicht geladen werden. Läuft ein lokaler Server?";
    return;
  }

  renderLibrary();
  renderDeviceOptions();
  buildPreview();
  renderWidgetOptions();

  await refreshState();
  setInterval(refreshState, STATE_INTERVAL);
  setInterval(() => tickClocks(config, tiles), CLOCK_INTERVAL);
}

// Das Backend ist beim Konfigurieren nicht zwingend an. Fehlt es, zeigen die
// Widgets ihren Platzhalter - die Uhr laeuft trotzdem.
async function refreshState() {
  try {
    state = await loadJSON(STATE_URL);
  } catch {
    state = {};
  }
  paintTiles();
}

// ---------- Vorschau ----------

function buildPreview() {
  const grid = document.getElementById("preview");
  const hint = document.getElementById("preview-hint");
  const { placed, skipped, cols, rows } = placeWidgets(config);

  grid.innerHTML = "";
  tiles.clear();
  applyGrid(grid, cols, rows);

  for (const { widget, col, row, size } of placed) {
    const el = document.createElement("div");
    el.className = "tile" + (widget.id === selectedId ? " selected" : "");
    el.dataset.id = widget.id;
    applyPosition(el, col, row, size);

    el.addEventListener("click", () => select(widget.id));

    grid.appendChild(el);
    tiles.set(widget.id, el);
  }

  paintTiles();

  // Im Config-UI steht sehr wohl jemand davor, der es lesen kann.
  hint.textContent = skipped.length
    ? "Nicht angezeigt: " + skipped.map(s => `${s.id} (${s.reason})`).join(", ")
    : "";
}

function paintTiles() {
  for (const w of config.widgets ?? []) {
    const el = tiles.get(w.id);
    if (el) renderWidget(el, w, state, config);
  }
}

function select(id) {
  selectedId = id;
  for (const [wid, el] of tiles) el.classList.toggle("selected", wid === id);
  renderWidgetOptions();
}

// ---------- Widget-Auswahl ----------

function renderLibrary() {
  const list = document.getElementById("library");
  list.innerHTML = "";

  for (const def of Object.values(WIDGET_TYPES)) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.textContent = `+ ${def.label}`;
    // Hinzufuegen braucht freie Platzsuche und Speichern - beides spaeter.
    btn.disabled = true;
    btn.title = "Hinzufügen kommt, sobald gespeichert werden kann";
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
    box.innerHTML = '<p class="hint">Kein Widget ausgewählt</p>';
    return;
  }

  const def = WIDGET_TYPES[w.type];
  if (!def) {
    box.innerHTML = `<p class="hint">Unbekannter Typ "${w.type}"</p>`;
    return;
  }

  box.appendChild(field({ label: "Größe", type: "select", choices: Object.keys(SIZES) }, w.size));
  box.appendChild(field({ label: "Position", type: "text" }, `${w.position?.col} / ${w.position?.row}`));
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
// Alle Felder sind deaktiviert: anzeigen ja, aendern erst mit Schreib-Endpunkt.

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

start();
