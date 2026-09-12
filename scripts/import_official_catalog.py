# -*- coding: utf-8 -*-
"""
Import product records from brand official-store catalog pages whose listing
page groups products by category (e.g. EDIFIER mall-pc.edifier.com/goods/).

Reads brands.json collection_urls, locates category group headings on the
listing page, extracts (name, href) per group, and appends name-level product
records to products.json with status "官方商城列表已确认/参数待补" so the
periodic enrichment loop can fill specs later.

Usage: python scripts/import_official_catalog.py --brand EDIFIER
"""
import argparse
import datetime
import json
import re
import sys
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/products.json"
BRANDS = ROOT / "data/brands.json"

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 PeripheralDBCatalogImport"
session = requests.Session()
session.headers["User-Agent"] = UA

# 分组标题 -> (品类, 子类)；None 表示跳过
GROUP_MAP = {
    "开放式": ("耳机/耳麦", "开放式/耳夹"),
    "TWS耳机": ("耳机/耳麦", "TWS/耳塞"),
    "头戴式耳机": ("耳机/耳麦", "头戴式耳机"),
    "入耳式耳机": ("耳机/耳麦", "TWS/耳塞"),
    "游戏耳机": ("耳机/耳麦", "游戏耳机"),
    "音箱": ("音箱/音响", "桌面音箱"),
    "音响": ("音箱/音响", "桌面音箱"),
    "鼠标": ("鼠标", "游戏鼠标"),
    "键盘": ("键盘", "机械键盘"),
    "键鼠": ("键盘", "机械键盘"),
    "配件": ("配件", "官方配件"),
    "线材": ("配件", "线材"),
    "麦克风": None,   # 品类暂未收录
    "助听器": None,   # 非外设
}

# 名称关键词 fallback 分类（按顺序优先）
FALLBACK_RULES = [
    (["音箱", "音响", "soundbar", "speaker", "低音炮"], ("音箱/音响", "桌面音箱")),
    (["麦克风", "话筒", "咪杆", "mic"], None),
    (["助听"], None),
    (["鼠标", "mouse"], ("鼠标", "游戏鼠标")),
    (["键盘", "keyboard"], ("键盘", "机械键盘")),
    (["鼠标垫", "mouse pad"], ("鼠标垫", "桌面垫")),
    (["手柄", "gamepad", "controller"], ("手柄", "手柄")),
    (["声卡", "sound card", "audio interface"], ("声卡", "外置声卡")),
    (["收纳包", "收纳袋"], ("外设收纳包", "收纳包")),
    (["线材", "音频线", "连接线", "数据线", "cable", "转接线"], ("配件", "线材")),
    (["配件", "肩带", "遥控器", "accessory"], ("配件", "官方配件")),
    (["耳机", "耳麦", "耳塞", "headset", "earphone", "headphone"], ("耳机/耳麦", "耳机")),
]

# 品牌型号前缀启发式：EDIFIER 官方商城型号命名规律
BRAND_MODEL_RULES = {
    "EDIFIER": [
        # HECATE 游戏子品牌：G+数字(3位以下) 耳机；G+4位 音箱；G{1-4}M 鼠标
        (r"(?i)^HECATE G\d{4}", ("音箱/音响", "游戏音箱")),
        (r"(?i)^HECATE G\d+M", ("鼠标", "游戏鼠标")),
        (r"(?i)^HECATE G\d", ("耳机/耳麦", "游戏耳机")),
        (r"(?i)^HECATE GM", ("耳机/耳麦", "游戏耳机")),
        (r"(?i)^HECATE AIR", ("耳机/耳麦", "游戏耳机")),
        # 耳机：W 颈挂/真无线、H 头戴、Lolli/Comfo 真无线、花再 Evo/Zero、X Pro
        (r"(?i)^W\d", ("耳机/耳麦", "颈挂/无线")),
        (r"(?i)^H\d+", ("耳机/耳麦", "头戴式耳机")),
        (r"(?i)^Lolli", ("耳机/耳麦", "TWS/耳塞")),
        (r"(?i)^Comfo", ("耳机/耳麦", "开放式/耳夹")),
        (r"^花再.*(Evo|Zero|喵|Doo)", ("耳机/耳麦", "TWS/耳塞")),
        (r"(?i)^X\d+", ("耳机/耳麦", "TWS/耳塞")),
        (r"^USB K", ("耳机/耳麦", "头戴式耳机")),
        # 音箱：N/S/M/T/R/K 系列
        (r"(?i)^[NSMTRK]\d", ("音箱/音响", "桌面音箱")),
        (r"(?i)^K\d{3}", ("音箱/音响", "桌面音箱")),
        (r"^M0", ("音箱/音响", "桌面音箱")),
        (r"^MF", ("音箱/音响", "桌面音箱")),
        (r"^花再.*(Nano|薄荷)", ("音箱/音响", "桌面音箱")),
    ],
}


def fallback_classify(brand, name, url=""):
    s = clean(name).lower() + " " + url.lower()
    for kws, mapping in FALLBACK_RULES:
        if any(k in s for k in kws):
            return mapping
    for br, rules in BRAND_MODEL_RULES.items():
        if brand == br:
            for pat, mapping in rules:
                if re.search(pat, clean(name)):
                    return mapping
    return None  # 待人工确认


