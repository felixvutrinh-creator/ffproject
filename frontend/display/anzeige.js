
const CONFIG_URL = "../../shared/config-widget.json";
const STATE_URL = "http://localhost:5001/api/state";
const STATE_INTERVAL = 15000;   // Backend pollt selbst alle 30s
const CLOCK_INTERVAL = 1000;



const SIZES = {
  small:  { cols: 2, rows: 2 },
  medium: { cols: 4, rows: 2 },
  large:  { cols: 4, rows: 4 },
};

const grid = document.getElementById("grid");

let config = null;
let state = {};

const tiles = new Map();

// Start 

async function start() {
  config = await loadConfig();
  if (!config) return;

  buildGrid();
  await refreshState();

  setInterval(refreshState, STATE_INTERVAL);
  setInterval(tickClocks, CLOCK_INTERVAL);
}

async function loadConfig() {
  try {
    const res = await fetch(CONFIG_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    // Ohne Config gibt es kein Layout. Statt schwarzem Schirm eine Meldung.
    console.error("Config konnte nicht geladen werden:", err);
    grid.textContent = "Konfiguration nicht lesbar";
    return null;
  }
}

async function refreshState() {
  try {
    const res = await fetch(STATE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state = await res.json();
  } catch (err) {
    
    console.error("State konnte nicht geladen werden:", err);
    state = {};
  }
  renderData();
}

// Layout

function buildGrid() {
  const cols = config.grid?.columns ?? 6;
  const rows = config.grid?.rows ?? 4;

  grid.innerHTML = "";
  tiles.clear();
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

  
  const taken = new Set();

  for (const w of config.widgets ?? []) {
    const size = SIZES[w.size];
    if (!size) {
      console.warn(`${w.id}: unbekannte Groesse "${w.size}"`);
      continue;
    }

    const col = w.position?.col ?? 1;
    const row = w.position?.row ?? 1;

    if (col < 1 || row < 1 || col + size.cols - 1 > cols || row + size.rows - 1 > rows) {
      console.warn(`${w.id}: passt nicht ins Raster`);
      continue;
    }

    const cells = [];
    for (let c = col; c < col + size.cols; c++) {
      for (let r = row; r < row + size.rows; r++) cells.push(`${c}:${r}`);
    }
    if (cells.some(cell => taken.has(cell))) {
      console.warn(`${w.id}: Platz belegt`);
      continue;
    }
    cells.forEach(cell => taken.add(cell));

    const el = document.createElement("div");
    el.className = "widget";
    el.dataset.id = w.id;
    el.style.gridColumn = `${col} / span ${size.cols}`;
    el.style.gridRow = `${row} / span ${size.rows}`;

    grid.appendChild(el);
    tiles.set(w.id, el);
  }
}

//daten

function renderData() {
  for (const w of config.widgets ?? []) {
    const el = tiles.get(w.id);
    if (!el) continue;   

    const render = RENDERERS[w.type];
    if (!render) {
      el.innerHTML = "";
      el.appendChild(placeholder(`Unbekannt: ${w.type}`));
      continue;
    }

    try {
      render(el, w);
    } catch (err) {
      // Fehler im Renderer solen nicht kaputt machen
      console.error(`${w.id}: Render fehlgeschlagen`, err);
      el.innerHTML = "";
      el.appendChild(placeholder("Fehler"));
    }
  }
}

// Der State ist derzeit nach Widget-TYP geschlüsselt ("clock", "weather"),
// die Config nach ID clock_1. Sobald das Backend nach ID liefert, ist das hier die einzige Zeile die sich ändert

function stateFor(w) {
  return state[w.type] ?? null;
}

function placeholder(text) {
  const el = document.createElement("span");
  el.className = "widget-placeholder";
  el.textContent = text;
  return el;
}

// Renderer Widget Typ
// Ein neuer Widget Typ ist ein Eintrag hier und sonst nichts

const RENDERERS = {

  clock(el, w) {
   
    if (!el.querySelector(".clock-time")) {
      el.innerHTML = "";
      const time = document.createElement("span");
      time.className = "clock-time";
      const date = document.createElement("span");
      date.className = "clock-date";
      el.append(time, date);
    }
    paintClock(el, w);
  },

  weather(el, w) {
    const entry = stateFor(w);

    if (!entry || entry.error || !entry.data) {
      el.innerHTML = "";
      el.appendChild(placeholder(entry?.error ? "Wetter nicht verfügbar" : "…"));
      return;
    }

    const d = entry.data;
    el.innerHTML = "";

    const temp = document.createElement("span");
    temp.className = "weather-temp";
    temp.textContent = `${Math.round(d.temperature)}°`;

    const cond = document.createElement("span");
    cond.className = "weather-condition";
    cond.textContent = d.condition ?? "";

    el.append(temp, cond);
  },
};

// Uhr

function paintClock(el, w) {
  const o = w.options ?? {};
  const timezone = o.timezone ?? config.device?.timezone ?? undefined;
  const locale = config.device?.language ?? "de-DE";
  const now = new Date();

  const timeOpts = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: o.format === "12h",
    timeZone: timezone,
  };
  if (o.showSeconds) timeOpts.second = "2-digit";

  el.querySelector(".clock-time").textContent =
    new Intl.DateTimeFormat(locale, timeOpts).format(now);

  el.querySelector(".clock-date").textContent =
    new Intl.DateTimeFormat(locale, {
      weekday: "short", day: "2-digit", month: "2-digit", timeZone: timezone,
    }).format(now);
}

function tickClocks() {
  if (!config) return;
  for (const w of config.widgets ?? []) {
    if (w.type !== "clock") continue;
    const el = tiles.get(w.id);
    if (el?.querySelector(".clock-time")) paintClock(el, w);
  }
}

start();
