import time
import threading
from widgets.clock import ClockWidget
from widgets.weather import WeatherWidget
from widgets.stocks import StocksWidget
from state import state

WIDGETS = [
    ClockWidget(),
    WeatherWidget(),
    StocksWidget(),
]

TICK = 5
# jedes widget hat seinen eigenen poll_interval, der in der jeweiligen Klasse definiert ist. Der Poller ruft die fetch-Methode jedes Widgets in einem eigenen Zeitintervall auf und aktualisiert den globalen State.
def poll_loop():

    next_run = {w.name: 0.0 for w in WIDGETS}
    while True:
        now = time.monotonic()
        for widget in WIDGETS:
            if now < next_run[widget.name]:
                continue
            result = widget.safe_fetch()
            state.update(result["name"], result)
            next_run[widget.name] = now + widget.poll_interval
        time.sleep(TICK)

def start_poller(): # Startet den Poller in einem Hintergrund-Thread, damit app.py nicht blockiert
    thread = threading.Thread(target=poll_loop, daemon=True)
    thread.start()