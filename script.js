const STORAGE_KEY = "province-leaflet-map.discovered.v1";

const regionMetadata = [
  ["110000", "beijing", "北京", "北京市", "直辖市", "北京", "华北", "#ffcad4"],
  ["120000", "tianjin", "天津", "天津市", "直辖市", "天津", "华北", "#ffc8dd"],
  ["130000", "hebei", "河北", "河北省", "省", "石家庄", "华北", "#fdffb6"],
  ["140000", "shanxi", "山西", "山西省", "省", "太原", "华北", "#bde0fe"],
  ["150000", "neimenggu", "内蒙古", "内蒙古自治区", "自治区", "呼和浩特", "华北", "#cdb4db"],
  ["210000", "liaoning", "辽宁", "辽宁省", "省", "沈阳", "东北", "#f28482"],
  ["220000", "jilin", "吉林", "吉林省", "省", "长春", "东北", "#84a59d"],
  ["230000", "heilongjiang", "黑龙江", "黑龙江省", "省", "哈尔滨", "东北", "#a3cef1"],
  ["310000", "shanghai", "上海", "上海市", "直辖市", "上海", "华东", "#ffafcc"],
  ["320000", "jiangsu", "江苏", "江苏省", "省", "南京", "华东", "#98f5e1"],
  ["330000", "zhejiang", "浙江", "浙江省", "省", "杭州", "华东", "#99d98c"],
  ["340000", "anhui", "安徽", "安徽省", "省", "合肥", "华东", "#bdb2ff"],
  ["350000", "fujian", "福建", "福建省", "省", "福州", "华东", "#ffb703"],
  ["360000", "jiangxi", "江西", "江西省", "省", "南昌", "华东", "#cdeac0"],
  ["370000", "shandong", "山东", "山东省", "省", "济南", "华东", "#80ed99"],
  ["410000", "henan", "河南", "河南省", "省", "郑州", "华中", "#f9c74f"],
  ["420000", "hubei", "湖北", "湖北省", "省", "武汉", "华中", "#ade8f4"],
  ["430000", "hunan", "湖南", "湖南省", "省", "长沙", "华中", "#ffddd2"],
  ["440000", "guangdong", "广东", "广东省", "省", "广州", "华南", "#fbc4ab"],
  ["450000", "guangxi", "广西", "广西壮族自治区", "自治区", "南宁", "华南", "#a9def9"],
  ["460000", "hainan", "海南", "海南省", "省", "海口", "华南", "#ffd6a5"],
  ["500000", "chongqing", "重庆", "重庆市", "直辖市", "重庆", "西南", "#f7a072"],
  ["510000", "sichuan", "四川", "四川省", "省", "成都", "西南", "#9bf6ff"],
  ["520000", "guizhou", "贵州", "贵州省", "省", "贵阳", "西南", "#d8f3dc"],
  ["530000", "yunnan", "云南", "云南省", "省", "昆明", "西南", "#b5e48c"],
  ["540000", "xizang", "西藏", "西藏自治区", "自治区", "拉萨", "西南", "#b7e4c7"],
  ["610000", "shaanxi", "陕西", "陕西省", "省", "西安", "西北", "#caffbf"],
  ["620000", "gansu", "甘肃", "甘肃省", "省", "兰州", "西北", "#ffd166"],
  ["630000", "qinghai", "青海", "青海省", "省", "西宁", "西北", "#90dbf4"],
  ["640000", "ningxia", "宁夏", "宁夏回族自治区", "自治区", "银川", "西北", "#f4a261"],
  ["650000", "xinjiang", "新疆", "新疆维吾尔自治区", "自治区", "乌鲁木齐", "西北", "#8ecae6"],
  ["710000", "taiwan", "台湾", "台湾省", "省", "台北", "华东", "#48cae4"],
  ["810000", "hongkong", "香港", "香港特别行政区", "特别行政区", "香港", "华南", "#ff99c8"],
  ["820000", "macau", "澳门", "澳门特别行政区", "特别行政区", "澳门", "华南", "#f1c0e8"],
];

const regions = regionMetadata.map(
  ([adcode, id, name, fullName, type, capital, zone, color]) => ({
    adcode,
    id,
    name,
    fullName,
    type,
    capital,
    zone,
    color,
  }),
);

const regionById = new Map(regions.map((region) => [region.id, region]));
const regionByAdcode = new Map(regions.map((region) => [region.adcode, region]));
const found = new Set(loadFound());
let activeId = null;
let challengeId = null;
let recent = [];
let map = null;
let provinceLayer = null;
let labelLayer = null;
const provinceLayers = new Map();
const labelMarkers = new Map();

