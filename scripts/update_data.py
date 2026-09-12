#!/usr/bin/env python3
import json, re, datetime, os, hashlib, time, html
from pathlib import Path
from urllib.parse import urljoin, urlparse
from xml.etree import ElementTree as ET
import requests
from bs4 import BeautifulSoup
from quality_rules import (
    canonical_url, concise_product_name, host_allowed, is_foreign_locale,
    product_identity, publication_rejection, source_priority,
)

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data/products.json"; BRANDS=ROOT/"data/brands.json"
REPORT=ROOT/"data/update_report.json"; REVIEW=ROOT/"data/review_queue.json"
TODAY=datetime.date.today().isoformat()
RUN_SLOT=datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M")
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
    MAX_RECHECKS,RECHECK_DAYS=45,10

session=requests.Session()
session.headers["User-Agent"]="Mozilla/5.0 (compatible; PeripheralDB/1.0.1)"
PATH_HINTS=("/products/","/product/","/gaming-mice/","/gaming-keyboards/","/gaming-headsets/","/mouse/","/keyboard/","/headset/")
BAD_HINTS=("/blog/","/news/","/pages/","/collections/","/category/","/support/","/download/","/login","/cart")

INLINE_SPEC_LABELS = {
    "型号": ("model", "product model", "型号"),
    "驱动单元": ("speaker driver", "driver size", "drivers", "驱动单元", "喇叭单元"),
    "蓝牙/无线": ("bluetooth version", "bluetooth", "蓝牙版本"),
    "编码": ("audio decoding", "audio codec", "codec", "音频编码", "解码格式"),
    "电池": ("battery capacity", "battery", "电池容量"),
    "续航": ("play time", "playback time", "battery life", "续航时间", "续航"),
    "充电方式": ("charging interface", "charging port", "充电接口"),
    "充电时间": ("charging time", "charge time", "充电时间"),
    "重量": ("product weight", "weight", "重量"),
    "尺寸": ("product dimensions", "dimensions", "size", "尺寸"),
    "降噪": ("active noise cancellation(?:\\(anc\\))?", "noise cancellation", "anc", "主动降噪", "降噪深度"),
    "延迟": ("latency", "game latency", "延迟"),
    "麦克风": ("microphone", "mic", "麦克风"),
    "有线连接": ("wired connection", "aux connection", "有线连接"),
    "多设备": ("pairing 2 devices", "dual-device connection", "multi-device", "双设备", "多设备"),
    "APP/软件": ("app control", "app", "software", "应用程序", "软件"),
    "传感器": ("sensor", "传感器"),
    "最高DPI": ("maximum dpi", "max dpi", "dpi", "最高dpi"),
    "回报率": ("polling rate", "report rate", "回报率"),
    "连接": ("connectivity", "connection modes", "connection", "连接方式"),
    "轴体": ("switch type", "switches", "轴体"),
    "配列": ("layout", "number of keys", "配列", "按键数量"),
}

def log(x): print(x, flush=True)
def clean(x): return re.sub(r"\s+"," ",str(x or "")).strip()
def get(url):
    r=session.get(url,timeout=(CONNECT_TIMEOUT,READ_TIMEOUT),allow_redirects=True)
    r.raise_for_status(); return r
def flatten(obj):
    if isinstance(obj,list):
        for x in obj: yield from flatten(x)
    elif isinstance(obj,dict):
        if "@graph" in obj: yield from flatten(obj["@graph"])
        yield obj
def image_values(value):
    """Yield image URLs from schema.org string, list, or ImageObject values."""
    if isinstance(value,str):
        yield value
    elif isinstance(value,list):
        for item in value: yield from image_values(item)
    elif isinstance(value,dict):
        for key in ("url","contentUrl","thumbnailUrl"):
            if value.get(key): yield from image_values(value[key])
def normalize_image_url(value,base):
    raw=html.unescape(clean(value))
    if not raw: return ""
    url=urljoin(base,raw)
    if url.startswith("http://"): url="https://"+url[7:]
    parsed=urlparse(url)
    low=(parsed.path+"?"+parsed.query).lower()
    if parsed.scheme!="https" or not parsed.netloc: return ""
    if any(x in low for x in ("favicon","site-logo","/logo.","placeholder","spinner","loading.gif","avatar","sprite")): return ""
    return url
