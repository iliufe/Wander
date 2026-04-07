import { cityDriftData } from "./data";
import type {
  CategoryId,
  ClusterId,
  Coordinates,
  GenerationOptions,
  ParsedRequest,
  RouteOption,
  RouteStop,
  RouteStyle,
  SharedRoute,
  Venue,
} from "./types";

const liveClusterMeta = {
  label: "当前位置附近 · 开放数据 POI",
  accent: "开源地图栈实时生成，优先控制在当前可执行半径内",
};

const chineseDigits: Record<string, number> = {
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
};

const categoryKeywords: Record<CategoryId, string[]> = {
  sichuan: ["川菜", "麻辣", "水煮", "火锅", "川味"],
  food: ["吃", "晚餐", "饭", "简餐", "餐厅", "小吃", "food", "dinner"],
  park: ["公园", "绿地", "草地"],
  walk: ["散步", "city walk", "walk", "逛逛", "步行", "走走"],
  grocery: ["买点吃的", "补给", "超市", "便利店", "生鲜", "groceries"],
  cafe: ["咖啡", "coffee", "cafe"],
  bookstore: ["书店", "书吧", "阅读", "书"],
  gallery: ["展", "美术馆", "画廊", "museum", "gallery"],
  dessert: ["甜品", "面包", "蛋糕", "dessert"],
  riverside: ["江边", "河边", "滨江", "滨水"],
  market: ["市集", "菜场", "market"],
};

const outdoorCategories = new Set<CategoryId>(["park", "walk", "riverside"]);
const weatherFallbacks: Partial<Record<CategoryId, CategoryId[]>> = {
  park: ["bookstore", "gallery"],
  walk: ["cafe", "bookstore"],
  riverside: ["gallery", "dessert"],
};

const styleMeta: Record<
  RouteStyle,
  {
    title: string;
    detail: string;
    fillers: CategoryId[];
  }
> = {
  balanced: {
    title: "平衡路线",
    detail: "主题命中、路径长度和停留节奏尽量均衡，适合大多数下班后或课后的空闲时间。",
    fillers: ["bookstore", "dessert", "market"],
  },
  scenic: {
    title: "氛围路线",
    detail: "更偏向散步感、景观感和情绪切换，适合周末早晨或黄昏出门。",
    fillers: ["riverside", "gallery", "dessert"],
  },
  efficient: {
    title: "高效路线",
    detail: "优先控制折返和移动成本，尽量让整条路线在最少切换里完成。",
    fillers: ["grocery", "cafe", "market"],
  },
};

export function parseRequest(text: string, options: GenerationOptions = {}): ParsedRequest {
  const template = options.template ?? null;
  const timeMinutes =
    options.timeOverrideMinutes != null
      ? Math.max(0, Math.min(12 * 60, Math.round(options.timeOverrideMinutes)))
      : extractTimeMinutes(text, template?.timeHours);

  return {
    rawText: text,
    startPoint: options.startPointOverride?.trim() || extractStartPoint(text),
    timeHours: timeMinutes / 60,
    timeMinutes,
    timeLabel: formatTimeBudget(timeMinutes),
    categories: inferCategories(text, template?.desiredCategories),
    mood: inferMood(text),
    scenario: {
      weather: options.scenario?.weather ?? "clear",
      venue: options.scenario?.venue ?? "live",
    },
    templateId: template?.id ?? null,
  };
}

export function generateRoutes(text: string, options: GenerationOptions = {}) {
  const parsed = parseRequest(text, options);
  if (parsed.timeMinutes === 0) {
    return { parsed, routes: [] as RouteOption[] };
  }

  const clusterRanking = chooseClusterRanking(
    parsed.categories,
    options.venuePool ?? null,
    options.liveMode ?? false,
    options.preferredClusterId,
    options.startCoordinates
  );
  const styles = buildStylesByMood(parsed.mood);
  const minimumStops = options.liveMode ? 1 : parsed.timeMinutes <= 150 ? 2 : 3;

  const routes = styles
    .map((style, index) =>
      buildRoute(parsed, clusterRanking[index] ?? clusterRanking[0] ?? "live", style, index, options)
    )
    .filter((route) => route.stops.length >= minimumStops);

  return { parsed, routes };
}

