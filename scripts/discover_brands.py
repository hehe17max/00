#!/usr/bin/env python3
"""
Automatic external-peripheral brand discovery.

Pipeline:
  Web search -> candidate domains -> official-site validation ->
  brand_candidates.json -> high-confidence auto-promotion to brands.json.

Safety/data-quality principles:
- Search results NEVER directly become a brand.
- Marketplaces, media, review sites and social networks are excluded.
- Auto-promotion requires multiple product pages and multiple Product JSON-LD signals.
- Borderline candidates stay in brand_candidates.json for review.
- A human can set candidate.status = "approved" or "rejected".
"""

import os
import re
import json
import time
import hashlib
import datetime
from pathlib import Path
from urllib.parse import urlparse, urljoin
import requests
from bs4 import BeautifulSoup
from quality_rules import brand_name_ok, is_foreign_locale

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "data/brand_discovery_config.json"
BRANDS = ROOT / "data/brands.json"
CANDIDATES = ROOT / "data/brand_candidates.json"
REPORT = ROOT / "data/brand_discovery_report.json"

TODAY = datetime.date.today().isoformat()
UA = "Mozilla/5.0 (compatible; PeripheralDBBrandDiscovery/1.0; public-catalog-research)"
session = requests.Session()
session.headers["User-Agent"] = UA

config = json.loads(CONFIG.read_text(encoding="utf-8"))
brands_doc = json.loads(BRANDS.read_text(encoding="utf-8"))
try:
    candidates = json.loads(CANDIDATES.read_text(encoding="utf-8"))
except Exception:
    candidates = []

report = {
    "date": TODAY,
    "provider": None,
    "queries": [],
    "results_scanned": 0,
    "candidate_sites_checked": 0,
    "new_candidates": 0,
    "auto_promoted": 0,
    "approved_promoted": 0,
    "rejected_skipped": 0,
    "errors": []
}

EXCLUDED = set(x.lower() for x in config.get("excluded_domains", []))
PRODUCT_HINTS = tuple(config.get("product_path_hints", []))
OFFICIAL_CUES = tuple(x.lower() for x in config.get("official_cues", []))

def clean(x):
    return re.sub(r"\s+", " ", str(x or "")).strip()

def registrableish_host(url):
    host = urlparse(url).netloc.lower().split(":")[0]
    if host.startswith("www."):
        host = host[4:]
    return host

def excluded(host):
    return any(host == d or host.endswith("." + d) for d in EXCLUDED)

def fetch(url, timeout=15):
    r = session.get(url, timeout=timeout, allow_redirects=True)
    r.raise_for_status()
    return r

def extract_jsonld(soup):
    objs = []
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            raw = json.loads(tag.string or "")
        except Exception:
            continue
        stack = raw if isinstance(raw, list) else [raw]
        while stack:
            x = stack.pop()
            if isinstance(x, list):
                stack.extend(x)
            elif isinstance(x, dict):
                objs.append(x)
                if isinstance(x.get("@graph"), list):
                    stack.extend(x["@graph"])
    return objs

def brand_name_from_page(soup, host):
    # Prefer organization/brand structured data.
    for x in extract_jsonld(soup):
        typ = x.get("@type")
        types = typ if isinstance(typ, list) else [typ]
        if any(t in ("Organization", "Brand", "Corporation") for t in types if t):
            name = clean(x.get("name"))
            if brand_name_ok(name):
                return name
    og = soup.find("meta", property="og:site_name")
    if og and clean(og.get("content")):
        name = clean(og.get("content"))
        if brand_name_ok(name):
            return name
    title = clean(soup.title.get_text(" ", strip=True) if soup.title else "")
    if title:
        for sep in [" | ", " - ", " – ", " — ", "_"]:
            if sep in title:
                title = title.split(sep)[0].strip()
                break
        if brand_name_ok(title):
            return title
    return host.split(".")[0].upper()

def classify_text(text):
    t = text.lower()
    cats = set()
    if any(x in t for x in ["mouse", "mice", "鼠标"]):
        cats.add("鼠标")
    if any(x in t for x in ["keyboard", "keyboards", "键盘", "磁轴"]):
        cats.add("键盘")
    if any(x in t for x in ["headset", "headphone", "earphone", "earbud", "耳机", "耳麦"]):
        cats.add("耳机/耳麦")
    return cats

