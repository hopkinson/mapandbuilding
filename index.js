/**
 * @file index.js
 * @description 城市 3D 建筑与道路数据抓取及 GeoJSON 转换脚本 (零外部依赖，使用 Node 18+ 原生 fetch)
 * @author hopkinson
 * @version 1.1.0
 */

const fs = require('fs');
const path = require('path');
let config = require('./config.js');

// 控制台彩色输出辅助函数
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.magenta}=== ${msg} ===${colors.reset}\n`)
};

// 解析命令行参数
function parseCliArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
      options.help = true;
    } else if (args[i] === '--district' && args[i + 1]) {
      options.district = args[++i];
    } else if (args[i] === '--city' && args[i + 1]) {
      options.city = args[++i];
    } else if (args[i] === '--key' && args[i + 1]) {
      options.amapApiKey = args[++i];
    } else if (args[i] === '--concurrency' && args[i + 1]) {
      options.concurrency = parseInt(args[++i], 10);
    } else if (args[i] === '--dry-run') {
      options.dryRun = true;
    }
  }
  return options;
}

// 打印帮助文档
function printHelp() {
  console.log(`
${colors.bright}MapAndBuilding - 城市 3D 建筑与道路数据提取工具${colors.reset}

${colors.yellow}用法:${colors.reset}
  node index.js [选项]

${colors.yellow}选项:${colors.reset}
  --help, -h             显示帮助信息
  --district <名称>      指定行政区名称 (例如: "南沙区"、"海淀区"、"浦东新区")
  --city <编码/名称>     指定城市代码或城市名 (例如: "440100" 或 "广州")
  --key <apikey>         使用高德开放平台 Web 服务 API Key 抓取
  --concurrency <数量>   设置最大并发请求数 (默认: 3)
  --dry-run              仅测试抓取前几个关键词，不写入文件

${colors.yellow}示例:${colors.reset}
  node index.js
  node index.js --district "天河区" --city "440100"
  node index.js --key "YOUR_AMAP_WEB_KEY"
`);
}

// 简易并发控制器
async function asyncPool(limit, array, iteratorFn) {
  const results = [];
  const executing = new Set();
  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    results.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

// 请求带超时的原生 fetch 包装
async function fetchWithTimeout(url, headers = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://ditu.amap.com/',
        ...headers
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// 1. 通过高德开放平台官方 Web 服务 API 抓取 POI 数据
async function fetchOfficialAmapPoi(keyword, city, apiKey, timeout) {
  const apiUrl = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(keyword)}&city=${encodeURIComponent(city)}&offset=50&page=1&key=${encodeURIComponent(apiKey)}&extensions=all&output=json`;

  try {
    const res = await fetchWithTimeout(apiUrl, {}, timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== '1') {
      throw new Error(`高德官方 API 错误: ${data.info || '未知原因'}`);
    }
    // 转换官方 POI 格式以兼容下游格式
    return (data.pois || []).map(p => {
      const [lng, lat] = (p.location || '').split(',');
      return {
        name: p.name,
        longitude: lng,
        latitude: lat,
        domain_list: []
      };
    });
  } catch (err) {
    log.warn(`官方 API 关键词 [${keyword}] 抓取失败: ${err.message}`);
    return [];
  }
}

// 2. 通过高德网页端接口抓取 POI 及 AOI 建筑轮廓数据
async function fetchWebAmapPoi(keyword, district, city, geoobj, timeout) {
  const queryUrl = `https://ditu.amap.com/service/poiInfo?query_type=TQUERY&pagesize=45&pagenum=1&qii=true&cluster_state=5&need_utd=true&utd_sceneid=1000&div=PC1000&addr_poi_merge=true&is_classify=true&zoom=12&city=${encodeURIComponent(city)}&geoobj=${encodeURIComponent(geoobj)}&_src=around&keywords=${encodeURIComponent(district + ' ' + keyword)}`;

  try {
    const res = await fetchWithTimeout(queryUrl, {}, timeout);
    if (!res.ok) {
      throw new Error(`HTTP 状态码异常: ${res.status}`);
    }
    const text = await res.text();
    // 验证返回是否为 JSON
    if (text.trim().startsWith('<')) {
      throw new Error('网页接口触发了反爬保护，建议使用 --key 参数配置高德开放平台 API Key');
    }
    const data = JSON.parse(text);
    return data?.data?.poi_list || [];
  } catch (err) {
    log.warn(`关键词 [${keyword}] 抓取失败: ${err.message}`);
    return [];
  }
}

// 统一数据抓取入口
async function fetchPoiData(keyword, district, city, geoobj, apiKey, timeout) {
  if (apiKey) {
    return await fetchOfficialAmapPoi(district ? `${district} ${keyword}` : keyword, city, apiKey, timeout);
  } else {
    return await fetchWebAmapPoi(keyword, district, city, geoobj, timeout);
  }
}

