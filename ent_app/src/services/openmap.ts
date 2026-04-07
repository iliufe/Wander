import { cityDriftData } from "../data";
import type { CategoryId, Coordinates, Venue } from "../types";

type OverpassElement = {
  id: number;
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

type NominatimReverseResponse = {
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
};

type OsrmRouteResponse = {
  code?: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry?: {
      coordinates: [number, number][];
      type: "LineString";
    };
    legs?: Array<{
      distance: number;
      duration: number;
    }>;
  }>;
};

export interface ReverseGeocodePayload {
  nearbyPlaceName: string;
  formattedAddress: string;
  cityName: string | null;
  districtName: string | null;
  adcode: string | null;
}

export interface NearbyVenueSearchResult {
  venues: Venue[];
  radiusMeters: number;
  note: string;
}

export interface OsrmRoutePayload {
  geometry: [number, number][];
  distanceMeters: number;
  durationMinutes: number;
  legs: Array<{
    distanceMeters: number;
    durationMinutes: number;
  }>;
}

interface SearchNearbyVenuePoolOptions {
  coordinates: Coordinates;
  categories: CategoryId[];
  radiusMeters: number;
}

const nominatimBaseUrl = "https://nominatim.openstreetmap.org";
const overpassBaseUrl = "https://overpass-api.de/api/interpreter";
const osrmBaseUrl = "https://router.project-osrm.org";

const categorySearchMeta: Record<
  CategoryId,
  {
    duration: number;
    outdoor: boolean;
    tags: string[];
  }
> = {
  food: {
    duration: 55,
    outdoor: false,
    tags: ["热餐", "附近可去", "饭点友好"],
  },
  sichuan: {
    duration: 65,
    outdoor: false,
    tags: ["川味", "下班可冲", "重口味"],
  },
  park: {
    duration: 35,
    outdoor: true,
    tags: ["透气", "散步", "户外"],
  },
  walk: {
    duration: 30,
    outdoor: true,
    tags: ["轻松走走", "不费脑", "顺路"],
  },
  grocery: {
    duration: 18,
    outdoor: false,
    tags: ["顺手补货", "效率型", "生活采购"],
  },
  cafe: {
    duration: 40,
    outdoor: false,
    tags: ["坐一会", "恢复电量", "安静"],
  },
  bookstore: {
    duration: 45,
    outdoor: false,
    tags: ["浏览", "静态停留", "灵感"],
  },
  gallery: {
    duration: 50,
    outdoor: false,
    tags: ["室内替代", "逛展", "天气友好"],
  },
  dessert: {
    duration: 25,
    outdoor: false,
    tags: ["甜口补给", "短停", "轻负担"],
  },
  riverside: {
    duration: 35,
    outdoor: true,
    tags: ["临水", "放空", "风景线"],
  },
  market: {
    duration: 20,
    outdoor: false,
    tags: ["生活流", "可顺带", "实用"],
  },
};

const generatedVenueLabels: Record<CategoryId, string> = {
  food: "餐厅",
  sichuan: "川味餐厅",
  park: "公园",
  walk: "步行点",
  grocery: "便利补给点",
  cafe: "咖啡点",
  bookstore: "书店",
  gallery: "展览空间",
  dessert: "甜品点",
  riverside: "临水步道",
  market: "生活市集",
};

