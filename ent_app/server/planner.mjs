import {
  fetchDrivingRouteFromAmap,
  fetchWalkingRouteFromAmap,
  fetchWeatherWithAmap,
  getAmapConfig,
  reverseGeocodeWithAmap,
  searchPlacesWithAmap,
} from "./amap.mjs";

const supportedCategories = [
  "food",
  "sichuan",
  "cinema",
  "park",
  "walk",
  "grocery",
  "cafe",
  "bookstore",
  "gallery",
  "dessert",
  "riverside",
  "market",
];

const routeStyles = ["balanced", "efficient", "scenic"];

const categoryFallbackTerms = {
  food: ["餐厅", "restaurant", "meal"],
  sichuan: ["火锅", "hotpot", "川菜"],
  cinema: ["电影院", "影城", "cinema"],
  park: ["公园", "park", "garden"],
  walk: ["步道", "walk", "greenway"],
  grocery: ["超市", "便利店", "supermarket"],
  cafe: ["咖啡", "cafe", "coffee"],
  bookstore: ["书店", "bookstore", "bookshop"],
  gallery: ["展览", "gallery", "museum"],
  dessert: ["甜品", "dessert", "bakery"],
  riverside: ["江边", "河边", "riverside"],
  market: ["市集", "market", "marketplace"],
};

const categoryRequiredFallback = {
  food: ["餐", "restaurant"],
  sichuan: ["火锅", "hotpot", "川"],
  cinema: ["影", "cinema", "movie"],
  park: ["公园", "park"],
  walk: ["步", "walk"],
  grocery: ["超市", "便利", "mart"],
  cafe: ["咖啡", "cafe"],
  bookstore: ["书", "book"],
  gallery: ["展", "gallery", "museum"],
  dessert: ["甜", "dessert", "cake"],
  riverside: ["河", "江", "water"],
  market: ["市集", "market"],
};

const heuristicCategoryKeywords = {
  cinema: ["电影院", "电影", "影城", "cinema", "movie", "film", "imax"],
  sichuan: ["火锅", "hotpot", "串串", "川菜", "冒菜", "麻辣烫"],
  park: ["公园", "park", "garden"],
  walk: ["散步", "步道", "city walk", "walk", "stroll", "trail", "greenway"],
  grocery: ["超市", "便利店", "grocery", "supermarket", "mart"],
  cafe: ["咖啡", "cafe", "coffee"],
  bookstore: ["书店", "bookstore", "bookshop", "book"],
  gallery: ["展览", "美术馆", "博物馆", "gallery", "museum", "exhibition"],
  dessert: ["甜品", "蛋糕", "dessert", "cake", "bakery"],
  riverside: ["江边", "河边", "湖边", "riverside", "waterfront"],
  market: ["市集", "market", "marketplace", "bazaar"],
  food: ["吃", "餐厅", "restaurant", "meal", "dinner", "lunch", "food"],
};

