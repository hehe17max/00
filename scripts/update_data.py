#!/usr/bin/env python3
import json, re, datetime, time, hashlib
from pathlib import Path
from urllib.parse import urljoin, urlparse
from xml.etree import ElementTree as ET
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data/products.json"; BRANDS=ROOT/"data/brands.json"; REPORT=ROOT/"data/update_report.json"; REVIEW=ROOT/"data/review_queue.json"
session=requests.Session()
session.headers["User-Agent"]="Mozilla/5.0 (compatible; PeripheralDB/5.0; +public-product-catalog-research)"
TODAY=datetime.date.today().isoformat()
TIMEOUT=25
MAX_SITEMAP_URLS=3500
MAX_RECHECKS=120
RECHECK_DAYS=7

ALIASES={
 "sensor":"传感器","sensor model":"传感器","dpi":"最高DPI","maximum dpi":"最高DPI","max dpi":"最高DPI",
 "polling rate":"回报率","report rate":"回报率","weight":"重量","connection":"连接","connectivity":"连接",
 "battery":"电池","battery capacity":"电池","battery life":"续航","switch":"轴体","switches":"轴体",
 "layout":"配列","driver":"驱动单元","driver unit":"驱动单元","frequency response":"频响","codec":"编码",
 "latency":"延迟","noise cancellation":"降噪","anc":"降噪","microphone":"麦克风"
}
PATH_HINTS=("/products/","/product/","/gaming-mice/","/gaming-keyboards/","/gaming-headsets/","/mouse/","/keyboard/","/headset/")
BAD_HINTS=("/blog/","/news/","/pages/","/collections/","/category/","/support/","/download/","/login","/cart")

def clean(s): return re.sub(r"\s+"," ",str(s or "")).strip()
def host_allowed(url,domains):
    h=urlparse(url).netloc.lower()
    return any(h==d.lower() or h.endswith("."+d.lower()) for d in domains)
def get(url):
    r=session.get(url,timeout=TIMEOUT,allow_redirects=True)
    r.raise_for_status();return r
def normalize_key(k):
    raw=clean(k); low=raw.lower().strip(":： ")
    return ALIASES.get(low,raw)
def flatten_jsonld(obj):
    if isinstance(obj,list):
        for x in obj: yield from flatten_jsonld(x)
    elif isinstance(obj,dict):
        if "@graph" in obj: yield from flatten_jsonld(obj["@graph"])
        yield obj

def parse_product_page(url):
    r=get(url); soup=BeautifulSoup(r.text,"html.parser")
    name=None; images=[]; specs={}
    for s in soup.find_all("script",type="application/ld+json"):
        try:
            obj=json.loads(s.string or "")
            for x in flatten_jsonld(obj):
                typ=x.get("@type")
                if typ=="Product" or (isinstance(typ,list) and "Product" in typ):
                    if x.get("name") and not name: name=clean(x["name"])
                    im=x.get("image")
                    if isinstance(im,str): images.append(im)
                    elif isinstance(im,list): images += [i for i in im if isinstance(i,str)]
                    elif isinstance(im,dict) and im.get("url"): images.append(im["url"])
        except Exception: pass
    og=soup.find("meta",property="og:image")
    if og and og.get("content"): images.append(urljoin(url,og["content"]))
    if not name:
        h=soup.find("h1"); name=clean(h.get_text(" ",strip=True)) if h else None
    for tr in soup.select("table tr"):
        cells=[clean(x.get_text(" ",strip=True)) for x in tr.find_all(["th","td"])]
        if len(cells)>=2 and 0<len(cells[0])<90 and 0<len(cells[1])<400: specs[normalize_key(cells[0])]=cells[1]
    for dt in soup.find_all("dt"):
        dd=dt.find_next_sibling("dd")
        if dd:
            k,v=clean(dt.get_text(" ",strip=True)),clean(dd.get_text(" ",strip=True))
            if k and v and len(k)<90 and len(v)<400: specs[normalize_key(k)]=v
    # Some storefronts use simple spec label/value blocks.
    for row in soup.select("[class*='spec']"):
        txt=[clean(x) for x in row.stripped_strings]
        if 2<=len(txt)<=4 and len(txt[0])<70 and len(" ".join(txt[1:]))<300:
            specs.setdefault(normalize_key(txt[0])," ".join(txt[1:]))
    image=next((i for i in images if isinstance(i,str) and i.startswith("http")), "")
    return name,dict(list(specs.items())[:70]),image,r.url