const mapEl = document.querySelector("#map");
const foundCountEl = document.querySelector("#foundCount");
const completionRateEl = document.querySelector("#completionRate");
const provinceNameEl = document.querySelector("#provinceName");
const provinceTypeEl = document.querySelector("#provinceType");
const provinceZoneEl = document.querySelector("#provinceZone");
const provinceCapitalEl = document.querySelector("#provinceCapital");
const challengeTargetEl = document.querySelector("#challengeTarget");
const challengeFeedbackEl = document.querySelector("#challengeFeedback");
const challengeButtonEl = document.querySelector("#challengeButton");
const resetButtonEl = document.querySelector("#resetButton");
const recentListEl = document.querySelector("#recentList");

renderMap();
updateUi();

challengeButtonEl.addEventListener("click", startChallenge);
resetButtonEl.addEventListener("click", resetGame);

function loadFound() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(stored)
      ? stored.filter((id) => regionById.has(id))
      : [];
  } catch {
    return [];
  }
}

function saveFound() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...found]));
}

function renderMap() {
  const geoData = window.CHINA_GEOJSON;
  if (!window.L || !geoData?.features?.length) {
    mapEl.textContent = "地图数据加载失败";
    return;
  }

  map = L.map(mapEl, {
    attributionControl: false,
    center: [35.5, 104],
    maxZoom: 8,
    minZoom: 3,
    preferCanvas: false,
    scrollWheelZoom: true,
    touchZoom: true,
    zoomControl: true,
    zoom: 4,
    zoomSnap: 0.25,
  });

  const namedFeatures = geoData.features.filter((feature) => feature.properties?.name);
  const decorationFeatures = geoData.features.filter((feature) => !feature.properties?.name);

  L.geoJSON(
    {
      type: "FeatureCollection",
      features: decorationFeatures,
    },
    {
      interactive: false,
      style: {
        color: "rgba(24, 32, 44, 0.32)",
        fillOpacity: 0,
        weight: 1,
      },
    },
  ).addTo(map);

  provinceLayer = L.geoJSON(
    {
      type: "FeatureCollection",
      features: namedFeatures,
    },
    {
      style: (feature) => getProvinceStyle(getRegionByFeature(feature)),
      onEachFeature,
    },
  ).addTo(map);

  labelLayer = L.layerGroup().addTo(map);
  const bounds = provinceLayer.getBounds();
  map.fitBounds(bounds, { padding: [18, 18] });
  map.setMaxBounds(bounds.pad(0.18));
  setTimeout(() => map.invalidateSize(), 0);
}

function onEachFeature(feature, layer) {
  const region = getRegionByFeature(feature);
  if (!region) return;

  provinceLayers.set(region.id, layer);
  layer.on({
    click: () => selectRegion(region.id),
    mouseover: () => {
      layer.setStyle(getHoverStyle(region));
      layer.bringToFront();
    },
    mouseout: () => updateMapState(),
    add: () => {
      const element = layer.getElement();
      if (!element) return;
      element.setAttribute("role", "button");
      element.setAttribute("tabindex", "0");
      element.setAttribute("aria-label", region.fullName);
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectRegion(region.id);
        }
      });
    },
  });

  addLabelMarker(region, feature);
  addSmallRegionHitArea(region, feature);
}

function addLabelMarker(region, feature) {
  const point = feature.properties?.centroid || feature.properties?.center;
  if (!point) return;

  const marker = L.marker(toLatLng(point), {
    interactive: false,
    keyboard: false,
    icon: L.divIcon({
      className: "province-label-icon",
      html: `<span>${region.name}</span>`,
      iconAnchor: [0, 0],
    }),
    zIndexOffset: 1000,
  });
  labelMarkers.set(region.id, marker);
}

function addSmallRegionHitArea(region, feature) {
  const radius = {
    beijing: 13,
    tianjin: 13,
    shanghai: 13,
    hongkong: 15,
    macau: 18,
  }[region.id];
  const point = feature.properties?.centroid || feature.properties?.center;
  if (!radius || !point) return;

  L.circleMarker(toLatLng(point), {
    bubblingMouseEvents: false,
    color: "transparent",
    fillColor: "transparent",
    fillOpacity: 0,
    interactive: true,
    opacity: 0,
    radius,
    weight: 0,
  })
    .on("click", () => selectRegion(region.id))
    .addTo(map);
}