// 将 POI 数据解析为 3D 建筑 GeoJSON Polygon 特性
function convertPoiToGeoJsonFeatures(poiList, radius = 0.001) {
  const features = [];
  for (const item of poiList) {
    if (!item || !item.name) continue;

    const domainList = Array.isArray(item.domain_list) ? item.domain_list : [];
    const aoiDomain = domainList.find(i => i.name === 'aoi');

    let coordinates;
    if (aoiDomain && aoiDomain.value) {
      // 高德 AOI 多边形经纬度格式："lng1,lat1_lng2,lat2_..."
      const points = aoiDomain.value.split('_').map(pt => {
        const coords = pt.split(',').map(n => Number(n.trim()));
        return coords;
      });
      // 确保多边形闭合
      if (points.length > 0) {
        const first = points[0];
        const last = points[points.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          points.push([...first]);
        }
        coordinates = [points];
      }
    }

    // 若无 AOI 轮廓，则根据中心坐标生成一个标准方块轮廓
    if (!coordinates && item.longitude && item.latitude) {
      const lng = Number(item.longitude);
      const lat = Number(item.latitude);
      const po1 = [lng + radius, lat];
      const po2 = [lng, lat + radius];
      const po3 = [lng - radius, lat];
      const po4 = [lng, lat - radius];
      coordinates = [[po1, po2, po3, po4, po1]];
    }

    if (coordinates) {
      features.push({
        type: 'Feature',
        properties: {
          name: item.name,
          stroke: '#555555',
          'stroke-width': 2,
          'stroke-opacity': 1,
          fill: '#555555',
          'fill-opacity': 0.5,
          height: Math.floor(Math.random() * 800) + 200 // 默认高度区间
        },
        geometry: {
          type: 'Polygon',
          coordinates: coordinates
        }
      });
    }
  }
  return features;
}

// 将道路 POI 数据转换为道路经纬度序列
function convertRoadPoiToRoutes(poiList) {
  const routes = [];
  for (const item of poiList) {
    if (!item) continue;
    const domainList = Array.isArray(item.domain_list) ? item.domain_list : [];
    const roadDomain = domainList.find(i => i.name === 'roadaoi' && i.value);
    if (roadDomain && roadDomain.value) {
      routes.push(roadDomain.value);
    }
  }
  return routes;
}

// 主执行函数
async function main() {
  const cliOptions = parseCliArgs();
  if (cliOptions.help) {
    printHelp();
    return;
  }

  // 合并 CLI 参数至配置
  config = { ...config, ...cliOptions };

  log.header('MapAndBuilding 数据抓取与转换工具');
  log.info(`目标城市: ${config.city}`);
  log.info(`目标行政区: ${config.district}`);
  log.info(`检索范围 (BBox): ${config.geoobj}`);
  log.info(`并发请求数: ${config.concurrency}`);

  const startTime = Date.now();

  // 1. 抓取建筑数据
  log.info(`\n[1/2] 开始抓取建筑/POI 数据 (${config.searchBuildings.length} 个关键词)...`);
  let buildingCount = 0;
  const buildingFeaturesList = await asyncPool(
    config.concurrency,
    config.searchBuildings,
    async (keyword) => {
      process.stdout.write(`  -> 正在抓取: ${keyword.padEnd(10, ' ')} `);
      const poiList = await fetchPoiData(keyword, config.district, config.city, config.geoobj, config.amapApiKey, config.timeout);
      const features = convertPoiToGeoJsonFeatures(poiList, config.defaultPolygonRadius);
      buildingCount += features.length;
      console.log(`${colors.green}✓ 获取到 ${features.length} 条建筑轮廓${colors.reset}`);
      return features;
    }
  );

  const allBuildingFeatures = [].concat(...buildingFeaturesList);
  const mapGeoJson = {
    type: 'FeatureCollection',
    features: allBuildingFeatures
  };

  // 2. 抓取道路数据
  log.info(`\n[2/2] 开始抓取道路路网数据 (${config.searchRoads.length} 个关键词)...`);
  let roadCount = 0;
  const roadRoutesList = await asyncPool(
    config.concurrency,
    config.searchRoads,
    async (keyword) => {
      process.stdout.write(`  -> 正在抓取: ${keyword.padEnd(10, ' ')} `);
      const poiList = await fetchPoiData(keyword, config.district, config.city, config.geoobj, config.amapApiKey, config.timeout);
      const routes = convertRoadPoiToRoutes(poiList);
      roadCount += routes.length;
      console.log(`${colors.green}✓ 获取到 ${routes.length} 条道路线${colors.reset}`);
      return routes;
    }
  );

  const allRoadRoutes = [].concat(...roadRoutesList);

  if (cliOptions.dryRun) {
    log.warn('检测到 --dry-run 参数，跳过写入本地文件。');
    return;
  }

  // 3. 写入文件
  log.info('\n正在保存 GeoJSON 数据文件...');

  const mapPath = path.resolve(__dirname, config.output.mapGeoJson);
  const roadPath = path.resolve(__dirname, config.output.roadGeoJson);

  if (allBuildingFeatures.length > 0) {
    fs.writeFileSync(mapPath, JSON.stringify(mapGeoJson), 'utf8');
    log.success(`成功生成建筑 GeoJSON: ${mapPath} (共 ${allBuildingFeatures.length} 栋建筑)`);
  } else {
    log.warn(`未抓取到有效建筑数据，保留已有 ${config.output.mapGeoJson}`);
  }

  if (allRoadRoutes.length > 0) {
    fs.writeFileSync(roadPath, JSON.stringify(allRoadRoutes), 'utf8');
    log.success(`成功生成道路 GeoJSON: ${roadPath} (共 ${allRoadRoutes.length} 条路段)`);
  } else {
    log.warn(`未抓取到有效道路数据，保留已有 ${config.output.roadGeoJson}`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  log.header(`全部处理完成！耗时: ${duration}s`);
  log.info(`提示：运行 "npm start" 或 "npx serve ." 可立即在浏览器中预览 3D 可视化效果。`);
}

// 运行
if (require.main === module) {
  main().catch(err => {
    log.error(`运行异常: ${err.stack || err.message}`);
    process.exit(1);
  });
}

module.exports = {
  convertPoiToGeoJsonFeatures,
  convertRoadPoiToRoutes,
  fetchPoiData
};
