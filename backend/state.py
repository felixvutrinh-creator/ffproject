import json
import os

STATE_FILE = os.path.join(os.path.dirname(__file__), "data", "state.json")

class StateManager:
    def __init__(self):
        self._state = {}
        self.load()

    def update(self, widget_name: str, data: dict):
        self._state[widget_name] = data
        self.save()

    def get_all(self) -> dict:
        return self._state

    def save(self):
        os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
        with open(STATE_FILE, "w") as f:
            json.dump(self._state, f, indent=2)

    def load(self):
        if os.path.exists(STATE_FILE):
            with open(STATE_FILE, "r") as f:
                self._state = json.load(f)

# Ein einziges globales State-Objekt, das sich Poller und app.py teilen
state = StateManager()