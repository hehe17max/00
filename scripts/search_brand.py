#!/usr/bin/env python3
import os, re, json, argparse, datetime
from pathlib import Path
from urllib.parse import urlparse, urljoin
import requests
from bs4 import BeautifulSoup
from quality_rules import brand_name_ok, is_foreign_locale

ROOT=Path(__file__).resolve().parents[1]
BRANDS=ROOT/"data/brands.json"
REPORT=ROOT/"data/brand_request_report.json"
CONFIG=ROOT/"data/brand_discovery_config.json"
TODAY=datetime.date.today().isoformat()

session=requests.Session()
session.headers["User-Agent"]="Mozilla/5.0 (compatible; PeripheralDB/1.1 BrandSupplement)"

def clean(s): return re.sub(r"\s+"," ",str(s or "")).strip()
def host(url):
    h=urlparse(url).netloc.lower().split(":")[0]
    return h[4:] if h.startswith("www.") else h
def get(url):
    r=session.get(url,timeout=(5,10),allow_redirects=True)
    r.raise_for_status()
    return r
def excluded(h, config):
    return any(h==d or h.endswith("."+d) for d in config.get("excluded_domains",[]))
def flatten_jsonld(obj):
    if isinstance(obj,list):
        for x in obj: yield from flatten_jsonld(x)
    elif isinstance(obj,dict):
        if isinstance(obj.get("@graph"),list): yield from flatten_jsonld(obj["@graph"])
        yield obj
def product_schema(soup):
    n=0
    for s in soup.find_all("script",type="application/ld+json"):
        try:
            for x in flatten_jsonld(json.loads(s.string or "")):
                typ=x.get("@type"); types=typ if isinstance(typ,list) else [typ]
                if "Product" in types: n+=1
        except: pass
    return n
def classify_text(t):
    t=t.lower(); out=set()
    if any(x in t for x in ["mouse","mice","鼠标"]): out.add("鼠标")
    if any(x in t for x in ["keyboard","键盘","磁轴"]): out.add("键盘")
    if any(x in t for x in ["headset","headphone","earphone","earbud","耳机","耳麦"]): out.add("耳机/耳麦")
    return out

def brave(q,limit=10):
    key=os.getenv("BRAVE_SEARCH_API_KEY","").strip()
    if not key:return None
    r=requests.get("https://api.search.brave.com/res/v1/web/search",
        params={"q":q,"count":limit},
        headers={"Accept":"application/json","X-Subscription-Token":key,"User-Agent":session.headers["User-Agent"]},
        timeout=15)
    r.raise_for_status()
    return [{"url":x["url"],"title":clean(x.get("title")),"snippet":clean(x.get("description"))}
            for x in r.json().get("web",{}).get("results",[]) if x.get("url")]
def serper(q,limit=10):
    key=os.getenv("SERPER_API_KEY","").strip()
    if not key:return None
    r=requests.post("https://google.serper.dev/search",
        json={"q":q,"num":limit},
        headers={"X-API-KEY":key,"Content-Type":"application/json"},timeout=15)
    r.raise_for_status()
    return [{"url":x["link"],"title":clean(x.get("title")),"snippet":clean(x.get("snippet"))}
            for x in r.json().get("organic",[]) if x.get("link")]
def ddgs(q,limit=10):
    try:
        from ddgs import DDGS
        with DDGS() as d:
            return [{"url":x.get("href") or x.get("url"),"title":clean(x.get("title")),"snippet":clean(x.get("body"))}
                    for x in d.text(q,max_results=limit) if x.get("href") or x.get("url")]
    except Exception:
        return []
def search(q,limit=10):
    for fn,name in [(brave,"brave"),(serper,"serper")]:
        try:
            r=fn(q,limit)
            if r is not None:return r,name
        except: pass
    return ddgs(q,limit),"ddgs"

