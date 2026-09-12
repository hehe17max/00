#!/usr/bin/env python3
"""Split data/products.json into per-category files plus a versioned meta manifest.

The browser loads the small products_meta.json first, then fetches each
category file in parallel with ?v=<version>. Files stay cached until the
content actually changes (no more full re-download with ?ts=Date.now() on
every visit). products.json remains the single source of truth for the
pipeline; nothing else reads the split files.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SRC = DATA / "products.json"

# Top-level category -> file slug. Unknown categories fall back to unclassified.
SLUG = {"鼠标": "mouse", "键盘": "keyboard", "耳机/耳麦": "headphone", "手柄": "controller", "配件": "accessory", "鼠标垫": "mousepad", "声卡": "soundcard", "航插线": "cable", "外设收纳包": "bag", "音箱/音响": "speaker"}
UNCLASSIFIED = "unclassified"


def main():
    doc = json.loads(SRC.read_text(encoding="utf-8"))
    products = doc.get("products", [])
    updated_at = doc.get("updated_at", "")
    schema_version = doc.get("schema_version", 5)

    buckets = {}
    for p in products:
        key = SLUG.get(p.get("category", ""), UNCLASSIFIED)
        buckets.setdefault(key, []).append(p)

    # Content-based version: stable until the data actually changes,
    # so the browser cache stays valid across 30-minute no-op runs.
    canon = json.dumps(
        products, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    version = hashlib.md5(canon).hexdigest()[:10]

    files = {}
    counts = {}
    for slug, items in sorted(buckets.items()):
        fn = f"products_{slug}.json"
        files[slug] = fn
        counts[slug] = len(items)
        out = {
            "schema_version": schema_version,
            "updated_at": updated_at,
            "products": items,
        }
        (DATA / fn).write_text(
            json.dumps(out, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )

    meta = {
        "schema_version": schema_version,
        "updated_at": updated_at,
        "version": version,
        "files": files,
        "counts": counts,
    }
    (DATA / "products_meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    print(json.dumps(
        {"version": version, "updated_at": updated_at, "files": files, "counts": counts},
        ensure_ascii=False,
    ))


if __name__ == "__main__":
    main()
