import { cityDriftData } from "./data";
import { extractIntentData, scoreVenueSearchTerms, venueMatchesSearchTerms } from "./intent";
import type {
  AppLanguage,
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

const categoryLabels: Record<AppLanguage, Record<CategoryId, string>> = {
  zh: {
    food: "轻晚餐",
    sichuan: "川菜",
    park: "公园散步",
    walk: "城市散步",
    grocery: "顺路补给",
    cafe: "咖啡小坐",
    bookstore: "书店停留",
    gallery: "看展",
    dessert: "甜品收尾",
    riverside: "滨水散步",
    market: "市集补给",
  },
  en: {
    food: "Meal",
    sichuan: "Sichuan",
    park: "Park Walk",
    walk: "City Walk",
    grocery: "Groceries",
    cafe: "Cafe",
    bookstore: "Bookstore",
    gallery: "Gallery",
    dessert: "Dessert",
    riverside: "Riverside Walk",
    market: "Market",
  },
};

const clusterMetaByLanguage = {
  zh: {
    jingan: { label: "静安 · 苏河线", accent: "切换成本低，适合工作日晚间从通勤状态直接出发。" },
    xuhui: { label: "徐汇 · 衡山路线", accent: "节奏更松，适合周末半天或课后较完整的空档。" },
    huangpu: { label: "黄浦 · 滨江线", accent: "夜景和展览密度更高，适合黄昏后出门。" },
    live: { label: "当前位置附近 · 实时候选", accent: "按你附近现在可去的地方、时间预算和天气状态重新拼路线。" },
  },
  en: {
    jingan: { label: "Jing'an · Creek Route", accent: "Lower switching cost and better for leaving right after work." },
    xuhui: { label: "Xuhui · Hengshan Route", accent: "More relaxed pacing for a slower weekend or a fuller after-class outing." },
    huangpu: { label: "Huangpu · Riverside Route", accent: "Stronger night-view and exhibition density for evening outings." },
    live: { label: "Nearby · Live Candidates", accent: "Rebuilt around places you can actually reach now with your current time window." },
  },
} as const;

const styleMeta: Record<RouteStyle, {
  title: Record<AppLanguage, string>;
  detail: Record<AppLanguage, string>;
  fillers: CategoryId[];
}> = {
  balanced: {
    title: { zh: "平衡路线", en: "Balanced Route" },
    detail: {
      zh: "主题命中、移动成本和停留节奏尽量均衡，适合大多数下班后或下课后的碎片时间。",
      en: "Balances theme match, travel cost, and stop rhythm for most after-work or after-class outings.",
    },
    fillers: ["dessert", "bookstore", "market"],
  },
  scenic: {
    title: { zh: "氛围路线", en: "Atmosphere Route" },
    detail: {
      zh: "更偏向散步感、景观感和情绪切换，适合想放松一点的时候。",
      en: "Leans into walking atmosphere, scenery, and mood shift when you want something softer.",
    },
    fillers: ["riverside", "gallery", "dessert"],
  },
  efficient: {
    title: { zh: "高效路线", en: "Efficient Route" },
    detail: {
      zh: "优先压缩折返和移动成本，把想做的事情尽量在更短路径里完成。",
      en: "Cuts down backtracking and travel cost so the outing stays easy to execute.",
    },
    fillers: ["grocery", "cafe", "market"],
  },
};

const categoryKeywords: Record<CategoryId, string[]> = {
  food: ["吃饭", "晚饭", "晚餐", "午饭", "餐厅", "dinner", "lunch", "meal", "restaurant", "food", "eat"],
  sichuan: ["川菜", "麻辣", "火锅", "串串", "冒菜", "spicy", "sichuan", "hotpot", "chili", "chilli"],
  park: ["公园", "绿地", "草地", "park", "garden", "green"],
  walk: ["散步", "走走", "逛逛", "city walk", "walk", "walking", "stroll", "wander"],
  grocery: ["补给", "超市", "便利店", "生鲜", "买菜", "买点吃的", "groceries", "grocery", "supermarket", "snacks"],
  cafe: ["咖啡", "coffee", "cafe", "latte", "espresso", "tea"],
  bookstore: ["书店", "看书", "阅读", "书吧", "bookstore", "bookshop", "books", "reading", "read"],
  gallery: ["看展", "展览", "美术馆", "博物馆", "gallery", "museum", "exhibition", "art"],
  dessert: ["甜品", "甜点", "蛋糕", "面包", "dessert", "cake", "bakery", "pastry", "ice cream", "sweet"],
  riverside: ["江边", "河边", "湖边", "滨江", "滨水", "waterfront", "riverside", "river", "canal", "lake"],
  market: ["市集", "菜场", "market", "marketplace", "bazaar", "farmers market"],
};

const categoryCompanions: Partial<Record<CategoryId, CategoryId[]>> = {
  food: ["walk", "dessert", "grocery"],
  sichuan: ["walk", "dessert", "grocery"],
  park: ["cafe", "dessert", "bookstore"],
  walk: ["cafe", "dessert", "grocery"],
  grocery: ["food", "cafe", "walk"],
  cafe: ["bookstore", "dessert", "gallery"],
  bookstore: ["cafe", "gallery", "dessert"],
  gallery: ["cafe", "bookstore", "dessert"],
  dessert: ["walk", "riverside", "cafe"],
  riverside: ["dessert", "cafe", "food"],
  market: ["food", "walk", "dessert"],
};

const outdoorCategories = new Set<CategoryId>(["park", "walk", "riverside"]);
const weatherFallbacks: Partial<Record<CategoryId, CategoryId[]>> = {
  park: ["bookstore", "gallery"],
  walk: ["cafe", "bookstore"],
  riverside: ["gallery", "dessert"],
};

const quietTokens = [
  "安静",
  "慢一点",
  "放松",
  "松弛",
  "轻松",
  "坐一会",
  "quiet",
  "calm",
  "relax",
  "slow",
  "chill",
  "cozy",
];

const scenicTokens = [
  "散步",
  "走走",
  "湖边",
  "江边",
  "河边",
  "夜景",
  "风景",
  "city walk",
  "walk",
  "riverside",
  "waterfront",
  "view",
  "scenic",
];

const efficientTokens = [
  "顺路",
  "快一点",
  "不折腾",
  "高效",
  "省时间",
  "回家前",
  "quick",
  "fast",
  "efficient",
  "low friction",
  "on the way",
  "easy",
];

const indoorTokens = ["下雨", "雨天", "室内", "避雨", "rain", "indoor"];
const nearbyTokens = ["附近", "离我近", "不要太远", "nearby", "close", "near me"];
const shortStopTokens = ["短一点", "快一点", "碎片时间", "短空档", "short", "quick", "brief"];
const longStopTokens = ["慢慢来", "待一会", "久一点", "longer", "linger"];

export function parseRequest(text: string, options: GenerationOptions = {}): ParsedRequest {
  const language = options.language ?? "zh";
  const template = options.template ?? null;
  const timeMinutes =
    options.timeOverrideMinutes != null
      ? Math.max(0, Math.min(12 * 60, Math.round(options.timeOverrideMinutes)))
      : extractTimeMinutes(text, template?.timeHours);
  const mood = inferMood(text);
  const intentData = extractIntentData(text);
  const inferredCategories = inferCategories(text, mood, template?.desiredCategories);

  return {
    rawText: text,
    startPoint: options.startPointOverride?.trim() || extractStartPoint(text, language),
    timeHours: timeMinutes / 60,
    timeMinutes,
    timeLabel: formatTimeBudget(timeMinutes, language),
    categories: dedupe([...intentData.categories, ...inferredCategories]),
    searchTerms: intentData.searchTerms,
    requiredTermsByCategory: intentData.requiredTermsByCategory,
    mood,
    scenario: {
      weather: options.scenario?.weather ?? "clear",
      venue: options.scenario?.venue ?? "live",
    },
    templateId: template?.id ?? null,
  };
}

export function generateRoutes(text: string, options: GenerationOptions = {}) {
  const parsed = parseRequest(text, options);
  const language = options.language ?? "zh";
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
      buildRoute(
        parsed,
        clusterRanking[index] ?? clusterRanking[0] ?? "live",
        style,
        index,
        options,
        language
      )
    )
    .filter((route) => route.stops.length >= minimumStops)
    .map((route) => sanitizeRouteCopy(route, language))
    .sort((left, right) => right.fitScore - left.fitScore);

  return { parsed, routes };
}