export function reverseGeocodeFromOpenMap(coordinates: Coordinates): Promise<ReverseGeocodePayload> {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(coordinates.latitude),
    lon: String(coordinates.longitude),
    zoom: "18",
    addressdetails: "1",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
  });

  return fetch(`${nominatimBaseUrl}/reverse?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Nominatim reverse geocoding failed");
      }

      return response.json() as Promise<NominatimReverseResponse>;
    })
    .then((payload) => {
      const address = payload.address ?? {};
      const nearbyPlaceName =
        payload.name ||
        address.amenity ||
        address.building ||
        address.shop ||
        address.tourism ||
        address.road ||
        address.pedestrian ||
        address.suburb ||
        address.neighbourhood ||
        "附近建筑";
      const formattedAddress =
        payload.display_name ||
        [address.road, address.house_number, address.suburb, address.city].filter(Boolean).join(", ") ||
        "当前位置附近";

      return {
        nearbyPlaceName,
        formattedAddress,
        cityName: address.city || address.town || address.county || null,
        districtName: address.suburb || address.city_district || address.neighbourhood || null,
        adcode: address.postcode || null,
      };
    });
}

export async function searchNearbyVenuePool(
  options: SearchNearbyVenuePoolOptions
): Promise<NearbyVenueSearchResult> {
  const query = buildOverpassQuery(options.coordinates, options.radiusMeters, options.categories);
  const response = await fetch(overpassBaseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      Accept: "application/json",
    },
    body: query,
  });

  if (!response.ok) {
    throw new Error("Overpass search failed");
  }

  const payload = (await response.json()) as OverpassResponse;
  const elements = Array.isArray(payload.elements) ? payload.elements : [];
  const requestedCategories = dedupe(options.categories);
  const uniqueVenues = new Map<string, Venue>();

  elements.forEach((element) => {
    const venue = mapOverpassElementToVenue(element, requestedCategories, options.coordinates);
    if (!venue) {
      return;
    }

    const existing = uniqueVenues.get(venue.id);
    if (!existing || (existing.distanceFromStartMeters ?? Number.POSITIVE_INFINITY) > (venue.distanceFromStartMeters ?? Number.POSITIVE_INFINITY)) {
      uniqueVenues.set(venue.id, venue);
    }
  });

  const venues = [...uniqueVenues.values()]
    .sort((left, right) => {
      const leftDistance = left.distanceFromStartMeters ?? Number.POSITIVE_INFINITY;
      const rightDistance = right.distanceFromStartMeters ?? Number.POSITIVE_INFINITY;
      return leftDistance - rightDistance || right.rating - left.rating;
    })
    .slice(0, 36);

  return {
    venues,
    radiusMeters: options.radiusMeters,
    note: venues.length
      ? `OpenStreetMap / Overpass 在 ${formatDistance(options.radiusMeters)} 内找到 ${venues.length} 个可用地点。`
      : `OpenStreetMap / Overpass 在 ${formatDistance(options.radiusMeters)} 内没有找到足够可用的附近地点。`,
  };
}

export async function fetchRouteFromOsrm(
  start: Coordinates,
  stops: Array<Pick<Venue, "latitude" | "longitude">>,
  profile: "walking" | "cycling" = "walking"
): Promise<OsrmRoutePayload> {
  const coordinates = [start, ...stops].map((point) => `${point.longitude},${point.latitude}`).join(";");
  const params = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    steps: "false",
  });
  const response = await fetch(`${osrmBaseUrl}/route/v1/${profile}/${coordinates}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("OSRM routing failed");
  }

  const payload = (await response.json()) as OsrmRouteResponse;
  if (payload.code !== "Ok" || !payload.routes?.[0]) {
    throw new Error("OSRM did not return a route");
  }

  const route = payload.routes[0];
  return {
    geometry: route.geometry?.coordinates ?? [],
    distanceMeters: route.distance,
    durationMinutes: Math.max(1, Math.round(route.duration / 60)),
    legs: (route.legs ?? []).map((leg) => ({
      distanceMeters: leg.distance,
      durationMinutes: Math.max(1, Math.round(leg.duration / 60)),
    })),
  };
}

function buildOverpassQuery(
  coordinates: Coordinates,
  radiusMeters: number,
  categories: CategoryId[]
) {
  const fragments = dedupe(categories).flatMap((category) => buildCategoryFragments(category, coordinates, radiusMeters));

  return `
[out:json][timeout:20];
(
${fragments.join("\n")}
);
out center 80;
`;
}