function getRegionByFeature(feature) {
  return regionByAdcode.get(String(feature.properties?.adcode || ""));
}

function toLatLng([lng, lat]) {
  return [lat, lng];
}

function getProvinceStyle(region) {
  const isActive = region.id === activeId;
  const isTarget = region.id === challengeId;
  const isFound = found.has(region.id);

  return {
    className: "province-shape",
    color: isActive ? "#111827" : "rgba(24, 32, 44, 0.52)",
    dashArray: isTarget ? "7 5" : null,
    fillColor: region.color,
    fillOpacity: isActive ? 0.98 : isFound ? 0.9 : 0.62,
    lineCap: "round",
    lineJoin: "round",
    opacity: 1,
    weight: isActive ? 2.8 : isTarget ? 2.2 : 1.3,
  };
}

function getHoverStyle(region) {
  const base = getProvinceStyle(region);
  return {
    ...base,
    color: "#111827",
    fillOpacity: Math.max(base.fillOpacity, 0.84),
    weight: Math.max(base.weight, 2.4),
  };
}

function selectRegion(id) {
  const region = regionById.get(id);
  if (!region) return;

  const wasNew = !found.has(id);
  found.add(id);
  activeId = id;
  recent = [id, ...recent.filter((recentId) => recentId !== id)].slice(0, 5);

  if (challengeId) {
    if (challengeId === id) {
      challengeFeedbackEl.textContent = `正确：${region.fullName}`;
      challengeFeedbackEl.className = "feedback good";
      challengeId = null;
      challengeTargetEl.textContent = "已完成";
    } else {
      const target = regionById.get(challengeId);
      challengeFeedbackEl.textContent = `点到的是${region.name}，目标是${target.name}`;
      challengeFeedbackEl.className = "feedback warn";
    }
  } else if (wasNew && found.size === regions.length) {
    challengeFeedbackEl.textContent = "全部发现完成";
    challengeFeedbackEl.className = "feedback good";
  } else if (wasNew) {
    challengeFeedbackEl.textContent = `发现：${region.fullName}`;
    challengeFeedbackEl.className = "feedback good";
  } else {
    challengeFeedbackEl.textContent = `当前：${region.fullName}`;
    challengeFeedbackEl.className = "feedback";
  }

  saveFound();
  updateUi();
}

function startChallenge() {
  const pool = regions.filter((region) => region.id !== activeId);
  const target = pool[Math.floor(Math.random() * pool.length)] || regions[0];
  challengeId = target.id;
  challengeTargetEl.textContent = target.fullName;
  challengeFeedbackEl.textContent = " ";
  challengeFeedbackEl.className = "feedback";
  updateMapState();
}

function resetGame() {
  found.clear();
  activeId = null;
  challengeId = null;
  recent = [];
  challengeTargetEl.textContent = "未开始";
  challengeFeedbackEl.textContent = " ";
  challengeFeedbackEl.className = "feedback";
  saveFound();
  updateUi();
}

function updateUi() {
  const active = activeId ? regionById.get(activeId) : null;
  foundCountEl.textContent = `${found.size}/${regions.length}`;
  completionRateEl.textContent = `${Math.round((found.size / regions.length) * 100)}%`;

  provinceNameEl.textContent = active ? active.fullName : "尚未选择";
  provinceTypeEl.textContent = active ? active.type : "-";
  provinceZoneEl.textContent = active ? active.zone : "-";
  provinceCapitalEl.textContent = active ? active.capital : "-";

  renderRecent();
  updateMapState();
}

function updateMapState() {
  provinceLayers.forEach((layer, id) => {
    const region = regionById.get(id);
    layer.setStyle(getProvinceStyle(region));
    if (id === activeId) layer.bringToFront();
  });

  labelLayer.clearLayers();
  labelMarkers.forEach((marker, id) => {
    if (found.has(id) || id === activeId) {
      marker.addTo(labelLayer);
    }
  });
}

function renderRecent() {
  if (recent.length === 0) {
    const item = document.createElement("li");
    item.className = "empty";
    item.textContent = "暂无记录";
    recentListEl.replaceChildren(item);
    return;
  }

  const items = recent.map((id) => {
    const region = regionById.get(id);
    const item = document.createElement("li");
    item.innerHTML = `<span>${region.name}</span><small>${region.zone}</small>`;
    return item;
  });
  recentListEl.replaceChildren(...items);
}
