#!/usr/bin/env python3
"""
Oppdaterer public/rates.json med gjeldende pengemarkedsrenter
hentet direkte fra sentralbankenes åpne API-er.

Kilder:
  NOK – NIBOR 3M   : Norges Bank  (data.norges-bank.no)
  EUR – EURIBOR 3M : ECB           (data-api.ecb.europa.eu)
  USD – SOFR 3M    : New York Fed  (markets.newyorkfed.org)
  SEK – STIBOR 3M  : Riksbanken   (api.riksbank.se)

Kjøres via GitHub Actions, eller manuelt:
  python3 scripts/fetch_rates.py
"""

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import date, timedelta

RATES_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public",
    "rates.json",
)


def load_current():
    try:
        with open(RATES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {
            "updated": "",
            "rates": {
                "NOK": {"navn": "NIBOR 3M", "rate": 4.00, "oppdatert": ""},
                "EUR": {"navn": "EURIBOR 3M", "rate": 2.25, "oppdatert": ""},
                "USD": {"navn": "SOFR 3M", "rate": 3.60, "oppdatert": ""},
                "SEK": {"navn": "STIBOR 3M", "rate": 2.00, "oppdatert": ""},
            },
        }


def fetch_json(url, timeout=15):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; RatesBot/1.0)",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def today_no():
    """Dagens dato på norsk format DD.MM.YYYY."""
    return date.today().strftime("%d.%m.%Y")


# ---------------------------------------------------------------------------
# Individuelle hentere
# ---------------------------------------------------------------------------

def fetch_nibor():
    """NIBOR 3M fra Norges Bank SDMX-JSON API."""
    url = (
        "https://data.norges-bank.no/api/data/NIBOR/B.NIBOR_3M."
        "?format=json&lastNObservations=1&locale=no"
    )
    data = fetch_json(url)
    series = data["data"]["dataSets"][0]["series"]
    first = next(iter(series.values()))
    obs = first["observations"]
    latest = max(obs.keys(), key=int)
    return round(float(obs[latest][0]), 2)


def fetch_stibor():
    """STIBOR 3M fra Sveriges Riksbank SWEA API."""
    today = date.today()
    from_date = (today - timedelta(days=14)).isoformat()
    to_date = today.isoformat()
    url = f"https://api.riksbank.se/swea/v1/Observations/SETSTR3M/{from_date}/{to_date}"
    data = fetch_json(url)
    if isinstance(data, list) and data:
        return round(float(data[-1]["value"]), 2)
    raise ValueError("Tom respons fra Riksbanken")


def fetch_euribor():
    """EURIBOR 3M fra ECB Statistical Data Warehouse API."""
    url = (
        "https://data-api.ecb.europa.eu/service/data/"
        "FM/B.U2.EUR.RT0.MM.EURIBOR3MD_.HSTA"
        "?lastNObservations=1&format=jsondata"
    )
    data = fetch_json(url)
    series = data["dataSets"][0]["series"]
    first = next(iter(series.values()))
    obs = first["observations"]
    latest = max(obs.keys(), key=int)
    return round(float(obs[latest][0]), 2)


def fetch_sofr():
    """SOFR 30-dagers snitt fra New York Fed. Fallback: overnight SOFR."""
    url = "https://markets.newyorkfed.org/api/rates/secured/sofr/averages/last/1.json"
    data = fetch_json(url)
    for r in data.get("refRates", []):
        if r.get("type") == "SOFR30DAYAVG":
            return round(float(r["percentRate"]), 2)
    # Fallback: overnight
    url2 = "https://markets.newyorkfed.org/api/rates/secured/sofr/last/1.json"
    data2 = fetch_json(url2)
    return round(float(data2["refRates"][0]["percentRate"]), 2)


# ---------------------------------------------------------------------------
# Hoved
# ---------------------------------------------------------------------------

FETCHERS = {
    "NOK": ("NIBOR 3M", fetch_nibor),
    "EUR": ("EURIBOR 3M", fetch_euribor),
    "USD": ("SOFR 3M", fetch_sofr),
    "SEK": ("STIBOR 3M", fetch_stibor),
}


def main():
    current = load_current()
    rates = current.get("rates", {})
    today = today_no()
    changes = []

    for currency, (name, fetcher) in FETCHERS.items():
        try:
            rate = fetcher()
            old = rates.get(currency, {}).get("rate")
            rates[currency] = {"navn": name, "rate": rate, "oppdatert": today}
            if rate != old:
                print(f"✓ {currency} ({name}): {old} → {rate}%")
                changes.append(currency)
            else:
                print(f"= {currency} ({name}): {rate}% (uendret)")
        except Exception as exc:
            fallback = rates.get(currency, {}).get("rate", "ukjent")
            print(f"✗ {currency} ({name}): FEIL – {exc}  (beholder {fallback}%)")

    output = {"updated": date.today().isoformat(), "rates": rates}
    with open(RATES_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    if changes:
        print(f"\n📝 Endringer: {', '.join(changes)}")
    else:
        print("\n✅ Ingen renteendringer siden forrige kjøring.")

    print(f"💾 Lagret: {RATES_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
