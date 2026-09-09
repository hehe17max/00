# PeripheralDB 配置与维护指南

## 1. 新增已知品牌

编辑：

`data/brands.json`

示例：

```json
{
  "brand": "Example",
  "origin": "中国",
  "domains": ["example.com"],
  "collection_urls": [
    "https://www.example.com/mouse",
    "https://www.example.com/keyboard"
  ],
  "discovery": [
    "configured_pages",
    "sitemap",
    "shopify_products_json"
  ],
  "sitemap_urls": [
    "https://www.example.com/sitemap.xml"
  ]
}
```

## 2. 调整自动品牌搜索

编辑：

`data/brand_discovery_config.json`

主要字段：

- `auto_promote_score`：自动加入品牌的评分阈值
- `auto_promote_min_product_pages`：最少产品页
- `auto_promote_min_product_schema_pages`：最少 Product Schema 页面
- `query_pool`：每日轮换搜索词
- `excluded_domains`：永远不作为官方品牌站的域名

不建议把自动加入评分调得过低。

## 3. 调整筛选关键词

编辑：

`data/filter_schema.json`

鼠标、键盘、耳机分别有自己的：

- `placeholder`
- `keywords`
- `priority_fields`

网页会自动读取，无需改 JavaScript。

## 4. 数据源可信规则

编辑：

`data/source_policy.json`

默认官方来源权重最高。

## 5. 人工导入第三方数据

写入：

`data/import_queue.json`

并保持品牌和型号与主库一致。

## 6. 运行本地检查

安装 Python 依赖：

```bash
pip install -r requirements.txt
```

检查安装完整性：

```bash
python scripts/health_check.py
```

检查数据库：

```bash
python scripts/validate_data.py
```

手动发现品牌：

```bash
python scripts/discover_brands.py
```

手动更新产品：

```bash
python scripts/update_data.py
```

本地启动网站：

```bash
python -m http.server 8000
```

访问：

```text
http://localhost:8000
```
