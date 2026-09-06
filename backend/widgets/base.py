from abc import ABC, abstractmethod

class BaseWidget(ABC): # Basisklasse für alle Widgets 

    name: str = "base"  # wird von jedem Widget überschrieben
    poll_interval: int = 30  # Sekunden, wie oft das Widget neue Daten holt. Widgets können das selbst überschreiben
    @abstractmethod
    def fetch(self) -> dict: # Holt aktuelle Daten
        raise NotImplementedError

    def safe_fetch(self) -> dict: # Fängt Fehler ab, damit nicht ganzes Backend crashed auf lock sondern nur das Widget einen Fehler spuckt
        try:
            return {"name": self.name, "data": self.fetch(), "error": None}
        except Exception as e:
            return {"name": self.name, "data": None, "error": str(e)}
    