def likely_product_url(url, anchor_text=""):
    s = (url + " " + anchor_text).lower()
    if is_foreign_locale(url):
        return False
    if any(x in s for x in ["/blog/", "/news/", "/article/", "/login", "/cart", "/privacy", "/terms"]):
        return False
    return any(x in s for x in PRODUCT_HINTS) or bool(classify_text(s))

def product_jsonld_count(soup):
    n = 0
    for x in extract_jsonld(soup):
        typ = x.get("@type")
        types = typ if isinstance(typ, list) else [typ]
        if "Product" in types:
            n += 1
    return n

def crawl_candidate(start_url, max_pages):
    host = registrableish_host(start_url)
    if excluded(host):
        return None

    scheme = urlparse(start_url).scheme or "https"
    root_url = f"{scheme}://{urlparse(start_url).netloc}/"

    # Prefer root, but keep search-result page as fallback.
    pages_to_try = []
    for u in [root_url, start_url]:
        if u not in pages_to_try:
            pages_to_try.append(u)

    root_resp = None
    for u in pages_to_try:
        try:
            root_resp = fetch(u)
            break
        except Exception:
            continue
    if not root_resp:
        return None

    final_host = registrableish_host(root_resp.url)
    if excluded(final_host):
        return None

    soup = BeautifulSoup(root_resp.text, "html.parser")
    brand_name = brand_name_from_page(soup, final_host)
    root_text = clean(soup.get_text(" ", strip=True))[:10000]

    links = []
    seen = set()
    categories = classify_text(root_text + " " + root_resp.url)
    for a in soup.find_all("a", href=True):
        u = urljoin(root_resp.url, a["href"]).split("#")[0].split("?")[0].rstrip("/")
        txt = clean(a.get_text(" ", strip=True))
        if registrableish_host(u) != final_host:
            continue
        categories |= classify_text(txt + " " + u)
        if likely_product_url(u, txt) and u not in seen:
            seen.add(u)
            links.append(u)

    # Also look at navigation/category pages before product pages.
    nav_links = []
    for a in soup.find_all("a", href=True):
        u = urljoin(root_resp.url, a["href"]).split("#")[0].split("?")[0].rstrip("/")
        txt = clean(a.get_text(" ", strip=True))
        if registrableish_host(u) != final_host:
            continue
        if classify_text(txt + " " + u) and u not in seen:
            nav_links.append(u)

    for nav in nav_links[:8]:
        try:
            nsoup = BeautifulSoup(fetch(nav).text, "html.parser")
        except Exception:
            continue
        for a in nsoup.find_all("a", href=True):
            u = urljoin(nav, a["href"]).split("#")[0].split("?")[0].rstrip("/")
            txt = clean(a.get_text(" ", strip=True))
            if registrableish_host(u) != final_host:
                continue
            categories |= classify_text(txt + " " + u)
            if likely_product_url(u, txt) and u not in seen:
                seen.add(u)
                links.append(u)

    links = links[:max_pages]
    product_pages = []
    product_schema_pages = 0
    product_names = []
    product_categories = set(categories)

    for u in links:
        try:
            r = fetch(u)
            psoup = BeautifulSoup(r.text, "html.parser")
        except Exception:
            continue
        pcount = product_jsonld_count(psoup)
        h1 = psoup.find("h1")
        title = clean(h1.get_text(" ", strip=True) if h1 else "")
        text_sample = clean(psoup.get_text(" ", strip=True))[:6000]
        cats = classify_text(title + " " + u + " " + text_sample)
        product_categories |= cats

        # Require product-ish evidence: Product JSON-LD or clear category + product path/h1.
        if pcount > 0 or (cats and title and likely_product_url(u, title)):
            product_pages.append(r.url)
            if pcount > 0:
                product_schema_pages += 1
            if title and len(title) <= 120:
                product_names.append(title)
        if len(product_pages) >= 12:
            break
        time.sleep(0.05)

    lower_root = root_text.lower()
    official_cue_hits = sum(1 for cue in OFFICIAL_CUES if cue in lower_root)
    has_contact = any(x in lower_root for x in ["contact", "联系我们", "about us", "关于我们"])
    has_support = any(x in lower_root for x in ["support", "download", "driver", "驱动", "支持"])

    # Conservative score. Search-result presence itself gives no large authority.
    score = 0
    score += min(36, len(product_pages) * 8)
    score += min(28, product_schema_pages * 10)
    score += min(12, len(product_categories) * 5)
    score += 5 if has_contact else 0
    score += 5 if has_support else 0
    score += min(6, official_cue_hits)
    if brand_name and brand_name.lower() in lower_root:
        score += 4
    score = min(100, score)

    return {
        "brand": brand_name,
        "domain": final_host,
        "official_url": root_resp.url,
        "score": score,
        "categories": sorted(product_categories),
        "product_page_count": len(product_pages),
        "product_schema_page_count": product_schema_pages,
        "sample_product_pages": product_pages[:10],
        "sample_product_names": product_names[:10],
        "evidence": {
            "has_contact_or_about": has_contact,
            "has_support_or_driver": has_support,
            "official_cue_hits": official_cue_hits
        }
    }

