# -*- coding: utf-8 -*-
"""
Import name-level product records from data/marketplace_missing_products.json
(e-commerce full-catalog search results) into products.json.

Only records whose brand exists in brands.json and whose name classifies into
an allowed category are imported; unknown-brand and unclassifiable rows are
reported. Imported records are marked needs_review and "marketplace search
found / specs pending" so the periodic enrichment loop can fill specs later.

Usage: python scripts/import_marketplace_missing.py [--list]
"""
import argparse
import datetime
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/products.json"
BRANDS = ROOT / "data/brands.json"
MISSING = ROOT / "data/marketplace_missing_products.json"

ALLOWED = {"鼠标", "键盘", "耳机/耳麦", "手柄", "配件", "鼠标垫", "声卡", "航插线", "外设收纳包", "音箱/音响"}

CATEGORY_RULES = [
    (["耳机", "耳麦", "耳塞", "headset", "headphone", "earbud"], "耳机/耳麦", "TWS/耳塞"),
    (["音箱", "音响", "soundbar", "sound box", "低音炮"], "音箱/音响", "桌面音箱"),
    (["键盘", "keyboard", "机械轴"], "键盘", "机械键盘"),
    (["鼠标垫", "mousepad", "mouse pad", "桌垫"], "鼠标垫", "桌面垫"),
    (["鼠标", "mouse", "mice"], "鼠标", "游戏鼠标"),
    (["手柄", "gamepad", "controller", "joypad"], "手柄", "手柄"),
    (["声卡", "sound card", "音频接口", "解码器"], "声卡", "外置声卡"),
    (["航插"], "航插线", "航插线"),
    (["收纳包", "收纳袋", "收纳盒", "储存包"], "外设收纳包", "收纳包"),
    (["键帽", "keycap", "腕托", "wrist rest", "线材", "数据线", "音频线", "脚贴", "防滑贴",
      "接收器", "防尘", "旋钮", "轴体", "switch", "充电座", "支架", "hub", "扩展坞", "grip"], "配件", "官方配件"),
    (["键鼠套装", "键鼠"], "键盘", "机械键盘"),
    (["解码"], "声卡", "外置声卡"),
    (["舒适豆", "迷你豆", "豆pro", "豆 "], "耳机/耳麦", "TWS/耳塞"),
]


def clean(x):
    return re.sub(r"\s+", " ", str(x or "")).strip()


def normalize(name):
    return re.sub(r"[^\w\u4e00-\u9fff]+", "", clean(name)).lower()


def classify(name):
    low = clean(name).lower()
    for kws, cat, sub in CATEGORY_RULES:
        if any(k in low for k in kws):
            return cat, sub
    return None, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true", help="only list, don't import")
    args = ap.parse_args()

    db = json.loads(DATA.read_text(encoding="utf-8"))
    brands = {b["brand"]: b for b in json.loads(BRANDS.read_text(encoding="utf-8"))["brands"]}
    items = json.loads(MISSING.read_text(encoding="utf-8"))
    existing = {(p["brand"].lower(), normalize(p["name"])) for p in db["products"]}
    today = datetime.date.today().isoformat()

    imported, skipped_brand, skipped_cat, skipped_dup = [], [], [], []
    for x in items:
        brand = x.get("brand", "")
        name = clean(x.get("name", ""))
        b = brands.get(brand)
        if not b:
            skipped_brand.append((brand, name))
            continue
        cat, sub = classify(name)
        if cat not in ALLOWED:
            skipped_cat.append((brand, name))
            continue
        key = (brand.lower(), normalize(name))
        if key in existing:
            skipped_dup.append((brand, name))
            continue
        rec = {
            "brand": brand,
            "brand_zh_cn": b.get("brand_zh_cn", brand),
            "name": name,
            "category": cat,
            "subcategory": sub,
            "status": "电商旗舰店检索已确认/参数待补",
            "verified": "marketplace search import",
            "origin": b.get("origin", ""),
            "market": "电商旗舰店",
            "first_seen": today,
            "last_verified": today,
            "last_checked": today,
            "source": b.get("collection_urls", [""])[0] or "",
            "sources": [{
                "type": "marketplace",
                "url": "",
                "tier": 60,
                "checked_at": today,
                "note": "marketplace full-catalog search",
            }],
            "specs": {},
            "verification": {"status": "pending", "needs_review": True,
                             "confidence": 0.6, "source_count": 1,
                             "quality_gate_version": "catalog-1.3.0",
                             "evidence": {"marketplace_listing": True}},
        }
        if args.list:
            print(f"  [{cat}] {brand} {name}")
        else:
            db["products"].append(rec)
            existing.add(key)
        imported.append((brand, name, cat))

    if not args.list:
        db["updated_at"] = today
        DATA.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"待导入 {len(items)}：可入库 {len(imported)}，品牌缺失 {len(skipped_brand)}，"
          f"无法分类 {len(skipped_cat)}，已在库 {len(skipped_dup)}")
    if skipped_brand:
        print("  品牌缺失:", sorted(set(b for b, _ in skipped_brand)))
    if skipped_cat:
        print("  无法分类样例:", [(b, n) for b, n in skipped_cat[:8]])


if __name__ == "__main__":
    main()
