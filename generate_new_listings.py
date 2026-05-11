#!/usr/bin/env python3
"""
generate_new_listings.py
Compares the two most-recent TradeMe CSV exports in data/
and writes data/new_listings.json with items that appear in
the latest CSV but not the previous one.

Also writes data/catalogue_meta.json so that script.js can
always load the latest CSV without the filename being hardcoded.

Run locally or via GitHub Actions whenever a new CSV is pushed.
"""

import csv
import glob
import json
import os
import re
from datetime import datetime, timezone

DATA_DIR  = "data"
OUT_FILE  = os.path.join(DATA_DIR, "new_listings.json")
META_FILE = os.path.join(DATA_DIR, "catalogue_meta.json")

# ── helpers ──────────────────────────────────────────────────────────────────

def csv_sort_key(path):
    """
    Extract a sortable datetime from filenames like:
      ProductExportTradeMe260408_164022.csv  -> 2026-04-08 16:40:22
      EXPORT10-5-26.csv                      -> 2026-05-10
    Falls back to file mtime so nothing is excluded.
    """
    name = os.path.basename(path)
    # Pattern: 6-digit date YYMMDD + optional _HHMMSS
    m = re.search(r'(\d{6})(?:_(\d{6}))?', name)
    if m:
        date_str = m.group(1)
        time_str = m.group(2) or "000000"
        try:
            return datetime.strptime(date_str + time_str, "%y%m%d%H%M%S")
        except ValueError:
            pass
    # Fallback: DD-M-YY or DD-MM-YY
    m2 = re.search(r'(\d{1,2})-(\d{1,2})-(\d{2,4})', name)
    if m2:
        d, mo, y = m2.groups()
        y = y if len(y) == 4 else "20" + y
        try:
            return datetime.strptime(f"{d}-{mo}-{y}", "%d-%m-%Y")
        except ValueError:
            pass
    return datetime.fromtimestamp(os.path.getmtime(path))


def unique_key(row):
    """Stable identity for a listing row."""
    return (
        row.get("listing_id") or
        row.get("id") or
        (row.get("title", "") + "||" + str(row.get("start_price", "")))
    )


def load_csv(path):
    rows = {}
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if any([row.get("title"), row.get("body"),
                    row.get("start_price"), row.get("stock_amount")]):
                k = unique_key(row)
                rows[k] = row
    return rows


def clean_price(val):
    if val is None:
        return 0.0
    try:
        return float(re.sub(r"[^0-9.]", "", str(val)))
    except ValueError:
        return 0.0


# ── main ─────────────────────────────────────────────────────────────────────

def main():
    csvs = sorted(
        glob.glob(os.path.join(DATA_DIR, "*.csv")),
        key=csv_sort_key
    )

    # ── Always write catalogue_meta.json so script.js knows the latest CSV ──
    latest_csv_name = os.path.basename(csvs[-1]) if csvs else ""
    meta_payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "latest_csv":   latest_csv_name,
    }
    with open(META_FILE, "w", encoding="utf-8") as f:
        json.dump(meta_payload, f, indent=2, ensure_ascii=False)
    print(f"catalogue_meta.json → latest_csv: {latest_csv_name}")

    if len(csvs) < 2:
        print("Need at least 2 CSV files to compare. Writing empty new_listings.json.")
        payload = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "latest_csv": latest_csv_name,
            "previous_csv": "",
            "new_count": 0,
            "listings": []
        }
        with open(OUT_FILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        return

    latest_path   = csvs[-1]
    previous_path = csvs[-2]

    print(f"Latest:   {latest_path}")
    print(f"Previous: {previous_path}")

    latest_rows   = load_csv(latest_path)
    previous_keys = set(load_csv(previous_path).keys())

    new_items = []
    for key, row in latest_rows.items():
        if key not in previous_keys:
            price = clean_price(row.get("start_price"))
            stock_raw = row.get("stock_amount", "")
            try:
                stock = int(float(re.sub(r"[^0-9.]", "", str(stock_raw))))
            except (ValueError, TypeError):
                stock = None
            new_items.append({
                "listing_id":    row.get("listing_id") or row.get("id") or "",
                "title":         row.get("title", "Untitled"),
                "body":          row.get("body", ""),
                "start_price":   price,
                "stock_amount":  stock,
                "buy_now_price": clean_price(row.get("buy_now_price")),
            })

    # Sort: highest price first
    new_items.sort(key=lambda x: x["start_price"], reverse=True)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "latest_csv":   os.path.basename(latest_path),
        "previous_csv": os.path.basename(previous_path),
        "new_count":    len(new_items),
        "listings":     new_items
    }

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"Done — {len(new_items)} new listing(s) written to {OUT_FILE}")


if __name__ == "__main__":
    main()
