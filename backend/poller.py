import time
import threading
from widgets.clock import ClockWidget
from widgets.weather import WeatherWidget
from state import state

WIDGETS = [
    ClockWidget(),
    WeatherWidget(),
]

POLL_INTERVAL = 30  # Sekunden

def poll_loop():
    while True:
        for widget in WIDGETS:
            result = widget.safe_fetch()
            state.update(result["name"], result)
        time.sleep(POLL_INTERVAL)

def start_poller(): # Startet den Poller in einem Hintergrund-Thread, damit app.py nicht blockiert
    thread = threading.Thread(target=poll_loop, daemon=True)
    thread.start()