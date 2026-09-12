#!/usr/bin/env python3
"""Strip marketplace/junk spec fields and repair malformed keys.

Runs after audit_products.py and before validate_data.py. Removes a field
from both specs and spec_evidence together, keeps provenance gates intact.
Deterministic and idempotent; never fabricates values.

Handles:
1. Junk vocabulary (marketplace fields, price keys incl. Belarusian,
   box-contents, software-settings section headers).
2. Value-as-key dirt: numeric+unit keys ("125Hz"), pure numbers ("5"),
   instruction steps ("1.Open MCHOSE..."), "Smoother ..." descriptions,
   product-family names used as keys, MCHOSE macro block.
3. 'General' merged blobs on a few records -> split into real keys
   (evidence entries are rebuilt from the original page source).
4. 'Size :490*420*3mm'-style keys -> canonical 'Dimensions' key.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS = ROOT / "data/products.json"

# Shared with the frontend JUNK_SPEC_KEY (app.js). Keep both in sync.
JUNK = re.compile(
    r"(add to cart|unit price|price|reviews?|contact|data sheet|spec sheet|"
    r"product name|package|packing list|what.?s in the box|included accessories|"
    r"energy efficiency|sustainable impact|network interface|memory slots?|"
    r"processor|graphics|storage|expansion slots?|external i/o|system fan|"
    r"security management|model|product|shipped from|hongkong|^us$|user guide|faq|"
    r"specification name|^included$|звычайная цана|адпускная цана|цана за адзінку|"
    r"also included|^macro$|^disabled$|^setting$|^switching$|^scenario$|^enabled$|"
    r"^feature$|^specification$|^total$|play once|repeat while pressed|"
    r"toggle repeat|number of levels|x/y axis|office work|general use|"
    r"fps games|high-resolution displays|general gaming|competitive fps gaming|"
    r"lower value|higher value|lod setting|^smoother\s|^\d+\.|^recommended for|^function type$|^mouse functions$|^keyboard mapping$|^system functions$|^slight increase in input latency|^mode$|^sensor fps$|"
    r"^\d+(\.\d+)?(\s*(mm|hz|khz|g|db|ips))?$)",
    re.I,
)

# Product/model family names scraped as spec keys (value-as-key dirt).
FAMILY_NAME_KEYS = {
    "A7 V2", "A7 V2 Pro", "A7 V2 Ultra", "A7 V2 Pro+", "A7 V2 Ultra+",
    "Magi65/Magi65 Pro", "EV63", "EZ80/EZ80 Dark Side RS", "EZ60/EZ63",
    "MQ80", "Zonex 75", "Ardbeg 65", "Tilly 60", "1+1 TKL",
    "Nature 80 Aura", "Nature 65", "FOX Series",
}

# 'General' merged blob -> canonical keys (longest prefix first).
GENERAL_PREFIXES = [
    ("Ear Cushion Material", "Ear Cushions"),
    ("Ear Tip Material", "Ear Tips"),
    ("Baseus App Support", "App Support"),
    ("Water Resistance", "Waterproof"),
    ("Product Materials", "Material"),
    ("Weight", "Weight"),
    ("Colors", "Colors"),
    ("Size", "Size"),
]
GENERAL_SPLIT = re.compile(r"(?=(" + "|".join(p for p, _ in GENERAL_PREFIXES) + r")\s*:)")


def drop_key(product, key):
    """Remove key + its evidence entry."""
    (product.get("specs") or {}).pop(key, None)
    (product.get("spec_evidence") or {}).pop(key, None)


def main():
    doc = json.loads(PRODUCTS.read_text(encoding="utf-8"))
    touched = 0
    removed = 0
    renamed = 0
    split = 0
    for product in doc.get("products", []):
        specs = product.get("specs") or {}
        evidence = product.get("spec_evidence") or {}
        changed = False
        junk_keys = [k for k in specs if JUNK.search(k) or k in FAMILY_NAME_KEYS]
        if junk_keys:
            for key in junk_keys:
                drop_key(product, key)
                removed += 1
            changed = True

        # 'Size :490*420*3mm'-style keys -> canonical 'Dimensions'.
        for key in list(specs.keys()):
            m = re.match(r"^size\s*:\s*(.+)$", key, re.I)
            if m and "Dimensions" not in specs:
                value = m.group(1).strip()
                specs["Dimensions"] = value
                proof = evidence.get(key)
                if proof:
                    evidence["Dimensions"] = dict(proof, value=value)
                drop_key(product, key)
                renamed += 1
                changed = True

        # Review text scraped into layout fields (AJAZZ AKS068 series).
        for key in ("配列", "Layout"):
            value = specs.get(key)
            if isinstance(value, str) and re.search(
                r"(just shy of|i work in a noisy|this is not a fully split)", value, re.I
            ):
                drop_key(product, key)
                removed += 1
                changed = True

        # 'General' merged blobs -> real keys.
        blob = specs.get("General")
        if blob and isinstance(blob, str) and ":" in blob:
            parts = [p.strip() for p in GENERAL_SPLIT.split(blob) if p.strip()]
            old_proof = evidence.get("General")
            new_entries = []
            for part in parts:
                m = re.match(r"^(.*?)\s*:\s*(.*)$", part, re.S)
                if not m:
                    continue
                prefix = m.group(1).strip()
                value = m.group(2).strip()
                target = None
                for p, t in GENERAL_PREFIXES:
                    if prefix == p:
                        target = t
                        break
                if not target or not value:
                    continue
                new_entries.append((target, value))
            if new_entries:
                for target, value in new_entries:
                    if target in specs:
                        continue
                    specs[target] = value
                    if old_proof:
                        evidence[target] = dict(old_proof, value=value)
                drop_key(product, "General")
                split += 1
                changed = True

        if changed:
            touched += 1

    PRODUCTS.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(
        {"products_touched": touched, "fields_removed": removed,
         "renamed": renamed, "general_split": split},
        ensure_ascii=False,
    ))


if __name__ == "__main__":
    main()
