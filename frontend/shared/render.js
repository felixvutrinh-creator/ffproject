// Gemeinsame Widget Schicht für Display und Config Vorschau.


export const SIZES = {
  small:  { cols: 2, rows: 2 },
  medium: { cols: 4, rows: 2 },
  large:  { cols: 4, rows: 4 },
};

// Widget Typen

export const WIDGET_TYPES = {
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

//platzierung
export function placeWidgets(config) {
  const cols = config.grid?.columns ?? 6;
  const rows = config.grid?.rows ?? 4;

  const taken = new Set();
  const placed = [];
  const skipped = [];

  for (const w of config.widgets ?? []) {
    const size = SIZES[w.size];
    if (!size) {
      skipped.push({ id: w.id, reason: `unbekannte Größe "${w.size}"` });
      continue;
    }

    const col = w.position?.col ?? 1;
    const row = w.position?.row ?? 1;

    if (col < 1 || row < 1 || col + size.cols - 1 > cols || row + size.rows - 1 > rows) {
      skipped.push({ id: w.id, reason: "passt nicht ins Raster" });
      continue;
    }

    const cells = [];
    for (let c = col; c < col + size.cols; c++) {
      for (let r = row; r < row + size.rows; r++) cells.push(`${c}:${r}`);
    }
    if (cells.some(cell => taken.has(cell))) {
      skipped.push({ id: w.id, reason: "Platz belegt" });
      continue;
    }
    cells.forEach(cell => taken.add(cell));

    placed.push({ widget: w, col, row, size });
  }

  return { placed, skipped, cols, rows };
}


export function applyGrid(el, cols, rows) {
  el.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  el.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
}

export function applyPosition(el, col, row, size) {
  el.style.gridColumn = `${col} / span ${size.cols}`;
  el.style.gridRow = `${row} / span ${size.rows}`;
}


export function stateFor(widget, state) {
  return state?.[widget.id] ?? null;
}

// renderer

function placeholder(text) {
  const el = document.createElement("span");
  el.className = "widget-placeholder";
  el.textContent = text;
  return el;
}

const RENDERERS = {

 
  clock(el, w, _state, config) {
    if (!el.querySelector(".clock-time")) {
      el.innerHTML = "";
      const time = document.createElement("span");
      time.className = "clock-time";
      const date = document.createElement("span");
      date.className = "clock-date";
      el.append(time, date);
    }
    paintClock(el, w, config);
  },

  weather(el, w, state) {
    const entry = stateFor(w, state);

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


export function renderWidget(el, widget, state, config) {
  const render = RENDERERS[widget.type];
  if (!render) {
    el.innerHTML = "";
    el.appendChild(placeholder(`Unbekannt: ${widget.type}`));
    return;
  }

  try {
    render(el, widget, state, config);
  } catch (err) {
    console.error(`${widget.id}: Render fehlgeschlagen`, err);
    el.innerHTML = "";
    el.appendChild(placeholder("Fehler"));
  }
}

//uhr

export function paintClock(el, w, config) {
  const o = w.options ?? {};
  const timezone = o.timezone ?? config?.device?.timezone ?? undefined;
  const locale = config?.device?.language ?? "de-DE";
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

// tick tick tick
export function tickClocks(config, tiles) {
  if (!config) return;
  for (const w of config.widgets ?? []) {
    if (w.type !== "clock") continue;
    const el = tiles.get(w.id);
    if (el?.querySelector(".clock-time")) paintClock(el, w, config);
  }
}




export async function loadJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
