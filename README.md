<div align="center">

# 🏙️ Map & Building 3D

**基于 ECharts-GL 与 Mapbox 的城市级 3D 建筑与道路流光可视化系统**

*涵盖高德地图 AOI 建筑轮廓与路网数据提取、GeoJSON 转换、PBR 逼真材质渲染与现代化 HUD 实时交互控制*

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="license">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18.0.0-brightgreen.svg?style=flat-square" alt="node">
  <img src="https://img.shields.io/badge/ECharts-GL-orange.svg?style=flat-square" alt="echarts-gl">
  <img src="https://img.shields.io/badge/Mapbox-GL-00f0ff.svg?style=flat-square" alt="mapbox-gl">
  <img src="https://img.shields.io/badge/Dependencies-Zero%20Runtime-success.svg?style=flat-square" alt="zero-deps">
</p>

</div>

---

## 📖 项目简介

**Map & Building** 是一个轻量、高效且炫酷的数字孪生 / 智慧城市 3D 地图可视化开源项目。

项目结合了 **ECharts-GL** 的 3D 渲染能力与 **Mapbox GL** 的地理底图瓦片能力，通过 Node.js 数据抓取脚本从地图服务商获取特定区域的 POI / AOI（建筑轮廓面）与道路线段数据，转换为标准 GeoJSON，并在前端实现**建筑物三维拔高（3D Extrusion）**、**真实感物理材质（PBR）**、**道路动态流光（Lines3D）**以及**现代化赛博朋克 HUD 控制中心**。

> 💡 **v1.1.0 升级亮点**：
> - 🚀 **彻底重构为零外部依赖**：移除已废弃的 `request` 库与前端 `jQuery`，全部采用 Node.js 18+ 及浏览器原生 `fetch`。
> - 🎛️ **新增现代化 HUD 悬浮控制面板**：支持 4 套赛博朋克科技主题切换、建筑高度/材质参数实时调节、道路流光速度与拖尾控制、镜头 360° 自动巡航与视角切换。
> - 📂 **支持动态导入自定义 GeoJSON**：无需刷新页面即可在浏览器中即时渲染任意城市的 GeoJSON 数据。
> - 🛠️ **模块化数据爬取脚本**：支持 CLI 参数与配置文件，轻松抓取全国任意城市的建筑与道路数据。

---

## ✨ 核心特性

- 🏢 **3D 建筑体挤出与 PBR 材质**：支持基于 AOI 真实建筑多边形的三维拉伸，结合环境贴图（HDR CubeMap）、金属度（Metalness）、粗糙度（Roughness）与屏幕空间环境光遮蔽（SSAO），呈现电影级质感。
- ⚡ **道路动态粒子流光**：基于 `lines3D` 特效引擎，模拟城市交通脉络的流动光效，支持自由调节流动速度、拖尾长度与发光强度。
- 🎨 **多款酷炫科技主题一键切换**：
  - 🌆 **赛博朋克 (Cyberpunk)**：霓虹玫红建筑搭配青蓝流光
  - 🌌 **暗黑科技 (Dark Tech)**：深邃幽蓝与极光绿交织
  - 👑 **黄金之城 (Gold Luxury)**：奢华流金质感与暖黄流光
  - 🌅 **落日余晖 (Sunset Glow)**：晚霞赤红与暖橙光效
- 🎥 **全方位镜头巡航与视角预设**：支持 360° 自动旋转巡航、正俯视全景、斜角透视及低空街景快速切换。
- 📊 **实时场景数据 HUD 监控**：显示建筑要素数、道路线段数、中心坐标等关键信息。
- 📡 **开箱即用、零环境负担**：纯原生 JS 实现，不依赖复杂的打包构建工具。

---

## 🚀 极速上手

### 1. 克隆代码仓库
```bash
git clone https://github.com/hopkinson/mapandbuilding.git
cd mapandbuilding
```

### 2. 启动本地静态服务器
由于浏览器加载本地 GeoJSON 及 HDR 环境贴图时受同源策略（CORS）限制，需通过 HTTP 服务访问：

```bash
# 方式 1：使用 npm 脚本 (推荐，无需全局安装)
npm start

# 方式 2：使用 npx 快速启动
npx serve . -p 8080

# 方式 3：使用 Python 自带服务器
python -m http.server 8080
```

### 3. 浏览器访问
在浏览器中打开：**`http://localhost:8080`** 即可立即体验 3D 城市可视化效果！

---

## 🛠️ 自定义城市数据抓取与生成

本项目内置了广州市南沙区的示例数据（`map.geojson` 和 `road.geojson`）。如果你想抓取自己所在城市或其他区域的建筑与道路数据，可以使用重构后的抓取工具：

### 快速执行抓取

```bash
# 使用默认配置抓取
npm run crawl

# 查看所有支持的命令行参数
node index.js --help
```

### 命令行参数说明

