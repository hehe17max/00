#!/usr/bin/env python3
"""Idempotent v1.2 metadata migration and conservative legacy cleanup."""

import datetime
import json
import os
from pathlib import Path

from quality_rules import canonical_url, is_foreign_locale, is_specific_product_url, product_name_ok

ROOT = Path(__file__).resolve().parents[1]
BRANDS = ROOT / "data/brands.json"
PRODUCTS = ROOT / "data/products.json"
QUARANTINE = ROOT / "data/quarantine_products.json"
TODAY = datetime.date.today().isoformat()

BRAND_META = {
    "iKF": ("iKF", "中国"), "Razer": ("雷蛇", "海外"),
    "SteelSeries": ("赛睿", "海外"), "HyperX": ("极度未知", "海外"),
    "Keychron": ("渴创", "海外"), "Corsair": ("美商海盗船", "海外"),
    "MCHOSE": ("迈从", "中国"), "Rapoo": ("雷柏", "中国"),
    "ATK": ("ATK", "中国"), "Darmoshark": ("达摩鲨", "中国"),
    "AJAZZ": ("黑爵", "中国"), "VGN": ("VGN", "中国"),
    "AULA": ("狼蛛", "中国"), "Dareu": ("达尔优", "中国"),
    "DURGOD": ("杜伽", "中国"), "KZZI": ("珂芝", "中国"),
    "Glorious": ("Glorious", "海外"), "IQUNIX": ("IQUNIX", "中国"),
    "Kinetic Labs": ("Kinetic Labs", "海外"), "LAMZU": ("兰族", "中国"),
    "ATTACK SHARK": ("攻击鲨", "中国"), "EKSA": ("亿歌", "中国"),
    "LUMINKEY": ("LUMINKEY", "中国"), "EDIFIER": ("漫步者", "中国"),
    "VXE": ("VXE", "中国"),
    "MOONDROP": ("水月雨", "中国"), "FiiO": ("飞傲", "中国"),
    "1MORE": ("万魔", "中国"), "Baseus": ("倍思", "中国"),
    "QCY": ("QCY", "中国"), "HIFIMAN": ("海菲曼", "中国"),
    "SoundPEATS": ("泥炭", "中国"), "Haylou": ("嘿喽", "中国"),
    "TRN": ("TRN", "中国"),
}

ALIASES = {
    "Razer 雷蛇": "Razer",
    "Custom Mechanical Keyboards, Gaming Mice, and PC Gear": "Glorious",
    "IQUNIX.com": "IQUNIX",
    "HyperX ROW": "HyperX",
}

NEW_BRANDS = [
    {"brand":"VXE","brand_zh_cn":"VXE","origin":"中国","preferred_locale":"zh-CN","domains":["atkgear.com.cn"],"collection_urls":["https://www.atkgear.com.cn/about"],"discovery":["configured_pages","sitemap"],"sitemap_urls":["https://www.atkgear.com.cn/sitemap.xml"],"curation":"official_site_verified"},
    {"brand":"EDIFIER","brand_zh_cn":"漫步者","origin":"中国","preferred_locale":"zh-CN","domains":["edifier.com"],"collection_urls":["https://www.edifier.com/cn/","https://www.edifier.com/cn/cate-63.html"],"discovery":["configured_pages","sitemap"],"sitemap_urls":["https://www.edifier.com/sitemap.xml"],"curation":"official_site_verified"},
    {"brand":"MOONDROP","brand_zh_cn":"水月雨","origin":"中国","preferred_locale":"zh-CN","domains":["moondroplab.com"],"collection_urls":["https://moondroplab.com/cn/home"],"discovery":["configured_pages","sitemap"],"sitemap_urls":["https://moondroplab.com/sitemap.xml"],"curation":"official_site_verified"},
    {"brand":"FiiO","brand_zh_cn":"飞傲","origin":"中国","preferred_locale":"zh-CN","domains":["fiio.com"],"collection_urls":["https://www.fiio.com/"],"discovery":["configured_pages","sitemap"],"sitemap_urls":["https://www.fiio.com/sitemap.xml"],"curation":"official_site_verified"},
    {"brand":"1MORE","brand_zh_cn":"万魔","origin":"中国","preferred_locale":"zh-CN","domains":["1more.com"],"collection_urls":["https://usa.1more.com/"],"discovery":["configured_pages","sitemap","shopify_products_json"],"sitemap_urls":["https://usa.1more.com/sitemap.xml"],"curation":"official_site_verified"},
    {"brand":"Baseus","brand_zh_cn":"倍思","origin":"中国","preferred_locale":"zh-CN","domains":["baseus.com"],"collection_urls":["https://www.baseus.com/"],"discovery":["configured_pages","sitemap","shopify_products_json"],"sitemap_urls":["https://www.baseus.com/sitemap.xml"],"curation":"official_site_verified"},
    {"brand":"QCY","brand_zh_cn":"QCY","origin":"中国","preferred_locale":"zh-CN","domains":["qcy.com"],"collection_urls":["https://www.qcy.com/"],"discovery":["configured_pages","sitemap","shopify_products_json"],"sitemap_urls":["https://www.qcy.com/sitemap.xml"],"curation":"official_site_verified"},
    {"brand":"HIFIMAN","brand_zh_cn":"海菲曼","origin":"中国","preferred_locale":"zh-CN","domains":["hifiman.com"],"collection_urls":["https://hifiman.com/"],"discovery":["configured_pages","sitemap"],"sitemap_urls":["https://hifiman.com/sitemap.xml"],"curation":"official_site_verified"},
    {"brand":"SoundPEATS","brand_zh_cn":"泥炭","origin":"中国","preferred_locale":"zh-CN","domains":["soundpeats.com"],"collection_urls":["https://soundpeats.com/"],"discovery":["configured_pages","sitemap","shopify_products_json"],"sitemap_urls":["https://soundpeats.com/sitemap.xml"],"curation":"official_site_verified"},
    {"brand":"Haylou","brand_zh_cn":"嘿喽","origin":"中国","preferred_locale":"zh-CN","domains":["haylou.com"],"collection_urls":["https://haylou.com/"],"discovery":["configured_pages","sitemap"],"sitemap_urls":["https://haylou.com/sitemap.xml"],"curation":"official_site_verified"},
    {"brand":"TRN","brand_zh_cn":"TRN","origin":"中国","preferred_locale":"zh-CN","domains":["trn-audio.com"],"collection_urls":["https://trn-audio.com/"],"discovery":["configured_pages","sitemap","shopify_products_json"],"sitemap_urls":["https://trn-audio.com/sitemap.xml"],"curation":"official_site_verified"},
]


