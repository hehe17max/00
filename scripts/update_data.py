#!/usr/bin/env python3
import json, re, datetime, os, hashlib, time
from pathlib import Path
from urllib.parse import urljoin, urlparse
from xml.etree import ElementTree as ET
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data/products.json"; BRANDS=ROOT/"data/brands.json"
REPORT=ROOT/"data/update_report.json"; REVIEW=ROOT/"data/review_queue.json"
TODAY=datetime.date.today().isoformat()
MODE=os.getenv("PERIPHERALDB_SCAN_MODE","fast").lower()

if MODE=="deep":
    CONNECT_TIMEOUT,READ_TIMEOUT=6,14
    MAX_SITEMAP_URLS,MAX_SITEMAP_CHILDREN=1200,35
    MAX_SHOPIFY_PAGES=4
    MAX_DISCOVERY_URLS_PER_BRAND=80
    MAX_NEW_PAGE_PARSES_PER_BRAND=35
    MAX_RECHECKS,RECHECK_DAYS=120,7
else:
    CONNECT_TIMEOUT,READ_TIMEOUT=4,8
    MAX_SITEMAP_URLS,MAX_SITEMAP_CHILDREN=350,12
    MAX_SHOPIFY_PAGES=2
    MAX_DISCOVERY_URLS_PER_BRAND=28
    MAX_NEW_PAGE_PARSES_PER_BRAND=12
    MAX_RECHECKS,RECHECK_DAYS=30,10

session=requests.Session()
session.headers["User-Agent"]="Mozilla/5.0 (compatible; PeripheralDB/1.0.1)"
PATH_HINTS=("/products/","/product/","/gaming-mice/","/gaming-keyboards/","/gaming-headsets/","/mouse/","/keyboard/","/headset/")
BAD_HINTS=("/blog/","/news/","/pages/","/collections/","/category/","/support/","/download/","/login","/cart")

def log(x): print(x, flush=True)
def clean(x): return re.sub(r"\s+"," ",str(x or "")).strip()
def host_allowed(url,domains):
    h=urlparse(url).netloc.lower().split(":")[0]
    return any(h==d.lower() or h.endswith("."+d.lower()) for d in domains)
def get(url):
    r=session.get(url,timeout=(CONNECT_TIMEOUT,READ_TIMEOUT),allow_redirects=True)
    r.raise_for_status(); return r
def flatten(obj):
    if isinstance(obj,list):
        for x in obj: yield from flatten(x)
    elif isinstance(obj,dict):
        if "@graph" in obj: yield from flatten(obj["@graph"])
        yield obj
def parse_product_page(url):
    r=get(url); soup=BeautifulSoup(r.text,"html.parser")
    name=None; images=[]; specs={}
    for s in soup.find_all("script",type="application/ld+json"):
        try:
            for x in flatten(json.loads(s.string or "")):
                typ=x.get("@type"); types=typ if isinstance(typ,list) else [typ]
                if "Product" in types:
                    if x.get("name") and not name: name=clean(x["name"])
                    im=x.get("image")
                    if isinstance(im,str): images.append(im)
                    elif isinstance(im,list): images += [i for i in im if isinstance(i,str)]
        except Exception: pass
    og=soup.find("meta",property="og:image")
    if og and og.get("content"): images.append(urljoin(url,og["content"]))
    if not name:
        h=soup.find("h1"); name=clean(h.get_text(" ",strip=True)) if h else None
    for tr in soup.select("table tr"):
        c=[clean(x.get_text(" ",strip=True)) for x in tr.find_all(["th","td"])]
        if len(c)>=2 and 0<len(c[0])<90 and 0<len(c[1])<400: specs[c[0]]=c[1]
    for dt in soup.find_all("dt"):
        dd=dt.find_next_sibling("dd")
        if dd:
            k,v=clean(dt.get_text(" ",strip=True)),clean(dd.get_text(" ",strip=True))
            if k and v and len(k)<90 and len(v)<400: specs[k]=v
    image=next((i for i in images if isinstance(i,str) and i.startswith("http")),"")
    return name,specs,image,r.url
def likely(u):
    low=u.lower()
    return not any(x in low for x in BAD_HINTS) and any(x in low for x in PATH_HINTS)
