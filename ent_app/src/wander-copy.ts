import type { DeviceLocation, LiveDataState } from "./types";

export function buildLocalizedLiveClusterLabel(
  location: DeviceLocation,
  language: "zh" | "en"
) {
  const area = location.districtName || location.cityName || (language === "zh" ? "附近" : "Nearby");
  return language === "zh" ? `${area}实时路线` : `${area} live route`;
}

export function buildLocalizedLiveClusterAccent(
  liveDataState: LiveDataState,
  language: "zh" | "en"
) {
  const radius = liveDataState.radiusMeters
    ? formatLocalizedRadius(liveDataState.radiusMeters, language)
    : language === "zh"
      ? "附近"
      : "nearby";

  if (liveDataState.status === "live") {
    return language === "zh"
      ? `开放地图实时搜索 · ${liveDataState.poiCount} 个候选点 · 控制在 ${radius} 内`
      : `Open-map live search · ${liveDataState.poiCount} candidates · kept within ${radius}`;
  }

  if (liveDataState.status === "loading") {
    return language === "zh"
      ? `正在围绕 ${radius} 搜索附近地点`
      : `Searching nearby places within ${radius}`;
  }

  if (liveDataState.status === "empty") {
    return language === "zh"
      ? `附近暂时只找到较少可用地点，已经扩展到 ${radius}`
      : `Only a few viable places were found nearby, so the search expanded to ${radius}`;
  }

  if (liveDataState.status === "error") {
    return language === "zh"
      ? "开放地图服务暂时不可用"
      : "Open-map services are temporarily unavailable";
  }

  return language === "zh"
    ? "实时路线会根据你附近的可去地点、时间预算和天气状态一起重算。"
    : "Realtime routes are rebuilt from reachable nearby places, your time budget, and live conditions.";
}

export function formatLocalizedRadius(radiusMeters: number, language: "zh" | "en") {
  if (radiusMeters < 1000) {
    return language === "zh" ? `${radiusMeters} 米` : `${radiusMeters} m`;
  }

  return language === "zh"
    ? `${(radiusMeters / 1000).toFixed(1)} 公里`
    : `${(radiusMeters / 1000).toFixed(1)} km`;
}

export function formatLocalizedGenerationLabel(
  isoString: string,
  activeTemplateId: string | null,
  language: "zh" | "en"
) {
  const formatted = new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(isoString));

  return activeTemplateId
    ? language === "zh"
      ? `模板已按当前条件实时重算 · ${formatted}`
      : `Shared route recalculated for current conditions · ${formatted}`
    : language === "zh"
      ? `实时规划生成 · ${formatted}`
      : `Realtime route generated · ${formatted}`;
}

export function buildLiveDataNote(
  status: LiveDataState["status"],
  source: LiveDataState["source"],
  language: "zh" | "en",
  radiusMeters: number | null = null,
  poiCount = 0
) {
  const radiusLabel =
    radiusMeters != null ? formatLocalizedRadius(radiusMeters, language) : language === "zh" ? "附近" : "nearby";

  if (status === "idle") {
    return language === "zh"
      ? "允许定位后，Wander 会用开放地图数据搜索你附近可去的地点并实时规划路线。"
      : "Once location is allowed, Wander will search nearby places with open-map data and rebuild routes in realtime.";
  }

  if (status === "loading") {
    return language === "zh"
      ? `正在搜索 ${radiusLabel} 内的附近地点，如果结果太少会自动扩圈。`
      : `Searching places within ${radiusLabel}. If the result set is too small, Wander will expand the radius automatically.`;
  }

  if (status === "live") {
    return language === "zh"
      ? `当前已接入开放地图实时结果，共找到 ${poiCount} 个可用候选点。`
      : `Open-map live results are active now, with ${poiCount} viable nearby candidates found.`;
  }

  if (status === "empty") {
    return language === "zh"
      ? `在 ${radiusLabel} 内只找到很少可用地点，可以换一个主题或再试一次定位。`
      : `Only a few viable places were found within ${radiusLabel}. Try a broader theme or refresh location once more.`;
  }

  if (status === "fallback" || source === "demo") {
    return language === "zh"
      ? "当前已切到本地精选包，但路线仍会按你当前位置和时间预算实时重算。"
      : "Wander is using the local fallback pack right now, but routes are still recalculated around your current location and time budget.";
  }

  return language === "zh"
    ? "附近地点搜索失败了，稍后再试一次通常会更稳。"
    : "Nearby search failed for now. Trying again shortly is usually more stable.";
}
