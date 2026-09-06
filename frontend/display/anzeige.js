// Display-Anzeige.
// Layout und Widget-Darstellung kommen aus ../shared/render.js - dieselbe
// Schicht, die auch die Config-Vorschau benutzt. Hier steht nur, was das
// Display zusaetzlich tut: State pollen und die Uhr ticken lassen.

import {
  placeWidgets, applyGrid, applyPosition,
  renderWidget, tickClocks, loadJSON,
} from "../shared/render.js";

const CONFIG_URL = "../../shared/config-widget.json";
const STATE_URL = "http://localhost:5001/api/state";
const STATE_INTERVAL = 15000;   // Backend pollt selbst alle 30s
const CLOCK_INTERVAL = 1000;

const grid = document.getElementById("grid");

let config = null;
let state = {};
const tiles = new Map();   // Widget-ID -> Kachel-Element

async function start() {
  try {
    config = await loadJSON(CONFIG_URL);
  } catch (err) {
    // Ohne Config gibt es kein Layout. Statt schwarzem Schirm eine Meldung.
    console.error("Config konnte nicht geladen werden:", err);
    grid.textContent = "Konfiguration nicht lesbar";
    return;
  }

  buildGrid();
  await refreshState();

  setInterval(refreshState, STATE_INTERVAL);
  setInterval(() => tickClocks(config, tiles), CLOCK_INTERVAL);
}

function buildGrid() {
  const { placed, skipped, cols, rows } = placeWidgets(config);

  grid.innerHTML = "";
  tiles.clear();
  applyGrid(grid, cols, rows);

  // Auf dem Display kein Hinweistext - da steht niemand davor, der ihn liest.
  for (const s of skipped) console.warn(`${s.id}: ${s.reason}`);

  for (const { widget, col, row, size } of placed) {
    const el = document.createElement("div");
    el.className = "widget";
    el.dataset.id = widget.id;
    applyPosition(el, col, row, size);
    grid.appendChild(el);
    tiles.set(widget.id, el);
  }
}

async function refreshState() {
  try {
    state = await loadJSON(STATE_URL);
  } catch (err) {
    // Backend weg: Widgets zeigen ihren Platzhalter, das Display laeuft weiter.
    console.error("State konnte nicht geladen werden:", err);
    state = {};
  }
  renderAll();
}

function renderAll() {
  for (const w of config.widgets ?? []) {
    const el = tiles.get(w.id);
    if (el) renderWidget(el, w, state, config);
  }
}

start();