function buildCategoryFragments(category: CategoryId, coordinates: Coordinates, radiusMeters: number) {
  const around = `(around:${radiusMeters},${coordinates.latitude},${coordinates.longitude})`;
  const repeat = (selector: string) => [
    `  node${around}${selector};`,
    `  way${around}${selector};`,
    `  relation${around}${selector};`,
  ];

  switch (category) {
    case "food":
      return repeat(`[amenity~"restaurant|fast_food|food_court|bar|pub|biergarten"]`);
    case "sichuan":
      return [
        ...repeat(`[amenity~"restaurant|fast_food"][cuisine~"sichuan|hotpot|chinese",i]`),
        ...repeat(`[name~"川|蜀|渝|火锅|串串|冒菜|麻辣|Sichuan|Hotpot",i]`),
      ];
    case "cafe":
      return repeat(`[amenity~"cafe|ice_cream"]`);
    case "grocery":
      return repeat(`[shop~"supermarket|convenience|greengrocer|grocery|deli"]`);
    case "market":
      return [
        ...repeat(`[amenity="marketplace"]`),
        ...repeat(`[shop~"supermarket|convenience"]`),
      ];
    case "bookstore":
      return repeat(`[shop~"books|stationery"]`);
    case "gallery":
      return [
        ...repeat(`[tourism~"museum|gallery"]`),
        ...repeat(`[amenity~"arts_centre|exhibition_centre"]`),
      ];
    case "dessert":
      return [
        ...repeat(`[shop~"bakery|pastry|confectionery"]`),
        ...repeat(`[amenity="ice_cream"]`),
      ];
    case "park":
      return [
        ...repeat(`[leisure~"park|garden"]`),
        ...repeat(`[landuse~"grass|recreation_ground"]`),
      ];
    case "walk":
      return [
        ...repeat(`[leisure~"park|garden"]`),
        ...repeat(`[place="square"]`),
        ...repeat(`[highway~"pedestrian|footway"]`),
      ];
    case "riverside":
      return [
        ...repeat(`[tourism="viewpoint"]`),
        ...repeat(`[natural="water"]`),
        ...repeat(`[waterway~"river|riverbank|canal"]`),
        ...repeat(`[leisure~"park|garden"][name~"江|河|湖|滨|waterfront|riverside",i]`),
      ];
    default:
      return [];
  }
}

function mapOverpassElementToVenue(
  element: OverpassElement,
  requestedCategories: CategoryId[],
  origin: Coordinates
): Venue | null {
  const tags = element.tags ?? {};
  const coordinates = getElementCoordinates(element);
  if (!coordinates) {
    return null;
  }

  const inferredCategories = dedupe(inferVenueCategories(tags));
  if (!inferredCategories.length) {
    return null;
  }

  const categories = dedupe([
    ...inferredCategories.filter((category) => requestedCategories.includes(category)),
    ...inferredCategories,
  ]);
  const primaryCategory = categories[0];
  const meta = categorySearchMeta[primaryCategory];
  const distanceFromStartMeters = distanceMeters(origin, coordinates);
  const displayName = tags.name || buildGeneratedVenueName(primaryCategory, tags);

  return {
    id: `open-${element.type}-${element.id}`,
    name: displayName,
    cluster: "live",
    area:
      [tags["addr:suburb"], tags["addr:district"], tags["addr:city"], tags["is_in:suburb"]]
        .filter(Boolean)
        .join(" / ") || "附近片区",
    address: formatElementAddress(tags),
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    categories,
    duration: meta.duration,
    outdoor: meta.outdoor,
    rating: estimateVenueRating(tags, distanceFromStartMeters),
    hours: tags.opening_hours || "OpenStreetMap 未提供营业时间",
    crowd:
      distanceFromStartMeters < 1200
        ? "离你很近，适合临时起意直接去。"
        : "可以作为顺路停靠点，适合碎片时间安排。",
    summary: `${displayName} 距离当前位置约 ${formatDistance(distanceFromStartMeters)}，适合作为 ${cityDriftData.categoryMeta[primaryCategory].label} 停靠点。`,
    tags: dedupe([
      ...meta.tags,
      "OpenStreetMap",
      tags.amenity || "",
      tags.shop || "",
      tags.tourism || "",
      tags.leisure || "",
      tags.cuisine || "",
    ]).filter(Boolean),
    sourceType: "open-live",
    sourceLabel: "OpenStreetMap / Overpass live POI",
    distanceFromStartMeters,
    ugc: {
      author: "@Wander Open Data",
      verified: "OpenStreetMap / Overpass live signal",
      title: `${displayName} 附近点位摘要`,
      stay: recommendedStay(meta.duration),
      tip:
        distanceFromStartMeters < 1500
          ? "步行压力比较小，适合先去这里再继续后面的站点。"
          : "距离稍远一些，更适合放在中段或返程前安排。",
    },
  };
}

function getElementCoordinates(element: OverpassElement): Coordinates | null {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return {
      latitude: element.lat,
      longitude: element.lon,
    };
  }

  if (element.center) {
    return {
      latitude: element.center.lat,
      longitude: element.center.lon,
    };
  }

  return null;
}

