from abc import ABC, abstractmethod

class BaseWidget(ABC): # Basisklasse für alle Widgets 

    name: str = "base"  # wird von jedem Widget überschrieben
    poll_interval: int = 30  # Sekunden, wie oft das Widget neue Daten holt. Widgets können das selbst überschreiben

    def __init__(self, widget_id: str, options: dict | None = None):
        self.id = widget_id
        self.options = options or {}

    @abstractmethod
    def fetch(self) -> dict:
        raise NotImplementedError("fetch() muss in jedem Widget implementiert werden")

    def safe_fetch(self) -> dict:
        try:
            return{"id": self.id, "type": self.name, "data": self.fetch(), "error": None}
        except Exception as e:
            print(f"[{self.id}] {e}")
            return {"id": self.id, "type": self.name, "data": None, "error": self._error_text(e)}

    @staticmethod
    def _error_text(e: Exception) -> str:
        response = getattr(e, "response", None)
        if response is not None:
            return f"HTTP {response.status_code}"
        return type(e).__name__
       