| 参数 | 说明 | 示例 |
| :--- | :--- | :--- |
| `--district <name>` | 指定目标行政区名称 | `--district "海淀区"` |
| `--city <code>` | 指定城市名称或城市行政编码 | `--city "110000"` 或 `--city "北京"` |
| `--concurrency <num>`| 设置并发请求数（防止被风控） | `--concurrency 3` |
| `--key <apikey>` | 使用高德开放平台 Web 服务 API Key | `--key "YOUR_KEY"` |
| `--dry-run` | 仅测试抓取前几个关键词，不写入本地文件 | `--dry-run` |

### 配置文件 `config.js` 自定义

你也可以直接编辑根目录下的 [`config.js`](file:///d:/fork/mapandbuilding/config.js) 文件，自定义需要抓取的搜索关键词、经纬度包围盒（Bounding Box）以及输出路径：

```javascript
module.exports = {
  district: '南沙区',
  city: '440100', // 广州市代码
  
  // 经纬度包围盒: minLng|minLat|maxLng|maxLat
  geoobj: '113.22766|22.807345|113.722045|22.908896',
  
  // 并发请求限制
  concurrency: 3,
  
  // 建筑物关键词列表 (用于获取 AOI 轮廓)
  searchBuildings: ['小区', '写字楼', '商场', '医院', '学校', '政府', '广场', ...],
  
  // 道路路网关键词列表
  searchRoads: ['进港大道', '凤凰大道', '道路', '公路', '街道', ...]
};
```

---

## 📂 项目结构

```text
mapandbuilding/
├── index.html                 # 3D 可视化主页面 (含现代化 HUD 控制面板)
├── index.js                   # 数据抓取与 GeoJSON 转换脚本 (Node.js 18+ 原生)
├── config.js                  # 城市区域与数据爬取配置文件
├── package.json               # 项目包配置与脚本指令
├── map.geojson                # 建筑多边形 GeoJSON 数据 (示例)
├── road.geojson               # 道路路线 GeoJSON 数据 (示例)
├── echarts-gl.min.js          # ECharts-GL 扩展库
├── ambientCubemapTexture.hdr   # PBR 渲染所需环境全景 HDR 贴图
├── LICENSE                    # MIT 开源许可证
└── README.md                  # 项目说明文档
```

---

## 🎛️ HUD 面板交互功能

| 模块 | 功能说明 |
| :--- | :--- |
| **🎨 主题预设** | 赛博朋克、暗黑科技、黄金之城、落日余晖 4 款预设配色，实时响应 |
| **🏢 建筑模型** | 建筑显隐开关、高度缩放倍率（0.2x ~ 3.0x）、金属度与粗糙度滑块 |
| **🚗 道路流光** | 流光显隐开关、流动速度调节、尾迹长度与光斑粗细设置 |
| **🎥 镜头控制** | 360° 自动巡航开关、斜角全景 / 正俯视 / 低空街景一键视角定位 |
| **📊 数据统计** | 实时显示当前加载的建筑要素多边形总数与道路路线总数 |
| **📂 动态导入** | 点击导入本地自定义 `.geojson` 文件，即刻热重载 3D 场景 |

---

## ❓ 常见问题 (FAQ)

<details>
<summary><b>Q1: 为什么直接双击打开 <code>index.html</code> 页面是空白的？</b></summary>

**A**: 浏览器的 WebGL 和 Fetch API 受同源安全策略（CORS）限制，不允许通过 `file://` 协议直接加载本地的 `map.geojson` 和 `.hdr` 贴图。请务必使用本地静态服务器打开（例如运行 `npm start` 或 `npx serve .` 后访问 `http://localhost:8080`）。
</details>

<details>
<summary><b>Q2: 如何使用我自己的 Mapbox Access Token 和自定义地图样式？</b></summary>

**A**: 项目已内置默认可用的公开 Token。如果你需要使用自己 Mapbox 账号下的私有样式，可在 `index.html` 的 JavaScript 代码顶部修改：
```javascript
const DEFAULT_MAPBOX_TOKEN = 'your_mapbox_token_here';
const DEFAULT_MAPBOX_STYLE = 'mapbox://styles/your_username/your_style_id';
```
</details>

<details>
<summary><b>Q3: 爬虫运行提示 "高德接口返回了 HTML 页面" 或触发风控怎么办？</b></summary>

**A**: 高德 Web 网页端接口对频繁请求有反爬防护机制。建议：
1. 调小 `config.js` 中的并发数 `concurrency: 1` 或适当增加请求间隔。
2. 或在 [高德开放平台](https://lbs.amap.com/) 免费申请一个 **Web 服务 API Key**，使用官方规范接口获取数据。
</details>

---

## 📄 开源许可证

本项目采用 [MIT License](file:///d:/fork/mapandbuilding/LICENSE) 协议开源，欢迎自由使用、修改与二开。

⭐ 如果这个项目对你的数据可视化或三维地图开发有所启发，欢迎给个 **Star** 支持一下！
