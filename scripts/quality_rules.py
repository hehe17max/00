#!/usr/bin/env python3
"""Shared, conservative publication rules for PeripheralDB.

The rules deliberately prefer false negatives over publishing a category page,
accessory, translated mirror, or unsupported specification as a product.
"""

import html
import re
from urllib.parse import unquote, urlparse, urlunparse

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
    "mouse pad", "mousepad", "desk mat", "wrist rest", "arm sleeve",
    "mouse keyboard pad", "keyboard mat", "mouse grip", "grip tape",
    "glass skates", "ptfe skates", "teflon feets", "mouse feet",
    "dustproof seal", "dust cover", "keyboard cover", "mouse charging dock",
    "keycap", "keycaps", "switches", "switch set", "plate", "pcb",
    "receiver", "dongle", "charging station", "charging cable", "pop filter",
    "desktop", "laptop", "monitor", "controller charging", "vip deposit",
    "deposit", "compliance and documents", "download center",
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

PRODUCT_KIND_TERMS = (
    "mouse", "mice", "鼠标", "keyboard", "键盘", "keypad", "headset",
    "headphone", "earphone", "earbud", "earclip", "耳机", "耳麦",
)

MODEL_STOP_WORDS = {
    "wireless", "wired", "bluetooth", "gaming", "esports", "mechanical",
    "keyboard", "mouse", "headset", "headsets", "headphone", "headphones",
    "earbud", "earbuds", "earphone", "earphones", "earclip", "with", "for",
    "featuring", "ultra-lightweight", "ultralight", "lightweight", "rgb",
    "custom", "active", "noise", "cancellation", "polling", "sensor",
    "switch", "switches", "aluminum", "magnesium", "carbon", "fiber",
    "tri-mode", "dual-mode", "low-profile", "hall", "effect", "magnetic",
    "open", "open-ear", "retro", "ergonomic",
}

MODEL_SUFFIXES = {
    "pro", "max", "ultra", "air", "mini", "plus", "master", "elite",
    "series", "pop", "v2", "v3", "gen-2", "gen2", "he", "rt", "rx", "apex",
}


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
    # Storefront titles are often verbose marketing copy.  They are reduced to
    # a concise model name before publication, so length alone is not evidence
    # that an official catalogue item is invalid.
    if not 2 <= len(value) <= 260:
        return False
    if low in CATEGORY_ONLY:
        return False
    if value.count("|") > 3 or len(value.split()) > 50:
        return False
    return True


def product_identity(brand, name):
    """Stable identity used to merge a concise legacy row with a store title."""
    value = clean(html.unescape(clean(name))).casefold()
    brand_value = clean(brand).casefold()
    if brand_value:
        value = re.sub(rf"(?<![\w]){re.escape(brand_value)}(?![\w])", " ", value)
    return re.sub(r"[^a-z0-9\u4e00-\u9fff]+", "", value)


def _slug_words(url):
    slug = unquote(urlparse(url).path.rstrip("/").split("/")[-1])
    return [x for x in re.split(r"[-_\s]+", slug) if x]


def concise_product_name(brand, title, url=""):
    """Reduce a storefront marketing title to a stable model name.

    The product URL is deliberately preferred because Shopify titles can begin
    with the selected colour or switch option. This function never invents a
    model; it only keeps the leading identity tokens already present on the
    official page or in its slug.
    """
    raw = clean(html.unescape(title)).replace("丨", "|")
    raw = re.sub(r"\s+[|–—]\s+.*$", "", raw)
    repeated = re.fullmatch(r"(.+?)\s*/\s*\1", raw, re.I)
    if repeated:
        raw = clean(repeated.group(1))
    brand_re = re.compile(rf"(?<![\w]){re.escape(clean(brand))}(?![\w])", re.I)

    # Prefer the last brand occurrence: variant selectors often prefix titles
    # with values such as "Black / Ice Blue Switch".
    matches = list(brand_re.finditer(raw)) if brand else []
    if matches:
        raw = raw[matches[-1].end():].strip(" -|/,:;")

    words = raw.split()

    kept = []
    for word in words:
        token = word.strip(" ,:;|()[]{}")
        low = token.casefold()
        if kept and low in MODEL_STOP_WORDS:
            break
        if not token:
            continue
        kept.append(token)
        if len(kept) >= 6:
            break

    # A model often ends with one or two edition markers after its alphanumeric
    # core (R5, V11 Pro, Arctis Nova 5, Ace 68 GT).
    if kept:
        digit_positions = [i for i, w in enumerate(kept) if any(c.isdigit() for c in w)]
        if digit_positions:
            end = digit_positions[0] + 1
            while end < len(kept) and (
                kept[end].casefold() in MODEL_SUFFIXES
                or re.fullmatch(r"(?:v?\d+(?:\.\d+)+|(?:mk|gen)\d+)", kept[end], re.I)
            ):
                end += 1
            kept = kept[:end]
        elif len(kept) > 3:
            kept = kept[:3]

    result = clean(" ".join(kept)).replace("&amp;", "&").strip(" ®™-–—|,;:/")
    return result or clean(title)


def supported_product(name, url=""):
    value = clean(html.unescape(clean(name))).casefold()
    low_url = unquote(url).casefold()
    # Reject explicit accessory identities, but do not reject a real headset
    # merely because its official title mentions a cable or replaceable pads.
    explicit_accessory = (
        bool(re.match(r"^(?:original\s+)?(?:earmuffs?|ear\s*pads?|earpads?)\b", value))
        or bool(re.match(r"^for\s+.+(?:earmuffs?|ear\s*pads?|earpads?)\b", value))
        or any(term in value or term in low_url for term in (
            "headphone case", "headset case", "storage bag", "carrying case",
            "replacement cable", "wireless dongle", "charging cable",
        ))
    )
    if explicit_accessory:
        return False
    if any(term in value or term in low_url for term in PRODUCT_KIND_TERMS):
        return True
    if any(term in value or term in low_url for term in NON_PRODUCT_TERMS):
        return False
    return False


def brand_name_ok(name):
    value = clean(name)
    low = value.casefold()
    if not 2 <= len(value) <= 32 or len(value.split()) > 5:
        return False
    return not any(term in low for term in BAD_BRAND_TERMS)


def publication_rejection(name, url, has_product_schema, official_catalog_listing=False):
    if not isinstance(name, str) or not clean(name):
        return "missing_product_name"
    if is_foreign_locale(url):
        return "foreign_locale_mirror"
    if not is_specific_product_url(url):
        return "not_a_specific_product_page"
    if not supported_product(name, url):
        return "unsupported_or_accessory_product"
    if not product_name_ok(name):
        return "accessory_or_non_product_name"
    if not has_product_schema and not official_catalog_listing:
        return "missing_product_structured_data"
    return ""