function inferVenueCategories(tags: Record<string, string>) {
  const categories = new Set<CategoryId>();
  const amenity = tags.amenity || "";
  const shop = tags.shop || "";
  const tourism = tags.tourism || "";
  const leisure = tags.leisure || "";
  const highway = tags.highway || "";
  const cuisine = tags.cuisine || "";
  const name = tags.name || "";
  const lowerName = name.toLowerCase();
  const natural = tags.natural || "";
  const waterway = tags.waterway || "";
  const landuse = tags.landuse || "";

  if (/restaurant|fast_food|food_court|bar|pub|biergarten/.test(amenity)) {
    categories.add("food");
  }

  if (
    /sichuan|hotpot|chinese/i.test(cuisine) ||
    /sichuan|hotpot/.test(lowerName) ||
    /川|蜀|渝|火锅|串串|冒菜|麻辣/.test(name)
  ) {
    categories.add("sichuan");
    categories.add("food");
  }

  if (/cafe|ice_cream/.test(amenity)) {
    categories.add("cafe");
    if (amenity === "ice_cream") {
      categories.add("dessert");
    }
  }

  if (/supermarket|convenience|greengrocer|grocery|deli/.test(shop)) {
    categories.add("grocery");
    categories.add("market");
  }

  if (/books|stationery/.test(shop)) {
    categories.add("bookstore");
  }

  if (/bakery|pastry|confectionery/.test(shop)) {
    categories.add("dessert");
  }

  if (/museum|gallery/.test(tourism) || /arts_centre|exhibition_centre/.test(amenity)) {
    categories.add("gallery");
  }

  if (/park|garden/.test(leisure) || /grass|recreation_ground/.test(landuse)) {
    categories.add("park");
    categories.add("walk");
  }

  if (highway === "pedestrian" || highway === "footway" || tags.place === "square") {
    categories.add("walk");
  }

  if (
    tourism === "viewpoint" ||
    natural === "water" ||
    /river|riverbank|canal/.test(waterway) ||
    /waterfront|riverside/.test(lowerName) ||
    /江|河|湖|滨/.test(name)
  ) {
    categories.add("riverside");
    categories.add("walk");
  }

  if (amenity === "marketplace") {
    categories.add("market");
  }

  return [...categories];
}

function formatElementAddress(tags: Record<string, string>) {
  const line = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  const locality = [tags["addr:suburb"], tags["addr:district"], tags["addr:city"], tags["is_in:suburb"]]
    .filter(Boolean)
    .join(" / ");
  const composed = [locality, line].filter(Boolean).join(" / ");
  return composed || tags["addr:full"] || tags.description || "OpenStreetMap 未提供门牌地址";
}

function buildGeneratedVenueName(primaryCategory: CategoryId, tags: Record<string, string>) {
  const candidate =
    tags.brand ||
    tags.operator ||
    tags["addr:housename"] ||
    tags["addr:street"] ||
    tags["addr:suburb"] ||
    tags["addr:district"];

  if (candidate) {
    return `${candidate}${generatedVenueLabels[primaryCategory]}`;
  }

  return `附近${generatedVenueLabels[primaryCategory]}`;
}

function estimateVenueRating(tags: Record<string, string>, distanceFromStartMeters: number) {
  const openingBonus = tags.opening_hours ? 0.15 : 0;
  const nameBonus = tags.name ? 0.1 : 0;
  const distanceBonus = Math.max(0, 0.35 - distanceFromStartMeters / 6000);
  return Number((4.15 + openingBonus + nameBonus + distanceBonus).toFixed(1));
}

function recommendedStay(duration: number) {
  const lower = Math.max(10, duration - 10);
  const upper = duration + 10;
  return `建议停留 ${lower}-${upper} 分钟`;
}

function distanceMeters(start: Coordinates, end: Coordinates) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
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

function formatDistance(distanceMetersValue: number) {
  if (distanceMetersValue < 1000) {
    return `${Math.round(distanceMetersValue)} 米`;
  }

  return `${(distanceMetersValue / 1000).toFixed(1)} 公里`;
}

function dedupe<T>(items: T[]) {
  return [...new Set(items)];
}
