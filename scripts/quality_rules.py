#!/usr/bin/env python3
"""Shared, conservative publication rules for PeripheralDB.

The rules deliberately prefer false negatives over publishing a category page,
accessory, translated mirror, or unsupported specification as a product.
"""

import re
from urllib.parse import urlparse, urlunparse

FOREIGN_LOCALE_SEGMENTS = {
    "ar", "de", "es", "es-ar", "fr", "it", "ja", "jp", "ko", "pl",
    "pt", "pt-br", "ru", "tr", "zh-tw", "zh-hk",
}

NON_PRODUCT_TERMS = (
    "accessory", "accessories", "bundle", "cable", "carrying case",
    "collection", "ear pad", "earpad", "earmuff", "headset plate",
    "holder", "microphone replacement", "replacement", "spare part",
    "microphone and camera arm", "housing", "keycaps", "switch sample",
    "wireless dongle", "产品中心", "全部产品", "配件",
    "替换耳罩", "耳机线", "收纳盒", "支持v hub", "轴体介绍",
)

CATEGORY_ONLY = (
    "gaming headsets", "headphones", "wireless gaming headsets",
    "wired gaming headsets", "xbox gaming headsets",
    "playstation gaming headsets", "nintendo gaming headsets",
    "all products", "earbuds", "open-ear earbuds",
)

BAD_BRAND_TERMS = (
    "custom mechanical", "gaming mice", "pc gear", "official website",
    "free shipping", "best gaming", "products and accessories",
)


def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def hostname(url):
    host = urlparse(url).netloc.lower().split(":")[0]
    return host[4:] if host.startswith("www.") else host


def host_allowed(url, domains):
    host = hostname(url)
    return any(host == d.lower() or host.endswith("." + d.lower()) for d in domains)


def locale_segment(url):
    parts = [x.lower() for x in urlparse(url).path.split("/") if x]
    return parts[0] if parts and parts[0] in FOREIGN_LOCALE_SEGMENTS | {"cn", "zh-cn"} else ""


def is_foreign_locale(url):
    return locale_segment(url) in FOREIGN_LOCALE_SEGMENTS


def source_priority(url):
    """Chinese mainland official pages outrank neutral/global and foreign mirrors."""
    host = hostname(url)
    path = urlparse(url).path.lower()
    if host.endswith(".cn") or "/cn/" in path or "/zh-cn/" in path or path.startswith("/cn"):
        return 120
    if is_foreign_locale(url):
        return 90
    return 110


def canonical_url(url):
    parsed = urlparse(url)
    parts = [x for x in parsed.path.split("/") if x]
    if parts and parts[0].lower() in FOREIGN_LOCALE_SEGMENTS | {"cn", "zh-cn"}:
        parts = parts[1:]
    path = "/" + "/".join(parts)
    return urlunparse((parsed.scheme.lower() or "https", hostname(url), path.rstrip("/"), "", "", ""))


def is_specific_product_url(url):
    path = urlparse(url).path.lower().rstrip("/")
    if not path or is_foreign_locale(url):
        return False
    if any(x in path for x in ("/collections/", "/category/", "/categories/", "/support/", "/download")):
        return False
    patterns = (
        r"/(?:products?|gaming-headsets?|headphones?|earphones?|earbuds?)/[^/]{3,}$",
        r"/(?:productinfo|goods)/\d+\.html$",
        r"/cate-\d+/[^/]{3,}$",
    )
    return any(re.search(pattern, path) for pattern in patterns)


def product_name_ok(name):
    value = clean(name)
    low = value.casefold()
    if not 2 <= len(value) <= 160:
        return False
    if low in CATEGORY_ONLY or any(term in low for term in NON_PRODUCT_TERMS):
        return False
    if value.count("|") > 2 or len(value.split()) > 26:
        return False
    return True


def brand_name_ok(name):
    value = clean(name)
    low = value.casefold()
    if not 2 <= len(value) <= 32 or len(value.split()) > 5:
        return False
    return not any(term in low for term in BAD_BRAND_TERMS)


def publication_rejection(name, url, has_product_schema):
    if is_foreign_locale(url):
        return "foreign_locale_mirror"
    if not is_specific_product_url(url):
        return "not_a_specific_product_page"
    if not product_name_ok(name):
        return "accessory_or_non_product_name"
    if not has_product_schema:
        return "missing_product_structured_data"
    return ""
