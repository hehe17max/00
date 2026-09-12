#!/usr/bin/env python3
"""Re-rank every product's official sources by the brand-class source policy.

品牌分类来源渠道策略（v1.4）落地到存量数据：
- 按 brands.json 的 source_preference 计算每个来源 URL 的新 tier / type；
- 按 (tier 降序, sha1) 重排 sources 数组（与 update_data.rotate 同序）；
- 主来源 source 取重排后的首位（仅从已有 sources 中选取，不新增抓取）；
- spec_evidence 逐字段的 source_priority / source_type 按该字段自身来源 URL 重算
  （value 与 source_url 不变，保证溯源真实）。

幂等：重复运行结果一致。
"""
import hashlib
import io
import json
import sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from quality_rules import is_cn_page, is_specific_product_url, source_priority

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/products.json"
BRANDS = ROOT / "data/brands.json"


def sha1(url):
    return hashlib.sha1(url.encode()).hexdigest()


def main():
    db = json.loads(DATA.read_text(encoding="utf-8"))
    brand_doc = json.loads(BRANDS.read_text(encoding="utf-8"))
    brands = {b["brand"]: b for b in brand_doc.get("brands", [])}

    changed_primary = 0
    changed_entries = 0
    per_brand = {}

    for p in db.get("products", []):
        bname = p.get("brand", "")
        cfg = brands.get(bname, {})
        preference = cfg.get("source_preference", "cn_official")
        domains = cfg.get("domains", [])

        # 1) 重算并重排 sources
        srcs = p.get("sources", [])
        touched = False
        for s in srcs:
            url = s.get("url", "")
            new_tier = source_priority(url, preference, domains)
            new_type = "official_cn_product" if is_cn_page(url) else "official_product"
            if s.get("tier") != new_tier or s.get("type") != new_type:
                s["tier"] = new_tier
                s["type"] = new_type
                touched = True
        if srcs:
            # 稳定排序：仅按 tier 降序，同权重保持原相对顺序（避免 sha1 平局噪音）。
            srcs.sort(key=lambda s: -s.get("tier", 0))

        # 2) 主来源：仅当存在渠道严格更优（tier 更高）的来源时翻转，
        #    避免同权重 URL 之间的无意义 sha1 平局扰动。
        if srcs:
            old_primary = p.get("source", "")
            old_primary_tier = source_priority(old_primary, preference, domains) if old_primary else 0
            top = srcs[0].get("url", "")
            if (
                top and top != old_primary
                and srcs[0].get("tier", 0) > old_primary_tier
                and is_specific_product_url(top)
            ):
                p["source"] = top
                changed_primary += 1
                touched = True
                per_brand[bname] = per_brand.get(bname, 0) + 1

        # 3) 逐字段证据重标（value/source_url 不变）
        for k, proof in (p.get("spec_evidence") or {}).items():
            if not isinstance(proof, dict):
                continue
            url = proof.get("source_url", "")
            if not url:
                continue
            new_prio = source_priority(url, preference, domains)
            new_type = "official_cn_product" if is_cn_page(url) else "official_product"
            if proof.get("source_priority") != new_prio or proof.get("source_type") != new_type:
                proof["source_priority"] = new_prio
                proof["source_type"] = new_type
                touched = True

        if touched:
            changed_entries += 1

    DATA.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"products={len(db.get('products', []))}")
    print(f"products_touched={changed_entries}, primary_changed={changed_primary}")
    for b, c in sorted(per_brand.items(), key=lambda x: -x[1]):
        print(f"  primary_flip {b}: {c}")


if __name__ == "__main__":
    main()