def validate_site(url, brand, config):
    try:r=get(url)
    except:return None
    h=host(r.url)
    if excluded(h,config):return None
    root=f"{urlparse(r.url).scheme}://{urlparse(r.url).netloc}/"
    try: soup=BeautifulSoup(get(root).text,"html.parser")
    except: soup=BeautifulSoup(r.text,"html.parser")
    text=clean(soup.get_text(" ",strip=True))[:10000]
    cats=classify_text(text)
    links=[]
    for a in soup.find_all("a",href=True):
        u=urljoin(root,a["href"]).split("#")[0].split("?")[0].rstrip("/")
        if host(u)!=h:continue
        if is_foreign_locale(u):continue
        t=(u+" "+clean(a.get_text(" ",strip=True))).lower()
        if classify_text(t) and any(x in t for x in ["/product","/products","/mouse","/keyboard","/headset","/gaming"]):
            if u not in links:links.append(u)
    prod_pages=[]; schema_pages=0
    for u in links[:16]:
        try:
            ps=BeautifulSoup(get(u).text,"html.parser")
        except:continue
        h1=ps.find("h1")
        title=clean(h1.get_text(" ",strip=True) if h1 else "")
        psc=product_schema(ps)
        if psc:
            prod_pages.append(u)
            if psc:schema_pages+=1
            cats |= classify_text(title+" "+u)
    cues=sum(1 for x in ["official","官网","support","driver","download","about us","contact","gaming"] if x in text.lower())
    brand_hit=brand.lower() in text.lower() or brand.lower() in h.lower()
    score=min(100, len(prod_pages)*10 + schema_pages*10 + len(cats)*5 + min(cues,8) + (12 if brand_hit else 0))
    return {"brand":brand,"domain":h,"official_url":root,"score":score,"categories":sorted(cats),
            "product_pages":prod_pages[:8],"product_page_count":len(prod_pages),
            "schema_page_count":schema_pages,"brand_text_match":brand_hit}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--brand",required=True)
    ap.add_argument("--official-url",default="")
    args=ap.parse_args()
    brand=clean(args.brand)
    cfg=json.loads(CONFIG.read_text(encoding="utf-8"))
    doc=json.loads(BRANDS.read_text(encoding="utf-8"))
    existing=next((b for b in doc.get("brands",[]) if b["brand"].lower()==brand.lower()),None)
    queries=[
        f'"{brand}" gaming mouse keyboard headset official',
        f'"{brand}" 鼠标 键盘 耳机 官网',
        f'"{brand}" official website gaming peripherals'
    ]
    results=[]; provider=None
    if args.official_url:
        results.append({"url":args.official_url,"title":"manual official url","snippet":""})
    for q in queries:
        r,p=search(q,8); provider=provider or p; results+=r
    seen=set(); candidates=[]
    for x in results:
        h=host(x.get("url",""))
        if not h or h in seen or excluded(h,cfg):continue
        seen.add(h)
        c=validate_site(x["url"],brand,cfg)
        if c:candidates.append(c)
        if len(candidates)>=8:break
    candidates.sort(key=lambda x:x["score"],reverse=True)
    best=candidates[0] if candidates else None
    report={"date":TODAY,"brand":brand,"provider":provider,"existing_before":bool(existing),
            "candidates":candidates,"status":"not_found","message":""}
    if not best:
        report["message"]="未找到可信官网候选。"
    elif not brand_name_ok(brand) or best["score"]<80 or best["schema_page_count"]<2:
        report["status"]="needs_review"
        report["message"]="找到了候选网站，但可信度不足，未自动加入。"
    else:
        if existing:
            # Merge discovered official domains and useful entry pages.
            if best["domain"] not in existing.setdefault("domains",[]):
                existing["domains"].append(best["domain"])
            urls=existing.setdefault("collection_urls",[])
            for u in [best["official_url"]]+best["product_pages"][:5]:
                if u not in urls:urls.append(u)
            sms=existing.setdefault("sitemap_urls",[])
            sm=best["official_url"].rstrip("/")+"/sitemap.xml"
            if sm not in sms:sms.append(sm)
            existing["last_brand_search"]=TODAY
            existing["last_brand_search_score"]=best["score"]
            report["status"]="existing_enriched"
            report["message"]="已补充现有品牌的官网入口，将继续扫描其产品。"
        else:
            doc["brands"].append({
                "brand":brand,"brand_zh_cn":brand,"brand_zh_cn_status":"pending_human_verification",
                "origin":"待确认","preferred_locale":"zh-CN","domains":[best["domain"]],
                "collection_urls":[best["official_url"]]+best["product_pages"][:5],
                "discovery":["configured_pages","sitemap","shopify_products_json"],
                "sitemap_urls":[best["official_url"].rstrip("/")+"/sitemap.xml"],
                "auto_discovered":False,"requested_by_user":True,
                "discovered_at":TODAY,"discovery_score":best["score"]
            })
            report["status"]="added"
            report["message"]="已验证并加入新品牌，将立即扫描产品。"
        BRANDS.write_text(json.dumps(doc,ensure_ascii=False,indent=2),encoding="utf-8")
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=="__main__":
    main()