def page_links(url,domains):
    out=set()
    try: soup=BeautifulSoup(get(url).text,"html.parser")
    except Exception as e:
        log(f"    ! index skipped: {type(e).__name__}")
        return out
    for a in soup.find_all("a",href=True):
        u=urljoin(url,a["href"]).split("#")[0].split("?")[0].rstrip("/")
        if host_allowed(u,domains) and likely(u): out.add(u)
    return out
def sitemap_urls(url,domains,depth=0):
    out=set()
    if depth>1: return out
    try:
        root=ET.fromstring(get(url).content)
    except Exception: return out
    locs=[clean(x.text) for x in root.iter() if x.tag.lower().endswith("loc") and x.text]
    if root.tag.lower().endswith("sitemapindex"):
        for loc in locs[:MAX_SITEMAP_CHILDREN]:
            if host_allowed(loc,domains):
                out |= sitemap_urls(loc,domains,depth+1)
                if len(out)>=MAX_SITEMAP_URLS: break
    else:
        for loc in locs[:MAX_SITEMAP_URLS]:
            if host_allowed(loc,domains) and likely(loc.rstrip("/")): out.add(loc.rstrip("/"))
    return set(list(out)[:MAX_SITEMAP_URLS])
def shopify(base):
    out=set()
    for page in range(1,MAX_SHOPIFY_PAGES+1):
        try:
            r=get(base.rstrip("/")+"/products.json?limit=250&page="+str(page))
            if "json" not in r.headers.get("content-type","").lower(): break
            rows=r.json().get("products",[])
        except Exception: break
        if not rows: break
        for p in rows:
            if p.get("handle"): out.add(base.rstrip("/")+"/products/"+p["handle"])
        if len(rows)<250: break
    return out
def classify(name,url):
    s=(clean(name)+" "+url).lower()
    if any(x in s for x in ["mouse","mice","鼠标"]): return "鼠标"
    if any(x in s for x in ["keyboard","键盘"]): return "键盘"
    if any(x in s for x in ["headset","headphone","earbud","earphone","耳机","耳麦"]): return "耳机/耳麦"
    return "待分类"
def due(last):
    if not last: return True
    try: return (datetime.date.today()-datetime.date.fromisoformat(last)).days>=RECHECK_DAYS
    except: return True
def rotate(urls,limit,salt):
    return sorted(urls,key=lambda u: hashlib.sha1((salt+u).encode()).hexdigest())[:limit]
def add_source(p,url,note):
    srcs=p.setdefault("sources",[])
    hit=next((x for x in srcs if x.get("url")==url),None)
    if hit: hit["checked_at"]=TODAY
    else: srcs.append({"type":"official_product","url":url,"tier":100,"checked_at":TODAY,"note":note})
    p.setdefault("verification",{})["source_count"]=len(srcs)
def merge(p,new,url,review):
    old=p.setdefault("specs",{}); n=0
    ver=p.setdefault("verification",{"status":"official_discovered","confidence":0.82,"source_count":0,"conflicts":[]})
    ver.setdefault("conflicts",[])
    for k,v in new.items():
        if not v: continue
        if k not in old or old[k] in ("—","待补参数",""):
            old[k]=v; n+=1
        elif clean(old[k]).lower()!=clean(v).lower():
            item={"brand":p["brand"],"name":p["name"],"field":k,"database_value":old[k],"new_value":v,"source":url,"detected_at":TODAY}
            if not any(x.get("brand")==item["brand"] and x.get("name")==item["name"] and x.get("field")==k and x.get("new_value")==v for x in review):
                review.append(item)
            ver["status"]="conflict"
    return n

db=json.loads(DATA.read_text(encoding="utf-8"))
cfg=json.loads(BRANDS.read_text(encoding="utf-8"))
try: review=json.loads(REVIEW.read_text(encoding="utf-8"))
except: review=[]
by_url={p.get("source","").rstrip("/"):p for p in db["products"] if p.get("source")}
by_name={(p["brand"].lower(),p["name"].lower()):p for p in db["products"]}
report={"date":TODAY,"mode":MODE,"discovered":0,"updated":0,"images_added":0,"rechecked":0,"conflicts_before":len(review),"conflicts":0,"errors":[],"brand_stats":{}}

brands=cfg.get("brands",[])
log(f"PeripheralDB mode={MODE} brands={len(brands)} recheck_budget={MAX_RECHECKS}")

