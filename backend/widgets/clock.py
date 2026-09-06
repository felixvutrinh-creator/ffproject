from datetime import datetime
from widgets.base import BaseWidget

class ClockWidget(BaseWidget):
    name = "clock"

    def fetch(self) -> dict:
        now = datetime.now()
        return {
            "time": now.strftime("%H:%M:%S"),
            "date": now.strftime("%d.%m.%Y")
        }