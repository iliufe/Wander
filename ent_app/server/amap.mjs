const defaultAmapBaseUrl = "https://restapi.amap.com/v3";

export function getAmapConfig() {
  return {
    key: process.env.AMAP_WEB_SERVICE_KEY || process.env.AMAP_KEY || "",
    baseUrl: (process.env.AMAP_BASE_URL || defaultAmapBaseUrl).replace(/\/+$/, ""),
  };
}

export async function reverseGeocodeWithAmap(coordinates, config = getAmapConfig()) {
  const payload = await amapRequest(
    "/geocode/regeo",
    {
      location: `${coordinates.longitude},${coordinates.latitude}`,
      extensions: "all",
      radius: "120",
      batch: "false",
      roadlevel: "0",
    },
    config
  );

  const regeocode = payload?.regeocode ?? {};
  const addressComponent = regeocode.addressComponent ?? {};
  const firstPoi = Array.isArray(regeocode.pois) ? regeocode.pois[0] ?? null : null;
  const firstRoad = Array.isArray(regeocode.roads) ? regeocode.roads[0] ?? null : null;
  const firstAoi = Array.isArray(regeocode.aois) ? regeocode.aois[0] ?? null : null;
  const buildingName = addressComponent?.building?.name || "";
  const cityName = pickFirstText(addressComponent.city, addressComponent.township, addressComponent.district);
  const districtName = pickFirstText(addressComponent.district, addressComponent.township, cityName);
  const aoiName = typeof firstAoi?.name === "string" ? firstAoi.name.trim() : "";
  const poiName = typeof firstPoi?.name === "string" ? firstPoi.name.trim() : "";
  const roadName = typeof firstRoad?.name === "string" ? firstRoad.name.trim() : "";
  const nearbyPlaceName =
    pickCampusLikeName(aoiName, buildingName, poiName) ||
    pickFirstText(
      aoiName,
      buildingName,
      poiName,
      roadName,
      districtName,
      cityName,
      "Current area"
    );

  return {
    nearbyPlaceName,
    formattedAddress:
      regeocode.formatted_address ||
      compactJoin([
        cityName,
        districtName,
        addressComponent?.township,
        addressComponent?.streetNumber?.street,
        addressComponent?.streetNumber?.number,
      ]) ||
      nearbyPlaceName,
    cityName: cityName || null,
    districtName: districtName || null,
    adcode: addressComponent.adcode || firstPoi?.adcode || null,
    aoiName: aoiName || null,
    poiName: poiName || null,
    buildingName: buildingName || null,
    roadName: roadName || null,
  };
}

export async function fetchWeatherWithAmap(adcode, config = getAmapConfig()) {
  if (!adcode) {
    return null;
  }

  const payload = await amapRequest(
    "/weather/weatherInfo",
    {
      city: adcode,
      extensions: "base",
    },
    config
  );

  const live = Array.isArray(payload?.lives) ? payload.lives[0] ?? null : null;
  if (!live) {
    return null;
  }

  const weatherText = typeof live.weather === "string" ? live.weather.trim() : "";
  return {
    weatherText: weatherText || null,
    weatherMode: /雨|snow|storm|shower/i.test(weatherText) ? "rain" : "clear",
    temperature: typeof live.temperature === "string" ? live.temperature : null,
    reportTime: typeof live.reporttime === "string" ? live.reporttime : null,
  };
}

