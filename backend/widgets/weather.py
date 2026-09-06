import requests
from widgets.base import BaseWidget

class WeatherWidget(BaseWidget):
    name = "weather"

    def __init__(self, latitude=52.13, longitude=11.64):  # Magdeburg als Default
        self.latitude = latitude
        self.longitude = longitude

    def fetch(self) -> dict:
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": self.latitude,
            "longitude": self.longitude,
            "current": "temperature_2m,weather_code,wind_speed_10m",
            "timezone": "Europe/Berlin"
        }
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()["current"]

        return {
            "temperature": data["temperature_2m"],
            "wind_speed": data["wind_speed_10m"],
            "condition": self._map_weather_code(data["weather_code"])
        }

    def _map_weather_code(self, code: int) -> str:
        mapping = {
            0: "Klar", 1: "Überwiegend klar", 2: "Teilweise bewölkt", 3: "Bewölkt",
            45: "Nebel", 61: "Leichter Regen", 63: "Regen", 65: "Starker Regen",
            71: "Leichter Schneefall", 80: "Regenschauer", 95: "Gewitter"
        }
        return mapping.get(code, "Unbekannt")