def search_brave(query, limit):
    key = os.getenv("BRAVE_SEARCH_API_KEY", "").strip()
    if not key:
        return None
    r = requests.get(
        "https://api.search.brave.com/res/v1/web/search",
        params={"q": query, "count": min(limit, 20), "search_lang": "zh-hans"},
        headers={"Accept": "application/json", "X-Subscription-Token": key, "User-Agent": UA},
        timeout=20
    )
    r.raise_for_status()
    out = []
    for x in r.json().get("web", {}).get("results", []):
        if x.get("url"):
            out.append({"url": x["url"], "title": clean(x.get("title")), "snippet": clean(x.get("description"))})
    return out

def search_serper(query, limit):
    key = os.getenv("SERPER_API_KEY", "").strip()
    if not key:
        return None
    r = requests.post(
        "https://google.serper.dev/search",
        json={"q": query, "num": min(limit, 20), "gl": "cn", "hl": "zh-cn"},
        headers={"X-API-KEY": key, "Content-Type": "application/json"},
        timeout=20
    )
    r.raise_for_status()
    out = []
    for x in r.json().get("organic", []):
        if x.get("link"):
            out.append({"url": x["link"], "title": clean(x.get("title")), "snippet": clean(x.get("snippet"))})
    return out

def search_ddgs(query, limit):
    try:
        from ddgs import DDGS
        out = []
        with DDGS() as ddgs:
            for x in ddgs.text(query, max_results=limit):
                u = x.get("href") or x.get("url")
                if u:
                    out.append({"url": u, "title": clean(x.get("title")), "snippet": clean(x.get("body"))})
        return out
    except Exception as e:
        report["errors"].append({"stage": "ddgs", "query": query, "error": clean(e)[:180]})
        return []

def choose_search(query, limit):
    try:
        r = search_brave(query, limit)
        if r is not None:
            report["provider"] = "brave"
            return r
    except Exception as e:
        report["errors"].append({"stage":"brave","query":query,"error":clean(e)[:180]})
    try:
        r = search_serper(query, limit)
        if r is not None:
            report["provider"] = "serper"
            return r
    except Exception as e:
        report["errors"].append({"stage":"serper","query":query,"error":clean(e)[:180]})
    report["provider"] = report["provider"] or "ddgs"
    return search_ddgs(query, limit)

def existing_brand_domains():
    out = set()
    for b in brands_doc.get("brands", []):
        for d in b.get("domains", []):
            out.add(d.lower())
    return out

def infer_origin(query, evidence):
    q = query.lower()
    return "中国" if any(x in q for x in ["中国","国产","china","chinese"]) else "待确认"

def make_brand_entry(c):
    base = c["official_url"].rstrip("/")
    return {
        "brand": c["brand"],
        "brand_zh_cn": c.get("brand_zh_cn") or c["brand"],
        "brand_zh_cn_status": "pending_human_verification",
        "origin": c.get("origin","待确认"),
        "preferred_locale": "zh-CN" if c.get("origin")=="中国" else "en",
        "domains": [c["domain"]],
        "collection_urls": list(dict.fromkeys([base] + c.get("sample_product_pages", [])[:3])),
        "discovery": ["configured_pages","sitemap","shopify_products_json"],
        "sitemap_urls": [base + "/sitemap.xml"],
        "auto_discovered": True,
        "discovered_at": TODAY,
        "discovery_score": c["score"]
    }

