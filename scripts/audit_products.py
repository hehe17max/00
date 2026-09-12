#!/usr/bin/env python3
"""Clean the full published catalogue and merge verbose duplicate store rows.

This is intentionally deterministic so it can run before every scheduled
update. It never fabricates specifications: empty products remain visible with
an explicit pending status, while accessories and unrelated products are moved
to the existing quarantine file.
"""

import datetime
import html
import json
import re
from pathlib import Path
from urllib.parse import unquote, urlparse

from quality_rules import (
    canonical_url,
    concise_product_name,
    product_identity,
    product_name_ok,
    supported_product,
)

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS = ROOT / "data/products.json"
QUARANTINE = ROOT / "data/quarantine_products.json"
REPORT = ROOT / "data/data_quality_report.json"
TODAY = datetime.date.today().isoformat()
ALLOWED_CATEGORIES = {"鼠标", "键盘", "耳机/耳麦", "手柄", "配件", "鼠标垫", "声卡", "航插线", "外设收纳包"}
PLACEHOLDERS = {None, "", "—", "待补参数"}


def clean(value):
    return re.sub(r"\s+", " ", html.unescape(str(value or ""))).strip()


def meaningful_specs(product):
    return {
        k: v for k, v in product.get("specs", {}).items()
        if k not in ("参数状态", "原分类") and v not in PLACEHOLDERS
    }


def auto_discovered(product):
    gate = str(product.get("verification", {}).get("quality_gate_version") or "")
    return (
        product.get("subcategory") == "自动发现"
        or "自动发现" in product.get("verified", "")
        or gate == "1.2"
        or gate.startswith("1.3")
    )


def phrase(value):
    return re.sub(r"[^a-z0-9\u4e00-\u9fff]+", " ", clean(value).casefold()).strip()


def classify(name, url):
    value = (clean(name) + " " + unquote(url)).casefold()
    if any(x in value for x in ("mouse", "mice", "鼠标")):
        return "鼠标"
    if any(x in value for x in ("keyboard", "keypad", "键盘")):
        return "键盘"
    if any(x in value for x in ("headset", "headphone", "earbud", "earphone", "earclip", "耳机", "耳麦")):
        return "耳机/耳麦"
    return "待分类"


def classify_subcategory(name, url):
    value = (clean(name) + " " + unquote(url)).casefold().replace("-", " ")
    if "sleep" in value or "睡眠" in value:
        return "睡眠耳机"
    if any(x in value for x in ("open ear", "earclip", "ear clip", "耳夹", "开放式")):
        return "开放式/耳夹"
    if any(x in value for x in ("gaming", "esports", "游戏", "电竞")):
        return "游戏耳机"
    if "wired" in value and "wireless" not in value:
        return "有线耳机"
    if any(x in value for x in ("earbud", "earphone", "耳塞")):
        return "TWS/耳塞"
    if any(x in value for x in ("headset", "headphone", "耳机", "耳麦")):
        return "头戴式耳机"
    return "自动发现"


def specific_url(url):
    path = urlparse(url).path.casefold()
    return "/products/" in path or "/product/" in path or "/goods/" in path


def record_score(product):
    return (
        len(meaningful_specs(product)) * 20
        + (8 if specific_url(product.get("source", "")) else 0)
        + (4 if product.get("image_url") else 0)
        - min(len(product.get("name", "")), 100) / 100
    )


