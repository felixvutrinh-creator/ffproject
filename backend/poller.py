import time
import json
import os
import threading
from widgets.clock import ClockWidget
from widgets.weather import WeatherWidget
from widgets.stocks import StocksWidget
from state import state
CONFIG_FILE = os.path.join(os.path.dirname(__file__), "..", "shared", "config-widget.json")
WIDGET_classes = { # Typ aus Config = Klasse. Gegenstück zu WIdget_types in config.js
    "clock": ClockWidget,
    "weather": WeatherWidget,
    "stocks": StocksWidget,

}

TICK = 5
# jedes widget hat seinen eigenen poll_interval, der in der jeweiligen Klasse definiert ist. Der Poller ruft die fetch-Methode jedes Widgets in einem eigenen Zeitintervall auf und aktualisiert den globalen State.
def build_widgets(): # Liest die Konfiguration und erstellt die Widget-Objekte ; soll nicht wegen Tippfehler in einer JSON Datei stumm bleiben
    try:
        with open(CONFIG_FILE, encoding="utf-8") as f:
            config = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        print(f"Config nicht lesbar ({type(e).__name__}) - starte ohne Widgets")
        return []

    widgets = []
    seen = set()

    for entry in config.get("widgets", []):
        widget_type = entry.get("type")
        widget_id = entry.get("id")
        options = entry.get("options", {})

        if not widget_type or not widget_id:
            print(f"Ungültige Widget-Konfiguration: {entry}")
            continue

        if widget_id in seen:
            print(f"Duplikat Widget-ID '{widget_id}' - überspringe")
            continue

        seen.add(widget_id)

        widget_class = WIDGET_classes.get(widget_type)
        if not widget_class:
            print(f"Unbekannter Widget-Typ '{widget_type}' - überspringe")
            continue

        try:
            widget = widget_class(widget_id, options)
            widgets.append(widget)
        except Exception as e:
            print(f"Fehler beim Erstellen von Widget '{widget_id}': {e}")
    return widgets

def poll_loop(widgets): # Taktgeber

    next_run = {w.id: 0.0 for w in widgets}
    while True:
        now = time.monotonic()
        for widget in widgets:
            if now < next_run[widget.id]:
                continue
            result = widget.safe_fetch()
            state.update(result["id"], result)
            next_run[widget.id] = now + widget.poll_interval
        time.sleep(TICK)

def start_poller(): # Startet den Poller in einem Hintergrund-Thread, damit app.py nicht blockiert
    widgets = build_widgets()
    print (f"Widgets aus Config: {', '.join(w.id for w in widgets) or 'keine'}")

    
    removed = state.prune([w.id for w in widgets]) # Entfernt Widgets, die nicht mehr in der Konfiguration sind
    if removed:
        print(f"Removed widgets from state: {', '.join(removed)}")
    thread = threading.Thread(target=poll_loop, args=(widgets,), daemon=True)
    thread.start()