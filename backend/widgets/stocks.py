import os
from datetime import datetime, timezone, timedelta

import requests
from widgets.base import BaseWidget

class StocksWidget(BaseWidget):
    name ="stocks"
    poll_interval = 300

    BASE_URL = "https://finnhub.io/api/v1/quote"
    STATE_AFTER = timedelta(minutes=15)

    def __init__(self, symbol="AAPL", currency="USD"):
        self.symbol = symbol
        self.currency = currency
    def fetch(self) -> dict:
        api_key = os.environ.get("FINNHUB_API_KEY")
        if not api_key:
            raise ValueError("FINNHUB_API_KEY environment variable is not set.")

        response =requests.get(self.BASE_URL, params={"symbol": self.symbol, "token": api_key}, timeout=5)
        response.raise_for_status()
        data = response.json()

        if not data.get("c"):
            raise ValueError(f"No Data founnd for symbol {self.symbol}")
        quoted_at = datetime.fromtimestamp(data["t"], tz=timezone.utc)

        return {
            "symbol": self.symbol,
            "currency": self.currency,
            "price": round(data["c"], 2),
            "change": round(data["d"] - data["pc"], 2),
            "percent_change": round(data["dp"], 2),
            "previous_close": round(data["pc"], 2),
            "quoted_at": quoted_at.isoformat(),
            "state": self._determine_state(quoted_at),
            "stale": datetime.now(timezone.utc) - quoted_at > self.STATE_AFTER
        }


    # API Keys müssen noch in der .env rein. Mach ich demnächst.