#!/usr/bin/env python3
"""
Import normalized secondary-source records from data/import_queue.json.
This intentionally does NOT scrape Taobao/Tmall/JD/Amazon.
Use authorized APIs/feeds or manually-curated records, then put them in import_queue.json.

Item format:
{
  "brand": "...", "name": "...", "source_type": "authorized_marketplace|marketplace|professional_review",
  "url": "https://...", "image_url": "...",
  "specs": {"第三方实测延迟":"...", "价格":"..."}
}
"""
import json, datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data/products.json"; QUEUE=ROOT/"data/import_queue.json"; REVIEW=ROOT/"data/review_queue.json"
db=json.loads(DATA.read_text(encoding="utf-8"));items=json.loads(QUEUE.read_text(encoding="utf-8"));review=json.loads(REVIEW.read_text(encoding="utf-8"))
tiers={"authorized_marketplace":75,"marketplace":60,"professional_review":55}
by={(p["brand"].lower(),p["name"].lower()):p for p in db["products"]}
today=datetime.date.today().isoformat(); imported=0
for x in items:
    p=by.get((x["brand"].lower(),x["name"].lower()))
    if not p: continue
    typ=x.get("source_type","professional_review");tier=tiers.get(typ,50)
    if x.get("url") and not any(s.get("url")==x["url"] for s in p.setdefault("sources",[])):
        p["sources"].append({"type":typ,"url":x["url"],"tier":tier,"checked_at":today,"note":"二级来源"})
    if x.get("image_url") and not p.get("image_url"): p["image_url"]=x["image_url"];p["image_source"]=x.get("url","")
    # Secondary values are namespaced; they never overwrite official fields.
    for k,v in x.get("specs",{}).items():
        sk=("第三方实测："+k) if typ=="professional_review" else ("电商信息："+k)
        p["specs"][sk]=v
    p["verification"]["source_count"]=len(p["sources"]);imported+=1
QUEUE.write_text("[]\n",encoding="utf-8");DATA.write_text(json.dumps(db,ensure_ascii=False,indent=2),encoding="utf-8")
print("imported",imported)