const expandedCategoryDefinitions = {
  food: {
    labels: { zh: "餐厅", en: "Meal" },
    aliases: ["吃饭", "餐厅", "饭店", "晚饭", "午饭", "美食", "简餐", "restaurant", "meal", "food", "dinner", "lunch", "eat"],
    required: ["餐厅", "饭店", "美食", "restaurant", "food"],
    duration: 60,
    min: 45,
    max: 120,
    outdoor: false,
  },
  hotpot: {
    labels: { zh: "火锅", en: "Hotpot" },
    aliases: ["火锅", "涮锅", "重庆火锅", "牛肉火锅", "潮汕牛肉火锅", "海底捞", "hotpot"],
    required: ["火锅", "涮锅", "hotpot"],
    duration: 75,
    min: 55,
    max: 135,
    outdoor: false,
  },
  sichuan: {
    labels: { zh: "川菜", en: "Sichuan Food" },
    aliases: ["川菜", "四川菜", "麻辣", "串串", "冒菜", "钵钵鸡", "spicy", "sichuan"],
    required: ["川菜", "四川", "麻辣", "串串", "冒菜", "sichuan"],
    duration: 70,
    min: 50,
    max: 125,
    outdoor: false,
  },
  bbq: {
    labels: { zh: "烧烤", en: "BBQ" },
    aliases: ["烧烤", "烤肉", "烤串", "串烧", "bbq", "barbecue", "grill"],
    required: ["烧烤", "烤肉", "烤串", "bbq"],
    duration: 70,
    min: 50,
    max: 130,
    outdoor: false,
  },
  japanese_food: {
    labels: { zh: "日料", en: "Japanese Food" },
    aliases: ["日料", "日本料理", "寿司", "拉面", "居酒屋", "japanese", "sushi", "ramen", "izakaya"],
    required: ["日料", "日本料理", "寿司", "japanese", "sushi"],
    duration: 65,
    min: 45,
    max: 120,
    outdoor: false,
  },
  korean_food: {
    labels: { zh: "韩餐", en: "Korean Food" },
    aliases: ["韩餐", "韩国料理", "部队锅", "韩式烤肉", "korean"],
    required: ["韩餐", "韩国料理", "korean"],
    duration: 65,
    min: 45,
    max: 120,
    outdoor: false,
  },
  western_food: {
    labels: { zh: "西餐", en: "Western Food" },
    aliases: ["西餐", "牛排", "意面", "披萨", "brunch", "western", "steak", "pizza", "pasta"],
    required: ["西餐", "牛排", "披萨", "western", "pizza", "steak"],
    duration: 70,
    min: 45,
    max: 130,
    outdoor: false,
  },
  noodles: {
    labels: { zh: "面馆", en: "Noodles" },
    aliases: ["面馆", "面条", "拉面", "米粉", "馄饨", "noodle", "noodles"],
    required: ["面", "粉", "馄饨", "noodle"],
    duration: 45,
    min: 25,
    max: 80,
    outdoor: false,
  },
  fast_food: {
    labels: { zh: "快餐", en: "Fast Food" },
    aliases: ["快餐", "汉堡", "炸鸡", "麦当劳", "肯德基", "fast food", "burger", "fried chicken"],
    required: ["快餐", "汉堡", "炸鸡", "fast food", "burger"],
    duration: 35,
    min: 20,
    max: 65,
    outdoor: false,
  },
  cinema: {
    labels: { zh: "电影院", en: "Cinema" },
    aliases: ["电影", "电影院", "影院", "影城", "看电影", "cinema", "movie", "film", "imax"],
    required: ["电影", "影院", "影城", "cinema", "movie"],
    duration: 125,
    min: 90,
    max: 190,
    outdoor: false,
  },
  park: {
    labels: { zh: "公园", en: "Park" },
    aliases: ["公园", "绿地", "花园", "园林", "草坪", "park", "garden", "green space"],
    required: ["公园", "绿地", "park", "garden"],
    duration: 45,
    min: 30,
    max: 130,
    outdoor: true,
  },
  walk: {
    labels: { zh: "散步", en: "Walk" },
    aliases: ["散步", "走走", "逛逛", "city walk", "步道", "walk", "stroll", "trail", "greenway"],
    required: ["散步", "步道", "walk", "stroll"],
    duration: 40,
    min: 25,
    max: 120,
    outdoor: true,
  },
  riverside: {
    labels: { zh: "滨水散步", en: "Riverside Walk" },
    aliases: ["江边", "河边", "湖边", "滨水", "滨江", "riverside", "waterfront", "river", "lake"],
    required: ["江边", "河边", "滨水", "riverside", "waterfront"],
    duration: 45,
    min: 30,
    max: 130,
    outdoor: true,
  },
  shopping_mall: {
    labels: { zh: "商场", en: "Shopping Mall" },
    aliases: ["商场", "购物中心", "广场", "综合体", "mall", "shopping mall", "shopping center"],
    required: ["商场", "购物中心", "mall"],
    duration: 70,
    min: 35,
    max: 160,
    outdoor: false,
  },
  grocery: {
    labels: { zh: "超市补给", en: "Groceries" },
    aliases: ["超市", "便利店", "生鲜", "买菜", "补给", "grocery", "supermarket", "mart"],
    required: ["超市", "便利", "生鲜", "supermarket", "mart"],
    duration: 25,
    min: 15,
    max: 60,
    outdoor: false,
  },
  market: {
    labels: { zh: "市集", en: "Market" },
    aliases: ["市集", "菜场", "集市", "夜市", "market", "bazaar", "marketplace"],
    required: ["市集", "市场", "market"],
    duration: 35,
    min: 20,
    max: 85,
    outdoor: true,
  },
  cafe: {
    labels: { zh: "咖啡", en: "Cafe" },
    aliases: ["咖啡", "咖啡店", "咖啡馆", "coffee", "cafe", "latte"],
    required: ["咖啡", "coffee", "cafe"],
    duration: 45,
    min: 25,
    max: 90,
    outdoor: false,
  },
  tea: {
    labels: { zh: "茶饮", en: "Tea" },
    aliases: ["奶茶", "茶饮", "茶馆", "茶室", "喝茶", "tea", "milk tea", "teahouse"],
    required: ["奶茶", "茶", "tea"],
    duration: 35,
    min: 20,
    max: 80,
    outdoor: false,
  },
  dessert: {
    labels: { zh: "甜品", en: "Dessert" },
    aliases: ["甜品", "甜点", "蛋糕", "冰淇淋", "dessert", "cake", "ice cream", "sweet"],
    required: ["甜品", "蛋糕", "dessert", "cake"],
    duration: 35,
    min: 20,
    max: 75,
    outdoor: false,
  },
  bakery: {
    labels: { zh: "面包烘焙", en: "Bakery" },
    aliases: ["面包", "烘焙", "面包店", "贝果", "bakery", "bread", "pastry", "bagel"],
    required: ["面包", "烘焙", "bakery", "bread"],
    duration: 30,
    min: 15,
    max: 65,
    outdoor: false,
  },
  bookstore: {
    labels: { zh: "书店", en: "Bookstore" },
    aliases: ["书店", "书吧", "阅读", "看书", "bookstore", "bookshop", "reading"],
    required: ["书店", "书吧", "bookstore", "book"],
    duration: 55,
    min: 35,
    max: 110,
    outdoor: false,
  },
  gallery: {
    labels: { zh: "看展", en: "Gallery" },
    aliases: ["展览", "看展", "美术馆", "艺术馆", "gallery", "exhibition", "art"],
    required: ["展览", "美术馆", "艺术", "gallery", "exhibition"],
    duration: 70,
    min: 40,
    max: 130,
    outdoor: false,
  },
  museum: {
    labels: { zh: "博物馆", en: "Museum" },
    aliases: ["博物馆", "纪念馆", "科技馆", "museum", "science museum"],
    required: ["博物馆", "纪念馆", "museum"],
    duration: 80,
    min: 45,
    max: 150,
    outdoor: false,
  },
  library: {
    labels: { zh: "图书馆", en: "Library" },
    aliases: ["图书馆", "自习", "阅读空间", "library", "study"],
    required: ["图书馆", "library"],
    duration: 70,
    min: 35,
    max: 150,
    outdoor: false,
  },
  ktv: {
    labels: { zh: "KTV", en: "KTV" },
    aliases: ["ktv", "唱歌", "练歌房", "量贩式ktv", "karaoke"],
    required: ["ktv", "唱歌", "karaoke"],
    duration: 120,
    min: 80,
    max: 210,
    outdoor: false,
  },
  livehouse: {
    labels: { zh: "Livehouse", en: "Livehouse" },
    aliases: ["livehouse", "live house", "演出", "现场音乐", "音乐现场", "小酒馆演出", "concert"],
    required: ["livehouse", "演出", "音乐", "concert"],
    duration: 120,
    min: 75,
    max: 210,
    outdoor: false,
  },
  bar: {
    labels: { zh: "酒吧", en: "Bar" },
    aliases: ["酒吧", "小酒馆", "精酿", "清吧", "bar", "pub", "craft beer", "cocktail"],
    required: ["酒吧", "小酒馆", "bar", "pub"],
    duration: 80,
    min: 45,
    max: 160,
    outdoor: false,
  },
  board_game: {
    labels: { zh: "桌游", en: "Board Games" },
    aliases: ["桌游", "剧本杀", "狼人杀", "棋牌", "board game", "script murder"],
    required: ["桌游", "剧本杀", "棋牌", "board game"],
    duration: 120,
    min: 70,
    max: 220,
    outdoor: false,
  },
  escape_room: {
    labels: { zh: "密室", en: "Escape Room" },
    aliases: ["密室", "密室逃脱", "escape room"],
    required: ["密室", "escape room"],
    duration: 90,
    min: 60,
    max: 150,
    outdoor: false,
  },
  arcade: {
    labels: { zh: "电玩城", en: "Arcade" },
    aliases: ["电玩城", "游戏厅", "抓娃娃", "电玩", "arcade", "game center"],
    required: ["电玩城", "游戏厅", "arcade"],
    duration: 70,
    min: 35,
    max: 130,
    outdoor: false,
  },
  sports: {
    labels: { zh: "运动", en: "Sports" },
    aliases: ["运动", "球馆", "羽毛球", "篮球", "网球", "乒乓球", "攀岩", "sports", "badminton", "basketball", "tennis", "climbing"],
    required: ["运动", "球馆", "羽毛球", "篮球", "sports"],
    duration: 90,
    min: 50,
    max: 170,
    outdoor: false,
  },
  gym: {
    labels: { zh: "健身", en: "Gym" },
    aliases: ["健身", "健身房", "撸铁", "gym", "fitness"],
    required: ["健身", "健身房", "gym"],
    duration: 80,
    min: 45,
    max: 150,
    outdoor: false,
  },
  yoga: {
    labels: { zh: "瑜伽", en: "Yoga" },
    aliases: ["瑜伽", "普拉提", "pilates", "yoga"],
    required: ["瑜伽", "普拉提", "yoga", "pilates"],
    duration: 75,
    min: 45,
    max: 140,
    outdoor: false,
  },
  massage: {
    labels: { zh: "按摩", en: "Massage" },
    aliases: ["按摩", "足疗", "推拿", "spa", "massage", "foot massage"],
    required: ["按摩", "足疗", "推拿", "massage"],
    duration: 75,
    min: 45,
    max: 140,
    outdoor: false,
  },
  spa: {
    labels: { zh: "SPA", en: "SPA" },
    aliases: ["spa", "水疗", "汤泉", "洗浴", "汗蒸", "温泉", "bathhouse", "hot spring"],
    required: ["spa", "水疗", "汤泉", "洗浴", "温泉"],
    duration: 120,
    min: 70,
    max: 240,
    outdoor: false,
  },
  beauty: {
    labels: { zh: "美容美甲", en: "Beauty" },
    aliases: ["美容", "美甲", "美睫", "护肤", "beauty", "nail"],
    required: ["美容", "美甲", "beauty", "nail"],
    duration: 80,
    min: 45,
    max: 160,
    outdoor: false,
  },
  hair_salon: {
    labels: { zh: "理发", en: "Hair Salon" },
    aliases: ["理发", "剪头发", "发型", "美发", "hair salon", "haircut"],
    required: ["理发", "美发", "hair"],
    duration: 70,
    min: 40,
    max: 140,
    outdoor: false,
  },
  pharmacy: {
    labels: { zh: "药店", en: "Pharmacy" },
    aliases: ["药店", "买药", "药房", "pharmacy", "drugstore"],
    required: ["药店", "药房", "pharmacy"],
    duration: 20,
    min: 10,
    max: 45,
    outdoor: false,
  },
  clinic: {
    labels: { zh: "诊所", en: "Clinic" },
    aliases: ["诊所", "医院", "口腔", "眼科", "体检", "clinic", "hospital", "dental"],
    required: ["诊所", "医院", "clinic", "hospital"],
    duration: 80,
    min: 40,
    max: 180,
    outdoor: false,
  },
  parent_child: {
    labels: { zh: "亲子", en: "Family Activity" },
    aliases: ["亲子", "儿童乐园", "遛娃", "儿童", "family", "kids", "children"],
    required: ["亲子", "儿童", "kids", "family"],
    duration: 90,
    min: 45,
    max: 180,
    outdoor: false,
  },
  pet: {
    labels: { zh: "宠物友好", en: "Pet Friendly" },
    aliases: ["宠物", "猫咖", "狗咖", "宠物友好", "pet", "cat cafe", "dog cafe"],
    required: ["宠物", "猫", "狗", "pet"],
    duration: 60,
    min: 30,
    max: 120,
    outdoor: false,
  },
  photography: {
    labels: { zh: "拍照", en: "Photography" },
    aliases: ["拍照", "摄影", "写真", "出片", "photo", "photography"],
    required: ["拍照", "摄影", "photo"],
    duration: 60,
    min: 30,
    max: 130,
    outdoor: true,
  },
  landmark: {
    labels: { zh: "城市地标", en: "Landmark" },
    aliases: ["地标", "景点", "老街", "古镇", "历史街区", "landmark", "sightseeing", "scenic spot"],
    required: ["地标", "景点", "老街", "古镇", "landmark"],
    duration: 60,
    min: 30,
    max: 140,
    outdoor: true,
  },
  temple: {
    labels: { zh: "寺庙古迹", en: "Temple" },
    aliases: ["寺庙", "古迹", "道观", "教堂", "temple", "church", "historic site"],
    required: ["寺庙", "古迹", "temple", "church"],
    duration: 55,
    min: 30,
    max: 120,
    outdoor: true,
  },
  night_market: {
    labels: { zh: "夜市", en: "Night Market" },
    aliases: ["夜市", "小吃街", "夜宵街", "night market", "street food"],
    required: ["夜市", "小吃街", "night market"],
    duration: 70,
    min: 35,
    max: 140,
    outdoor: true,
  },
  coworking: {
    labels: { zh: "自习办公", en: "Coworking" },
    aliases: ["自习室", "共享办公", "办公", "工作空间", "coworking", "study room"],
    required: ["自习室", "共享办公", "coworking", "study"],
    duration: 90,
    min: 45,
    max: 240,
    outdoor: false,
  },
};

const categoryAliasToId = new Map();

registerCategoryTaxonomy();

const specificFoodCategories = new Set([
  "hotpot",
  "sichuan",
  "bbq",
  "japanese_food",
  "korean_food",
  "western_food",
  "noodles",
  "fast_food",
]);

export async function generatePlans({
  prompt,
  language,
  coordinates,
  locationLabel,
  timeBudgetMinutes,
  weather,
  venueStatus,
  qwenConfig,
}) {
  const amapConfig = getAmapConfig();
  const locationSnapshot = await withTimeout(
    reverseGeocodeWithAmap(coordinates, amapConfig),
    Number(process.env.WANDER_AMAP_REVERSE_TIMEOUT_MS || 5000),
    "AMap reverse geocode request timed out"
  ).catch((error) => {
    console.warn("[wander] reverse geocode fallback", error instanceof Error ? error.message : error);
    return buildFallbackLocationSnapshot(coordinates, locationLabel, language);
  });
  const weatherSnapshot = await withTimeout(
    fetchWeatherWithAmap(locationSnapshot.adcode, amapConfig),
    2500,
    "AMap weather request timed out"
  ).catch(() => null);
  const effectiveWeather = weather || weatherSnapshot?.weatherMode || "clear";
  const blueprintPayload = await withTimeout(
    planBlueprintsWithQwen({
      prompt,
      language,
      timeBudgetMinutes,
      weather: effectiveWeather,
      venueStatus,
      locationLabel: locationSnapshot.nearbyPlaceName || locationLabel,
      formattedAddress: locationSnapshot.formattedAddress,
      weatherText: weatherSnapshot?.weatherText || null,
      qwenConfig,
    }),
    Number(process.env.WANDER_QWEN_BLUEPRINT_TIMEOUT_MS || 18000),
    "Qwen blueprint request timed out"
  ).catch((error) => {
    console.warn("[wander] qwen blueprint fallback", error instanceof Error ? error.message : error);
    return normalizeBlueprintPayload({}, language, prompt, timeBudgetMinutes);
  });

  const radiusMeters = buildSearchRadius(timeBudgetMinutes);
  const candidateRegistry = new Set();
  const searchCache = new Map();
  const routeKeys = new Set();

  const buildAttempt = (blueprint, routeIndex, variantIndex) =>
    buildRouteFromBlueprint({
      blueprint,
      intent: blueprintPayload.intent,
      coordinates,
      radiusMeters,
      timeBudgetMinutes,
      weather: effectiveWeather,
      locationSnapshot,
      language,
      searchCache,
      candidateRegistry,
      amapConfig,
      routeIndex,
      variantIndex,
    }).catch(() => null);

  let routes = [];
  const primaryRoutes = await Promise.all(
    blueprintPayload.routeOptions.map((blueprint, routeIndex) =>
      buildAttempt(blueprint, routeIndex, routeIndex)
    )
  );

  for (const route of primaryRoutes) {
    addRouteIfUsable(route, routes, routeKeys, blueprintPayload.intent.categories);
  }

  for (let variantIndex = 1; variantIndex < 4 && routes.length < 3; variantIndex += 1) {
    const fallbackRoutes = await Promise.all(
      blueprintPayload.routeOptions.map((blueprint, routeIndex) =>
        buildAttempt(blueprint, routeIndex, variantIndex + routeIndex)
      )
    );

    for (const route of fallbackRoutes) {
      addRouteIfUsable(route, routes, routeKeys, blueprintPayload.intent.categories);
      if (routes.length >= 3) {
        break;
      }
    }
  }

  routes = dedupeRoutes(routes)
    .sort((left, right) => right.fitScore - left.fitScore)
    .slice(0, 3);

  if (routes.length && process.env.WANDER_ENABLE_ROUTE_COPY_AI === "true") {
    routes = await finalizeRouteCopyWithQwen({
      routes,
      language,
      prompt,
      timeBudgetMinutes,
      weather: effectiveWeather,
      locationLabel: locationSnapshot.nearbyPlaceName || locationLabel,
      qwenConfig,
    }).catch(() => routes);
  }

  return {
    intent: blueprintPayload.intent,
    routes,
    location: {
      ...locationSnapshot,
      weatherMode: weatherSnapshot?.weatherMode || null,
      weatherText: weatherSnapshot?.weatherText || null,
      weatherReportTime: weatherSnapshot?.reportTime || null,
    },
    liveData: {
      status: routes.length ? "live" : "empty",
      source: "amap",
      note: buildLiveDataNote({
        routesFound: routes.length,
        candidateCount: candidateRegistry.size,
        radiusMeters,
        language,
      }),
      radiusMeters,
      poiCount: candidateRegistry.size,
    },
  };
}