def likely_product_url(u):
    low=u.lower()
    if any(x in low for x in BAD_HINTS): return False
    return any(x in low for x in PATH_HINTS)

def discover_page_links(url,domains):
    out=set()
    try: soup=BeautifulSoup(get(url).text,"html.parser")
    except Exception: return out
    for a in soup.find_all("a",href=True):
        u=urljoin(url,a["href"]).split("#")[0].split("?")[0].rstrip("/")
        if host_allowed(u,domains) and likely_product_url(u): out.add(u)
    return out

def sitemap_urls(sm_url,domains,depth=0):
    out=set()
    if depth>2:return out
    try:
        r=get(sm_url)
        root=ET.fromstring(r.content)
    except Exception:return out
    locs=[clean(x.text) for x in root.iter() if x.tag.lower().endswith("loc") and x.text]
    if root.tag.lower().endswith("sitemapindex"):
        for loc in locs[:80]:
            if host_allowed(loc,domains): out |= sitemap_urls(loc,domains,depth+1)
    else:
        for loc in locs[:MAX_SITEMAP_URLS]:
            if host_allowed(loc,domains) and likely_product_url(loc.rstrip("/")): out.add(loc.rstrip("/"))
    return out

def shopify_products(base,domains):
    out=set()
    # Discovery via public Shopify catalog endpoint where the store exposes it.
    for page in range(1,8):
        try:
            r=get(base.rstrip("/")+"/products.json?limit=250&page="+str(page))
            if "json" not in r.headers.get("content-type","").lower():break
            data=r.json().get("products",[])
        except Exception:break
        if not data:break
        for p in data:
            h=p.get("handle")
            if h: out.add(base.rstrip("/")+"/products/"+h)
        if len(data)<250:break
    return out

def classify(name,url):
    s=(clean(name)+" "+url).lower()
    if any(x in s for x in ["mouse","mice","鼠标"]):return "鼠标"
    if any(x in s for x in ["keyboard","keyboad","键盘"]):return "键盘"
    if any(x in s for x in ["headset","headphone","earbud","earphone","耳机","耳麦"]):return "耳机/耳麦"
    return "待分类"

def date_due(last):
    if not last:return True
    try:return (datetime.date.today()-datetime.date.fromisoformat(last)).days>=RECHECK_DAYS
    except:return True

def add_source(p,typ,url,tier,note=""):
    srcs=p.setdefault("sources",[])
    if not any(x.get("url")==url for x in srcs):
        srcs.append({"type":typ,"url":url,"tier":tier,"checked_at":TODAY,"note":note})
    else:
        for x in srcs:
            if x.get("url")==url:x["checked_at"]=TODAY
    p["verification"]["source_count"]=len(srcs)

def merge_official_specs(p,new_specs,url,review):
    updated=0
    old=p.setdefault("specs",{})
    for k,v in new_specs.items():
        if not v or v in ("—","N/A","NA"):continue
        if k not in old or old[k] in ("—","待补参数","待结构化",""):
            old[k]=v;updated+=1
        elif clean(old[k]).lower()!=clean(v).lower():
            # Never silently overwrite a previously verified official value.
            item={"brand":p["brand"],"name":p["name"],"field":k,"database_value":old[k],"new_value":v,
                  "source":url,"detected_at":TODAY}
            if not any(x.get("brand")==item["brand"] and x.get("name")==item["name"] and x.get("field")==k and x.get("new_value")==v for x in review):
                review.append(item)
            p["verification"]["status"]="conflict"
            p["verification"].setdefault("conflicts",[]).append({"field":k,"existing":old[k],"candidate":v,"source":url})
    return updated

db=json.loads(DATA.read_text(encoding="utf-8"));cfg=json.loads(BRANDS.read_text(encoding="utf-8"))
try: review=json.loads(REVIEW.read_text(encoding="utf-8"))
except: review=[]
report={"date":TODAY,"discovered":0,"updated":0,"images_added":0,"rechecked":0,"conflicts_before":len(review),"conflicts":0,"errors":[],"brand_discovery":{}}
by_url={p.get("source","").rstrip("/"):p for p in db["products"] if p.get("source")}
by_name={(p["brand"].lower(),p["name"].lower()):p for p in db["products"]}
recheck_budget=MAX_RECHECKS

