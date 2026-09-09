# 全球外设产品参数库 v4

## 核心升级
- 按品类动态参数模板：鼠标 / 键盘 / 耳机耳麦分别使用不同字段体系。
- 搜索框 placeholder 会随品类变化。
- 快捷检索词会随品类变化。
- 产品卡片与对比表会优先按对应品类的重要字段排序。
- 支持“≤60g”等简单结构化搜索。
- 持续补充国产厂商详细参数。

## 鼠标重点字段
传感器、最高DPI、回报率、重量、主控、IPS、加速度、LOD、微动、寿命、编码器、电池、续航、尺寸、脚贴、充电、软件、板载存储、握法。

## 键盘重点字段
配列、轴体、磁轴方案、Rapid Trigger、RT精度、触发行程、扫描率、回报率、延迟、连接、热插拔、键帽、定位板、结构、机身、NKRO、灯光、电池、软件。

## 耳机重点字段
驱动单元、驱动类型、频响、蓝牙/无线、连接、编码、采样率、位深、ANC、延迟、麦克风、续航、电池、充电、无线距离、重量、有线连接、虚拟环绕、APP、兼容平台。

## 数据规模
当前产品：262
品牌：12

## 新增官方详细参数
本版本重点补充了 MCHOSE A7 V2 系列、L7 系列、K7 V2 系列、K7 Ultra、A7X Ultra 等鼠标参数。


## GitHub Pages 部署（推荐）

1. 在 GitHub 新建一个仓库，例如 `peripheral-db`。
2. 将本项目的**所有文件和目录**上传到仓库根目录，包括 `.github`、`data`、`scripts`。
3. 确认默认分支名称为 `main`。
4. 打开 `Settings → Pages`，在 `Build and deployment → Source` 选择 **GitHub Actions**。
5. 打开 `Settings → Actions → General`，确认 Actions 已启用。
6. 首次 push 后，`Deploy website to GitHub Pages` 工作流会自动部署。
7. 定时数据更新完成后，部署工作流会再次读取最新 `main` 并发布。

典型网址：
`https://你的GitHub用户名.github.io/peripheral-db/`

如果自动更新工作流需要向仓库提交 `data/products.json`，请确认仓库允许工作流写入内容。