export async function searchPlacesWithAmap(
  {
    keywords,
    coordinates,
    radiusMeters,
    city,
    pageSize = 12,
  },
  config = getAmapConfig()
) {
  const trimmedKeywords = keywords.trim();
  if (!trimmedKeywords) {
    return [];
  }

  const aroundPromise = amapRequest(
    "/place/around",
    {
      location: `${coordinates.longitude},${coordinates.latitude}`,
      keywords: trimmedKeywords,
      radius: String(Math.max(500, Math.min(15000, Math.round(radiusMeters)))),
      sortrule: "distance",
      offset: String(pageSize),
      page: "1",
      extensions: "all",
    },
    config
  ).catch(() => null);

  const textPromise = amapRequest(
    "/place/text",
    {
      keywords: trimmedKeywords,
      city: city || "",
      citylimit: city ? "true" : "false",
      offset: String(pageSize),
      page: "1",
      extensions: "all",
    },
    config
  ).catch(() => null);

  const [aroundPayload, textPayload] = await Promise.all([aroundPromise, textPromise]);
  const rawPois = [
    ...(Array.isArray(aroundPayload?.pois) ? aroundPayload.pois : []),
    ...(Array.isArray(textPayload?.pois) ? textPayload.pois : []),
  ];

  const deduped = new Map();
  rawPois.forEach((poi) => {
    const normalized = normalizeAmapPoi(poi, coordinates);
    if (!normalized) {
      return;
    }

    const existing = deduped.get(normalized.id);
    if (!existing || existing.distanceMeters > normalized.distanceMeters) {
      deduped.set(normalized.id, normalized);
    }
  });

  return [...deduped.values()];
}

export async function fetchWalkingRouteFromAmap(
  origin,
  destination,
  config = getAmapConfig()
) {
  const payload = await amapRequest(
    "/direction/walking",
    {
      origin: `${origin.longitude},${origin.latitude}`,
      destination: `${destination.longitude},${destination.latitude}`,
    },
    config
  );

  const path = Array.isArray(payload?.route?.paths) ? payload.route.paths[0] ?? null : null;
  if (!path) {
    throw new Error("AMap walking route returned no path");
  }

  const geometry = [];
  const pushCoordinate = (coordinate) => {
    const last = geometry[geometry.length - 1];
    if (!last || last[0] !== coordinate[0] || last[1] !== coordinate[1]) {
      geometry.push(coordinate);
    }
  };

  const steps = Array.isArray(path.steps) ? path.steps : [];
  steps.forEach((step) => {
    const polyline = typeof step.polyline === "string" ? step.polyline : "";
    polyline
      .split(";")
      .map((point) => point.split(",").map((value) => Number(value)))
      .filter((point) => point.length === 2 && point.every((value) => Number.isFinite(value)))
      .forEach((point) => pushCoordinate([point[0], point[1]]));
  });

  if (!geometry.length) {
    pushCoordinate([origin.longitude, origin.latitude]);
    pushCoordinate([destination.longitude, destination.latitude]);
  }

  return {
    distanceMeters: toNumber(path.distance) ?? distanceMetersBetween(origin, destination),
    durationMinutes: Math.max(
      1,
      Math.round(
        toNumber(path.duration) != null
          ? toNumber(path.duration) / 60
          : distanceMetersBetween(origin, destination) / 76
      )
    ),
    geometry,
  };
}

export async function fetchDrivingRouteFromAmap(
  origin,
  destination,
  config = getAmapConfig()
) {
  const payload = await amapRequest(
    "/direction/driving",
    {
      origin: `${origin.longitude},${origin.latitude}`,
      destination: `${destination.longitude},${destination.latitude}`,
      strategy: "0",
      extensions: "base",
    },
    config
  );

  const path = Array.isArray(payload?.route?.paths) ? payload.route.paths[0] ?? null : null;
  if (!path) {
    throw new Error("AMap driving route returned no path");
  }

  return {
    distanceMeters: toNumber(path.distance) ?? distanceMetersBetween(origin, destination),
    durationMinutes: Math.max(
      2,
      Math.round(
        toNumber(path.duration) != null
          ? toNumber(path.duration) / 60
          : distanceMetersBetween(origin, destination) / 320
      )
    ),
  };
}