for i,b in enumerate(brands,1):
    t0=time.time(); brand=b["brand"]; domains=b["domains"]; found=set()
    log(f"[{i}/{len(brands)}] {brand}")
    for u in b.get("collection_urls",[])[:8]: found |= page_links(u,domains)
    for u in b.get("sitemap_urls",[])[:2]: found |= sitemap_urls(u,domains)
    if "shopify_products_json" in b.get("discovery",[]):
        bases=[]
        for u in b.get("collection_urls",[]):
            pr=urlparse(u)
            if pr.scheme and pr.netloc:
                base=f"{pr.scheme}://{pr.netloc}"
                if base not in bases: bases.append(base)
        for base in bases[:1 if MODE=="fast" else 2]: found |= shopify(base)
    subset=rotate(found,MAX_DISCOVERY_URLS_PER_BRAND,TODAY+brand)
    log(f"    found={len(found)} subset={len(subset)}")
    budget=MAX_NEW_PAGE_PARSES_PER_BRAND; newc=upd=imgs=0
    for u in subset:
        if u.rstrip("/") in by_url: continue
        if budget<=0: break
        try:
            name,specs,image,final=parse_product_page(u); budget-=1
        except Exception as e:
            report["errors"].append({"brand":brand,"url":u,"error":str(e)[:120]}); budget-=1; continue
        if not name or len(name)>180: continue
        key=(brand.lower(),name.lower())
        if key in by_name:
            p=by_name[key]; add_source(p,final,"additional official page")
            upd += merge(p,specs,final,review)
            if image and not p.get("image_url"): p["image_url"]=image; p["image_source"]=final; imgs+=1
            by_url[final.rstrip("/")]=p
            continue
        p={"brand":brand,"name":name,"category":classify(name,final),"subcategory":"自动发现","status":"官网可确认/待复核",
           "verified":"官方页面自动发现","origin":b.get("origin","海外"),"market":"官网","first_seen":TODAY,"last_verified":TODAY,"last_checked":TODAY,
           "source":final,"image_url":image,"image_source":final if image else "","sources":[],"specs":specs or {"参数状态":"已发现官方产品页，详细参数待结构化"},
           "conflict":"","verification":{"status":"official_verified" if len(specs)>=4 else "official_discovered","confidence":0.92 if len(specs)>=4 else 0.82,"source_count":0,"conflicts":[]}}
        add_source(p,final,"new official product")
        db["products"].append(p); by_url[final.rstrip("/")]=p; by_name[key]=p; newc+=1
        if image: imgs+=1
    report["discovered"]+=newc; report["updated"]+=upd; report["images_added"]+=imgs
    elapsed=time.time()-t0
    report["brand_stats"][brand]={"found":len(found),"subset":len(subset),"new":newc,"updated":upd,"images":imgs,"seconds":round(elapsed,1)}
    log(f"    done {elapsed:.1f}s new={newc} updated={upd} images={imgs}")

todo=[p for p in db["products"] if due(p.get("last_checked"))]
todo.sort(key=lambda p:(p.get("last_checked") or "",p.get("brand",""),p.get("name","")))
log(f"Recheck due={len(todo)} budget={MAX_RECHECKS}")
done=0
for p in todo:
    if done>=MAX_RECHECKS: break
    b=next((x for x in brands if x["brand"]==p["brand"]),None)
    url=p.get("source","")
    if not b or not url or not host_allowed(url,b["domains"]): continue
    try:
        _,specs,image,final=parse_product_page(url)
    except Exception as e:
        report["errors"].append({"product":p["brand"]+" "+p["name"],"error":str(e)[:120]}); done+=1; continue
    p["last_checked"]=TODAY; add_source(p,final,"periodic recheck")
    report["updated"] += merge(p,specs,final,review)
    if image and p.get("image_url")!=image:
        p["image_url"]=image; p["image_source"]=final; report["images_added"]+=1
    report["rechecked"]+=1; done+=1
    if done%5==0: log(f"    recheck {done}/{MAX_RECHECKS}")

report["conflicts"]=len(review)-report["conflicts_before"]
db["updated_at"]=TODAY
DATA.write_text(json.dumps(db,ensure_ascii=False,indent=2),encoding="utf-8")
REVIEW.write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding="utf-8")
REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
log("Update complete")
log(json.dumps({"mode":MODE,"discovered":report["discovered"],"updated":report["updated"],"images":report["images_added"],"rechecked":report["rechecked"],"errors":len(report["errors"])},ensure_ascii=False))