def extract_inline_specs(soup):
    """Extract labelled specification prose used by many Shopify stores."""
    aliases=[]
    for key,values in INLINE_SPEC_LABELS.items():
        for value in values: aliases.append((key,value))
    alias_pattern="|".join(f"(?:{value})" for _,value in sorted(aliases,key=lambda x:len(x[1]),reverse=True))
    label_re=re.compile(rf"(?P<label>{alias_pattern})\\s*[:：]\\s*",re.I)
    candidates=[]
    for node in soup.select(".product__description,.product-description,[id*='description'],[class*='description'],.rte"):
        value=clean(node.get_text(" ",strip=True))
        if 20<len(value)<12000 and len(label_re.findall(value))>=2: candidates.append(value)
    full=clean(soup.get_text(" ",strip=True))
    marker=re.search(r"(?:specifications?|technical specifications?|产品参数|规格参数)\\s*[:：]?",full,re.I)
    if marker:
        segment=full[marker.end():marker.end()+6000]
        segment=re.split(r"what.?s in (?:the )?(?:box|package)|package contents|faqs?|包装清单",segment,1,flags=re.I)[0]
        candidates.append(segment)
    if not candidates: return {}
    text=max(candidates,key=lambda value:len(label_re.findall(value)))
    hits=list(label_re.finditer(text)); result={}
    alias_to_key={re.sub(r"\\", "", alias).casefold():key for key,values in INLINE_SPEC_LABELS.items() for alias in values if "\\" not in alias}
    for index,hit in enumerate(hits):
        raw_label=clean(hit.group("label")).casefold()
        key=alias_to_key.get(raw_label)
        if not key:
            for candidate,values in INLINE_SPEC_LABELS.items():
                if any(re.fullmatch(value,raw_label,re.I) for value in values): key=candidate; break
        if not key or key=="型号": continue
        end=hits[index+1].start() if index+1<len(hits) else min(len(text),hit.end()+180)
        value=clean(text[hit.end():end]).strip(" -|;,.")
        value=re.split(r"\\s+(?:[1-9]\\.|important|note:)",value,1,flags=re.I)[0]
        if 0<len(value)<=180: result.setdefault(key,value)
    return result
def parse_product_page(url):
    r=get(url); soup=BeautifulSoup(r.text,"html.parser")
    name=None; images=[]; specs={}; product_objects=[]
    for s in soup.find_all("script",type="application/ld+json"):
        try:
            for x in flatten(json.loads(s.string or "")):
                typ=x.get("@type"); types=typ if isinstance(typ,list) else [typ]
                if "Product" in types:
                    product_objects.append(x)
                    if x.get("name") and not name: name=clean(x["name"])
                    images += list(image_values(x.get("image")))
                    for prop in x.get("additionalProperty",[]) if isinstance(x.get("additionalProperty"),list) else []:
                        if not isinstance(prop,dict): continue
                        key=clean(prop.get("name") or prop.get("propertyID"))
                        value=clean(prop.get("value"))
                        if key and value and len(key)<90 and len(value)<400: specs[key]=value
        except Exception: pass
    og=soup.find("meta",property="og:image")
    if og and og.get("content"): images.append(urljoin(url,og["content"]))
    twitter=soup.find("meta",attrs={"name":"twitter:image"}) or soup.find("meta",attrs={"property":"twitter:image"})
    if twitter and twitter.get("content"): images.append(urljoin(url,twitter["content"]))
    image_src=soup.find("link",rel=lambda value:value and "image_src" in value)
    if image_src and image_src.get("href"): images.append(urljoin(url,image_src["href"]))
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
    for k,v in extract_inline_specs(soup).items(): specs.setdefault(k,v)
    image=next((candidate for i in images if (candidate:=normalize_image_url(i,r.url))),"")
    canonical=soup.find("link",rel="canonical")
    canonical_href=urljoin(r.url,canonical.get("href")) if canonical and canonical.get("href") else r.url
    evidence={
        "product_schema": bool(product_objects),
        "product_schema_count": len(product_objects),
        "canonical_url": canonical_url(canonical_href),
        "page_language": clean((soup.html or {}).get("lang") if soup.html else ""),
        "official_url": r.url,
        "source_priority": source_priority(r.url),
    }
    if product_objects:
        obj=product_objects[0]
        evidence["sku"]=clean(obj.get("sku") or obj.get("mpn"))
        brand_obj=obj.get("brand")
        evidence["schema_brand"]=clean(brand_obj.get("name") if isinstance(brand_obj,dict) else brand_obj)
    return name,specs,image,r.url,evidence