def promote(c, reason):
    domains = existing_brand_domains()
    if c["domain"].lower() in domains:
        return False
    brands_doc["brands"].append(make_brand_entry(c))
    c["status"] = "promoted"
    c["promoted_at"] = TODAY
    c["promotion_reason"] = reason
    return True

# First process human-reviewed candidates from prior runs.
for c in candidates:
    status = c.get("status")
    if status == "approved":
        if promote(c, "human_approved"):
            report["approved_promoted"] += 1
    elif status == "rejected":
        report["rejected_skipped"] += 1

known_domains = existing_brand_domains()
candidate_by_domain = {c.get("domain","").lower(): c for c in candidates if c.get("domain")}
candidate_sites_seen = set()

# Rotate search queries deterministically by date so each day covers a different subset.
pool = config.get("query_pool", [])
seed = int(hashlib.sha1(TODAY.encode()).hexdigest()[:8], 16)
if pool:
    start = seed % len(pool)
    ordered = pool[start:] + pool[:start]
else:
    ordered = []
queries = ordered[:config.get("max_queries_per_run", 5)]

raw_results = []
for q in queries:
    report["queries"].append(q)
    try:
        results = choose_search(q, config.get("max_results_per_query", 12))
    except Exception as e:
        report["errors"].append({"stage":"search","query":q,"error":clean(e)[:180]})
        results = []
    for r in results:
        r["query"] = q
        raw_results.append(r)

report["results_scanned"] = len(raw_results)

for r in raw_results:
    if report["candidate_sites_checked"] >= config.get("max_candidate_sites_per_run", 28):
        break
    u = r.get("url","")
    host = registrableish_host(u)
    if not host or excluded(host) or host in known_domains or host in candidate_sites_seen:
        continue
    candidate_sites_seen.add(host)

    try:
        c = crawl_candidate(u, config.get("max_pages_per_candidate", 50))
    except Exception as e:
        report["errors"].append({"stage":"candidate","url":u,"error":clean(e)[:180]})
        continue
    report["candidate_sites_checked"] += 1
    if not c or c["score"] < config.get("candidate_keep_score",48):
        continue

    c["origin"] = infer_origin(r.get("query",""), c)
    c["discovered_at"] = candidate_by_domain.get(c["domain"],{}).get("discovered_at", TODAY)
    c["last_seen"] = TODAY
    c["search_evidence"] = {
        "query": r.get("query"),
        "result_title": r.get("title"),
        "result_snippet": r.get("snippet")
    }

    prior = candidate_by_domain.get(c["domain"])
    if prior:
        # Preserve human state and promotion history.
        for k in ["status","review_note","promoted_at","promotion_reason"]:
            if k in prior:
                c[k] = prior[k]
        idx = candidates.index(prior)
        candidates[idx] = c
        candidate_by_domain[c["domain"]] = c
    else:
        c["status"] = "candidate"
        candidates.append(c)
        candidate_by_domain[c["domain"]] = c
        report["new_candidates"] += 1

    can_auto = (
        brand_name_ok(c.get("brand"))
        and
        c["score"] >= config.get("auto_promote_score",82)
        and c["product_page_count"] >= config.get("auto_promote_min_product_pages",3)
        and c["product_schema_page_count"] >= config.get("auto_promote_min_product_schema_pages",2)
        and c.get("status") not in ("rejected","promoted")
    )
    if can_auto and promote(c, "high_confidence_auto"):
        report["auto_promoted"] += 1
        known_domains.add(c["domain"].lower())

# De-duplicate exact brand names. Multiple related brands may legitimately share
# one corporate domain (for example ATK/VXE or EDIFIER/HECATE).
seen_brands = set()
dedup = []
for b in brands_doc.get("brands", []):
    key = b.get("brand", "").casefold().strip()
    if key in seen_brands:
        continue
    seen_brands.add(key)
    dedup.append(b)
brands_doc["brands"] = dedup

BRANDS.write_text(json.dumps(brands_doc, ensure_ascii=False, indent=2), encoding="utf-8")
CANDIDATES.write_text(json.dumps(candidates, ensure_ascii=False, indent=2), encoding="utf-8")
REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(report, ensure_ascii=False, indent=2))