export function buildPromptFromSharedRoute(
  sharedRoute: SharedRoute,
  currentParsed?: ParsedRequest | null,
  language: AppLanguage = "zh"
) {
  const start = currentParsed?.startPoint ?? (language === "zh" ? "当前位置附近" : "near my current location");
  const timeLabel = currentParsed?.timeLabel ?? formatTimeBudget(sharedRoute.timeHours * 60, language);
  const wish = sharedRoute.desiredCategories
    .map((category) => getCategoryLabelLocalized(category, language))
    .join(language === "zh" ? "、" : ", ");

  return language === "en"
    ? `I'm leaving from ${start} with ${timeLabel}. I'd like a route that includes ${wish}.`
    : `我从 ${start} 出发，有 ${timeLabel}，想安排 ${wish}。`;
}

export function getCategoryLabel(category: CategoryId) {
  return getCategoryLabelLocalized(category, "zh");
}

export function formatHours(totalMinutes: number, language: AppLanguage = "zh") {
  if (totalMinutes < 60) {
    return language === "zh" ? `${totalMinutes} 分钟` : `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return language === "zh"
    ? minutes ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`
    : minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

function extractTimeMinutes(text: string, templateTimeHours?: number) {
  const mixedMatch =
    text.match(/(\d{1,2})\s*小时\s*(\d{1,2})\s*分钟/) ||
    text.match(/(\d{1,2})\s*h(?:ours?)?\s*(\d{1,2})\s*m(?:in(?:utes?)?)?/i);
  if (mixedMatch) return clampTimeMinutes(Number(mixedMatch[1]) * 60 + Number(mixedMatch[2]));

  const decimalMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:小时|h|hour|hours)/i);
  if (decimalMatch) return clampTimeMinutes(Number(decimalMatch[1]) * 60);

  const chineseMatch = text.match(/([一二两三四五六七八九十])\s*小时/);
  if (chineseMatch) return clampTimeMinutes((chineseDigits[chineseMatch[1]] ?? templateTimeHours ?? 4) * 60);

  const minuteMatch = text.match(/(\d{1,3})\s*(?:分钟|min(?:ute)?s?)/i);
  if (minuteMatch) return clampTimeMinutes(Number(minuteMatch[1]));

  if (text.includes("半天")) return 5 * 60;
  if (text.includes("下班后") || text.includes("下课后") || /after work|after class/i.test(text)) return 3 * 60;
  return clampTimeMinutes((templateTimeHours ?? 4) * 60);
}