async function planBlueprintsWithQwen({
  prompt,
  language,
  timeBudgetMinutes,
  weather,
  venueStatus,
  locationLabel,
  formattedAddress,
  weatherText,
  qwenConfig,
}) {
  const response = await fetch(`${qwenConfig.baseUrl}/chat/completions`, {
    method: "POST",
    signal: AbortSignal.timeout(Number(process.env.WANDER_QWEN_BLUEPRINT_TIMEOUT_MS || 18000)),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${qwenConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: qwenConfig.model,
      temperature: 0.25,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: [
            "You are Wander's route planning model.",
            "Create three route blueprints for a real-world city outing.",
            "Do not invent stores, addresses, prices, ratings, or travel times.",
            "Keep the stop order aligned with the user's request whenever possible.",
            `Use only these categories: ${supportedCategories.join(", ")}.`,
            "Choose the most specific category that matches each user need, for example hotpot for 火锅, cinema for 看电影, ktv for 唱歌, massage for 按摩, and park for 公园.",
            "If the user uses words outside the category list, keep those exact words in searchTerms and requiredTerms so the map search can still retrieve matching POIs.",
            "Return strict JSON with keys categories, searchTerms, requiredTermsByCategory, preferredStyle, routeSummary, timePlanSummary, stopSignals, routeOptions.",
            "routeOptions must contain exactly 3 items with keys routeId, style, title, summary, stopSignals.",
            "Every stopSignals item must use keys category, label, durationMinutes, searchTerms, requiredTerms, rationale, indoorPreferred.",
            "Keep total stop durations realistic within the time budget and leave time for travel.",
            "When the time budget is long, add enough stops to make it feel like a half-day or full-day plan instead of returning only two short stops.",
            "The three routeOptions must be meaningfully different in pacing, stop mix, or atmosphere, not only in wording.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `language=${language}`,
            `user_request=${prompt}`,
            `time_budget_minutes=${timeBudgetMinutes}`,
            `weather_mode=${weather}`,
            `weather_text=${weatherText || "unknown"}`,
            `venue_status=${venueStatus}`,
            `start_place=${locationLabel}`,
            `start_address=${formattedAddress}`,
            "requiredTermsByCategory should include must-hit words for map search.",
            "routeSummary should describe the overall planning strategy in one sentence.",
            "timePlanSummary should summarize time split between travel and stops in one sentence.",
            "At least one routeOption should prioritize efficiency, one should prioritize balance, and one should prioritize atmosphere if the request allows it.",
            `Aim to cover about ${buildTargetCoverageHint(timeBudgetMinutes)} of the user's available time.`,
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Qwen blueprint request failed: ${response.status} ${message.slice(0, 240)}`);
  }

  const payload = await response.json();
  const rawContent = payload?.choices?.[0]?.message?.content;
  const content = Array.isArray(rawContent)
    ? rawContent.map((item) => item?.text || item?.content || "").join("")
    : typeof rawContent === "string"
      ? rawContent
      : "";

  if (!content.trim()) {
    throw new Error("Qwen blueprint request returned no content");
  }

  return normalizeBlueprintPayload(JSON.parse(content), language, prompt, timeBudgetMinutes);
}

async function finalizeRouteCopyWithQwen({
  routes,
  language,
  prompt,
  timeBudgetMinutes,
  weather,
  locationLabel,
  qwenConfig,
}) {
  const routeFacts = routes.map((route) => ({
    routeId: route.id,
    style: route.style,
    totalMinutes: route.totalMinutes,
    bufferMinutes: route.bufferMinutes,
    distanceMeters: route.routeDistanceMeters ?? 0,
    stops: route.stops.map((stop) => ({
      name: stop.name,
      address: stop.address,
      requestedCategory: stop.requestedCategory,
      durationMinutes: stop.duration,
      travelMinutesFromPrevious: stop.travelMinutesFromPrevious ?? 0,
      rating: stop.rating,
      averageCostCny: stop.averageCostCny ?? null,
      groupbuyCount: stop.groupbuyCount ?? null,
    })),
  }));

  const response = await fetch(`${qwenConfig.baseUrl}/chat/completions`, {
    method: "POST",
    signal: AbortSignal.timeout(Number(process.env.WANDER_QWEN_COPY_TIMEOUT_MS || 6000)),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${qwenConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: qwenConfig.model,
      temperature: 0.2,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: [
            "You are Wander's route copywriter.",
            "You will receive already-selected real routes.",
            "Do not change any stop, order, duration, or factual field.",
            "Return strict JSON with one key routes.",
            "Each routes item must use keys routeId, title, subtitle, summary, adjustments.",
            "adjustments should be a short array of notes only when there is an actual tradeoff, otherwise return an empty array.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              language,
              userRequest: prompt,
              timeBudgetMinutes,
              weather,
              startPlace: locationLabel,
              routes: routeFacts,
            },
            null,
            2
          ),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Qwen route copy request failed: ${response.status}`);
  }

  const payload = await response.json();
  const rawContent = payload?.choices?.[0]?.message?.content;
  const content = Array.isArray(rawContent)
    ? rawContent.map((item) => item?.text || item?.content || "").join("")
    : typeof rawContent === "string"
      ? rawContent
      : "";

  const parsed = JSON.parse(content || "{}");
  const copyMap = new Map(
    (Array.isArray(parsed?.routes) ? parsed.routes : [])
      .filter((item) => item && typeof item.routeId === "string")
      .map((item) => [item.routeId, item])
  );

  return routes.map((route) => {
    const copy = copyMap.get(route.id);
    if (!copy) {
      return route;
    }

    return {
      ...route,
      title: normalizeLine(copy.title) || route.title,
      subtitle: normalizeLine(copy.subtitle) || route.subtitle,
      summary: normalizeLine(copy.summary) || route.summary,
      adjustments: Array.isArray(copy.adjustments)
        ? copy.adjustments.map((item) => normalizeLine(item)).filter(Boolean)
        : route.adjustments,
    };
  });
}

async function buildRouteFromBlueprint({
  blueprint,
  intent,
  coordinates,
  radiusMeters,
  timeBudgetMinutes,
  weather,
  locationSnapshot,
  language,
  searchCache,
  candidateRegistry,
  amapConfig,
  routeIndex = 0,
  variantIndex = 0,
}) {
  const requestedStops = expandStopSignalsForBudget({
    stopSignals: blueprint.stopSignals,
    style: blueprint.style,
    timeBudgetMinutes,
    weather,
    language,
  });
  if (!requestedStops.length) {
    return null;
  }

  const minimumStops = Math.min(
    3,
    Math.max(requestedStops.length === 1 ? 1 : 2, Math.ceil(requestedStops.length * 0.45))
  );

  let selectedStops = [];
  let currentOrigin = coordinates;
  const usedIds = new Set();
  const usedAreas = new Set();
  const adjustments = [];

  for (const [stopIndex, stopSignal] of requestedStops.entries()) {
    const candidates = await findCandidatesForStop({
      stopSignal,
      currentOrigin,
      startCoordinates: coordinates,
      radiusMeters,
      city: locationSnapshot.adcode || locationSnapshot.cityName || "",
      weather,
      searchCache,
      amapConfig,
    });

    candidates.forEach((candidate) => candidateRegistry.add(candidate.id));
    const chosen = pickCandidateForStop({
      candidates,
      usedIds,
      usedAreas,
      stopSignal,
      style: blueprint.style,
      routeIndex,
      variantIndex,
      stopIndex,
    });
    if (!chosen) {
      adjustments.push(
        language === "zh"
          ? `未找到特别合适的${buildCategoryLabel(stopSignal.category, "zh")}点位，已跳过这一站。`
          : `No strong ${buildCategoryLabel(stopSignal.category, "en")} match was found, so this stop was skipped.`
      );
      continue;
    }

    usedIds.add(chosen.id);
    if (chosen.area) {
      usedAreas.add(chosen.area);
    }
    selectedStops.push(
      buildStopFromCandidate({
        candidate: chosen,
        requestedCategory: stopSignal.category,
        language,
        startCoordinates: coordinates,
        stopSignal,
      })
    );
    currentOrigin = {
      latitude: chosen.latitude,
      longitude: chosen.longitude,
    };
  }

  if (selectedStops.length < minimumStops) {
    return null;
  }

  let computed = await attachRouteLegs(
    selectedStops,
    coordinates,
    locationSnapshot.nearbyPlaceName || locationSnapshot.formattedAddress || "Current start",
    language,
    amapConfig
  );
  const requiredRouteCategories = new Set(Array.isArray(intent.categories) ? intent.categories : []);
  while (
    computed.totalMinutes > timeBudgetMinutes + 15 &&
    computed.stops.length > minimumStops
  ) {
    if (!canTrimLastStop(selectedStops, requiredRouteCategories)) {
      break;
    }

    adjustments.push(
      language === "zh"
        ? "为压回时间预算，已收缩最后一站。"
          : "The last stop was trimmed back to stay closer to your time budget."
    );
    selectedStops = selectedStops.slice(0, -1);
    computed = await attachRouteLegs(
      selectedStops,
      coordinates,
      locationSnapshot.nearbyPlaceName || locationSnapshot.formattedAddress || "Current start",
      language,
      amapConfig
    );
  }

  if (computed.totalMinutes < timeBudgetMinutes * 0.78 && selectedStops.length) {
    const stretchedStops = stretchStopDurations(
      selectedStops,
      timeBudgetMinutes,
      computed.totalRouteDuration
    );
    const durationWasExpanded = stretchedStops.some(
      (stop, index) => stop.duration !== selectedStops[index]?.duration
    );

    if (durationWasExpanded) {
      adjustments.push(
        language === "zh"
          ? "已适度拉长停留时间，让整天安排更贴近你的时间预算。"
          : "Stay windows were extended a bit so the plan fills more of your available time."
      );
      selectedStops = stretchedStops;
      computed = await attachRouteLegs(
        selectedStops,
        coordinates,
        locationSnapshot.nearbyPlaceName || locationSnapshot.formattedAddress || "Current start",
        language,
        amapConfig
      );
    }
  }

  const totalMinutes = computed.totalMinutes;
  const fitScore = scoreRouteFit({
    route: computed,
    timeBudgetMinutes,
    intentCategoryCount: intent.categories.length,
  });

  if (!computed.stops.length) {
    return null;
  }

  return {
    id: blueprint.routeId,
    clusterId: "live",
    clusterLabel:
      language === "zh"
        ? `${locationSnapshot.districtName || locationSnapshot.cityName || "附近"}路线`
        : `${locationSnapshot.districtName || locationSnapshot.cityName || "Nearby"} Route`,
    clusterAccent: buildClusterAccent({
      language,
      radiusMeters,
      weather,
      stopCount: computed.stops.length,
    }),
    title:
      blueprint.title ||
      buildFallbackRouteTitle(computed.stops, blueprint.style, language),
    subtitle:
      blueprint.summary ||
      intent.timePlanSummary ||
      buildFallbackSubtitle(totalMinutes, timeBudgetMinutes, language),
    style: blueprint.style,
    fitScore,
    totalMinutes,
    bufferMinutes: Math.max(0, timeBudgetMinutes - totalMinutes),
    hitCount: computed.stops.length,
    stops: computed.stops,
    adjustments,
    summary: buildFallbackSummary(computed.stops, language),
    transitSummary: buildRouteTransitSummary(computed.routeModes, language),
    routeModes: computed.routeModes,
    navigationUrl: computed.navigationUrl,
    routeGeometry: computed.routeGeometry,
    routeDistanceMeters: computed.totalRouteDistance,
    routeDurationMinutes: computed.totalRouteDuration,
    routeMode: "walking",
  };
}

async function findCandidatesForStop({
  stopSignal,
  currentOrigin,
  startCoordinates,
  radiusMeters,
  city,
  weather,
  searchCache,
  amapConfig,
}) {
  const searchTerms = dedupe([
    ...stopSignal.requiredTerms,
    ...stopSignal.searchTerms,
    ...(categoryFallbackTerms[stopSignal.category] ?? []),
  ]).slice(0, 3);

  const results = [];
  const nearbyBatches = await Promise.all(
    searchTerms.map((term) =>
      searchWithCache({
        term,
        coordinates: currentOrigin,
        radiusMeters,
        city,
        searchCache,
        amapConfig,
      })
    )
  );
  results.push(...nearbyBatches.flat());

  if (
    results.length < 6 &&
    distanceMetersBetween(currentOrigin, startCoordinates) > 350
  ) {
    const startBatches = await Promise.all(
      searchTerms.map((term) =>
        searchWithCache({
          term,
          coordinates: startCoordinates,
          radiusMeters: Math.round(radiusMeters * 1.4),
          city,
          searchCache,
          amapConfig,
        })
      )
    );
    results.push(...startBatches.flat());
  }

  const deduped = new Map();
  results.forEach((candidate) => {
    const existing = deduped.get(candidate.id);
    const score = scoreCandidate({
      candidate,
      stopSignal,
      currentOrigin,
      startCoordinates,
      weather,
    });

    if (!existing || score > existing.score) {
      deduped.set(candidate.id, { ...candidate, score });
    }
  });

  return [...deduped.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, 8);
}

async function searchWithCache({
  term,
  coordinates,
  radiusMeters,
  city,
  searchCache,
  amapConfig,
}) {
  const cacheKey = `${term}::${city}::${radiusMeters}::${roundCoordinate(coordinates.latitude)}::${roundCoordinate(coordinates.longitude)}`;
  let items = searchCache.get(cacheKey);
  if (!items) {
    items = await searchPlacesWithAmap(
      {
        keywords: term,
        coordinates,
        radiusMeters,
        city,
        pageSize: 8,
      },
      amapConfig
    ).catch(() => []);
    searchCache.set(cacheKey, items);
  }

  return items;
}

async function attachRouteLegs(stops, startCoordinates, startLabel, language, amapConfig) {
  const routeGeometry = [];
  let totalRouteDistance = 0;
  let totalRouteDuration = 0;
  const routeModeTotals = {
    walking: { mode: "walking", durationMinutes: 0, distanceMeters: 0 },
    riding: { mode: "riding", durationMinutes: 0, distanceMeters: 0 },
    driving: { mode: "driving", durationMinutes: 0, distanceMeters: 0 },
  };
  const withLegs = [];
  let previous = startCoordinates;
  let previousLabel = startLabel;

  const pushGeometry = (coordinates) => {
    coordinates.forEach((coordinate) => {
      const last = routeGeometry[routeGeometry.length - 1];
      if (!last || last[0] !== coordinate[0] || last[1] !== coordinate[1]) {
        routeGeometry.push(coordinate);
      }
    });
  };

  pushGeometry([[startCoordinates.longitude, startCoordinates.latitude]]);

  for (const stop of stops) {
    const destination = { latitude: stop.latitude, longitude: stop.longitude };
    const walkingLeg = await fetchWalkingRouteFromAmap(previous, destination, amapConfig).catch(() =>
      buildFallbackLeg(previous, destination)
    );
    const drivingLeg =
      process.env.WANDER_ENABLE_AMAP_DRIVING === "true"
        ? await fetchDrivingRouteFromAmap(previous, destination, amapConfig).catch(() =>
            buildFallbackDrivingLeg(previous, destination)
          )
        : buildFallbackDrivingLeg(previous, destination);
    const ridingLeg = estimateRidingLeg(walkingLeg.distanceMeters, previous, destination);
    const travelModes = buildTravelModes({
      walkingLeg,
      ridingLeg,
      drivingLeg,
      language,
      origin: previous,
      destination,
      fromLabel: previousLabel,
      toLabel: stop.name,
    });

    totalRouteDistance += walkingLeg.distanceMeters;
    totalRouteDuration += walkingLeg.durationMinutes;
    routeModeTotals.walking.durationMinutes += walkingLeg.durationMinutes;
    routeModeTotals.walking.distanceMeters += walkingLeg.distanceMeters;
    routeModeTotals.riding.durationMinutes += ridingLeg.durationMinutes;
    routeModeTotals.riding.distanceMeters += ridingLeg.distanceMeters;
    routeModeTotals.driving.durationMinutes += drivingLeg.durationMinutes;
    routeModeTotals.driving.distanceMeters += drivingLeg.distanceMeters;
    pushGeometry(walkingLeg.geometry);

    withLegs.push({
      ...stop,
      travelFromPrevious: travelModes[0]?.label || buildTravelLabel(walkingLeg.durationMinutes, walkingLeg.distanceMeters, language),
      travelMinutesFromPrevious: walkingLeg.durationMinutes,
      travelDistanceMetersFromPrevious: walkingLeg.distanceMeters,
      travelModesFromPrevious: travelModes,
      navigationUrls: Object.fromEntries(
        travelModes
          .filter((mode) => mode.navigationUrl)
          .map((mode) => [mode.mode, mode.navigationUrl])
      ),
      visitLabel: buildVisitLabel(stop.duration, language),
    });

    previous = destination;
    previousLabel = stop.name;
  }

  const stopDuration = withLegs.reduce((sum, stop) => sum + stop.duration, 0);
  const routeModes = Object.values(routeModeTotals).map((mode) => ({
    ...mode,
    label: buildTravelModeLabel(mode.mode, mode.durationMinutes, mode.distanceMeters, language),
  }));

  return {
    stops: withLegs,
    totalRouteDistance,
    totalRouteDuration,
    routeGeometry,
    routeModes,
    navigationUrl: withLegs[0]?.navigationUrls?.walking || null,
    totalMinutes: stopDuration + totalRouteDuration,
  };
}

function normalizeBlueprintPayload(payload, language, prompt = "", timeBudgetMinutes = 120) {
  const heuristicIntent = extractHeuristicIntent(prompt, timeBudgetMinutes);
  const intent = {
    categories: heuristicIntent.categories.length
      ? heuristicIntent.categories
      : dedupe(
          (Array.isArray(payload?.categories) ? payload.categories : [])
            .map((category) => normalizeCategoryId(category))
            .filter(Boolean)
        ),
    searchTerms: dedupe([
      ...heuristicIntent.searchTerms,
      ...(Array.isArray(payload?.searchTerms) ? payload.searchTerms : [])
        .map((term) => normalizeLine(term))
        .filter(Boolean)
        .slice(0, 20),
    ]),
    requiredTermsByCategory: mergeRequiredTerms(
      heuristicIntent.requiredTermsByCategory,
      normalizeRequiredTerms(payload?.requiredTermsByCategory)
    ),
    preferredStyle: routeStyles.includes(payload?.preferredStyle) ? payload.preferredStyle : null,
    routeSummary: normalizeLine(payload?.routeSummary) || null,
    timePlanSummary: normalizeLine(payload?.timePlanSummary) || null,
    stopSignals: heuristicIntent.stopSignals.length
      ? heuristicIntent.stopSignals
      : normalizeStopSignals(payload?.stopSignals),
  };

  const normalizedRoutes = (Array.isArray(payload?.routeOptions) ? payload.routeOptions : [])
    .map((route, index) => normalizeRouteBlueprint(route, index))
    .filter(Boolean);

  return {
    intent,
    routeOptions: normalizedRoutes.length
      ? normalizedRoutes.map((route, index) => ({
          ...route,
          stopSignals: expandStopSignalsForBudget({
            stopSignals: mergeMandatoryStopSignals(
              route.stopSignals,
              heuristicIntent.stopSignals.length ? heuristicIntent.stopSignals : intent.stopSignals
            ),
            style: route.style,
            timeBudgetMinutes,
            weather: "clear",
            language,
          }),
          title:
            route.title ||
            (language === "zh" ? `路线方案 ${index + 1}` : `Route Option ${index + 1}`),
        }))
      : buildFallbackBlueprints(intent, language, timeBudgetMinutes),
  };
}

function normalizeRouteBlueprint(route, index) {
  const stopSignals = normalizeStopSignals(route?.stopSignals);
  if (!stopSignals.length) {
    return null;
  }

  return {
    routeId:
      normalizeLine(route?.routeId) ||
      `route-${index + 1}`,
    style: routeStyles.includes(route?.style) ? route.style : routeStyles[index % routeStyles.length],
    title: normalizeLine(route?.title) || "",
    summary: normalizeLine(route?.summary) || "",
    stopSignals,
  };
}

function mergeMandatoryStopSignals(routeStopSignals, mandatoryStopSignals) {
  const mandatory = Array.isArray(mandatoryStopSignals) ? mandatoryStopSignals : [];
  const routeSignals = Array.isArray(routeStopSignals) ? routeStopSignals : [];

  if (!mandatory.length) {
    return routeSignals.length ? routeSignals : mandatory;
  }

  const mandatoryCategories = new Set(mandatory.map((signal) => signal.category));
  return [
    ...mandatory,
    ...routeSignals.filter((signal) => !mandatoryCategories.has(signal.category)),
  ];
}

function buildFallbackBlueprints(intent, language, timeBudgetMinutes) {
  const baseStopSignals = intent.stopSignals.length
    ? intent.stopSignals
    : intent.categories.slice(0, 4).map((category) => ({
        category,
        label: category,
        durationMinutes: defaultDurationForCategory(category),
        searchTerms: categoryFallbackTerms[category] ?? [],
        requiredTerms: categoryRequiredFallback[category] ?? [],
        rationale: "",
        indoorPreferred: !isOutdoorCategory(category),
      }));

  return routeStyles.map((style, index) => ({
    routeId: `route-${index + 1}`,
    style,
    title: language === "zh" ? `路线方案 ${index + 1}` : `Route Option ${index + 1}`,
    summary: intent.timePlanSummary || intent.routeSummary || "",
    stopSignals: expandStopSignalsForBudget({
      stopSignals: baseStopSignals,
      style,
      timeBudgetMinutes,
      weather: "clear",
      language,
    }),
  }));
}

function normalizeStopSignals(input) {
  return (Array.isArray(input) ? input : [])
    .map((stop) => {
      if (!stop) {
        return null;
      }

      const category = normalizeCategoryId(stop.category);
      if (!category) {
        return null;
      }

      return {
        category,
        label: normalizeLine(stop.label) || category,
        durationMinutes: clampNumber(
          stop.durationMinutes,
          15,
          240,
          defaultDurationForCategory(category)
        ),
        searchTerms: dedupe(
          (Array.isArray(stop.searchTerms) ? stop.searchTerms : [])
            .map((term) => normalizeLine(term))
            .filter(Boolean)
            .slice(0, 8)
        ),
        requiredTerms: dedupe(
          (Array.isArray(stop.requiredTerms) ? stop.requiredTerms : [])
            .map((term) => normalizeLine(term))
            .filter(Boolean)
            .slice(0, 8)
        ),
        rationale: normalizeLine(stop.rationale) || "",
        indoorPreferred:
          typeof stop.indoorPreferred === "boolean"
            ? stop.indoorPreferred
            : !isOutdoorCategory(category),
      };
    })
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeRequiredTerms(input) {
  const result = {};
  Object.entries(input && typeof input === "object" ? input : {}).forEach(([rawCategory, rawValues]) => {
    const category = normalizeCategoryId(rawCategory);
    if (!category) {
      return;
    }

    const values = Array.isArray(rawValues) ? rawValues : [];
    const normalized = dedupe(values.map((item) => normalizeLine(item)).filter(Boolean)).slice(0, 8);
    if (normalized.length) {
      result[category] = dedupe([...(result[category] || []), ...normalized]).slice(0, 8);
    }
  });
  return result;
}

function mergeRequiredTerms(primary, fallback) {
  const result = {};
  supportedCategories.forEach((category) => {
    const merged = dedupe([
      ...(Array.isArray(primary?.[category]) ? primary[category] : []),
      ...(Array.isArray(fallback?.[category]) ? fallback[category] : []),
    ]);

    if (merged.length) {
      result[category] = merged.slice(0, 8);
    }
  });

  return result;
}

function buildStopFromCandidate({
  candidate,
  requestedCategory,
  language,
  startCoordinates,
  stopSignal,
}) {
  const categories = dedupe([requestedCategory, ...inferCategoriesFromCandidate(candidate)]);
  const startDistance = distanceMetersBetween(startCoordinates, candidate);
  return {
    id: `amap-${candidate.id}`,
    amapId: candidate.amapId,
    name: candidate.name,
    cluster: "live",
    area: candidate.area,
    address: candidate.address || (language === "zh" ? "高德未提供地址" : "Address not provided by AMap"),
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    categories,
    duration: stopSignal.durationMinutes,
    outdoor: isOutdoorCategory(requestedCategory),
    rating: candidate.rating,
    hours: candidate.hours || (language === "zh" ? "营业时间待确认" : "Hours not provided"),
    crowd:
      startDistance < 1200
        ? language === "zh"
          ? "距离当前定位较近，适合下班后直接去。"
          : "Close to your current location, so it is easy to head there right away."
        : language === "zh"
          ? "更适合作为路线中段停靠。"
          : "Works better as a mid-route stop.",
    summary:
      language === "zh"
        ? `${candidate.name} 与你的 ${buildCategoryLabel(requestedCategory, "zh")} 需求匹配度较高。`
        : `${candidate.name} is a strong match for the ${buildCategoryLabel(requestedCategory, "en")} part of this outing.`,
    merchantIntro: buildMerchantIntro({
      candidate,
      requestedCategory,
      language,
      startDistance,
    }),
    merchantHighlights: buildMerchantHighlights({
      candidate,
      language,
      startDistance,
    }),
    tags: dedupe([
      buildCategoryLabel(requestedCategory, language),
      ...(candidate.groupbuyCount ? [language === "zh" ? "可看团购" : "Group-buy available"] : []),
      ...(candidate.averageCostCny ? [language === "zh" ? `人均¥${candidate.averageCostCny}` : `Avg ¥${candidate.averageCostCny}`] : []),
      candidate.type || "",
    ]).filter(Boolean).slice(0, 4),
    sourceType: "amap-live",
    sourceLabel: "AMap live POI",
    distanceFromStartMeters: startDistance,
    averageCostCny: candidate.averageCostCny,
    groupbuyCount: candidate.groupbuyCount,
    phone: candidate.phone,
    ugc: {
      author: "@Wander AI",
      verified: language === "zh" ? "高德实时 POI" : "AMap live POI",
      title:
        language === "zh"
          ? `${candidate.name} 已按实时搜索命中`
          : `${candidate.name} matched the live search`,
      stay: buildVisitLabel(stopSignal.durationMinutes, language),
      tip:
        stopSignal.rationale ||
        (language === "zh"
          ? "建议先确认当前营业状态，再按这条顺序出发。"
          : "Check the live opening status before leaving and keep this order."),
    },
    requestedCategory,
  };
}

function inferCategoriesFromCandidate(candidate) {
  const text = candidate.searchText || "";
  const categories = [];

  if (/火锅|hotpot|川|sichuan/.test(text)) {
    categories.push("sichuan", "food");
  }
  if (/影|cinema|movie|imax/.test(text)) {
    categories.push("cinema");
  }
  if (/公园|park|garden/.test(text)) {
    categories.push("park", "walk");
  }
  if (/超市|便利|supermarket|mart/.test(text)) {
    categories.push("grocery", "market");
  }
  if (/咖啡|cafe|coffee/.test(text)) {
    categories.push("cafe");
  }
  if (/书|book/.test(text)) {
    categories.push("bookstore");
  }
  if (/展|gallery|museum/.test(text)) {
    categories.push("gallery");
  }
  if (/甜|cake|dessert|bakery/.test(text)) {
    categories.push("dessert");
  }
  if (/河|江|水|river|lake|riverside/.test(text)) {
    categories.push("riverside", "walk");
  }
  if (/餐|restaurant|meal|food/.test(text)) {
    categories.push("food");
  }

  Object.entries(expandedCategoryDefinitions).forEach(([category, definition]) => {
    const terms = dedupe([
      definition.labels?.zh,
      definition.labels?.en,
      ...(definition.aliases || []),
      ...(definition.required || []),
    ].filter(Boolean));

    if (terms.some((term) => text.includes(term.toLowerCase()))) {
      categories.push(category);
    }
  });

  return dedupe(categories.filter((category) => supportedCategories.includes(category)));
}

function scoreCandidate({
  candidate,
  stopSignal,
  currentOrigin,
  startCoordinates,
  weather,
}) {
  const searchText = candidate.searchText || "";
  const requiredTerms = dedupe([
    ...stopSignal.requiredTerms,
    ...(categoryRequiredFallback[stopSignal.category] ?? []),
  ]);
  const searchTerms = dedupe([
    ...stopSignal.searchTerms,
    ...(categoryFallbackTerms[stopSignal.category] ?? []),
  ]);

  const requiredHits = requiredTerms.reduce(
    (sum, term) => sum + (searchText.includes(term.toLowerCase()) ? 1 : 0),
    0
  );
  const keywordHits = searchTerms.reduce(
    (sum, term) => sum + (searchText.includes(term.toLowerCase()) ? 1 : 0),
    0
  );
  const distanceFromCurrent = distanceMetersBetween(currentOrigin, candidate);
  const distanceFromStart = distanceMetersBetween(startCoordinates, candidate);
  const distanceScore = Math.max(-20, 26 - distanceFromCurrent / 140);
  const startDistanceScore = Math.max(-14, 12 - distanceFromStart / 320);
  const ratingScore = (candidate.rating || 4) * 5;
  const groupbuyScore = candidate.groupbuyCount ? Math.min(6, candidate.groupbuyCount / 2) : 0;
  const weatherScore =
    weather === "rain" && isOutdoorCategory(stopSignal.category) ? -8 : stopSignal.indoorPreferred ? 2 : 0;
  const hardConstraintPenalty = requiredTerms.length && requiredHits === 0 ? -90 : 0;
  const categoryMatchBonus = inferCategoriesFromCandidate(candidate).includes(stopSignal.category) ? 14 : 0;

  return (
    hardConstraintPenalty +
    categoryMatchBonus +
    requiredHits * 20 +
    keywordHits * 8 +
    distanceScore +
    startDistanceScore +
    ratingScore +
    groupbuyScore +
    weatherScore
  );
}

function scoreRouteFit({ route, timeBudgetMinutes, intentCategoryCount }) {
  const averageRating =
    route.stops.reduce((sum, stop) => sum + stop.rating, 0) / Math.max(1, route.stops.length);
  const budgetPenalty = Math.max(0, route.totalMinutes - timeBudgetMinutes) * 0.7;
  const matchScore = Math.min(18, route.stops.length * 6 + intentCategoryCount * 2);
  const distanceScore = Math.max(0, 14 - route.totalRouteDistance / 1200);
  const rawScore = 58 + averageRating * 5 + matchScore + distanceScore - budgetPenalty;
  return clampNumber(rawScore, 55, 98, 72);
}

function buildTransitSummary(distanceMeters, durationMinutes, language) {
  if (!distanceMeters || !durationMinutes) {
    return language === "zh" ? "步行衔接较轻" : "Light walking connection";
  }

  return language === "zh"
    ? `步行约 ${formatDistance(distanceMeters, "zh")} · ${durationMinutes} 分钟`
    : `Walk about ${formatDistance(distanceMeters, "en")} · ${durationMinutes} min`;
}

function buildTravelLabel(durationMinutes, distanceMeters, language) {
  return language === "zh"
    ? `步行 ${durationMinutes} 分钟 · ${formatDistance(distanceMeters, "zh")}`
    : `Walk ${durationMinutes} min · ${formatDistance(distanceMeters, "en")}`;
}

function buildRouteTransitSummary(routeModes, language) {
  if (!Array.isArray(routeModes) || !routeModes.length) {
    return language === "zh" ? "出行方式待生成" : "Travel options pending";
  }

  return routeModes
    .filter((mode) => Number.isFinite(mode.durationMinutes) && mode.durationMinutes > 0)
    .slice(0, 3)
    .map((mode) => buildCompactTravelModeLabel(mode.mode, mode.durationMinutes, language))
    .join(language === "zh" ? " · " : " · ");
}

function buildTravelModes({
  walkingLeg,
  ridingLeg,
  drivingLeg,
  language,
  origin,
  destination,
  fromLabel,
  toLabel,
}) {
  return [
    {
      mode: "walking",
      durationMinutes: walkingLeg.durationMinutes,
      distanceMeters: walkingLeg.distanceMeters,
    },
    {
      mode: "riding",
      durationMinutes: ridingLeg.durationMinutes,
      distanceMeters: ridingLeg.distanceMeters,
    },
    {
      mode: "driving",
      durationMinutes: drivingLeg.durationMinutes,
      distanceMeters: drivingLeg.distanceMeters,
    },
  ].map((mode) => ({
    ...mode,
    label: buildTravelModeLabel(mode.mode, mode.durationMinutes, mode.distanceMeters, language),
    navigationUrl: buildAmapNavigationUrl({
      origin,
      destination,
      fromLabel,
      toLabel,
      mode: mode.mode,
    }),
  }));
}

function buildTravelModeLabel(mode, durationMinutes, distanceMeters, language) {
  const modeLabel = buildRouteModeLabel(mode, language);
  return language === "zh"
    ? `${modeLabel} ${durationMinutes} 分钟 · ${formatDistance(distanceMeters, language)}`
    : `${modeLabel} ${durationMinutes} min · ${formatDistance(distanceMeters, language)}`;
}

function buildCompactTravelModeLabel(mode, durationMinutes, language) {
  const modeLabel = buildRouteModeLabel(mode, language);
  return language === "zh"
    ? `${modeLabel} ${durationMinutes} 分钟`
    : `${modeLabel} ${durationMinutes} min`;
}

function buildRouteModeLabel(mode, language) {
  if (language === "zh") {
    if (mode === "riding") return "骑行";
    if (mode === "driving") return "打车";
    return "步行";
  }

  if (mode === "riding") return "Ride";
  if (mode === "driving") return "Taxi";
  return "Walk";
}

function buildAmapNavigationUrl({ origin, destination, fromLabel, toLabel, mode }) {
  const modeMap = {
    walking: "walk",
    riding: "ride",
    driving: "car",
  };

  const searchParams = new URLSearchParams();
  searchParams.set("from", `${origin.longitude},${origin.latitude},${fromLabel || "Start"}`);
  searchParams.set("to", `${destination.longitude},${destination.latitude},${toLabel || "Stop"}`);
  searchParams.set("mode", modeMap[mode] || "walk");
  searchParams.set("src", "wander");
  searchParams.set("coordinate", "gaode");
  searchParams.set("callnative", "1");

  return `https://uri.amap.com/navigation?${searchParams.toString()}`;
}

function estimateRidingLeg(distanceMeters, origin, destination) {
  const safeDistance =
    distanceMeters && distanceMeters > 0 ? distanceMeters : distanceMetersBetween(origin, destination);

  return {
    distanceMeters: safeDistance,
    durationMinutes: Math.max(2, Math.round(safeDistance / 210)),
  };
}

function buildFallbackDrivingLeg(origin, destination) {
  const distanceMeters = distanceMetersBetween(origin, destination);
  return {
    distanceMeters,
    durationMinutes: Math.max(4, Math.round(distanceMeters / 360) + 4),
  };
}

function buildRouteKey(route) {
  return route.stops.map((stop) => stop.id).join("|");
}

function addRouteIfUsable(route, routes, routeKeys, requiredCategories) {
  if (!route || !routeCoversRequiredCategories(route, requiredCategories)) {
    return false;
  }

  const routeKey = buildRouteKey(route);
  if (routeKeys.has(routeKey)) {
    return false;
  }

  routeKeys.add(routeKey);
  routes.push(route);
  return true;
}

function routeCoversRequiredCategories(route, requiredCategories) {
  const required = dedupe(Array.isArray(requiredCategories) ? requiredCategories : []);
  if (!required.length) {
    return true;
  }

  return required.every((category) =>
    route.stops.some((stop) => stop.requestedCategory === category || stop.categories?.includes(category))
  );
}

function canTrimLastStop(stops, requiredCategories) {
  const lastStop = stops[stops.length - 1];
  if (!lastStop || !requiredCategories.has(lastStop.requestedCategory)) {
    return true;
  }

  return stops
    .slice(0, -1)
    .some(
      (stop) =>
        stop.requestedCategory === lastStop.requestedCategory ||
        stop.categories?.includes(lastStop.requestedCategory)
    );
}

function buildTargetCoverageHint(timeBudgetMinutes) {
  if (timeBudgetMinutes >= 480) {
    return "82%-95%";
  }

  if (timeBudgetMinutes >= 240) {
    return "78%-90%";
  }

  return "70%-85%";
}

function pickCandidateForStop({
  candidates,
  usedIds,
  usedAreas,
  style,
  routeIndex,
  variantIndex,
  stopIndex,
}) {
  const ranked = candidates
    .filter((candidate) => !usedIds.has(candidate.id))
    .map((candidate) => {
      const areaBonus = candidate.area && !usedAreas.has(candidate.area) ? 4 : 0;
      const searchText = candidate.searchText || "";
      const scenicSignal = /park|garden|gallery|museum|river|water|cafe|coffee|景|园|馆|江|河/.test(
        searchText
      )
        ? 6
        : 0;
      const efficientScore = style === "efficient" ? -(candidate.distanceMeters || 0) / 130 : 0;
      const scenicScore =
        style === "scenic" ? scenicSignal + ((candidate.rating || 4) - 4) * 8 + areaBonus * 1.3 : 0;
      const balancedScore =
        style === "balanced"
          ? areaBonus + Math.min(3, (candidate.groupbuyCount || 0) / 4) + ((candidate.rating || 4) - 4) * 5
          : 0;

      return {
        ...candidate,
        variantScore: candidate.score + efficientScore + scenicScore + balancedScore + areaBonus,
      };
    })
    .sort((left, right) => right.variantScore - left.variantScore);

  if (!ranked.length) {
    return null;
  }

  const topCandidates = ranked.slice(0, Math.min(4, ranked.length));
  const styleBase = style === "efficient" ? 0 : style === "balanced" ? 1 : 2;
  const offset =
    variantIndex === 0
      ? Math.min(styleBase, topCandidates.length - 1)
      : (styleBase + variantIndex + routeIndex + stopIndex) % topCandidates.length;

  return topCandidates[offset] || ranked[0];
}

function expandStopSignalsForBudget({
  stopSignals,
  style,
  timeBudgetMinutes,
  weather,
  language,
}) {
  const uniqueSignals = dedupeStopSignals(stopSignals);
  if (!uniqueSignals.length) {
    return uniqueSignals;
  }

  const targetStopCount = determineTargetStopCount(timeBudgetMinutes, uniqueSignals.length);
  const supplementalCategories = buildSupplementalCategories(
    uniqueSignals.map((signal) => signal.category),
    style,
    weather,
    timeBudgetMinutes
  );

  const expanded = [...uniqueSignals];
  let supplementalIndex = 0;
  while (expanded.length < targetStopCount && supplementalIndex < supplementalCategories.length * 2) {
    const category = supplementalCategories[supplementalIndex % supplementalCategories.length];
    supplementalIndex += 1;

    if (!category || expanded[expanded.length - 1]?.category === category) {
      continue;
    }

    expanded.push(buildSupplementalStopSignal(category, language, expanded.length));
  }

  return rebalanceStopSignals(expanded, timeBudgetMinutes);
}

function determineTargetStopCount(timeBudgetMinutes, currentCount) {
  if (timeBudgetMinutes >= 600) {
    return Math.max(currentCount, 7);
  }

  if (timeBudgetMinutes >= 420) {
    return Math.max(currentCount, 6);
  }

  if (timeBudgetMinutes >= 300) {
    return Math.max(currentCount, 5);
  }

  if (timeBudgetMinutes >= 180) {
    return Math.max(currentCount, 4);
  }

  return Math.max(currentCount, 3);
}

function buildSupplementalCategories(primaryCategories, style, weather, timeBudgetMinutes) {
  const scenicQueue = ["park", "walk", "riverside", "gallery", "museum", "landmark", "cafe", "tea", "dessert", "bookstore"];
  const efficientQueue = ["cafe", "tea", "bakery", "market", "grocery", "shopping_mall", "bookstore", "pharmacy"];
  const balancedQueue = ["cafe", "tea", "bookstore", "dessert", "park", "gallery", "shopping_mall", "market"];
  const rainSafeQueue = ["cafe", "tea", "bookstore", "gallery", "museum", "dessert", "shopping_mall", "cinema", "ktv", "board_game", "arcade"];
  const baseQueue =
    weather === "rain"
      ? rainSafeQueue
      : style === "efficient"
        ? efficientQueue
        : style === "scenic"
          ? scenicQueue
          : balancedQueue;

  const queue = [...baseQueue];
  if (timeBudgetMinutes >= 300 && !primaryCategories.includes("cinema")) {
    queue.push("cinema");
  }
  const hasMealStop = primaryCategories.some(
    (category) => category === "food" || specificFoodCategories.has(category)
  );
  if (!hasMealStop) {
    queue.push("food");
  }
  if (weather !== "rain" && !primaryCategories.includes("park")) {
    queue.push("park");
  }

  return dedupe(
    queue.filter(
      (category) => supportedCategories.includes(category) && !primaryCategories.includes(category)
    )
  );
}

function buildSupplementalStopSignal(category, language, index) {
  return {
    category,
    label:
      language === "zh"
        ? `${buildCategoryLabel(category, language)}补充站 ${index + 1}`
        : `${buildCategoryLabel(category, language)} extra stop ${index + 1}`,
    durationMinutes: defaultDurationForCategory(category),
    searchTerms: dedupe(categoryFallbackTerms[category] ?? []).slice(0, 6),
    requiredTerms: dedupe(categoryRequiredFallback[category] ?? []).slice(0, 6),
    rationale:
      language === "zh"
        ? "用来补足时间预算，并保持路线衔接轻松。"
        : "Used to fill the remaining time budget while keeping the route easy to follow.",
    indoorPreferred: !isOutdoorCategory(category),
  };
}

function dedupeStopSignals(stopSignals) {
  const seen = new Set();
  return (Array.isArray(stopSignals) ? stopSignals : []).filter((stopSignal) => {
    if (!stopSignal || !stopSignal.category) {
      return false;
    }

    const key = `${stopSignal.category}::${(stopSignal.requiredTerms || []).join("|")}::${(stopSignal.searchTerms || []).join("|")}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function rebalanceStopSignals(stopSignals, timeBudgetMinutes) {
  if (!stopSignals.length) {
    return stopSignals;
  }

  const travelReserve = 28 + Math.max(0, stopSignals.length - 1) * 16;
  const targetStopMinutes = Math.max(stopSignals.length * 24, timeBudgetMinutes - travelReserve);
  const currentStopMinutes = stopSignals.reduce((sum, stop) => sum + stop.durationMinutes, 0);
  const ratio = currentStopMinutes > 0 ? targetStopMinutes / currentStopMinutes : 1;

  const scaled = stopSignals.map((stop) => {
    const bounds = getStopDurationBounds(stop.category);
    return {
      ...stop,
      durationMinutes: Math.max(
        bounds.min,
        Math.min(bounds.max, Math.round(stop.durationMinutes * ratio))
      ),
    };
  });

  let remaining = targetStopMinutes - scaled.reduce((sum, stop) => sum + stop.durationMinutes, 0);
  let cursor = 0;
  while (remaining > 0 && cursor < scaled.length * 6) {
    const index = cursor % scaled.length;
    const stop = scaled[index];
    const bounds = getStopDurationBounds(stop.category);
    const increment = Math.min(12, remaining);
    if (stop.durationMinutes + increment <= bounds.max) {
      stop.durationMinutes += increment;
      remaining -= increment;
    }
    cursor += 1;
  }

  return scaled;
}

function stretchStopDurations(stops, timeBudgetMinutes, travelDurationMinutes) {
  if (!stops.length) {
    return stops;
  }

  const targetStopMinutes = Math.max(
    stops.length * 24,
    Math.round(timeBudgetMinutes - Math.max(20, travelDurationMinutes))
  );
  const currentStopMinutes = stops.reduce((sum, stop) => sum + stop.duration, 0);
  const ratio = currentStopMinutes > 0 ? targetStopMinutes / currentStopMinutes : 1;

  const stretched = stops.map((stop) => {
    const bounds = getStopDurationBounds(stop.requestedCategory || stop.categories?.[0]);
    return {
      ...stop,
      duration: Math.max(bounds.min, Math.min(bounds.max, Math.round(stop.duration * ratio))),
    };
  });

  let remaining = targetStopMinutes - stretched.reduce((sum, stop) => sum + stop.duration, 0);
  let cursor = 0;
  while (remaining > 0 && cursor < stretched.length * 6) {
    const index = cursor % stretched.length;
    const stop = stretched[index];
    const bounds = getStopDurationBounds(stop.requestedCategory || stop.categories?.[0]);
    const increment = Math.min(10, remaining);
    if (stop.duration + increment <= bounds.max) {
      stop.duration += increment;
      remaining -= increment;
    }
    cursor += 1;
  }

  return stretched;
}

function getStopDurationBounds(category) {
  const definition = getCategoryDefinition(category);
  if (definition?.min && definition?.max) {
    return { min: definition.min, max: definition.max };
  }

  switch (category) {
    case "cinema":
      return { min: 90, max: 180 };
    case "sichuan":
    case "food":
      return { min: 50, max: 120 };
    case "park":
    case "walk":
    case "riverside":
      return { min: 30, max: 120 };
    case "grocery":
    case "market":
      return { min: 20, max: 50 };
    case "cafe":
    case "dessert":
      return { min: 20, max: 70 };
    case "gallery":
    case "bookstore":
      return { min: 35, max: 100 };
    default:
      return { min: 20, max: 80 };
  }
}

function buildMerchantIntro({ candidate, requestedCategory, language, startDistance }) {
  const priceText =
    candidate.averageCostCny != null
      ? language === "zh"
        ? `人均约¥${candidate.averageCostCny}`
        : `about ¥${candidate.averageCostCny} per person`
      : "";
  const dealText =
    candidate.groupbuyCount != null
      ? language === "zh"
        ? "支持团购信息查看"
        : "group-buy info is available"
      : "";
  const distanceText =
    language === "zh"
      ? `距离当前约${formatDistance(startDistance, language)}`
      : `about ${formatDistance(startDistance, language)} from your start`;

  if (language === "zh") {
    return [
      candidate.area ? `${candidate.name}位于${candidate.area}` : `${candidate.name}就在你当前路线附近`,
      `更适合承担这条路线里的${buildCategoryLabel(requestedCategory, language)}环节`,
      candidate.rating ? `评分约${candidate.rating}` : "",
      priceText,
      dealText,
      candidate.hours ? `营业信息：${candidate.hours}` : "",
      distanceText,
    ]
      .filter(Boolean)
      .join("，")
      .concat("。");
  }

  return [
    candidate.area ? `${candidate.name} sits around ${candidate.area}` : `${candidate.name} is close to your current route`,
    `and fits the ${buildCategoryLabel(requestedCategory, language).toLowerCase()} part of the plan well`,
    candidate.rating ? `with a ${candidate.rating} rating` : "",
    priceText,
    dealText,
    candidate.hours ? `hours: ${candidate.hours}` : "",
    distanceText,
  ]
    .filter(Boolean)
    .join(", ")
    .concat(".");
}

function buildMerchantHighlights({ candidate, language, startDistance }) {
  const highlights = [];

  if (candidate.area) {
    highlights.push(language === "zh" ? `商圈：${candidate.area}` : `Area: ${candidate.area}`);
  }
  if (candidate.averageCostCny != null) {
    highlights.push(
      language === "zh"
        ? `人均：¥${candidate.averageCostCny}`
        : `Avg spend: ¥${candidate.averageCostCny}`
    );
  }
  if (candidate.groupbuyCount != null) {
    highlights.push(
      language === "zh"
        ? `团购：${candidate.groupbuyCount}`
        : `Group-buy: ${candidate.groupbuyCount}`
    );
  }
  if (candidate.hours) {
    highlights.push(language === "zh" ? `营业：${candidate.hours}` : `Hours: ${candidate.hours}`);
  }
  highlights.push(
    language === "zh"
      ? `距起点：${formatDistance(startDistance, language)}`
      : `From start: ${formatDistance(startDistance, language)}`
  );

  return highlights.slice(0, 5);
}

function buildVisitLabel(durationMinutes, language) {
  const lower = Math.max(10, durationMinutes - 10);
  const upper = durationMinutes + 10;
  return language === "zh"
    ? `建议停留 ${lower}-${upper} 分钟`
    : `Suggested stay ${lower}-${upper} min`;
}

function buildFallbackRouteTitle(stops, style, language) {
  const first = stops[0]?.name || (language === "zh" ? "附近出发" : "Nearby Start");
  if (language === "zh") {
    if (style === "efficient") return `${first} 低切换路线`;
    if (style === "scenic") return `${first} 氛围路线`;
    return `${first} 平衡路线`;
  }

  if (style === "efficient") return `${first} Efficient Route`;
  if (style === "scenic") return `${first} Atmosphere Route`;
  return `${first} Balanced Route`;
}

function buildFallbackSubtitle(totalMinutes, timeBudgetMinutes, language) {
  return language === "zh"
    ? `总时长约 ${totalMinutes} 分钟，尽量压在 ${timeBudgetMinutes} 分钟预算内。`
    : `About ${totalMinutes} minutes in total, kept as close as possible to your ${timeBudgetMinutes}-minute budget.`;
}

function buildFallbackSummary(stops, language) {
  const names = stops.map((stop) => stop.name).join(language === "zh" ? " -> " : " -> ");
  return language === "zh"
    ? `路线依次经过 ${names}。`
    : `This route moves through ${names}.`;
}

function buildClusterAccent({ language, radiusMeters, weather, stopCount }) {
  return language === "zh"
    ? `高德实时点位 + 步行路径，控制在约 ${formatDistance(radiusMeters, "zh")} 范围内，当前 ${weather === "rain" ? "偏向避雨" : "适合直接出发"}，共 ${stopCount} 站。`
    : `AMap live POIs plus walking paths, kept within about ${formatDistance(radiusMeters, "en")}, currently ${weather === "rain" ? "leaning indoor" : "ready to leave now"}, with ${stopCount} stops.`;
}

function buildLiveDataNote({ routesFound, candidateCount, radiusMeters, language }) {
  if (routesFound) {
    return language === "zh"
      ? `千问已完成意图规划，高德返回 ${candidateCount} 个候选点，并生成了 ${routesFound} 条可执行路线。`
      : `Qwen finished the planning pass, AMap returned ${candidateCount} candidates, and ${routesFound} executable routes were generated.`;
  }

  return language === "zh"
    ? `在约 ${formatDistance(radiusMeters, "zh")} 范围内暂时没有足够匹配的真实路线。`
    : `There are not enough matching real routes within about ${formatDistance(radiusMeters, "en")}.`;
}

function buildSearchRadius(timeBudgetMinutes) {
  return Math.min(10000, Math.max(2500, Math.round(timeBudgetMinutes * 26)));
}

function buildFallbackLocationSnapshot(coordinates, locationLabel, language) {
  const fallbackLabel =
    normalizeLine(locationLabel) ||
    (language === "zh" ? "当前位置附近" : "Current location area");

  return {
    nearbyPlaceName: fallbackLabel,
    formattedAddress: fallbackLabel,
    cityName: null,
    districtName: null,
    adcode: null,
    aoiName: null,
    poiName: null,
    buildingName: null,
    roadName: null,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  };
}

function buildFallbackLeg(origin, destination) {
  const distanceMeters = distanceMetersBetween(origin, destination);
  return {
    distanceMeters,
    durationMinutes: Math.max(1, Math.round(distanceMeters / 78)),
    geometry: [
      [origin.longitude, origin.latitude],
      [destination.longitude, destination.latitude],
    ],
  };
}

function roundCoordinate(value) {
  return Number(value.toFixed(3));
}

function dedupeRoutes(routes) {
  const seen = new Set();
  return routes.filter((route) => {
    const key = route.stops.map((stop) => stop.id).join("|");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function registerCategoryTaxonomy() {
  Object.entries(expandedCategoryDefinitions).forEach(([category, definition]) => {
    if (!supportedCategories.includes(category)) {
      supportedCategories.push(category);
    }

    const aliases = dedupe([
      category,
      definition.labels?.zh,
      definition.labels?.en,
      ...(definition.aliases || []),
      ...(definition.required || []),
    ].filter(Boolean));

    categoryFallbackTerms[category] = dedupe([
      ...(categoryFallbackTerms[category] || []),
      ...aliases,
    ]);
    categoryRequiredFallback[category] = dedupe([
      ...(categoryRequiredFallback[category] || []),
      ...(definition.required || []),
    ]);
    heuristicCategoryKeywords[category] = dedupe([
      ...(heuristicCategoryKeywords[category] || []),
      ...aliases,
    ]);

    aliases.forEach((alias) => {
      const key = buildCategoryAliasKey(alias);
      if (key) {
        categoryAliasToId.set(key, category);
      }
    });
  });
}

function getCategoryDefinition(category) {
  return expandedCategoryDefinitions[category] || null;
}

function normalizeCategoryId(value) {
  const key = buildCategoryAliasKey(value);
  if (!key) {
    return null;
  }

  if (supportedCategories.includes(key)) {
    return key;
  }

  return categoryAliasToId.get(key) || null;
}

function buildCategoryAliasKey(value) {
  return normalizeLine(value)
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/\/+/g, "_");
}

function normalizeLine(value) {
  return typeof value === "string" ? value.trim() : "";
}

function clampNumber(value, minimum, maximum, fallback) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
}

function isOutdoorCategory(category) {
  const definition = getCategoryDefinition(category);
  if (typeof definition?.outdoor === "boolean") {
    return definition.outdoor;
  }

  return category === "park" || category === "walk" || category === "riverside";
}

function buildCategoryLabel(category, language) {
  const definition = getCategoryDefinition(category);
  if (definition?.labels?.[language]) {
    return definition.labels[language];
  }

  const zh = {
    food: "餐厅",
    sichuan: "火锅/川菜",
    cinema: "电影院",
    park: "公园",
    walk: "散步",
    grocery: "补给",
    cafe: "咖啡",
    bookstore: "书店",
    gallery: "展览",
    dessert: "甜品",
    riverside: "滨水散步",
    market: "市集",
  };
  const en = {
    food: "meal",
    sichuan: "hotpot or Sichuan food",
    cinema: "cinema",
    park: "park",
    walk: "walk",
    grocery: "grocery stop",
    cafe: "cafe",
    bookstore: "bookstore",
    gallery: "gallery",
    dessert: "dessert",
    riverside: "riverside walk",
    market: "market",
  };

  return (language === "zh" ? zh : en)[category] || category;
}

function formatDistance(distanceMeters, language) {
  if (distanceMeters < 1000) {
    return language === "zh" ? `${Math.round(distanceMeters)} 米` : `${Math.round(distanceMeters)} m`;
  }

  return language === "zh"
    ? `${(distanceMeters / 1000).toFixed(1)} 公里`
    : `${(distanceMeters / 1000).toFixed(1)} km`;
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

function dedupe(items) {
  return [...new Set(items)];
}

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function extractHeuristicIntent(prompt, timeBudgetMinutes = 120) {
  const source = normalizeLine(prompt).toLowerCase();
  if (!source) {
    return {
      categories: [],
      searchTerms: [],
      requiredTermsByCategory: {},
      stopSignals: [],
    };
  }

  const hits = Object.entries(heuristicCategoryKeywords)
    .map(([category, keywords]) => {
      const matches = keywords
        .map((keyword) => ({
          keyword,
          index: source.indexOf(keyword.toLowerCase()),
        }))
        .filter((item) => item.index >= 0);

      if (!matches.length) {
        return null;
      }

      return {
        category,
        index: Math.min(...matches.map((item) => item.index)),
        keywords: matches.map((item) => item.keyword),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.index - right.index);

  let categories = hits.map((item) => item.category);
  if (categories.includes("hotpot")) {
    categories = categories.filter((category) => category !== "food" && category !== "sichuan");
  }
  if (categories.some((category) => specificFoodCategories.has(category))) {
    categories = categories.filter((category) => category !== "food");
  }
  if (categories.includes("sichuan")) {
    categories = categories.filter((category) => category !== "food");
  }
  if (categories.includes("park")) {
    categories = categories.filter((category) => category !== "walk");
  }
  if (categories.includes("grocery")) {
    categories = categories.filter((category) => category !== "market");
  }

  const maxIntentCategories = timeBudgetMinutes >= 420 ? 7 : timeBudgetMinutes >= 240 ? 5 : 4;
  categories = dedupe(categories).slice(0, maxIntentCategories);

  const requiredTermsByCategory = {};
  categories.forEach((category) => {
    requiredTermsByCategory[category] = dedupe([
      ...((hits.find((item) => item.category === category)?.keywords || []).slice(0, 3)),
      ...(categoryRequiredFallback[category] || []),
    ]).slice(0, 6);
  });

  const stopSignals = fitStopDurations(
    categories.map((category) => ({
      category,
      label: category,
      durationMinutes: defaultDurationForCategory(category),
      searchTerms: dedupe([
        ...((hits.find((item) => item.category === category)?.keywords || []).slice(0, 4)),
        ...(categoryFallbackTerms[category] || []),
      ]).slice(0, 6),
      requiredTerms: requiredTermsByCategory[category] || [],
      rationale: "",
      indoorPreferred: !isOutdoorCategory(category),
    })),
    timeBudgetMinutes
  );

  return {
    categories,
    searchTerms: dedupe(stopSignals.flatMap((stop) => stop.searchTerms)).slice(0, 16),
    requiredTermsByCategory,
    stopSignals,
  };
}

function defaultDurationForCategory(category) {
  const definition = getCategoryDefinition(category);
  if (definition?.duration) {
    return definition.duration;
  }

  switch (category) {
    case "cinema":
      return 120;
    case "sichuan":
      return 70;
    case "food":
      return 60;
    case "park":
    case "walk":
    case "riverside":
      return 40;
    case "grocery":
    case "market":
      return 20;
    case "dessert":
      return 25;
    default:
      return 35;
  }
}

function fitStopDurations(stopSignals, timeBudgetMinutes) {
  if (!stopSignals.length) {
    return stopSignals;
  }

  const travelReserve = 24 + Math.max(0, stopSignals.length - 1) * 14;
  const targetStopMinutes = Math.max(stopSignals.length * 22, timeBudgetMinutes - travelReserve);
  const currentMinutes = stopSignals.reduce((sum, stop) => sum + stop.durationMinutes, 0);

  if (!currentMinutes || currentMinutes <= targetStopMinutes) {
    return stopSignals;
  }

  const ratio = targetStopMinutes / currentMinutes;
  return stopSignals.map((stop) => ({
    ...stop,
    durationMinutes: Math.max(
      getStopDurationBounds(stop.category).min,
      Math.round(stop.durationMinutes * ratio)
    ),
  }));
}
