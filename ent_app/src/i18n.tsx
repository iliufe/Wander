import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CategoryId } from "./types";

export type Language = "zh" | "en";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const storageKey = "wander-language";

const categoryLabels: Record<Language, Record<CategoryId, string>> = {
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
    cafe: "Cafe Break",
    bookstore: "Bookstore",
    gallery: "Gallery",
    dessert: "Dessert",
    riverside: "Riverside",
    market: "Market",
  },
};

const copy = {
  zh: {
    layout: {
      navHome: "主页",
      navRoutes: "路线规划",
      navCommunity: "社区",
      navProfile: "个人中心",
      brandTagline: "先定位，再一键出发",
      cta: "新建路线",
      language: "语言",
    },
    planner: {
      eyebrow: "主页",
      title: "先授权当前位置，再告诉 Wander 你想做什么。",
      lead: "首页只保留需求输入。先定位、再选时间、再写主题，生成后直接进入路线规划页面选择方案。",
      currentStart: "当前位置",
      precision: "浏览器精度约",
      sourceOpen: "优先使用 GPS + 开放地图数据",
      sourceFallback: "当前使用 GPS + 本地精选包",
      realtimeSource: "实时状态",
      realtimeStatus: "路线状态",
      dataSource: "数据来源",
      generatedAt: "最近生成",
      candidateCount: "候选地点",
      searchRadius: "搜索范围",
      systemNote: "系统说明",
      statusCardLead: "Wander 会围绕你当前的位置和时间预算持续刷新附近可执行候选点。",
      requestLabel: "你的需求",
      requestHelp: "这里只写你想做什么，不用再手输地址和时间。系统会自动围绕你当前位置生成多站路线。",
      requestPlaceholder: "例如：想吃点川菜，去附近走走，再顺路买点明天早餐。",
      quickExamples: "快速示例",
      weather: "天气",
      clear: "晴朗",
      rain: "下雨",
      venueStatus: "营业状态",
      venueOpen: "实时正常",
      venueClosed: "有店临时关闭",
      generate: "生成路线",
      needLocation: "请先允许定位权限",
      needLocationHint: "先点击上方按钮允许 GPS 定位，浏览器会弹出权限请求。",
      needTimeHint: "先在下拉时间里选择至少 1 分钟的可用时间。",
      parsed: "解析结果",
      start: "起点",
      time: "可用时间",
      theme: "识别主题",
      scenario: "当前场景",
      templateApplied: "已套用公开路线模板，并按你当前附近的位置和时间预算重新生成。",
      localFallbackNote: "当前已经切到本地精选包，路线仍然会根据你的位置和时间实时重排。",
      livePoiNote: "系统会优先在你当前附近的候选点里选站，避免把你硬拉去很远的城区。",
    },
    timePicker: {
      eyebrow: "时间预算",
      title: "用下拉选择可用时间",
      note: "这里的时间选择会优先生效，不需要再在文本里重复写时间。",
      hours: "小时",
      minutes: "分钟",
    },
    routes: {
      eyebrow: "路线规划",
      title: "从实时生成的方案里，选一条你现在真的愿意出发的路线。",
      description: "这里专门负责比较路线和查看完整详情，不再和输入区混在一起。",
      allRoutes: "全部方案",
      allRoutesTitle: "挑一条最适合现在出发的方案",
      selectedRoute: "路线详情",
      selectedRouteTitle: "选完路线后，在下方查看完整路线、地图和每一站说明",
    },
    routeCard: {
      option: "方案",
      total: "总时长",
      buffer: "剩余缓冲",
      selected: "当前已选",
      view: "展开详情",
      continue: "选择这条路线",
    },
    routeDetail: {
      waiting: "等待路线",
      waitingTitle: "还没有拿到可执行路线",
      chooseRouteTitle: "先从上方选择一条路线",
      chooseRouteNote: "上方会先展示所有可执行方案。点击其中一条后，这里再展开完整路线、地图和每一站说明。",
      ready: "准备出发",
      match: "主题命中",
      score: "推荐度",
      direct: "当前路线无需额外替换，可直接执行",
      shared: "共享路线只提供主题 seed，站点顺序已按当前条件实时重算",
      realtime: "当前路线由当前位置、时间预算和附近候选点共同生成",
      localSource: "当前使用本地精选包完成路线规划",
      sourcePrefix: "数据来源：",
      mapFlow: "路线动线",
      mapLoading: "正在载入地图模块",
      mapLoadingNote: "地图模块按需加载，避免整个应用一开始过重。",
      timeline: "站点时间线",
      timelineNote: "点击任意一站都可以打开详情卡，查看停留建议和入选理由。",
      fromStart: "从当前起点出发",
      livePoi: "站点来自开放地图附近候选点",
      localPoi: "站点来自本地精选包",
      viewStop: "查看详情",
      emptyLoading: "正在根据你当前定位刷新路线，稍等几秒就会出现新方案。",
      emptyEmptySuffix: "。你可以放宽主题、增加时间预算，或者重新获取一次定位。",
      emptyErrorSuffix: "。现在已经优先使用本地精选包，所以再点一次定位通常就能恢复。",
    },
    stopSheet: {
      liveDigest: "实时点位摘要",
      verified: "到访验证内容",
      rating: "评分",
      close: "关闭",
      stay: "建议停留",
      source: "数据来源",
      visitVerified: "到访验证",
      bestTime: "适合时段",
      reason: "入选理由",
      matched: "命中本次输入",
      summary: "Wander 摘要",
      authorNote: "的笔记",
      tip: "实用提醒",
    },
    community: {
      eyebrow: "社区",
      title: "看看别人下班后、下课后，都怎么安排自己的 Wander 日常。",
      description: "这里不再是路线模板库，而是偏日常分享的社区流，用户可以发近况、点赞、评论和转发。",
      composerTitle: "发布今天的动态",
      composerPlaceholder: "分享你今天的路线、临时起意的去处，或者一句课后想出去走走的感受……",
      publish: "发布",
      addPhoto: "添加图片",
      changePhoto: "更换图片",
      removePhoto: "移除图片",
      photoReady: "已附加一张图片",
      photoHint: "支持上传一张图片，让社区动态更像真实分享。",
      feedTitle: "社区动态",
      feedDesc: "真实的课后、下班后日常更容易给别人灵感。",
      sidebarTitle: "社区脉搏",
      sidebarDesc: "这部分更像答辩时展示社区氛围和 UGC 活跃度的模块。",
      like: "点赞",
      liked: "已赞",
      comment: "评论",
      share: "转发",
      shared: "已转发",
      hotThemes: "热门主题",
      postingHint: "发布后会把你当前的路线需求和时间窗口一起整理成帖子摘要。",
    },
    profile: {
      eyebrow: "个人中心",
      title: "把偏好、语言和最近路线收进一个地方。",
      description: "这里更像用户自己的控制台，方便查看当前位置、最近路线状态和语言设置。",
      account: "账户概览",
      currentLocation: "当前位置",
      uiLanguage: "界面语言",
      stats: "最近使用",
      readCards: "已读地点卡",
      routeScore: "当前路线匹配度",
      selectedRoute: "当前选中路线",
      request: "当前需求",
      preferences: "偏好设置",
      preferencesDesc: "这些偏好帮助 Wander 优先给你低切换、低心智负担的路线。",
      pref1: "GPS-first 出发",
      pref2: "碎片时间优先",
      pref3: "多站点自动拼接",
      languageSetting: "语言切换",
      languageDesc: "这里也可以在中英文界面之间切换。",
    },
  },
  en: {
    layout: {
      navHome: "Home",
      navRoutes: "Route Planning",
      navCommunity: "Community",
      navProfile: "Profile",
      brandTagline: "Locate first, then go",
      cta: "New Route",
      language: "Language",
    },
    planner: {
      eyebrow: "Home",
      title: "Grant location access first, then tell Wander what you want to do.",
      lead: "The homepage now focuses only on request input. Locate, pick your time budget, write your theme, then jump straight into route selection.",
      currentStart: "Current Start",
      precision: "Browser accuracy",
      sourceOpen: "GPS + open-map services enabled",
      sourceFallback: "GPS + local fallback pack enabled",
      realtimeSource: "Realtime Status",
      realtimeStatus: "Route status",
      dataSource: "Data source",
      generatedAt: "Last generated",
      candidateCount: "Nearby candidates",
      searchRadius: "Search radius",
      systemNote: "System note",
      statusCardLead:
        "Wander keeps refreshing executable nearby options around your current location and time budget.",
      requestLabel: "Your plan",
      requestHelp: "Only describe what you want to do here. You do not need to manually type the address or time again.",
      requestPlaceholder: "For example: I'd like Sichuan food, a short walk nearby, and a quick grocery stop on the way back.",
      quickExamples: "Quick prompts",
      weather: "Weather",
      clear: "Clear",
      rain: "Rain",
      venueStatus: "Venue status",
      venueOpen: "Open normally",
      venueClosed: "Some venues closed",
      generate: "Generate Routes",
      needLocation: "Allow location first",
      needLocationHint: "Click the button above to allow GPS access. Your browser will show a permission prompt.",
      needTimeHint: "Pick at least 1 minute in the dropdown fields before generating.",
      parsed: "Parsed Request",
      start: "Start",
      time: "Time Budget",
      theme: "Detected Themes",
      scenario: "Current Scenario",
      templateApplied: "A shared route template is active and has been recalculated around your current location and time window.",
      localFallbackNote: "The app is using a local fallback pack right now, but the route is still reorganized around your live location and schedule.",
      livePoiNote: "Wander will prioritize nearby candidates around your current location instead of pulling you into a faraway district.",
    },
    timePicker: {
      eyebrow: "Time Budget",
      title: "Use the dropdown fields to choose your available time",
      note: "These dropdown fields have higher priority than anything written in the text input.",
      hours: "Hours",
      minutes: "Minutes",
    },
    routes: {
      eyebrow: "Route Planning",
      title: "Choose the route you would actually leave for right now.",
      description: "This page focuses on comparing generated options and reviewing the full route details.",
      allRoutes: "Generated Options",
      allRoutesTitle: "Pick the best route for leaving now",
      selectedRoute: "Route Details",
      selectedRouteTitle:
        "After you choose a route above, review the full route, map, and stop-by-stop notes below",
    },
    routeCard: {
      option: "Option",
      total: "Total",
      buffer: "Buffer",
      selected: "Selected",
      view: "Expand Details",
      continue: "Select This Route",
    },
    routeDetail: {
      waiting: "Waiting For Route",
      waitingTitle: "No executable route yet",
      chooseRouteTitle: "Choose a route from above first",
      chooseRouteNote:
        "All executable options appear in the upper section first. Once you pick one, the full route, map, and stop-by-stop notes will expand here.",
      ready: "Ready To Go",
      match: "Theme Match",
      score: "Relevance",
      direct: "This route can be followed directly without extra swaps.",
      shared: "Shared routes only provide the theme seed. Stop order has been recalculated for current conditions.",
      realtime: "This route was generated from your current location, time budget, and nearby candidates.",
      localSource: "This route is currently powered by the local fallback pack.",
      sourcePrefix: "Source: ",
      mapFlow: "Route Flow",
      mapLoading: "Loading map module",
      mapLoadingNote: "The map module loads on demand so the app stays lighter on first load.",
      timeline: "Stop Timeline",
      timelineNote: "Tap any stop to open details, recommended stay time, and why it was included.",
      fromStart: "From your current start point",
      livePoi: "This stop came from nearby open-map candidates",
      localPoi: "This stop came from the local fallback pack",
      viewStop: "Open Details",
      emptyLoading: "Refreshing routes around your live location. A new option should appear shortly.",
      emptyEmptySuffix: ". You can broaden the theme, increase the time budget, or refresh location once more.",
      emptyErrorSuffix: ". The app now prefers the local fallback pack, so retrying location usually fixes it.",
    },
    stopSheet: {
      liveDigest: "Live POI Digest",
      verified: "Visit Verified",
      rating: "Rating",
      close: "Close",
      stay: "Suggested Stay",
      source: "Source",
      visitVerified: "Verified",
      bestTime: "Best Time",
      reason: "Why Included",
      matched: "Matched This Request",
      summary: "Wander Summary",
      authorNote: "'s Note",
      tip: "Practical Tip",
    },
    community: {
      eyebrow: "Community",
      title: "See how other people turn a free evening or a post-class gap into a small Wander outing.",
      description: "This page is now a social feed instead of a route template library, with likes, comments, and reposts.",
      composerTitle: "Share an update",
      composerPlaceholder: "Post your route, a quick note about where you went, or the kind of outing you wanted today…",
      publish: "Post",
      addPhoto: "Add Photo",
      changePhoto: "Change Photo",
      removePhoto: "Remove Photo",
      photoReady: "One photo attached",
      photoHint: "Upload one image to make the post feel more like a real social share.",
      feedTitle: "Community Feed",
      feedDesc: "Real after-work and after-class moments are often the best inspiration.",
      sidebarTitle: "Community Pulse",
      sidebarDesc: "This area helps you demo social engagement and UGC activity during critique or presentation.",
      like: "Like",
      liked: "Liked",
      comment: "Comment",
      share: "Repost",
      shared: "Reposted",
      hotThemes: "Hot Themes",
      postingHint: "New posts automatically include your current route intent and time budget as context.",
    },
    profile: {
      eyebrow: "Profile",
      title: "Keep your preferences, language, and recent route state in one place.",
      description: "This page works like a lightweight user dashboard for location, route status, and language settings.",
      account: "Account Overview",
      currentLocation: "Current Location",
      uiLanguage: "Interface Language",
      stats: "Recent Usage",
      readCards: "Stop Cards Read",
      routeScore: "Current Route Score",
      selectedRoute: "Selected Route",
      request: "Current Request",
      preferences: "Preferences",
      preferencesDesc: "These settings help Wander prioritize low-friction routes with less switching and less mental load.",
      pref1: "GPS-first start",
      pref2: "Fragmented free-time friendly",
      pref3: "Automatic multi-stop assembly",
      languageSetting: "Language Switch",
      languageDesc: "You can switch between Chinese and English here as well.",
    },
  },
} as const;

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = window.localStorage.getItem(storageKey);
    return stored === "en" ? "en" : "zh";
  });

  useEffect(() => {
    window.localStorage.setItem(storageKey, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}

export function useCopy() {
  const { language } = useLanguage();
  return copy[language];
}

export function getLocalizedCategoryLabel(category: CategoryId, language: Language) {
  return categoryLabels[language][category];
}
