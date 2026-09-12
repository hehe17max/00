# Changelog

## 1.4.1 — 2026-09-12

### 值层全面中文化
- 中文模式下参数**值**不再残留英文句子/短语：新增 200+ 条值翻译规则（sentenceRules），覆盖营销长句、规格短语、单位换算、材质/工艺/结构术语。
- 典型修复："Support low latency mode for gaming"→支持游戏低延迟模式；"10 minutes of charging = 3 hours of use"→10 分钟充电 = 3 小时使用；"Crystal-Clear Calls: Four microphones..."→清晰通话：四麦克风 AI 降噪；"memory titanium alloy"→记忆钛合金；"IPX5 waterproof and sweatproof"→IPX5 防水防汗；"touch controls"→触控操作。
- 翻译前后对比（620 条产品、4591 个显示规格项）：整行为英文句子的规格项 1730 → **0**；值内残留 ≥3 词英文片段 1730 → **10**（仅剩平台兼容列表、品牌轴体型号、国际配列代码等专名，如 "PC, PS5™, Xbox Series X|S™"、"Keychron Ultra-fast Lime"、"DE-ISO, UK-ISO"）。
- 全部规则为显示层处理（不改动数据源），与证据一致性校验兼容。

## 1.4.0 — 2026-09-12

### 数据来源渠道策略（品牌分类）
- 品牌分类来源优先级落地：**外国品牌**（Razer/Corsair/HyperX/SteelSeries/Keychron）→ 原属国官网优先，中文镜像降级；**小众品牌**（Kinetic Labs/Glorious/iBUYPOWER/AJAZZ/AULA/DURGOD/EKSA/KZZI/LUMINKEY/TRN/ATTACK SHARK）→ 国内官网优先、国内零售/社区网页次之；**国产品牌** → 国内官网优先。
- quality_rules.source_priority 改为品牌分类感知：cn_official（国内官方 120 > 中性 110 > 外语镜像 90）；origin_official（原属国官方 120 > 中性 110 > 中文镜像 100 > 外语镜像 90）；cn_web（国内官方 120 > 国内零售/社区网页 115 > 全球官网 110 > 外语镜像 90）；新增 is_cn_page（识别 .cn 域名、cn. 子域、cn/zh-cn 路径）。
- update_data.py 爬取排序、来源入库、字段合并、复检全链路按品牌策略排名；新增 scripts/rerank_sources.py（幂等）回写存量数据。
- 存量数据回写：611 条产品来源全部按新策略重标 tier/type 并按权重重排；3 条 Razer 记录主来源由 cn.razerzone.com 翻转为 razer.com 原属国官网产品页（BlackShark V2 X / V3 X Hyperspeed / Kraken Kitty V2）。
- validate_data.py 新增品牌策略一致性校验：source_preference 必填且与原属国分类匹配（中国品牌禁用 origin_official、外国品牌禁用 cn_official）。

## 1.3.3 — 2026-09-12

### 修复
- 中文模式下规格键不再残留英文：新增 30+ 常见规格的中英词典与别名映射（灵敏度/阻抗/指向性/续航/表面处理等），修正 IPS、静默高度、快速触发等字段的中文标签。
- 数据清洗升级：清除商城垃圾键（价格/发货地/波罗的海语价格等）、MCHOSE 驱动设置页教学文本、以型号名/数值为键的脏数据（共 578 条字段，279 条产品记录受益；另 4 条 General 合并文本拆解、2 条尺寸键规范化）。
- 修复 4 条 Baseus 记录「General」整段英文合并文本：拆解为防水/材质/重量/颜色等结构化参数。
- 修复 2 条 AJAZZ 记录用户评价混入配列字段的问题。
- 值翻译补充：supports→支持、no support→不支持、分钟/克/毫米等单位换算。

### 数据
- 清洗规则并入 CI（cleanup_specs.py，幂等），此后每次数据更新自动执行。
## 1.3.2 — 2026-09-12

- 数据按品类拆分加载：products.json 拆分为 products_mouse / products_keyboard / products_headphone 与 products_meta 版本清单，浏览器并行加载并按内容哈希缓存，减少重复下载约 27%。
- 筛选、搜索、关键词与对比状态写入 URL（hash 路由），支持分享链接与浏览器前进后退。

## 1.3.1 — 2026-09-11

- 全库清理营销长标题、配件和非目标产品，合并同型号重复记录。
- iKF R5、T3、Pet Clip、V11 Pro 等重复记录恢复简洁型号并合并已有参数与图片。
- 无结构化参数的产品不再显示空白，明确显示“详细参数正在补充（待核实）”。
- 新增定时全库审计，后续新产品同样必须通过型号、分类、重复和配件检查。
- 增强 Shopify 正文参数解析，可读取未放入表格或结构化数据的官网规格段落。

## 1.3.0 — 2026-09-11

- 中文模式补充常见英文参数名、参数值和状态说明的中文显示。
- 低可信度参数继续展示，并在参数值后标记“待核实”。
- 数据库改为每 30 分钟自动扫描新品，并优先补全缺图、缺参数和待复核产品。
- 自动更新完成后自动触发 GitHub Pages 部署。
- 精简品牌与产品联网补全入口。

## 1.2.1 — 2026-09-10

- 移除维护者前端密码，联网补全入口直接显示；实际写入继续由 GitHub 仓库权限控制。
- 产品详情页和参数对比表跟随简体中文 / English 选项切换语言。
- 合并中英文同义参数字段，并隐藏误抓的导航、购物和支持页字段。
- 图片地址统一使用 HTTPS，增加多来源提取、失效回退和缺图提示。
- 数据校验拒绝非 HTTPS 图片和明显的站点图标、占位图。

## 1.0.0 — 2026-09-09

首个正式版。

整合此前自动核验版和自动品牌发现版：

- 产品配图与分类占位图
- 每日品牌/产品联网发现
- Sitemap / 官方页面 / Shopify Catalog 多入口新品补漏
- 自动发现未知品牌与官网可信度验证
- 品牌候选人工批准/拒绝流程
- 多来源数据分级和参数冲突审核
- 20 款产品同时对比
- 单选、AND、OR 多关键词筛选
- 鼠标、键盘、耳机分类独立参数提示
- 自动产品滚动复核
- GitHub Pages 自动部署
- GitHub Actions 每日更新
- 安装完整性 health check
