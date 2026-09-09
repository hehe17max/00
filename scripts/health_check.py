#!/usr/bin/env python3
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
required_files = [
    "index.html", "app.js", "style.css", ".nojekyll",
    "data/products.json", "data/brands.json", "data/filter_schema.json",
    "data/source_policy.json", "data/brand_discovery_config.json",
    "data/brand_candidates.json", "data/review_queue.json",
    "scripts/discover_brands.py", "scripts/update_data.py",
    "scripts/import_secondary.py", "scripts/validate_data.py",
    ".github/workflows/update.yml", ".github/workflows/deploy-pages.yml",
]
errors = []
for rel in required_files:
    if not (ROOT / rel).exists():
        errors.append("缺少文件: " + rel)

for rel in [
    "data/products.json","data/brands.json","data/filter_schema.json",
    "data/source_policy.json","data/brand_discovery_config.json",
    "data/brand_candidates.json","data/review_queue.json",
]:
    try:
        json.loads((ROOT / rel).read_text(encoding="utf-8"))
    except Exception as e:
        errors.append(f"{rel} JSON 无法读取: {e}")

if errors:
    print("PeripheralDB health check FAILED")
    for e in errors:
        print("ERROR:", e)
    sys.exit(1)

db = json.loads((ROOT/"data/products.json").read_text(encoding="utf-8"))
brands = json.loads((ROOT/"data/brands.json").read_text(encoding="utf-8"))
print("PeripheralDB health check OK")
print("products =", len(db.get("products", [])))
print("configured brands =", len(brands.get("brands", [])))
