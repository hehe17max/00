#!/usr/bin/env python3
"""
Brand product cross-check against online marketplaces (JD / Tmall / Taobao).

Usage:
  python scripts/search_marketplace.py --from-json <browser_results.json>
  python scripts/search_marketplace.py --brand 漫步者 --names "漫步者X1" "漫步者Lolli3"

The browser part (opening JD/Tmall/Taobao search pages and collecting product
names) is done interactively in a real browser because the marketplaces block
headless scraping. This script consumes the collected names and produces the
list of products that are MISSING from the database, plus a report.

Marketplace pages remain a valid spec source at tier 115 (CN_RETAIL_HOSTS in
quality_rules.py); brand official sites stay at tier 120 as the primary source.
"""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BRANDS = ROOT / "data/brands.json"
PRODUCTS = ROOT / "data/products.json"
MISSING = ROOT / "data/marketplace_missing_products.json"
REPORT = ROOT / "data/marketplace_report.json"


def load_brands():
    doc = json.loads(BRANDS.read_text(encoding="utf-8"))
    return [b.get("brand") for b in doc.get("brands", []) if b.get("brand")]


def load_products():
    doc = json.loads(PRODUCTS.read_text(encoding="utf-8"))
    out = {}
    for p in doc.get("products", []):
        b = p.get("brand", "")
        name = p.get("name", "")
        out.setdefault(b, set()).add(normalize(name))
    return out


def normalize(name):
    """Normalize a product name for fuzzy matching."""
    s = re.sub(r"[^\w\u4e00-\u9fff]+", "", str(name or "")).lower()
    return s


def brand_aliases():
    """Brand name -> possible names/aliases seen on marketplaces."""
    doc = json.loads(BRANDS.read_text(encoding="utf-8"))
    aliases = {}
    zh_to_en = {}
    for b in doc.get("brands", []):
        key = b.get("brand", "")
        names = {key.lower()}
        zh = b.get("brand_zh_cn")
        if zh:
            names.add(zh.lower())
            zh_to_en[zh.lower()] = key
        aliases[key] = names
    return aliases, zh_to_en


def match_product(brand, name, existing, aliases):
    """Return True if the product already exists for this brand (fuzzy)."""
    n = normalize(name)
    if not n:
        return True  # empty name: skip
    # remove brand prefix from the name before comparing
    for a in aliases.get(brand, set()):
        if n.startswith(a):
            n = n[len(a):]
            break
    if not n:
        return True
    for exist in existing.get(brand, set()):
        if not exist:
            continue
        # exact or one contains the other (short names)
        if n == exist or (len(n) >= 4 and (n in exist or exist in n)):
            return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from-json", help="JSON file with browser-collected results: {brand: [product names]}")
    ap.add_argument("--brand", help="single brand name")
    ap.add_argument("--names", nargs="*", help="product names for --brand")
    ap.add_argument("--list", action="store_true", help="list all brands")
    args = ap.parse_args()

    brands = load_brands()
    existing = load_products()
    aliases, zh_to_en = brand_aliases()

    if args.list:
        for b in brands:
            print(f"{b}: {len(existing.get(b, []))} 在库产品")
        return

    results = {}
    if args.from_json:
        results = json.loads(Path(args.from_json).read_text(encoding="utf-8"))
    elif args.brand:
        results = {args.brand: args.names or []}

    missing = []
    report = {"checked_brands": 0, "collected_names": 0, "missing": 0, "known": 0, "brands": {}}
    for raw_brand, names in results.items():
        brand = zh_to_en.get(raw_brand.lower(), raw_brand)
        if brand not in aliases:
            report["brands"].setdefault(brand, {"status": "unknown_brand"})
            for name in names:
                if name and str(name).strip():
                    missing.append({"brand": brand, "name": str(name).strip(),
                                    "source": "marketplace", "pending_brand": True})
            print(f"[{brand}] 品牌不在 brands.json（待自动发现入库），收集 {len(names)} 个均为候选")
            report["brands"][brand] = {"collected": len(names), "missing": names, "status": "unknown_brand"}
            continue
        report["checked_brands"] += 1
        bn = []
        for name in names:
            if not name or not str(name).strip():
                continue
            report["collected_names"] += 1
            if match_product(brand, name, existing, aliases):
                report["known"] += 1
            else:
                bn.append(str(name).strip())
                missing.append({"brand": brand, "name": str(name).strip(), "source": "marketplace"})
        report["brands"][brand] = {"collected": len(names), "missing": bn}
        print(f"[{brand}] 收集 {len(names)} 个，缺失 {len(bn)} 个")
        for x in bn:
            print(f"    - {x}")

    MISSING.write_text(json.dumps(missing, ensure_ascii=False, indent=2), encoding="utf-8")
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n缺失产品 {len(missing)} 个 -> {MISSING.name}")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
