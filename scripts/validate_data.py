#!/usr/bin/env python3
"""Validate publication safety, provenance, domains, and duplicate identities."""

import json
import sys
from pathlib import Path
from urllib.parse import urlparse

from quality_rules import canonical_url, host_allowed, product_name_ok

ROOT = Path(__file__).resolve().parents[1]
db = json.loads((ROOT / "data/products.json").read_text(encoding="utf-8"))
brand_doc = json.loads((ROOT / "data/brands.json").read_text(encoding="utf-8"))
brands = {b["brand"]: b for b in brand_doc.get("brands", [])}
errors, warnings, seen_names, seen_urls = [], [], set(), set()

for brand, cfg in brands.items():
    if not cfg.get("brand_zh_cn"):
        errors.append(f"品牌 {brand}: 缺少 brand_zh_cn")
    if cfg.get("origin") == "中国" and cfg.get("preferred_locale") != "zh-CN":
        errors.append(f"品牌 {brand}: 中国品牌未设置中文来源优先")

for product in db.get("products", []):
    label = f"{product.get('brand','?')} {product.get('name','?')}"
    brand = product.get("brand", "")
    cfg = brands.get(brand)
    if not cfg:
        errors.append(f"{label}: 品牌不在受控品牌库")
        continue
    for required in ("brand", "brand_zh_cn", "name", "category", "specs", "source", "verification"):
        if required not in product:
            errors.append(f"{label}: 缺少 {required}")
    if product.get("brand_zh_cn") != cfg.get("brand_zh_cn"):
        errors.append(f"{label}: 中文品牌名与品牌库不一致")
    source = product.get("source", "")
    if not source.startswith("http"):
        errors.append(f"{label}: source 非 URL")
    elif not host_allowed(source, cfg.get("domains", [])):
        errors.append(f"{label}: 主来源不是受控官方域名")
    if not product_name_ok(product.get("name")):
        errors.append(f"{label}: 名称疑似配件、分类页或营销标题")
    name_key = (brand.casefold().strip(), str(product.get("name", "")).casefold().strip())
    if name_key in seen_names:
        errors.append(f"{label}: 品牌内重名")
    seen_names.add(name_key)
    url_key = canonical_url(source) if source else ""
    if url_key and url_key in seen_urls:
        if product.get("verification", {}).get("quality_gate_version") == "1.2":
            errors.append(f"{label}: 与其他产品使用同一规范化产品页")
        else:
            warnings.append(f"{label}: 历史记录共用产品/集合页，待逐项补证")
    seen_urls.add(url_key)
    confidence = product.get("verification", {}).get("confidence", 0)
    if not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1:
        errors.append(f"{label}: confidence 非法")
    if product.get("verification", {}).get("quality_gate_version") == "1.2":
        evidence = product.get("verification", {}).get("evidence", {})
        if not evidence.get("product_schema"):
            errors.append(f"{label}: 新记录缺少官方 Product 结构化证据")
        for field, value in product.get("specs", {}).items():
            proof = product.get("spec_evidence", {}).get(field)
            if not proof or proof.get("value") != value or not proof.get("source_url"):
                errors.append(f"{label}: 参数 {field} 缺少逐字段来源")
    elif not product.get("spec_evidence"):
        warnings.append(f"{label}: 历史参数待补逐字段来源")
    image_url = product.get("image_url", "")
    if image_url:
        parsed = urlparse(image_url)
        if parsed.scheme != "https" or not parsed.netloc:
            errors.append(f"{label}: 产品图片必须使用有效 HTTPS URL")
        if any(token in image_url.lower() for token in ("favicon", "site-logo", "/logo.", "placeholder", "spinner", "loading.gif", "avatar", "sprite")):
            errors.append(f"{label}: 产品图片疑似站点图标或占位图")

print(f"products={len(db.get('products', []))}, brands={len(brands)}, errors={len(errors)}, warnings={len(warnings)}")
for item in warnings[:30]:
    print("WARN", item)
for item in errors[:100]:
    print("ERROR", item)
if errors:
    sys.exit(1)
