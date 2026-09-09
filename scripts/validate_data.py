#!/usr/bin/env python3
import json, sys, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
db=json.loads((ROOT/"data/products.json").read_text(encoding="utf-8"))
errors=[];warnings=[];seen=set()
for i,p in enumerate(db["products"]):
    label=f"{p.get('brand','?')} {p.get('name','?')}"
    key=(str(p.get("brand","")).lower().strip(),str(p.get("name","")).lower().strip())
    if key in seen: warnings.append("疑似重复: "+label)
    seen.add(key)
    for req in ["brand","name","category","specs","source","verification"]:
        if req not in p: errors.append(f"{label}: 缺少 {req}")
    if p.get("source") and not str(p["source"]).startswith("http"): errors.append(f"{label}: source 非 URL")
    if p.get("image_url") and not str(p["image_url"]).startswith("http"): warnings.append(f"{label}: image_url 非远程 URL")
    conf=p.get("verification",{}).get("confidence",0)
    if not isinstance(conf,(int,float)) or not 0<=conf<=1: errors.append(f"{label}: confidence 非法")
print(f"products={len(db['products'])}, errors={len(errors)}, warnings={len(warnings)}")
for x in warnings[:80]:print("WARN",x)
for x in errors[:80]:print("ERROR",x)
if errors:sys.exit(1)
