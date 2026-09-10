import requests
from widgets.base import BaseWidget

class WeatherWidget(BaseWidget):
    name = "weather"
    poll_interval = 300

    FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
    GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"

    def __init__(self, widget_id, options=None):
        super().__init__(widget_id, options) #Nur lesen kein Netzwerk
       
        self.latitude = self.options.get("latitude")
        self.longitude = self.options.get("longitude")

    def _resolve_location(self):
        location = self.options.get("location")
        if not location:
            raise ValueError("Weder 'location' noch Koordinaten in den options")

        response = requests.get(
            self.GEOCODE_URL,
            params={"name": location, "count": 1,
                    "language": self.options.get("language", "de")},
            timeout=5,
                    
        )
        response.raise_for_status()
        results = response.json().get("results")
        if not results:
            raise ValueError(f"Ort '{location}' nicht gefunden")
        self.latitude = results[0]["latitude"]
        self.longitude = results[0]["longitude"]

    def fetch(self) -> dict:
        if self.latitude is None or self.longitude is None:
            self._resolve_location()

        response = requests.get(
            self.FORECAST_URL,
            params={
                "latitude": self.latitude,
                "longitude": self.longitude,
                "current": "temperature_2m,weather_code,wind_speed_10m",
                "timezone": "Europe/Berlin",
            },
            timeout=5,
        )
        response.raise_for_status()
        data = response.json()["current"]

        return {
            "location": self.options.get("location"),
            "temperature":data["temperature_2m"],
            "wind_speed":data["wind_speed_10m"],
            "condition":self._map_weather_code(data["weather_code"]),
        }
    def _map_weather_code(self, code: int) -> str:
        mapping = {
            0: "Klar", 1: "Überwiegend klar", 2: "Teilweise bewölkt", 3: "Bewölkt",
            45: "Nebel", 61: "Leichter Regen", 63: "Regen", 65: "Starker Regen",
            71: "Leichter Schneefall", 80: "Regenschauer", 95: "Gewitter"
        }
        return mapping.get(code, "Unbekannt")