export function buildPromptFromSharedRoute(sharedRoute: SharedRoute, currentParsed?: ParsedRequest | null) {
  const start = currentParsed?.startPoint ?? "当前位置附近";
  const timeLabel = currentParsed?.timeLabel ?? formatTimeBudget(sharedRoute.timeHours * 60);
  const wish = sharedRoute.desiredCategories.map((category) => getCategoryLabel(category)).join("、");
  return `我从 ${start} 出发，有 ${timeLabel}，想安排 ${wish}。`;
}

export function getCategoryLabel(category: CategoryId) {
  return cityDriftData.categoryMeta[category].label;
}

export function formatHours(totalMinutes: number) {
  if (totalMinutes < 60) {
    return `${totalMinutes} 分钟`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`;
}

function normalizeText(text: string) {
  return text.trim().toLowerCase();
}

function clampTimeMinutes(minutes: number, minimum = 30) {
  return Math.max(minimum, Math.min(12 * 60, Math.round(minutes)));
}

function extractTimeMinutes(text: string, templateTimeHours?: number) {
  const mixedMatch =
    text.match(/(\d{1,2})\s*小时\s*(\d{1,2})\s*分/) ||
    text.match(/(\d{1,2})\s*h\s*(\d{1,2})\s*m/i);
  if (mixedMatch) {
    return clampTimeMinutes(Number(mixedMatch[1]) * 60 + Number(mixedMatch[2]));
  }

  const decimalMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:小时|h|hour|hours)/i);
  if (decimalMatch) {
    return clampTimeMinutes(Number(decimalMatch[1]) * 60);
  }

  const chineseMatch = text.match(/([一二两三四五六七八九十])\s*小时/);
  if (chineseMatch) {
    return clampTimeMinutes((chineseDigits[chineseMatch[1]] ?? templateTimeHours ?? 4) * 60);
  }

  const minuteMatch = text.match(/(\d{1,2})\s*分/);
  if (minuteMatch) {
    return clampTimeMinutes(Number(minuteMatch[1]));
  }

  if (text.includes("半天")) {
    return 5 * 60;
  }

  if (text.includes("下班后") || text.includes("下课后")) {
    return 3 * 60;
  }

  return clampTimeMinutes((templateTimeHours ?? 4) * 60);
}

function extractStartPoint(text: string) {
  const match =
    text.match(/(?:我在|从|人在|现在在)([^，。；\n]{2,20})(?:出发|开始|附近)?/) ||
    text.match(/([^，。；\n]{2,20})(?:附近|地铁站|商场|小区)/);

  if (match?.[1]) {
    return match[1].trim();
  }

  if (match?.[0]) {
    return match[0].trim();
  }

  return "当前位置附近";
}

function inferCategories(text: string, templateCategories?: CategoryId[]): CategoryId[] {
  const categories: CategoryId[] = [];
  const source = normalizeText(text);

  (Object.entries(categoryKeywords) as [CategoryId, string[]][]).forEach(([category, keywords]) => {
    if (keywords.some((keyword) => source.includes(keyword.toLowerCase()))) {
      categories.push(category);
    }
  });

  const unique = dedupe(categories);
  if (unique.length) {
    return unique;
  }

  return templateCategories?.length ? [...templateCategories] : ["food", "walk", "grocery"];
}

function inferMood(text: string): ParsedRequest["mood"] {
  const source = normalizeText(text);

  if (["慢一点", "放松", "随便走走", "slow"].some((token) => source.includes(token))) {
    return "slow";
  }

  if (["高效", "不折腾", "顺路", "快一点", "efficient"].some((token) => source.includes(token))) {
    return "efficient";
  }

  if (["看风景", "滨江", "散步", "city walk", "氛围"].some((token) => source.includes(token))) {
    return "scenic";
  }

  return "balanced";
}

function chooseClusterRanking(
  categories: CategoryId[],
  venuePool: Venue[] | null,
  liveMode: boolean,
  preferredClusterId?: ClusterId | null,
  startCoordinates?: Coordinates | null
) {
  if (liveMode) {
    return ["live"] as ClusterId[];
  }

  const pool = venuePool?.length ? venuePool : cityDriftData.venues;
  const clusters = Object.keys(cityDriftData.clusters) as Exclude<ClusterId, "live">[];

  const scores = clusters.map((clusterId) => {
    const clusterVenues = pool.filter((venue) => venue.cluster === clusterId);
    const score =
      categories.reduce((sum, category) => {
        return sum + (clusterVenues.some((venue) => matchesCategory(venue, category)) ? 3 : 0);
      }, 0) +
      (preferredClusterId === clusterId ? 4 : 0) +
      getClusterDistanceScore(clusterVenues, startCoordinates);

    return { clusterId, score };
  });

  return scores.sort((left, right) => right.score - left.score).map((item) => item.clusterId);
}

function buildStylesByMood(mood: ParsedRequest["mood"]): RouteStyle[] {
  if (mood === "scenic" || mood === "slow") {
    return ["scenic", "balanced", "efficient"];
  }

  if (mood === "efficient") {
    return ["efficient", "balanced", "scenic"];
  }

  return ["balanced", "efficient", "scenic"];
}

function expandCategories(baseCategories: CategoryId[], timeHours: number, style: RouteStyle) {
  const result = dedupe(baseCategories);

  if (!result.some((category) => category === "food" || category === "sichuan" || category === "cafe")) {
    result.unshift("food");
  }

  const maxStops = timeHours <= 2.5 ? 2 : timeHours >= 4.5 ? 4 : 3;
  styleMeta[style].fillers.forEach((candidate) => {
    if (result.length < maxStops && !result.includes(candidate)) {
      result.push(candidate);
    }
  });

  if (result.length < 3) {
    (["walk", "grocery", "dessert"] as CategoryId[]).forEach((candidate) => {
      if (result.length < 3 && !result.includes(candidate)) {
        result.push(candidate);
      }
    });
  }

  return result.slice(0, maxStops);
}

function applyScenarioToCategory(category: CategoryId, scenario: ParsedRequest["scenario"]) {
  if (scenario.weather === "rain" && outdoorCategories.has(category)) {
    const fallbackList = weatherFallbacks[category] ?? ["bookstore"];
    return {
      requestedCategory: category,
      finalCategory: fallbackList[0],
      note: `下雨时优先把 ${getCategoryLabel(category)} 换成更稳妥的室内站点`,
    };
  }

  return {
    requestedCategory: category,
    finalCategory: category,
    note: null,
  };
}

function buildRoute(
  parsed: ParsedRequest,
  clusterId: ClusterId,
  style: RouteStyle,
  index: number,
  options: GenerationOptions
): RouteOption {
  const providedPool = options.venuePool ?? null;
  const sourcePool = options.liveMode || providedPool?.length ? providedPool ?? [] : cityDriftData.venues;
  const categories = expandCategories(parsed.categories, parsed.timeHours, style);
  const used = new Set<string>();
  const adjustments: string[] = [];
  const stops: RouteStop[] = [];
  const clusterMeta = resolveClusterMeta(clusterId, options);
  let currentCoordinates = options.startCoordinates ?? getClusterAnchor(clusterId, sourcePool);
  const startLabel = parsed.startPoint;

  categories.forEach((category) => {
    const adjusted = applyScenarioToCategory(category, parsed.scenario);
    let venue = findVenue(
      adjusted.finalCategory,
      sourcePool,
      clusterId,
      used,
      parsed.scenario,
      currentCoordinates,
      style
    );
    let stopCategory = adjusted.finalCategory;

    if (!venue) {
      const fallbackVenue = findFallbackVenue(sourcePool, used, parsed.scenario, currentCoordinates, style);
      if (!fallbackVenue) {
        adjustments.push(`附近暂时没有找到足够合适的 ${getCategoryLabel(adjusted.finalCategory)} 站点`);
        return;
      }

      venue = fallbackVenue;
      stopCategory = fallbackVenue.categories[0] ?? adjusted.finalCategory;
      adjustments.push(
        `附近暂无理想的 ${getCategoryLabel(adjusted.finalCategory)}，已改用附近可执行的 ${getCategoryLabel(stopCategory)} 补位`
      );
    }

    if (adjusted.note) {
      adjustments.push(adjusted.note);
    }

    used.add(venue.id);
    const venueCoordinates = getVenueCoordinates(venue);
    const travel = currentCoordinates
      ? estimateTravel(distanceMetersBetweenCoordinates(currentCoordinates, venueCoordinates), style)
      : null;

    stops.push({
      ...venue,
      requestedCategory: stopCategory,
      visitLabel: venue.ugc.stay,
      travelFromPrevious:
        travel && stops.length === 0 ? `从 ${startLabel} 出发 · ${travel.label}` : travel?.label,
      travelMinutesFromPrevious: travel?.minutes ?? 0,
      travelDistanceMetersFromPrevious: travel?.distanceMeters ?? 0,
    });
    currentCoordinates = venueCoordinates;
  });

  trimStopsToBudget(stops, parsed.timeMinutes, options.liveMode ?? false);

  const totalVisitMinutes = stops.reduce((sum, stop) => sum + stop.duration, 0);
  const totalTransitMinutes = stops.reduce((sum, stop) => sum + (stop.travelMinutesFromPrevious ?? 0), 0);
  const totalMinutes = totalVisitMinutes + totalTransitMinutes;
  const maxLegDistance = Math.max(0, ...stops.map((stop) => stop.travelDistanceMetersFromPrevious ?? 0));
  const hitCount = parsed.categories.filter((category) => stops.some((stop) => matchesCategory(stop, category))).length;
  const fitScore = Math.min(
    97,
    66 +
      hitCount * 8 +
      Math.max(0, stops.length - 2) * 4 +
      (parsed.scenario.weather === "rain" || parsed.scenario.venue === "closed" ? -2 : 3) -
      index
  );

  return {
    id: `${clusterId}-${style}`,
    clusterId,
    clusterLabel: clusterMeta.label,
    clusterAccent: clusterMeta.accent,
    title: `${clusterMeta.label} · ${styleMeta[style].title}`,
    subtitle: styleMeta[style].detail,
    style,
    fitScore,
    totalMinutes,
    bufferMinutes: Math.max(0, parsed.timeMinutes - totalMinutes),
    hitCount,
    stops,
    adjustments: dedupe(adjustments),
    summary: buildRouteSummary(parsed, stops, totalMinutes),
    transitSummary: totalTransitMinutes
      ? `${totalTransitMinutes} 分钟在路上 · 最远一段 ${formatDistance(maxLegDistance)}`
      : "站点都在附近，可以轻量步行串联",
  };
}

function resolveClusterMeta(clusterId: ClusterId, options: GenerationOptions) {
  if (clusterId === "live") {
    return {
      label: options.liveClusterLabel || liveClusterMeta.label,
      accent: options.liveClusterAccent || liveClusterMeta.accent,
    };
  }

  return cityDriftData.clusters[clusterId];
}

function findVenue(
  category: CategoryId,
  pool: Venue[],
  clusterId: ClusterId,
  excludedIds: Set<string>,
  scenario: ParsedRequest["scenario"],
  origin: Coordinates | null,
  style: RouteStyle
) {
  const candidates = pool.filter((venue) => {
    if (excludedIds.has(venue.id)) {
      return false;
    }

    if (!matchesCategory(venue, category)) {
      return false;
    }

    if (scenario.venue === "closed" && venue.demoCanClose) {
      return false;
    }

    return true;
  });

  return (
    candidates.sort((left, right) => {
      return scoreVenue(right, clusterId, origin, style) - scoreVenue(left, clusterId, origin, style);
    })[0] ?? null
  );
}

function findFallbackVenue(
  pool: Venue[],
  excludedIds: Set<string>,
  scenario: ParsedRequest["scenario"],
  origin: Coordinates | null,
  style: RouteStyle
) {
  const candidates = pool.filter((venue) => {
    if (excludedIds.has(venue.id)) {
      return false;
    }

    if (scenario.venue === "closed" && venue.demoCanClose) {
      return false;
    }

    return true;
  });

  return (
    candidates.sort((left, right) => {
      return scoreVenue(right, "live", origin, style) - scoreVenue(left, "live", origin, style);
    })[0] ?? null
  );
}

function matchesCategory(venue: Venue | RouteStop, category: CategoryId) {
  if (venue.categories.includes(category)) {
    return true;
  }

  if (category === "food") {
    return venue.categories.includes("food") || venue.categories.includes("sichuan");
  }

  if (category === "market") {
    return venue.categories.includes("market") || venue.categories.includes("grocery");
  }

  if (category === "walk") {
    return (
      venue.categories.includes("walk") ||
      venue.categories.includes("park") ||
      venue.categories.includes("riverside")
    );
  }

  if (category === "riverside") {
    return venue.categories.includes("riverside") || venue.categories.includes("walk");
  }

  if (category === "cafe") {
    return venue.categories.includes("cafe") || venue.categories.includes("bookstore");
  }

  return false;
}

function calculateMinutes(stops: RouteStop[]) {
  return stops.reduce((sum, stop) => sum + stop.duration + (stop.travelMinutesFromPrevious ?? 0), 0);
}

function trimStopsToBudget(stops: RouteStop[], targetMinutes: number, isLiveMode: boolean) {
  const minimumStops = isLiveMode ? 1 : targetMinutes <= 150 ? 2 : 3;

  while (stops.length > minimumStops) {
    const total = calculateMinutes(stops);
    if (total <= targetMinutes + 15) {
      break;
    }

    stops.pop();
  }
}

function buildRouteSummary(parsed: ParsedRequest, stops: RouteStop[], totalMinutes: number) {
  const stopLabels = stops.map((stop) => stop.name).join(" → ");
  return `从 ${parsed.startPoint} 出发，用 ${formatHours(totalMinutes)} 完成 ${stopLabels}。`;
}

function formatTimeBudget(totalMinutes: number) {
  if (totalMinutes <= 0) {
    return "0 小时 0 分钟";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} 分钟`;
  }

  return minutes ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`;
}

function getClusterDistanceScore(venues: Venue[], startCoordinates?: Coordinates | null) {
  if (!startCoordinates || !venues.length) {
    return 0;
  }

  const nearestDistanceKm =
    Math.min(...venues.map((venue) => distanceMetersBetweenCoordinates(startCoordinates, getVenueCoordinates(venue)))) /
    1000;

  return Math.max(0, 8 - nearestDistanceKm * 2.2);
}

function scoreVenue(venue: Venue, clusterId: ClusterId, origin: Coordinates | null, style: RouteStyle) {
  const distancePenalty = origin ? distanceMetersBetweenCoordinates(origin, getVenueCoordinates(venue)) / 240 : 0;
  const clusterBonus = clusterId === "live" ? 4 : venue.cluster === clusterId ? 10 : 0;
  const scenicBonus = style === "scenic" && (venue.outdoor || venue.categories.includes("riverside")) ? 5 : 0;
  const efficientBonus = style === "efficient" && distancePenalty < 8 ? 5 : 0;
  const liveDistanceBonus =
    venue.distanceFromStartMeters != null ? Math.max(0, 10 - venue.distanceFromStartMeters / 450) : 0;

  return venue.rating * 22 + clusterBonus + scenicBonus + efficientBonus + liveDistanceBonus - distancePenalty;
}

function getClusterAnchor(clusterId: ClusterId, pool: Venue[]) {
  const fallback = pool[0] ?? cityDriftData.venues[0];
  const clusterVenue = pool.find((venue) => venue.cluster === clusterId) ?? fallback;
  return getVenueCoordinates(clusterVenue);
}

function getVenueCoordinates(venue: Venue): Coordinates {
  return {
    latitude: venue.latitude,
    longitude: venue.longitude,
  };
}

function distanceMetersBetweenCoordinates(start: Coordinates, end: Coordinates) {
  return haversineDistanceKm(start.latitude, start.longitude, end.latitude, end.longitude) * 1000;
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const startLat = toRadians(lat1);
  const endLat = toRadians(lat2);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function estimateTravel(distanceMeters: number, style: RouteStyle) {
  if (distanceMeters < 900) {
    const minutes = Math.max(4, Math.round(distanceMeters / 78));
    return {
      label: `步行 ${minutes} 分钟 · ${formatDistance(distanceMeters)}`,
      minutes,
      distanceMeters,
    };
  }

  if (distanceMeters < 2200) {
    if (style === "efficient") {
      const minutes = Math.max(6, Math.round(distanceMeters / 210));
      return {
        label: `骑行 ${minutes} 分钟 · ${formatDistance(distanceMeters)}`,
        minutes,
        distanceMeters,
      };
    }

    const minutes = Math.max(10, Math.round(distanceMeters / 85));
    return {
      label: `步行 ${minutes} 分钟 · ${formatDistance(distanceMeters)}`,
      minutes,
      distanceMeters,
    };
  }

  if (distanceMeters < 5000) {
    const minutes =
      style === "efficient"
        ? Math.max(10, Math.round(distanceMeters / 360) + 4)
        : Math.max(14, Math.round(distanceMeters / 300) + 5);
    return {
      label: `${style === "efficient" ? "骑行" : "公交/打车"} ${minutes} 分钟 · ${formatDistance(distanceMeters)}`,
      minutes,
      distanceMeters,
    };
  }

  const minutes = Math.max(18, Math.round(distanceMeters / 330) + 7);
  return {
    label: `公交/打车 ${minutes} 分钟 · ${formatDistance(distanceMeters)}`,
    minutes,
    distanceMeters,
  };
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} 米`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} 公里`;
}

function dedupe<T>(items: T[]) {
  return [...new Set(items)];
}