def merge_records(left, right, canonical_name):
    if record_score(right) > record_score(left):
        left, right = right, left
    left["name"] = canonical_name
    left.setdefault("specs", {})
    for key, value in right.get("specs", {}).items():
        if value not in PLACEHOLDERS and left["specs"].get(key) in PLACEHOLDERS:
            left["specs"][key] = value
    left.setdefault("spec_evidence", {}).update({
        key: value for key, value in right.get("spec_evidence", {}).items()
        if key not in left.get("spec_evidence", {})
    })
    sources = []
    seen = set()
    for source in left.get("sources", []) + right.get("sources", []):
        url = canonical_url(source.get("url", ""))
        if url and url not in seen:
            seen.add(url)
            sources.append(source)
    left["sources"] = sources
    if specific_url(right.get("source", "")) and not specific_url(left.get("source", "")):
        left["source"] = right["source"]
    if not left.get("image_url") and right.get("image_url"):
        left["image_url"] = right["image_url"]
        left["image_source"] = right.get("image_source", right.get("source", ""))
    if left.get("category") not in ALLOWED_CATEGORIES and right.get("category") in ALLOWED_CATEGORIES:
        left["category"] = right["category"]
    if left.get("subcategory") == "自动发现" and right.get("subcategory") not in (None, "", "自动发现"):
        left["subcategory"] = right["subcategory"]
    verification = left.setdefault("verification", {})
    verification["needs_review"] = True
    verification["confidence"] = min(float(verification.get("confidence", 0.78)), 0.78)
    if verification.get("status") != "conflict":
        verification["status"] = "legacy_review_required"
    verification["quality_gate_version"] = "1.3-audited"
    verification["source_count"] = len(sources)
    return left


def main():
    document = json.loads(PRODUCTS.read_text(encoding="utf-8"))
    products = document.get("products", [])
    quarantine = json.loads(QUARANTINE.read_text(encoding="utf-8")) if QUARANTINE.exists() else []
    cleaned = []
    quarantined = []
    renamed = []
    for product in products:
        brand = product.get("brand", "")
        raw_name = clean(product.get("name"))
        is_auto = auto_discovered(product)
        already_audited = product.get("verification", {}).get("quality_gate_version") == "1.3-audited"
        official_catalog_listing = bool(
            product.get("verification", {}).get("evidence", {}).get("official_catalog_listing")
        )
        if is_auto and not already_audited and not official_catalog_listing and not supported_product(raw_name, product.get("source", "")):
            quarantined.append((product, "unsupported_or_accessory_product"))
            continue
        new_name = concise_product_name(brand, raw_name, product.get("source", "")) if is_auto else raw_name
        if is_auto and (not product_name_ok(new_name) or len(new_name) > 64 or len(new_name.split()) > 8):
            quarantined.append((product, "invalid_or_marketing_title"))
            continue
        if new_name != raw_name:
            renamed.append({"brand": brand, "from": raw_name, "to": new_name})
        product["name"] = new_name
        if is_auto:
            category = classify(raw_name, product.get("source", ""))
            if category in ALLOWED_CATEGORIES:
                product["category"] = category
            if product.get("subcategory") in (None, "", "自动发现"):
                product["subcategory"] = classify_subcategory(raw_name, product.get("source", ""))
            product.setdefault("verification", {})["quality_gate_version"] = "1.3-audited"
        cleaned.append(product)

    merged = []
    index = {}
    duplicate_count = 0
    for product in cleaned:
        key = (product.get("brand", "").casefold(), product_identity(product.get("brand", ""), product.get("name", "")))
        if key[1] and key in index:
            duplicate_count += 1
            current = index[key]
            combined = merge_records(current, product, current.get("name") or product.get("name"))
            if combined is not current:
                merged[merged.index(current)] = combined
                index[key] = combined
            quarantine.append({"quarantined_at": TODAY, "reason": "duplicate_canonical_product_merged", "product": product})
        else:
            index[key] = product
            merged.append(product)

    for product, reason in quarantined:
        quarantine.append({"quarantined_at": TODAY, "reason": reason, "product": product})

    for product in merged:
        if meaningful_specs(product):
            product.setdefault("specs", {}).pop("参数状态", None)

    document["products"] = sorted(merged, key=lambda p: (p.get("brand", "").casefold(), p.get("name", "").casefold()))
    document["updated_at"] = TODAY
    document["notes"] = "v1.3：全库型号清洗、重复产品合并、空参数可见；每30分钟补充官网参数。"
    report = {
        "date": TODAY,
        "before": len(products),
        "after": len(merged),
        "renamed": len(renamed),
        "duplicates_merged": duplicate_count,
        "quarantined": len(quarantined),
        "empty_specs_visible": sum(not meaningful_specs(p) for p in merged),
        "rename_samples": renamed[:50],
    }
    PRODUCTS.write_text(json.dumps(document, ensure_ascii=False, indent=2), encoding="utf-8")
    QUARANTINE.write_text(json.dumps(quarantine, ensure_ascii=False, indent=2), encoding="utf-8")
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