def likely(u):
    low=u.lower()
    return not is_foreign_locale(u) and not any(x in low for x in BAD_HINTS) and any(x in low for x in PATH_HINTS)
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
def needs_enrichment(product):
    specs={k:v for k,v in product.get("specs",{}).items() if v not in (None,"","—","待补参数")}
    return bool(product.get("verification",{}).get("needs_review")) or len(specs)<8 or not product.get("image_url")
def product_due(product):
    last=product.get("last_checked")
    if not last: return True
    try:
        interval=1 if needs_enrichment(product) else RECHECK_DAYS
        return (datetime.date.today()-datetime.date.fromisoformat(last)).days>=interval
    except: return True
def rotate(urls,limit,salt):
    return sorted(urls,key=lambda u:(-source_priority(u),hashlib.sha1((salt+u).encode()).hexdigest()))[:limit]
def add_source(p,url,note):
    srcs=p.setdefault("sources",[])
    hit=next((x for x in srcs if x.get("url")==url),None)
    if hit: hit["checked_at"]=TODAY
    else:
        tier=source_priority(url)
        srcs.append({"type":"official_cn_product" if tier==120 else "official_product","url":url,"tier":tier,"checked_at":TODAY,"note":note})
    p.setdefault("verification",{})["source_count"]=len(srcs)
def merge(p,new,url,review,evidence):
    old=p.setdefault("specs",{}); n=0
    ver=p.setdefault("verification",{"status":"official_discovered","confidence":0.82,"source_count":0,"conflicts":[]})
    ver.setdefault("conflicts",[])
    field_evidence=p.setdefault("spec_evidence",{})
    incoming_priority=source_priority(url)
    for k,v in new.items():
        if not v: continue
        if k not in old or old[k] in ("—","待补参数",""):
            old[k]=v; n+=1
            field_evidence[k]={"value":v,"source_url":url,"source_type":"official_cn_product" if incoming_priority==120 else "official_product","source_priority":incoming_priority,"checked_at":TODAY,"claim_type":"厂商标称"}
        elif clean(old[k]).lower()==clean(v).lower():
            field_evidence[k]={"value":old[k],"source_url":url,"source_type":"official_cn_product" if incoming_priority==120 else "official_product","source_priority":incoming_priority,"checked_at":TODAY,"claim_type":"厂商标称"}
        elif clean(old[k]).lower()!=clean(v).lower():
            current_priority=field_evidence.get(k,{}).get("source_priority",source_priority(p.get("source",url)))
            resolution="pending_review"
            if incoming_priority>current_priority:
                old_value=old[k]; old[k]=v; n+=1; resolution="prefer_zh_cn_official"
                field_evidence[k]={"value":v,"source_url":url,"source_type":"official_cn_product","source_priority":incoming_priority,"checked_at":TODAY,"claim_type":"厂商标称"}
            else:
                old_value=old[k]
            item={"brand":p["brand"],"name":p["name"],"field":k,"database_value":old_value,"new_value":v,"source":url,"detected_at":TODAY,"resolution":resolution}
            if not any(x.get("brand")==item["brand"] and x.get("name")==item["name"] and x.get("field")==k and x.get("new_value")==v for x in review):
                review.append(item)
            if resolution=="pending_review": ver["status"]="conflict"
    ver["evidence"]=evidence
    ver["quality_gate_version"]="1.3"
    published_fields={k:v for k,v in old.items() if v not in (None,"","—","待补参数")}
    fully_evidenced=bool(published_fields) and all(
        field_evidence.get(k,{}).get("value")==v and field_evidence.get(k,{}).get("source_url")
        for k,v in published_fields.items()
    )
    if ver.get("status")!="conflict" and evidence.get("product_schema") and fully_evidenced and len(published_fields)>=4:
        ver["status"]="official_verified"
        ver["confidence"]=0.95 if incoming_priority==120 else 0.92
        ver["needs_review"]=False
    elif ver.get("status")!="conflict":
        ver["status"]="official_discovered"
        ver["confidence"]=min(float(ver.get("confidence",0.78)),0.78)
        ver["needs_review"]=True
    return n

db=json.loads(DATA.read_text(encoding="utf-8"))
cfg=json.loads(BRANDS.read_text(encoding="utf-8"))
try: review=json.loads(REVIEW.read_text(encoding="utf-8"))
except: review=[]
by_url={canonical_url(p.get("source", "")):p for p in db["products"] if p.get("source")}
by_name={(p["brand"].lower(),product_identity(p["brand"],p["name"])):p for p in db["products"]}
report={"date":TODAY,"mode":MODE,"discovered":0,"updated":0,"images_added":0,"rechecked":0,"conflicts_before":len(review),"conflicts":0,"errors":[],"brand_stats":{}}