def clean(x):
    return re.sub(r"\s+", " ", str(x or "")).strip()


def normalize(name):
    return re.sub(r"[^\w\u4e00-\u9fff]+", "", clean(name)).lower()


def find_group_container(title_el, soup):
    """Find the container that holds both the group heading and its items."""
    node = title_el
    for _ in range(6):
        node = node.parent
        if node is None:
            break
        if node.find_all("a", href=True) and node.get_text(" ", strip=True):
            # prefer the smallest ancestor that already contains a goods link
            if node.find("a", href=True) and len(node.find_all("a", href=True)) >= 2:
                return node
    return None


def extract_catalog(url):
    """Return list of (category, subcategory, name, href) for all goods links."""
    try:
        r = session.get(url, timeout=20)
        r.encoding = "utf-8"
        r.raise_for_status()
    except Exception as e:
        print(f"  ! 抓取失败 {url}: {e}")
        return []
    soup = BeautifulSoup(r.text, "html.parser")
    # 1) 分组标题 -> 容器内商品链接
    grouped = {}
    for el in soup.find_all(["h1", "h2", "h3", "h4", "h5", "span", "div", "p"]):
        t = clean(el.get_text(" ", strip=True))
        if t not in GROUP_MAP or GROUP_MAP[t] is None:
            continue
        container = find_group_container(el, soup)
        if container is None:
            continue
        for a in container.find_all("a", href=True):
            h = urljoin(url, a["href"]).split("#")[0].split("?")[0]
            name = clean(a.get_text(" ", strip=True))
            if not name or len(name) < 3 or "goodsdetail" not in h.lower():
                continue
            grouped.setdefault(name, GROUP_MAP[t])
    # 2) 全页商品，分组优先，否则 fallback
    out = []
    seen = set()
    for a in soup.find_all("a", href=True):
        h = urljoin(url, a["href"]).split("#")[0].split("?")[0]
        name = clean(a.get_text(" ", strip=True))
        if not name or len(name) < 3 or "goodsdetail" not in h.lower():
            continue
        if name in seen:
            continue
        seen.add(name)
        mapping = grouped.get(name)
        if mapping is None:
            mapping = GROUP_MAP.get(name)
        out.append((mapping[0], mapping[1], name, h) if mapping else (None, None, name, h))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--brand", help="brand key in brands.json")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--list", action="store_true", help="only list, don't import")
    args = ap.parse_args()

    db = json.loads(DATA.read_text(encoding="utf-8"))
    brands = json.loads(BRANDS.read_text(encoding="utf-8"))["brands"]
    existing = {(p["brand"].lower(), normalize(p["name"])): p for p in db["products"]}
    today = datetime.date.today().isoformat()

    targets = [b for b in brands if (args.all or b["brand"] == args.brand)]
    for b in targets:
        urls = [u for u in b.get("collection_urls", []) if "/goods/" in u or "goodsdetail" in u.lower()]
        if not urls:
            continue
        print(f"== {b['brand']} 列表页 {urls}")
        for u in urls:
            items = extract_catalog(u)
            # 未分组/未识别的商品用 fallback 分类
            resolved = []
            for cat, sub, name, href in items:
                if cat is None:
                    m = fallback_classify(b["brand"], name, href)
                    if m is None:
                        resolved.append((None, None, name, href))
                    else:
                        resolved.append((m[0], m[1], name, href))
                else:
                    resolved.append((cat, sub, name, href))
            grouped = {}
            for cat, sub, name, href in resolved:
                grouped.setdefault(cat, []).append((sub, name, href))
            for cat, lst in grouped.items():
                if cat is None:
                    print(f"   [跳过] {len(lst)} 个（{lst[0][1]} 等）")
                    continue
                print(f"   [{cat}] {len(lst)} 个")
                added = 0
                for sub, name, href in lst:
                    key = (b["brand"].lower(), normalize(name))
                    if key in existing:
                        continue
                    rec = {
                        "brand": b["brand"],
                        "brand_zh_cn": b.get("brand_zh_cn", b["brand"]),
                        "name": name,
                        "category": cat,
                        "subcategory": sub,
                        "status": "官方商城列表已确认/参数待补",
                        "verified": "官方商城列表导入",
                        "origin": b.get("origin", ""),
                        "market": "官方商城",
                        "first_seen": today,
                        "last_verified": today,
                        "last_checked": today,
                        "source": href,
                        "sources": [{
                            "type": "official_store",
                            "url": href,
                            "tier": 90,
                            "checked_at": today,
                            "note": "official store catalog import",
                        }],
                        "specs": {},
                        "verification": {"status": "pending", "needs_review": True,
                                         "confidence": 0.7, "source_count": 1,
                                         "quality_gate_version": "1.3-catalog"},
                    }
                    if args.list:
                        print(f"       - {name} [{cat}]")
                    else:
                        db["products"].append(rec)
                        existing[key] = rec
                    added += 1
                if not args.list:
                    print(f"       新增 {added} 个")
    if not args.list:
        db["updated_at"] = today
        DATA.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")
        print("完成")


if __name__ == "__main__":
    main()