for b in cfg["brands"]:
    brand=b["brand"];domains=b["domains"];origin=b.get("origin","海外"); found=set()
    methods=b.get("discovery",["configured_pages","sitemap"])
    if "configured_pages" in methods:
        for u in b.get("collection_urls",[]): found |= discover_page_links(u,domains)
    if "sitemap" in methods:
        for u in b.get("sitemap_urls",[]): found |= sitemap_urls(u,domains)
    if "shopify_products_json" in methods and b.get("collection_urls"):
        bases=[]
        for u in b["collection_urls"]:
            pr=urlparse(u);base=f"{pr.scheme}://{pr.netloc}"
            if base not in bases:bases.append(base)
        for base in bases[:2]: found |= shopify_products(base,domains)
    report["brand_discovery"][brand]=len(found)

    for u in sorted(found):
        cleanu=u.rstrip("/")
        p=by_url.get(cleanu)
        if p:
            continue
        try:name,specs,image,final_url=parse_product_page(cleanu)
        except Exception as e:
            continue
        if not name or len(name)>180:continue
        key=(brand.lower(),name.lower())
        if key in by_name:
            p=by_name[key]; add_source(p,"official_product",final_url,100,"自动发现的额外官方页面")
            if image and not p.get("image_url"):
                p["image_url"]=image;p["image_source"]=final_url;report["images_added"]+=1
            report["updated"]+=merge_official_specs(p,specs,final_url,review)
            continue
        p={"brand":brand,"name":name,"category":classify(name,final_url),"subcategory":"自动发现","status":"官网可确认/待人工复核",
           "verified":"官方页面自动发现","origin":origin,"market":"官网","first_seen":TODAY,"last_verified":TODAY,"last_checked":TODAY,
           "source":final_url,"image_url":image,"image_source":final_url if image else "",
           "sources":[],"specs":specs or {"参数状态":"已发现官方产品页，详细参数待结构化"},"conflict":"",
           "verification":{"status":"official_verified" if len(specs)>=4 else "official_discovered",
                           "confidence":0.92 if len(specs)>=4 else 0.82,"source_count":0,"conflicts":[]}}
        add_source(p,"official_product",final_url,100,"官方新品自动发现")
        db["products"].append(p);by_url[final_url.rstrip("/")]=p;by_name[key]=p
        report["discovered"]+=1
        if image:report["images_added"]+=1
        time.sleep(.08)

# Rolling recheck: keeps existing images/specs fresh without hammering every site every day.
for p in sorted(db["products"],key=lambda x:x.get("last_checked","")):
    if recheck_budget<=0:break
    url=p.get("source","")
    brandcfg=next((x for x in cfg["brands"] if x["brand"]==p["brand"]),None)
    if not url or not brandcfg or not host_allowed(url,brandcfg["domains"]) or not date_due(p.get("last_checked")):continue
    try:name,specs,image,final_url=parse_product_page(url)
    except Exception as e:
        report["errors"].append({"product":p["brand"]+" "+p["name"],"url":url,"error":str(e)[:180]});continue
    p["last_checked"]=TODAY;report["rechecked"]+=1;recheck_budget-=1
    add_source(p,"official_product",final_url,100,"定期官方规格复核")
    if image and p.get("image_url")!=image:
        p["image_url"]=image;p["image_source"]=final_url;report["images_added"]+=1
    report["updated"]+=merge_official_specs(p,specs,final_url,review)
    if p["verification"]["status"]!="conflict":
        meaningful=len([v for v in p.get("specs",{}).values() if v and v not in ("—","待补参数")])
        p["verification"]["status"]="official_verified" if meaningful>=4 else "official_discovered"
        p["verification"]["confidence"]=0.98 if meaningful>=4 else 0.84
    time.sleep(.08)

report["conflicts"]=len(review)-report["conflicts_before"]
db["updated_at"]=TODAY
DATA.write_text(json.dumps(db,ensure_ascii=False,indent=2),encoding="utf-8")
REVIEW.write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding="utf-8")
REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps(report,ensure_ascii=False,indent=2))
