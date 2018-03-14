/**
 * @Date:   2018-03-06T15:47:04+08:00
 * @Last modified time: 2018-03-08T09:16:42+08:00
 */
var request = require('request')
var fs = require('fs')
let arr = []
let arrRoad = []
let search = [
  '小区',
  // '公园',
  '医院',
  '广场',
  '美食',
  '商场',
  '写字楼',
  '楼盘',
  '酒店',
  '地铁',
  // '景点',
  '政府',
  '学校',
  '酒吧',
  '局',
  '路',
  '进港大道',
  '凤凰大道',
  '海滨路',
  '道路',
  '公路',
  '海景路',
  '市南大道',
  '进港大道',
  '银华街',
  '蕉门路',
  '金蕉大道',
  '黄阁南路',
  '建设一路',
  '建设三路',
  '蕉西路',
  '蕉港路',
  '江灵北路',
  '江灵南路',
  '合兴路',
  '珠江大道',
  '美德一路',
  '新塘公路',
  '上聚安路',
  '同安东围路',
  '务安围路',
  '红莲路',
  '工业路',
  '街道'
]
let searchRoad = [
  '进港大道',
  '凤凰大道',
  '海滨路',
  '道路',
  '公路',
  '海景路',
  '市南大道',
  '进港大道',
  '银华街',
  '蕉门路',
  '金蕉大道',
  '黄阁南路',
  '建设一路',
  '建设三路',
  '蕉西路',
  '蕉港路',
  '江灵北路',
  '江灵南路',
  '合兴路',
  '珠江大道',
  '美德一路',
  '街道',
  '新塘公路',
  '上聚安路',
  '同安东围路',
  '务安围路',
  '红莲路',
  '工业路'
]
let district = '南沙区 '
let LENGTH = 0.001

let url = 'https://ditu.amap.com/service/poiInfo?query_type=TQUERY&pagesize=45&pagenum=1&qii=true&cluster_state=5&need_utd=true&utd_sceneid=1000&div=PC1000&addr_poi_merge=true&is_classify=true&zoom=12&city=440100&geoobj=113.22766%7C22.807345%7C113.722045%7C22.908896&_src=around&keywords='
search.forEach(keyword => {
  arr.push(new Promise(resolve => {
    request((url + encodeURI(district + keyword)), (error, response, body) => {
      if (!error && response.statusCode === 200) {
        let transBody = body && JSON.parse(body)
        let {data} = transBody
        let {poi_list} = data
        console.log(data)
        let regionData = poi_list.map(item => {
          let hasAoi = item.domain_list.find(i => i.name === 'aoi')
          let po1 = [
            Number(item.longitude) + LENGTH,
            item.latitude
          ]
          let po2 = [
            item.longitude,
            Number(item.latitude) + LENGTH
          ]
          let po3 = [
            Number(item.longitude) - LENGTH,
            item.latitude
          ]
          let po4 = [
            item.longitude,
            Number(item.latitude) - LENGTH
          ]
          return {
            name: item.name,
            coordinates: hasAoi.hasOwnProperty('value')
              ? [hasAoi.value.split('_').map(i => i.split(','))]
              : [
                [po1, po2, po3, po4, po1]
              ]
          }
        })
        let result = regionData.map(item => {
          return {
            'type': 'Feature',
            'properties': {
              'stroke': '#555555',
              'stroke-width': 2,
              'stroke-opacity': 1,
              'fill': '#555555',
              'fill-opacity': 0.5,
              'height': 10,
              'name': item.name
            },
            'geometry': {
              'type': 'Polygon',
              'coordinates': item.coordinates
            }
          }
        })
        resolve(result)
        // console.log(result.map(item => item.properties.name))
      }
    })
  }))
})
searchRoad.forEach(keyword => {
  arrRoad.push(new Promise(resolve => {
    request((url + encodeURI(district + keyword)), (error, response, body) => {
      if (!error && response.statusCode === 200) {
        let transBody = body && JSON.parse(body)
        let {data} = transBody
        let {poi_list} = data
        let hasCorPolygons = poi_list.map(item => item.domain_list.find(i => (i.name === 'roadaoi') && i.value)
          ? (item.domain_list.find(i => (i.name === 'roadaoi') && i.value)).value
          : '').filter(item => item)
        resolve(hasCorPolygons)
      }
    })
  }))
})
// 地区
Promise.all(arr).then(urls => {
  let geoJSON = {}
  geoJSON.type = 'FeatureCollection'
  geoJSON.features = [].concat(...urls)
  fs.unlink(__dirname + '/map.geojson', err => {
    if (err) {
      console.log(err)
      return false
    }
    fs.writeFile(__dirname + '/map.geojson', JSON.stringify(geoJSON), {
      flag: 'a'
    }, err => {
      if (err) {
        console.error(err)
      } else {
        console.log('写入成功')
      }
    })
  })
})

// 道路
Promise.all(arrRoad).then(urls => {
  fs.unlink(__dirname + '/road.geojson', err => {
    if (err) {
      console.log(err)
      return false
    }
    console.log(urls)
    fs.writeFile(__dirname + '/road.geojson', JSON.stringify(urls), {
      flag: 'a'
    }, err => {
      if (err) {
        console.error(err)
      } else {
        console.log('写入成功')
      }
    })
  })
})