brands=cfg.get("brands",[])
ONLY_BRAND=os.getenv("PERIPHERALDB_ONLY_BRAND","").strip()
if ONLY_BRAND:
    brands=[b for b in brands if b.get("brand","").lower()==ONLY_BRAND.lower()]
    log(f"Brand-targeted scan: {ONLY_BRAND}")
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
    # A manually requested brand scan is expected to finish that brand, rather
    # than expose a different random slice on every run.  The normal scheduled
    # scan remains deliberately bounded so all brands still get time.
    discovery_limit=max(MAX_DISCOVERY_URLS_PER_BRAND,120) if ONLY_BRAND else MAX_DISCOVERY_URLS_PER_BRAND
    subset=rotate(found,discovery_limit,RUN_SLOT+brand)
    log(f"    found={len(found)} subset={len(subset)}")
    budget=max(MAX_NEW_PAGE_PARSES_PER_BRAND,120) if ONLY_BRAND else MAX_NEW_PAGE_PARSES_PER_BRAND
    newc=upd=imgs=0
    for u in subset:
        if canonical_url(u) in by_url: continue
        if budget<=0: break
        try:
            name,specs,image,final,evidence=parse_product_page(u); budget-=1
        except Exception as e:
            report["errors"].append({"brand":brand,"url":u,"error":str(e)[:120]}); budget-=1; continue
        rejection=publication_rejection(name,final,evidence.get("product_schema",False))
        if rejection:
            report.setdefault("rejected",[]).append({"brand":brand,"url":final,"name":name,"reason":rejection})
            continue
        concise=concise_product_name(brand,name,final)
        key=(brand.lower(),product_identity(brand,concise))
        if key in by_name:
            p=by_name[key]; add_source(p,final,"additional official page")
            upd += merge(p,specs,final,review,evidence)
            if image and not p.get("image_url"): p["image_url"]=image; p["image_source"]=final; imgs+=1
            by_url[canonical_url(final)]=p
            continue
        p={"brand":brand,"brand_zh_cn":b.get("brand_zh_cn",brand),"name":concise,"category":classify(name,final),"subcategory":"自动发现","status":"官网产品页已确认/参数待复核",
           "verified":"官方页面自动发现","origin":b.get("origin","海外"),"market":"官网","first_seen":TODAY,"last_verified":TODAY,"last_checked":TODAY,
           "source":final,"image_url":image,"image_source":final if image else "","sources":[],"specs":specs,
           "spec_evidence":{k:{"value":v,"source_url":final,"source_type":"official_cn_product" if source_priority(final)==120 else "official_product","source_priority":source_priority(final),"checked_at":TODAY,"claim_type":"厂商标称"} for k,v in specs.items()},
           "conflict":"","verification":{"status":"official_verified" if len(specs)>=4 else "official_discovered","confidence":0.92 if len(specs)>=4 else 0.78,"source_count":0,"conflicts":[],"evidence":evidence,"quality_gate_version":"1.3","needs_review":len(specs)<4}}
        add_source(p,final,"new official product")
        db["products"].append(p); by_url[canonical_url(final)]=p; by_name[key]=p; newc+=1
        if image: imgs+=1
    report["discovered"]+=newc; report["updated"]+=upd; report["images_added"]+=imgs
    elapsed=time.time()-t0
    report["brand_stats"][brand]={"found":len(found),"subset":len(subset),"new":newc,"updated":upd,"images":imgs,"seconds":round(elapsed,1)}
    log(f"    done {elapsed:.1f}s new={newc} updated={upd} images={imgs}")

todo=[p for p in db["products"] if product_due(p)]
todo.sort(key=lambda p:(not needs_enrichment(p),bool(p.get("image_url")),len([v for v in p.get("specs",{}).values() if v not in (None,"","—","待补参数")]),p.get("last_checked") or "",p.get("brand",""),p.get("name","")))
log(f"Recheck due={len(todo)} budget={MAX_RECHECKS}")
done=0
for p in todo:
    if done>=MAX_RECHECKS: break
    b=next((x for x in brands if x["brand"]==p["brand"]),None)
    url=p.get("source","")
    if not b or not url or not host_allowed(url,b["domains"]): continue
    try:
        _,specs,image,final,evidence=parse_product_page(url)
    except Exception as e:
        report["errors"].append({"product":p["brand"]+" "+p["name"],"error":str(e)[:120]}); done+=1; continue
    p["last_checked"]=TODAY; add_source(p,final,"periodic recheck")
    report["updated"] += merge(p,specs,final,review,evidence)
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
