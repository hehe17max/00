#!/usr/bin/env python3
import json, re, datetime, time
from pathlib import Path
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data/products.json"; BRANDS=ROOT/"data/brands.json"
session=requests.Session()
session.headers["User-Agent"]="Mozilla/5.0 (compatible; PeripheralDB/3.0; official-source-indexer)"

PRODUCT_HINTS=("mouse","mice","keyboard","headset","headphone","earbud","鼠标","键盘","耳机","产品")

def host_allowed(url,domains):
    host=urlparse(url).netloc.lower()
    return any(host==d or host.endswith("."+d) for d in domains)

def fetch(url):
    r=session.get(url,timeout=30)
    r.raise_for_status()
    return r.text

def clean(s): return re.sub(r"\s+"," ",s or "").strip()

def discover_links(url, domains):
    soup=BeautifulSoup(fetch(url),"html.parser"); out=set()
    for a in soup.find_all("a",href=True):
        u=urljoin(url,a["href"]).split("#")[0].split("?")[0].rstrip("/")
        txt=(clean(a.get_text(" ",strip=True))+" "+u).lower()
        if host_allowed(u,domains) and any(h in txt for h in PRODUCT_HINTS):
            out.add(u)
    return out

def product_name_and_specs(url):
    soup=BeautifulSoup(fetch(url),"html.parser"); name=None; specs={}
    for s in soup.find_all("script",type="application/ld+json"):
        try:
            obj=json.loads(s.string or "")
            stack=obj if isinstance(obj,list) else [obj]
            for x in stack:
                if isinstance(x,dict) and x.get("@type")=="Product" and x.get("name"):
                    name=clean(str(x["name"])); break
        except Exception: pass
        if name: break
    if not name:
        h=soup.find("h1"); name=clean(h.get_text(" ",strip=True)) if h else None
    for tr in soup.select("table tr"):
        cells=[clean(x.get_text(" ",strip=True)) for x in tr.find_all(["th","td"])]
        if len(cells)>=2 and 0<len(cells[0])<80 and 0<len(cells[1])<350: specs[cells[0]]=cells[1]
    for dt in soup.find_all("dt"):
        dd=dt.find_next_sibling("dd")
        if dd:
            k,v=clean(dt.get_text(" ",strip=True)),clean(dd.get_text(" ",strip=True))
            if k and v and len(k)<80 and len(v)<350: specs[k]=v
    return name,dict(list(specs.items())[:50])

def classify(name,url):
    s=(name+" "+url).lower()
    if any(x in s for x in ["mouse","mice","鼠标"]): return "鼠标"
    if any(x in s for x in ["keyboard","键盘"]): return "键盘"
    if any(x in s for x in ["headset","headphone","earbud","耳机"]): return "耳机/耳麦"
    return "待分类"

db=json.loads(DATA.read_text(encoding="utf-8")); cfg=json.loads(BRANDS.read_text(encoding="utf-8"))
seen_urls={p["source"].rstrip("/") for p in db["products"]}
seen={(p["brand"].lower(),p["name"].lower()) for p in db["products"]}
added=0
for brand in cfg["brands"]:
    origin=brand.get("origin","中国" if brand["brand"] in {"iKF","MCHOSE","Rapoo","ATK","Darmoshark","AJAZZ"} else "海外")
    for index_url in brand["collection_urls"]:
        try: links=discover_links(index_url,brand["domains"])
        except Exception as e:
            print("index fail",brand["brand"],index_url,e); continue
        for u in links:
            if u in seen_urls: continue
            try: name,specs=product_name_and_specs(u)
            except Exception: continue
            if not name or len(name)>160: continue
            key=(brand["brand"].lower(),name.lower())
            if key in seen: continue
            db["products"].append({
              "brand":brand["brand"],"name":name,"category":classify(name,u),"subcategory":"自动发现",
              "origin":origin,"market":"官网","last_verified":datetime.date.today().isoformat(),
              "status":"待核实","verified":"官方页面自动发现","source":u,
              "specs":specs or {"参数状态":"官网已发现型号，等待品牌适配器补充参数"},
              "conflict":"自动发现记录：参数完成结构化后再标记为详细已核实"
            })
            seen.add(key);seen_urls.add(u);added+=1;time.sleep(.1)

db["updated_at"]=datetime.date.today().isoformat()
DATA.write_text(json.dumps(db,ensure_ascii=False,indent=2),encoding="utf-8")
print("new",added,"total",len(db["products"]))