function extractStartPoint(text: string, language: AppLanguage) {
  const match =
    text.match(/(?:我在|人在|现在在)\s*([^，。；\n]{2,24})(?:出发|开始|附近)?/) ||
    text.match(/(?:i(?:'m| am)|at)\s+([^,.\n]{2,30})(?:\s+now)?/i);
  return match?.[1]?.trim() || (language === "zh" ? "当前位置附近" : "Near my current location");
}

function inferCategories(
  text: string,
  mood: ParsedRequest["mood"],
  templateCategories?: CategoryId[]
): CategoryId[] {
  const source = text.trim().toLowerCase();
  const hits = (Object.entries(categoryKeywords) as [CategoryId, string[]][])
    .map(([category, keywords]) => {
      const matched = keywords.filter((keyword) => source.includes(keyword.toLowerCase()));
      if (!matched.length) return null;
      return {
        category,
        index: Math.min(...matched.map((keyword) => source.indexOf(keyword.toLowerCase()))),
        score: matched.length,
      };
    })
    .filter(Boolean) as Array<{ category: CategoryId; index: number; score: number }>;

  if (hits.length) return hits.sort((a, b) => a.index - b.index || b.score - a.score).map((item) => item.category);
  if (templateCategories?.length) return [...templateCategories];
  if (mood === "slow") return ["cafe", "bookstore", "gallery"];
  if (mood === "scenic") return ["walk", "riverside", "dessert"];
  if (mood === "efficient") return ["food", "grocery", "cafe"];
  return ["food", "walk", "grocery"];
}

function inferMood(text: string): ParsedRequest["mood"] {
  const source = text.trim().toLowerCase();
  if (["慢一点", "放松", "松弛", "随便走走", "relax", "slow", "chill", "easygoing"].some((token) => source.includes(token))) return "slow";
  if (["高效", "不折腾", "顺路", "快一点", "赶时间", "efficient", "quick", "fast", "low friction"].some((token) => source.includes(token))) return "efficient";
  if (["散步", "city walk", "walk", "江边", "河边", "湖边", "看夜景", "氛围", "scenic", "riverside", "waterfront"].some((token) => source.includes(token))) return "scenic";
  return "balanced";
}

function chooseClusterRanking(
  categories: CategoryId[],
  venuePool: Venue[] | null,
  liveMode: boolean,
  preferredClusterId?: ClusterId | null,
  startCoordinates?: Coordinates | null
) {
  if (liveMode) return ["live"] as ClusterId[];
  const pool = venuePool?.length ? venuePool : cityDriftData.venues;
  const clusters = Object.keys(cityDriftData.clusters) as Exclude<ClusterId, "live">[];
  return clusters
    .map((clusterId) => {
      const clusterVenues = pool.filter((venue) => venue.cluster === clusterId);
      const score =
        categories.reduce((sum, category) => sum + (clusterVenues.some((venue) => matchesCategory(venue, category)) ? 3 : 0), 0) +
        (preferredClusterId === clusterId ? 4 : 0) +
        getClusterDistanceScore(clusterVenues, startCoordinates);
      return { clusterId, score };
    })
    .sort((left, right) => right.score - left.score)
    .map((item) => item.clusterId);
}

function buildStylesByMood(mood: ParsedRequest["mood"]): RouteStyle[] {
  if (mood === "scenic" || mood === "slow") return ["scenic", "balanced", "efficient"];
  if (mood === "efficient") return ["efficient", "balanced", "scenic"];
  return ["balanced", "efficient", "scenic"];
}

function expandCategories(baseCategories: CategoryId[], timeHours: number, style: RouteStyle, mood: ParsedRequest["mood"]) {
  const result = dedupe(baseCategories);
  const maxStops = timeHours <= 2.25 ? 2 : timeHours >= 4.5 ? 4 : 3;
  const fallbackByMood: CategoryId[] =
    mood === "slow"
      ? ["cafe", "bookstore", "dessert"]
      : mood === "scenic"
        ? ["walk", "riverside", "dessert"]
        : mood === "efficient"
          ? ["food", "grocery", "cafe"]
          : ["food", "walk", "grocery"];

  if (!result.length) result.push(...fallbackByMood);
  const queue = dedupe([...result.flatMap((category) => categoryCompanions[category] ?? []), ...styleMeta[style].fillers, ...fallbackByMood]);
  queue.forEach((candidate) => {
    if (result.length < maxStops && !result.includes(candidate)) result.push(candidate);
  });
  return result.slice(0, maxStops);
}

function applyScenarioToCategory(category: CategoryId, scenario: ParsedRequest["scenario"], language: AppLanguage) {
  if (scenario.weather === "rain" && outdoorCategories.has(category)) {
    const fallback = weatherFallbacks[category]?.[0] ?? "bookstore";
    return {
      requestedCategory: category,
      finalCategory: fallback,
      note: language === "zh"
        ? `下雨时优先把 ${getCategoryLabelLocalized(category, "zh")} 改成更稳妥的室内站点`
        : `Because of the rain, the ${getCategoryLabelLocalized(category, "en").toLowerCase()} stop was swapped to an indoor alternative.`,
    };
  }
  return { requestedCategory: category, finalCategory: category, note: null };
}

function buildRoute(
  parsed: ParsedRequest,
  clusterId: ClusterId,
  style: RouteStyle,
  routeIndex: number,
  options: GenerationOptions,
  language: AppLanguage
): RouteOption {
  const providedPool = options.venuePool ?? null;
  const sourcePool = options.liveMode || providedPool?.length ? providedPool ?? [] : cityDriftData.venues;
  const categories = expandCategories(parsed.categories, parsed.timeHours, style, parsed.mood);
  const used = new Set<string>();
  const adjustments: string[] = [];
  const stops: RouteStop[] = [];
  const clusterMeta = resolveClusterMeta(clusterId, options, language);
  let currentCoordinates = options.startCoordinates ?? getClusterAnchor(clusterId, sourcePool);

  categories.forEach((category) => {
    const adjusted = applyScenarioToCategory(category, parsed.scenario, language);
    let venue = findVenue(
      adjusted.finalCategory,
      sourcePool,
      clusterId,
      used,
      parsed,
      currentCoordinates,
      style,
      parsed.categories,
      routeIndex
    );

    if (!venue) {
      const fallbackVenue = findFallbackVenue(
        sourcePool,
        used,
        parsed,
        currentCoordinates,
        style,
        parsed.categories,
        routeIndex
      );
      if (!fallbackVenue) {
        adjustments.push(language === "zh"
          ? `附近暂时没有找到足够合适的 ${getCategoryLabelLocalized(adjusted.finalCategory, "zh")} 站点`
          : `There are not enough nearby places that fit the ${getCategoryLabelLocalized(adjusted.finalCategory, "en").toLowerCase()} part of this plan.`);
        return;
      }

      venue = fallbackVenue;
      const fallbackCategory = fallbackVenue.categories[0] ?? adjusted.finalCategory;
      adjustments.push(language === "zh"
        ? `附近暂无理想的 ${getCategoryLabelLocalized(adjusted.finalCategory, "zh")}，已改用附近可执行的 ${getCategoryLabelLocalized(fallbackCategory, "zh")} 补位`
        : `A nearby ${getCategoryLabelLocalized(adjusted.finalCategory, "en").toLowerCase()} stop was not available, so Wander filled the route with a reachable ${getCategoryLabelLocalized(fallbackCategory, "en").toLowerCase()} stop instead.`);
    }

    if (adjusted.note) adjustments.push(adjusted.note);

    used.add(venue.id);
    const venueCoordinates = getVenueCoordinates(venue);
    const travel = currentCoordinates ? estimateTravel(distanceMetersBetweenCoordinates(currentCoordinates, venueCoordinates), style, language) : null;
    const localizedVenue = localizeVenueForRoute(venue, category, language, routeIndex, stops.length);

    stops.push({
      ...localizedVenue,
      requestedCategory: category,
      visitLabel: buildVisitLabel(localizedVenue.duration, language),
      travelFromPrevious: travel
        ? stops.length === 0
          ? buildStartTravelLabel(parsed.startPoint, travel.label, language)
          : travel.label
        : undefined,
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
  const fitScore = Math.min(97, 64 + hitCount * 9 + Math.max(0, stops.length - 2) * 4 + (parsed.scenario.weather === "rain" || parsed.scenario.venue === "closed" ? -2 : 3) - routeIndex);

  return {
    id: `${clusterId}-${style}`,
    clusterId,
    clusterLabel: clusterMeta.label,
    clusterAccent: clusterMeta.accent,
    title: `${clusterMeta.label} · ${styleMeta[style].title[language]}`,
    subtitle: styleMeta[style].detail[language],
    style,
    fitScore,
    totalMinutes,
    bufferMinutes: Math.max(0, parsed.timeMinutes - totalMinutes),
    hitCount,
    stops,
    adjustments: dedupe(adjustments),
    summary: buildRouteSummary(parsed, stops, totalMinutes, language),
    transitSummary: buildTransitSummary(totalTransitMinutes, maxLegDistance, language),
  };
}

function resolveClusterMeta(clusterId: ClusterId, options: GenerationOptions, language: AppLanguage) {
  const sanitize = (value: string) => sanitizeRouteText(value, language);

  if (clusterId === "live") {
    return {
      label: sanitize(options.liveClusterLabel || clusterMetaByLanguage[language].live.label),
      accent: sanitize(options.liveClusterAccent || clusterMetaByLanguage[language].live.accent),
    };
  }

  const meta = clusterMetaByLanguage[language][clusterId];
  return {
    label: sanitize(meta.label),
    accent: sanitize(meta.accent),
  };
}

function findVenue(
  category: CategoryId,
  pool: Venue[],
  clusterId: ClusterId,
  excludedIds: Set<string>,
  parsed: ParsedRequest,
  origin: Coordinates | null,
  style: RouteStyle,
  requestedCategories: CategoryId[],
  routeIndex: number
) {
  const candidates = pool.filter(
    (venue) =>
      !excludedIds.has(venue.id) &&
      matchesCategory(venue, category) &&
      !(parsed.scenario.venue === "closed" && venue.demoCanClose)
  );

  const requiredSearchTerms = dedupe([
    ...(parsed.requiredTermsByCategory[category] ?? []),
    ...(category === "food" ? parsed.requiredTermsByCategory.sichuan ?? [] : []),
  ]);
  const targetedCandidates = requiredSearchTerms.length
    ? candidates.filter((venue) => venueMatchesSearchTerms(venue, requiredSearchTerms))
    : candidates;
  const activeCandidates = targetedCandidates.length ? targetedCandidates : candidates;

  const ranked = activeCandidates
    .map((venue) => ({
      venue,
      score: scoreVenue(venue, clusterId, origin, style, requestedCategories, category, parsed),
    }))
    .sort((left, right) => right.score - left.score);

  return pickVariantCandidate(ranked, routeIndex, style);
}

function findFallbackVenue(
  pool: Venue[],
  excludedIds: Set<string>,
  parsed: ParsedRequest,
  origin: Coordinates | null,
  style: RouteStyle,
  requestedCategories: CategoryId[],
  routeIndex: number
) {
  const fallbackCategory = requestedCategories[0] ?? "food";
  const candidates = pool.filter(
    (venue) => !excludedIds.has(venue.id) && !(parsed.scenario.venue === "closed" && venue.demoCanClose)
  );

  const ranked = candidates
    .map((venue) => ({
      venue,
      score: scoreVenue(venue, "live", origin, style, requestedCategories, fallbackCategory, parsed),
    }))
    .sort((left, right) => right.score - left.score);

  return pickVariantCandidate(ranked, routeIndex, style);
}

function pickVariantCandidate(
  ranked: Array<{ venue: Venue; score: number }>,
  routeIndex: number,
  style: RouteStyle
) {
  if (!ranked.length) {
    return null;
  }

  const topScore = ranked[0].score;
  const tolerance = style === "scenic" ? 5.5 : style === "efficient" ? 4 : 4.8;
  const closeMatches = ranked.filter((item) => topScore - item.score <= tolerance);
  const offset = Math.min(routeIndex, Math.max(0, closeMatches.length - 1));

  return (closeMatches[offset] ?? ranked[0]).venue;
}

function matchesCategory(venue: Venue | RouteStop, category: CategoryId) {
  if (venue.categories.includes(category)) return true;
  if (category === "food") return venue.categories.includes("food") || venue.categories.includes("sichuan");
  if (category === "market") return venue.categories.includes("market") || venue.categories.includes("grocery");
  if (category === "walk") return venue.categories.includes("walk") || venue.categories.includes("park") || venue.categories.includes("riverside");
  if (category === "riverside") return venue.categories.includes("riverside") || venue.categories.includes("walk");
  if (category === "cafe") return venue.categories.includes("cafe") || venue.categories.includes("bookstore");
  return false;
}

function calculateMinutes(stops: RouteStop[]) {
  return stops.reduce((sum, stop) => sum + stop.duration + (stop.travelMinutesFromPrevious ?? 0), 0);
}

function trimStopsToBudget(stops: RouteStop[], targetMinutes: number, isLiveMode: boolean) {
  const minimumStops = isLiveMode ? 1 : targetMinutes <= 150 ? 2 : 3;
  while (stops.length > minimumStops) {
    if (calculateMinutes(stops) <= targetMinutes + 15) break;
    stops.pop();
  }
}

function localizeVenueForRoute(
  venue: Venue,
  requestedCategory: CategoryId,
  language: AppLanguage,
  routeIndex: number,
  stopIndex: number
): Venue {
  if (language === "zh") return venue;

  return {
    ...venue,
    summary: buildEnglishStopSummary(venue, requestedCategory),
    crowd: buildEnglishCrowdLine(venue),
    hours: localizeHours(venue.hours, "en"),
    tags: buildEnglishTags(venue, routeIndex, stopIndex),
    sourceLabel: venue.sourceType === "open-live" ? "OpenStreetMap live POI" : "Wander curated venue",
    ugc: {
      author: venue.ugc.author,
      verified: venue.sourceType === "open-live" ? "OpenStreetMap live signal" : "Visit-verified note",
      title: buildEnglishUgcTitle(venue, requestedCategory),
      stay: buildVisitLabel(venue.duration, "en"),
      tip: buildEnglishTip(venue, requestedCategory),
    },
  };
}

function buildEnglishStopSummary(venue: Venue, requestedCategory: CategoryId) {
  const label = getCategoryLabelLocalized(requestedCategory, "en").toLowerCase();
  const distanceNote = venue.distanceFromStartMeters != null ? ` about ${formatDistance(venue.distanceFromStartMeters, "en")} from your current start` : "";
  return venue.sourceType === "open-live"
    ? `${venue.name} is${distanceNote} and works well as a ${label} stop in this route.`
    : `${venue.name} fits the ${label} part of this outing without adding too much extra detour.`;
}

function buildEnglishCrowdLine(venue: Venue) {
  if (venue.outdoor) return "Best around late afternoon or early evening for a lighter stop.";
  if (venue.duration <= 25) return "Quick stop that keeps the route easy to execute.";
  if (venue.duration <= 45) return "Works well as a short mid-route pause.";
  return "Better when you want a fuller stop without rushing the next leg.";
}

function buildEnglishTags(venue: Venue, routeIndex: number, stopIndex: number) {
  const categoryTags = dedupe(venue.categories.map((category) => getCategoryLabelLocalized(category, "en")));
  const rhythmTag = venue.duration <= 25 ? "Quick stop" : venue.duration <= 45 ? "Easy pause" : "Longer stay";
  const sourceTag = venue.sourceType === "open-live" ? "Live POI" : "Curated stop";
  const variationTag = routeIndex === 0 ? "Primary match" : stopIndex % 2 === 0 ? "Alt option" : "Route variant";
  return dedupe([...categoryTags.slice(0, 2), rhythmTag, sourceTag, variationTag]).slice(0, 4);
}

function buildEnglishUgcTitle(venue: Venue, requestedCategory: CategoryId) {
  const label = getCategoryLabelLocalized(requestedCategory, "en").toLowerCase();
  return venue.sourceType === "open-live"
    ? `Live POI digest for a ${label} stop near your current area.`
    : `This stop keeps the ${label} part of the plan practical and easy to follow.`;
}

function buildEnglishTip(venue: Venue, requestedCategory: CategoryId) {
  const label = getCategoryLabelLocalized(requestedCategory, "en").toLowerCase();
  if (venue.outdoor) return `Keep this ${label} stop flexible in case the weather changes.`;
  if (venue.duration <= 25) return `Treat this as a short ${label} checkpoint so the rest of the route still feels light.`;
  return `Use this ${label} stop as the main pause before moving to the next part of the route.`;
}

function buildVisitLabel(duration: number, language: AppLanguage) {
  const lower = Math.max(10, duration - 10);
  const upper = duration + 10;
  return language === "zh" ? `建议停留 ${lower}-${upper} 分钟` : `Suggested stay ${lower}-${upper} min`;
}

function buildStartTravelLabel(startLabel: string, travelLabel: string, language: AppLanguage) {
  return language === "zh" ? `从 ${startLabel} 出发 · ${travelLabel}` : `From ${startLabel} · ${travelLabel}`;
}

function buildRouteSummary(parsed: ParsedRequest, stops: RouteStop[], totalMinutes: number, language: AppLanguage) {
  const stopLabels = stops.map((stop) => stop.name).join(language === "zh" ? " → " : " -> ");
  return language === "zh"
    ? `从 ${parsed.startPoint} 出发，用 ${formatHours(totalMinutes, "zh")} 完成 ${stopLabels}。`
    : `Start from ${parsed.startPoint}, spend ${formatHours(totalMinutes, "en")}, and complete ${stopLabels}.`;
}

function buildTransitSummary(totalTransitMinutes: number, maxLegDistance: number, language: AppLanguage) {
  if (!totalTransitMinutes) {
    return language === "zh" ? "站点都在附近，可以用轻量步行串联" : "Stops stay close enough to connect with a light walk.";
  }

  return language === "zh"
    ? `${totalTransitMinutes} 分钟在路上 · 最远一段 ${formatDistance(maxLegDistance, "zh")}`
    : `${totalTransitMinutes} min in transit · longest leg ${formatDistance(maxLegDistance, "en")}`;
}

function formatTimeBudget(totalMinutes: number, language: AppLanguage) {
  if (totalMinutes <= 0) return language === "zh" ? "0 小时 0 分钟" : "0 hr 0 min";
  return formatHours(totalMinutes, language);
}

function getClusterDistanceScore(venues: Venue[], startCoordinates?: Coordinates | null) {
  if (!startCoordinates || !venues.length) return 0;
  const nearestDistanceKm = Math.min(...venues.map((venue) => distanceMetersBetweenCoordinates(startCoordinates, getVenueCoordinates(venue)))) / 1000;
  return Math.max(0, 8 - nearestDistanceKm * 2.2);
}

function scoreVenue(
  venue: Venue,
  clusterId: ClusterId,
  origin: Coordinates | null,
  style: RouteStyle,
  requestedCategories: CategoryId[],
  targetCategory: CategoryId,
  parsed: ParsedRequest
) {
  const distancePenalty = origin ? distanceMetersBetweenCoordinates(origin, getVenueCoordinates(venue)) / 260 : 0;
  const clusterBonus = clusterId === "live" ? 7 : venue.cluster === clusterId ? 10 : 0;
  const scenicBonus = style === "scenic" && (venue.outdoor || venue.categories.includes("riverside")) ? 6 : 0;
  const efficientBonus =
    style === "efficient" &&
    ((venue.distanceFromStartMeters ?? Number.POSITIVE_INFINITY) < 1800 || venue.duration <= 30)
      ? 5
      : 0;
  const liveDistanceBonus = venue.distanceFromStartMeters != null ? Math.max(0, 12 - venue.distanceFromStartMeters / 420) : 0;
  const requestedBonus = requestedCategories.filter((category) => matchesCategory(venue, category)).length * 3;
  const targetBonus = matchesCategory(venue, targetCategory) ? 12 : 0;
  const weatherBonus =
    parsed.scenario.weather === "rain" ? (venue.outdoor ? -6 : 4) : venue.outdoor ? 1 : 0;
  const durationBonus = scoreDurationFit(venue.duration, parsed.timeMinutes, parsed.mood);
  const promptBonus = scorePromptAffinity(venue, parsed.rawText, parsed.mood, targetCategory);
  const keywordBonus = scoreVenueSearchTerms(venue, parsed.searchTerms) * 1.6;

  return (
    venue.rating * 22 +
    clusterBonus +
    scenicBonus +
    efficientBonus +
    liveDistanceBonus +
    requestedBonus +
    targetBonus +
    weatherBonus +
    durationBonus +
    keywordBonus +
    promptBonus -
    distancePenalty
  );
}

function scoreDurationFit(duration: number, totalTimeMinutes: number, mood: ParsedRequest["mood"]) {
  if (totalTimeMinutes <= 120) {
    if (duration <= 25) return 5;
    if (duration <= 40) return 2;
    return -3;
  }

  if (mood === "slow" && duration >= 35) return 3;
  if (mood === "efficient" && duration <= 30) return 3;
  if (totalTimeMinutes >= 240 && duration >= 40) return 2;

  return 0;
}

function scorePromptAffinity(
  venue: Venue,
  rawText: string,
  mood: ParsedRequest["mood"],
  targetCategory: CategoryId
) {
  const prompt = normalizeText(rawText);
  if (!prompt) {
    return 0;
  }

  const venueText = buildVenueSearchText(venue);
  let score = 0;

  if (
    containsAny(prompt, categoryKeywords[targetCategory]) &&
    containsAny(venueText, categoryKeywords[targetCategory])
  ) {
    score += 6;
  }

  if (containsAny(prompt, quietTokens) && containsAny(venueText, quietTokens)) {
    score += 5;
  }

  if (containsAny(prompt, scenicTokens) && containsAny(venueText, scenicTokens)) {
    score += 5;
  }

  if (containsAny(prompt, efficientTokens) && containsAny(venueText, efficientTokens)) {
    score += 5;
  }

  if (containsAny(prompt, indoorTokens) && !venue.outdoor) {
    score += 4;
  }

  if (containsAny(prompt, nearbyTokens)) {
    const distance = venue.distanceFromStartMeters ?? Number.POSITIVE_INFINITY;
    if (distance <= 1200) score += 5;
    else if (distance <= 2400) score += 2;
  }

  if (containsAny(prompt, shortStopTokens) && venue.duration <= 30) {
    score += 3;
  }

  if (containsAny(prompt, longStopTokens) && venue.duration >= 40) {
    score += 2;
  }

  if (mood === "slow" && (containsAny(venueText, quietTokens) || venue.duration >= 35)) {
    score += 3;
  }

  if (mood === "scenic" && (containsAny(venueText, scenicTokens) || venue.outdoor)) {
    score += 3;
  }

  if (mood === "efficient" && (containsAny(venueText, efficientTokens) || venue.duration <= 30)) {
    score += 3;
  }

  return score;
}

function buildVenueSearchText(venue: Venue) {
  const categoryText = venue.categories.flatMap((category) => categoryKeywords[category] ?? []).join(" ");
  const vibeText = [
    venue.outdoor ? scenicTokens.join(" ") : indoorTokens.join(" "),
    venue.duration <= 30 ? efficientTokens.join(" ") : quietTokens.join(" "),
  ].join(" ");

  return normalizeText(
    [
      venue.name,
      venue.area,
      venue.address,
      venue.summary,
      venue.crowd,
      venue.hours,
      venue.tags.join(" "),
      venue.ugc.title,
      venue.ugc.tip,
      venue.ugc.verified,
      categoryText,
      vibeText,
    ].join(" ")
  );
}

function getClusterAnchor(clusterId: ClusterId, pool: Venue[]) {
  const fallback = pool[0] ?? cityDriftData.venues[0];
  const clusterVenue = pool.find((venue) => venue.cluster === clusterId) ?? fallback;
  return getVenueCoordinates(clusterVenue);
}

function getVenueCoordinates(venue: Venue): Coordinates {
  return { latitude: venue.latitude, longitude: venue.longitude };
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

function estimateTravel(distanceMeters: number, style: RouteStyle, language: AppLanguage) {
  if (distanceMeters < 900) {
    const minutes = Math.max(4, Math.round(distanceMeters / 78));
    return { label: language === "zh" ? `步行 ${minutes} 分钟 · ${formatDistance(distanceMeters, "zh")}` : `Walk ${minutes} min · ${formatDistance(distanceMeters, "en")}`, minutes, distanceMeters };
  }

  if (distanceMeters < 2200) {
    if (style === "efficient") {
      const minutes = Math.max(6, Math.round(distanceMeters / 210));
      return { label: language === "zh" ? `骑行 ${minutes} 分钟 · ${formatDistance(distanceMeters, "zh")}` : `Bike ${minutes} min · ${formatDistance(distanceMeters, "en")}`, minutes, distanceMeters };
    }

    const minutes = Math.max(10, Math.round(distanceMeters / 85));
    return { label: language === "zh" ? `步行 ${minutes} 分钟 · ${formatDistance(distanceMeters, "zh")}` : `Walk ${minutes} min · ${formatDistance(distanceMeters, "en")}`, minutes, distanceMeters };
  }

  if (distanceMeters < 5000) {
    const minutes = style === "efficient" ? Math.max(10, Math.round(distanceMeters / 360) + 4) : Math.max(14, Math.round(distanceMeters / 300) + 5);
    const modeLabel = style === "efficient" ? (language === "zh" ? "骑行" : "Bike") : (language === "zh" ? "公交/打车" : "Transit / Ride");
    return { label: `${modeLabel} ${minutes} ${language === "zh" ? "分钟" : "min"} · ${formatDistance(distanceMeters, language)}`, minutes, distanceMeters };
  }

  const minutes = Math.max(18, Math.round(distanceMeters / 330) + 7);
  return { label: language === "zh" ? `公交/打车 ${minutes} 分钟 · ${formatDistance(distanceMeters, "zh")}` : `Transit / Ride ${minutes} min · ${formatDistance(distanceMeters, "en")}`, minutes, distanceMeters };
}

function formatDistance(distanceMeters: number, language: AppLanguage) {
  if (distanceMeters < 1000) return language === "zh" ? `${Math.round(distanceMeters)} 米` : `${Math.round(distanceMeters)} m`;
  return language === "zh" ? `${(distanceMeters / 1000).toFixed(1)} 公里` : `${(distanceMeters / 1000).toFixed(1)} km`;
}

function sanitizeRouteCopy(route: RouteOption, language: AppLanguage): RouteOption {
  return {
    ...route,
    clusterLabel: sanitizeRouteText(route.clusterLabel, language),
    clusterAccent: sanitizeRouteText(route.clusterAccent, language),
    title: sanitizeRouteText(route.title, language),
    subtitle: sanitizeRouteText(route.subtitle, language),
    summary: sanitizeRouteText(route.summary, language),
    transitSummary: sanitizeRouteText(route.transitSummary, language),
    adjustments: route.adjustments.map((item) => sanitizeRouteText(item, language)),
    stops: route.stops.map((stop) => ({
      ...stop,
      visitLabel: sanitizeRouteText(stop.visitLabel, language),
      travelFromPrevious: stop.travelFromPrevious
        ? sanitizeRouteText(stop.travelFromPrevious, language)
        : undefined,
      summary: sanitizeRouteText(stop.summary, language),
      crowd: sanitizeRouteText(stop.crowd, language),
      hours: sanitizeRouteText(stop.hours, language),
      tags: stop.tags.map((tag) => sanitizeRouteText(tag, language)),
      ugc: {
        ...stop.ugc,
        verified: sanitizeRouteText(stop.ugc.verified, language),
        title: sanitizeRouteText(stop.ugc.title, language),
        stay: sanitizeRouteText(stop.ugc.stay, language),
        tip: sanitizeRouteText(stop.ugc.tip, language),
      },
    })),
  };
}

function sanitizeRouteText(text: string, language: AppLanguage) {
  if (language !== "en") {
    return text;
  }

  return text
    .replace(/\s+路\s+/g, " · ")
    .replace(/Jing'an 路/g, "Jing'an ")
    .replace(/Xuhui 路/g, "Xuhui ")
    .replace(/Huangpu 路/g, "Huangpu ")
    .replace(/Nearby 路/g, "Nearby ");
}

function localizeHours(hours: string, language: AppLanguage) {
  if (language === "zh") return hours;
  if (hours.includes("全天开放")) return "Open all day";
  if (hours.includes("未提供营业时间")) return "Opening hours not provided";
  return hours;
}

function getCategoryLabelLocalized(category: CategoryId, language: AppLanguage) {
  return categoryLabels[language][category];
}

function clampTimeMinutes(minutes: number, minimum = 30) {
  return Math.max(minimum, Math.min(12 * 60, Math.round(minutes)));
}

function normalizeText(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function containsAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

function dedupe<T>(items: T[]) {
  return [...new Set(items)];
}