async function amapRequest(pathname, params, config) {
  if (!config.key) {
    throw new Error("AMAP_WEB_SERVICE_KEY is not configured");
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  searchParams.set("key", config.key);

  const url = `${config.baseUrl}${pathname}?${searchParams.toString()}`;
  const maxAttempts = Number(process.env.AMAP_REQUEST_RETRIES || 1);
  const timeoutMs = Number(process.env.AMAP_REQUEST_TIMEOUT_MS || 3500);
  let response = null;
  let lastError = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          Accept: "application/json",
        },
      });
      break;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts - 1) {
        await sleep(180 * (attempt + 1));
      }
    }
  }

  if (!response) {
    throw lastError || new Error("AMap request failed");
  }

  if (!response.ok) {
    throw new Error(`AMap request failed: ${response.status}`);
  }

  const payload = await response.json();
  if (payload?.status && payload.status !== "1") {
    throw new Error(payload?.info || payload?.infocode || "AMap service returned an error");
  }

  return payload;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeAmapPoi(poi, origin) {
  if (!poi || typeof poi !== "object") {
    return null;
  }

  const coordinates = parseLocation(poi.location);
  if (!coordinates) {
    return null;
  }

  const name = typeof poi.name === "string" ? poi.name.trim() : "";
  if (!name) {
    return null;
  }

  const bizExt =
    poi.biz_ext && typeof poi.biz_ext === "object"
      ? poi.biz_ext
      : {};
  const business = poi.business && typeof poi.business === "object" ? poi.business : {};
  const rating =
    toNumber(bizExt.rating) ??
    toNumber(poi.rating) ??
    4.2;
  const distanceMeters =
    toNumber(poi.distance) ??
    distanceMetersBetween(origin, coordinates);

  return {
    id: String(poi.id || `${name}-${coordinates.longitude}-${coordinates.latitude}`),
    amapId: poi.id ? String(poi.id) : null,
    name,
    address: compactJoin([poi.cityname, poi.adname, poi.address]) || compactJoin([poi.pname, poi.cityname, poi.adname]),
    area: compactJoin([business.business_area, poi.business_area, poi.adname, poi.cityname]) || "Nearby",
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    distanceMeters,
    rating: Number(rating.toFixed(1)),
    averageCostCny: toNumber(bizExt.cost) ?? toNumber(poi.cost),
    groupbuyCount:
      toNumber(poi.groupbuy_num) ??
      toNumber(bizExt.groupbuy_num) ??
      null,
    phone: typeof poi.tel === "string" ? poi.tel : null,
    type: typeof poi.type === "string" ? poi.type : "",
    typecode: typeof poi.typecode === "string" ? poi.typecode : "",
    hours:
      pickFirstText(
        business.opentime_today,
        business.opentime_week,
        poi.shopinfo,
        poi.open_time,
        poi.business_hours
      ) || null,
    searchText: compactJoin([
      name,
      poi.type,
      poi.typecode,
      poi.address,
      poi.business_area,
      business.business_area,
      poi.tag,
      poi.alias,
      poi.tel,
    ]).toLowerCase(),
  };
}

function parseLocation(value) {
  if (typeof value !== "string" || !value.includes(",")) {
    return null;
  }

  const [longitude, latitude] = value.split(",").map((item) => Number(item));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

function pickFirstText(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const first = pickFirstText(...value);
      if (first) {
        return first;
      }
      continue;
    }

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function pickCampusLikeName(...values) {
  const candidates = values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  return (
    candidates.find((value) =>
      /(大学|学院|校区|campus|college|university|school)/i.test(value)
    ) || ""
  );
}

function compactJoin(values) {
  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

function toNumber(value) {
  const result =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;

  return Number.isFinite(result) ? result : null;
}

function distanceMetersBetween(start, end) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(end.latitude - start.latitude);
  const deltaLon = toRadians(end.longitude - start.longitude);
  const startLat = toRadians(start.latitude);
  const endLat = toRadians(end.latitude);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a)) * 1000;
}