def main():
    brand_doc = json.loads(BRANDS.read_text(encoding="utf-8"))
    merged = {}
    for item in brand_doc.get("brands", []) + NEW_BRANDS:
        item = dict(item)
        item["brand"] = ALIASES.get(item.get("brand"), item.get("brand"))
        brand = item["brand"]
        zh, origin = BRAND_META.get(brand, (brand, item.get("origin", "待确认")))
        item["brand_zh_cn"] = zh
        item["origin"] = origin
        item.setdefault("preferred_locale", "zh-CN" if origin == "中国" else "en")
        if brand not in merged:
            merged[brand] = item
        else:
            for key in ("domains", "collection_urls", "sitemap_urls", "discovery"):
                merged[brand][key] = list(dict.fromkeys(merged[brand].get(key, []) + item.get(key, [])))
    brand_doc["brands"] = sorted(merged.values(), key=lambda x: (x.get("origin") != "中国", x["brand"].casefold()))
    brand_doc["schema_version"] = "1.2"
    brand_doc["language_default"] = "zh-CN"

    db = json.loads(PRODUCTS.read_text(encoding="utf-8"))
    try:
        quarantine = json.loads(QUARANTINE.read_text(encoding="utf-8"))
    except Exception:
        quarantine = []
    restore_source = os.getenv("PERIPHERALDB_RESTORE_PRODUCTS", "").strip()
    if restore_source:
        restored = json.loads(Path(restore_source).read_text(encoding="utf-8"))
        source_products = list(restored.get("products", []))
        quarantine = []
    else:
        source_products = list(db.get("products", []))
    if not restore_source and db.get("quality_migration_revision", 0) < 2:
        source_products += [x.get("product", {}) for x in quarantine if x.get("product")]
        quarantine = []
    quarantined_keys = {
        (x.get("product", {}).get("brand"), x.get("product", {}).get("name"), x.get("product", {}).get("source"))
        for x in quarantine
    }
    output = []
    seen = set()
    for product in source_products:
        product["brand"] = ALIASES.get(product.get("brand"), product.get("brand"))
        zh, origin = BRAND_META.get(product["brand"], (product["brand"], product.get("origin", "待确认")))
        product["brand_zh_cn"] = zh
        product["origin"] = origin
        source = product.get("source", "")
        auto = product.get("subcategory") == "自动发现"
        reason = ""
        if auto and is_foreign_locale(source):
            reason = "foreign_locale_duplicate"
        elif auto and not is_specific_product_url(source):
            reason = "category_or_non_product_page"
        elif auto and not product_name_ok(product.get("name")):
            reason = "accessory_or_non_product"
        identity_value = canonical_url(source) if source and is_specific_product_url(source) else product.get("name", "").casefold()
        identity = (product["brand"].casefold(), identity_value)
        if identity in seen:
            reason = reason or "duplicate_canonical_product"
        if reason:
            quarantine_key = (product.get("brand"), product.get("name"), source)
            if quarantine_key not in quarantined_keys:
                quarantine.append({"quarantined_at": TODAY, "reason": reason, "product": product})
                quarantined_keys.add(quarantine_key)
            continue
        seen.add(identity)
        verification = product.setdefault("verification", {})
        verification.setdefault("evidence", {"official_url": source, "legacy_record": True})
        if verification.get("evidence", {}).get("legacy_record"):
            verification["quality_gate_version"] = "legacy"
        else:
            verification.setdefault("quality_gate_version", "legacy")
        # Historical records predate field-level provenance. Keep them visible,
        # but never present them as verified until the official page is re-read
        # by the v1.2 gate and every published field receives evidence.
        if verification.get("quality_gate_version") == "legacy":
            verification["status"] = "legacy_review_required"
            verification["confidence"] = min(float(verification.get("confidence", 0.7)), 0.70)
            verification["needs_review"] = True
        output.append(product)

    db["products"] = output
    db["quality_policy_version"] = "1.2"
    db["quality_migration_revision"] = 2
    db["language_default"] = "zh-CN"
    db["quarantined_count"] = len(quarantine)
    BRANDS.write_text(json.dumps(brand_doc, ensure_ascii=False, indent=2), encoding="utf-8")
    PRODUCTS.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")
    QUARANTINE.write_text(json.dumps(quarantine, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"brands": len(brand_doc["brands"]), "published": len(output), "quarantined": len(quarantine)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
