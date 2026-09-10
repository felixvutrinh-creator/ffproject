from datetime import datetime
from widgets.base import BaseWidget
from zoneinfo import ZoneInfo
class ClockWidget(BaseWidget):
    name = "clock"

    def fetch(self) -> dict:
        timezone = self.options.get("timezone")
        now = datetime.now(ZoneInfo(timezone)) if timezone else datetime.now()

        time_format = "%I:%M %p" if self.options.get("format") == "12h" else "%H:%M"
        if self.options.get("showSeconds"):
            time_format = time_format.replace("%M", "%M:%S")

        return {
            "time": now.strftime(time_format),
            "date": now.strftime("%d.%m.%Y"),
            "timezone": timezone,
        }