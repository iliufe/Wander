import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cityDriftData } from "./data";
import { buildPromptFromSharedRoute, generateRoutes, parseRequest } from "./engine";
import { useLanguage } from "./i18n";
import { buildLocalFallbackVenuePool, findNearestOfflineLandmark } from "./local-fallback-packs";
import { reverseGeocodeFromOpenMap, searchNearbyVenuePool } from "./services/openmap";
import {
  buildLiveDataNote,
  buildLocalizedLiveClusterAccent,
  buildLocalizedLiveClusterLabel,
  formatLocalizedGenerationLabel,
} from "./wander-copy";
import type {
  AppClusterId,
  CategoryId,
  DeviceLocation,
  LiveDataState,
  RouteOption,
  ScenarioState,
  TimeSelection,
  Venue,
} from "./types";

const storageKey = "wander-demo-state";
const liveClusterAccentFallback = "实时路线会根据你附近的可去地点、时间预算和天气状态一起重算。";

type OpenedStop = {
  routeId: string;
  stopId: string;
} | null;

interface WanderContextValue {
  inputPrompt: string;
  activePrompt: string;
  setInputPrompt: (value: string) => void;
  location: DeviceLocation;
  locationReady: boolean;
  requestCurrentLocation: () => void;
  generationLabel: string;
  liveDataState: LiveDataState;
  openDataEnabled: boolean;
  timeSelection: TimeSelection;
  setTimeSelection: (value: TimeSelection | ((current: TimeSelection) => TimeSelection)) => void;
  canGenerate: boolean;
  scenario: ScenarioState;
  setScenario: (updater: ScenarioState | ((current: ScenarioState) => ScenarioState)) => void;
  ugcReads: number;
  parsed: ReturnType<typeof generateRoutes>["parsed"];
  routes: RouteOption[];
  selectedRouteId: string | null;
  setSelectedRouteId: (routeId: string) => void;
  selectedRoute: RouteOption | null;
  routeFit: string;
  adjustmentState: string;
  activeTemplateId: string | null;
  commitPrompt: () => void;
  applyQuickPrompt: (prompt: string) => void;
  applySharedRoute: (routeId: string) => void;
  activeStop: RouteOption["stops"][number] | null;
  openStop: (routeId: string, stopId: string) => void;
  closeStop: () => void;
}

type StoredState = {
  prompt?: string;
  location?: DeviceLocation;
  timeSelection?: TimeSelection;
  activeTimeBudgetMinutes?: number;
  scenario?: ScenarioState;
  ugcReads?: number;
};

type ReverseGeocodeSnapshot = {
  nearbyPlaceName: string;
  formattedAddress: string;
  cityName: string | null;
  districtName: string | null;
  adcode: string | null;
};

const WanderContext = createContext<WanderContextValue | null>(null);

const keepLegacyHelpersReferenced = [
  liveClusterAccentFallback,
  buildLiveClusterLabel,
  buildLiveClusterAccent,
  formatGenerationLabel,
];

void keepLegacyHelpersReferenced;

const clusterLocationMeta: Record<
  AppClusterId,
  {
    latitude: number;
    longitude: number;
  }
> = {
  jingan: {
    latitude: 31.2282,
    longitude: 121.4453,
  },
  xuhui: {
    latitude: 31.2057,
    longitude: 121.4397,
  },
  huangpu: {
    latitude: 31.2327,
    longitude: 121.4753,
  },
};

function readStoredState() {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as StoredState;
  } catch {
    return null;
  }
}

export function WanderProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const stored = readStoredState();
  const defaultPrompt = stored?.prompt || cityDriftData.defaults.prompt;
  const parsedDefault = parseRequest(defaultPrompt, { language });
  const defaultTimeSelection = selectionFromMinutes(parsedDefault.timeMinutes);
  const openDataEnabled = true;

  const [inputPrompt, setInputPrompt] = useState(defaultPrompt);
  const [activePrompt, setActivePrompt] = useState(defaultPrompt);
  const [location, setLocation] = useState<DeviceLocation>(() => createInitialLocation(stored?.location));
  const [timeSelection, setTimeSelection] = useState<TimeSelection>(
    stored?.timeSelection || defaultTimeSelection
  );
  const [activeTimeBudgetMinutes, setActiveTimeBudgetMinutes] = useState(
    stored?.activeTimeBudgetMinutes ?? parsedDefault.timeMinutes
  );
  const [scenario, setScenario] = useState<ScenarioState>(
    stored?.scenario || {
      weather: "clear",
      venue: "live",
    }
  );
  const [ugcReads, setUgcReads] = useState(stored?.ugcReads || 0);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [openedStop, setOpenedStop] = useState<OpenedStop>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState(() => new Date().toISOString());
  const [liveVenuePool, setLiveVenuePool] = useState<Venue[]>([]);
  const [liveDataState, setLiveDataState] = useState<LiveDataState>({
    status: "idle",
    source: "open",
    note: "允许定位后，Wander 会用 Nominatim / Overpass / OSRM 搜索你附近可去的地点并实时规划路线。",
    radiusMeters: null,
    poiCount: 0,
  });

  const locationReady = location.permission === "granted" || location.permission === "unsupported";
  const activeTemplate =
    cityDriftData.sharedRoutes.find((route) => route.id === activeTemplateId) || null;
  const selectedTimeMinutes = timeSelection.hours * 60 + timeSelection.minutes;
  const canGenerate = selectedTimeMinutes > 0 && locationReady;
  const liveMode =
    openDataEnabled &&
    location.permission === "granted" &&
    location.latitude != null &&
    location.longitude != null;
  const liveClusterLabel = liveMode ? buildLocalizedLiveClusterLabel(location, language) : null;
  const liveClusterAccent = liveMode ? buildLocalizedLiveClusterAccent(liveDataState, language) : null;

  const { parsed, routes } = generateRoutes(activePrompt, {
    language,
    template: activeTemplate,
    scenario,
    timeOverrideMinutes: activeTimeBudgetMinutes,
    startPointOverride: locationReady ? location.label : null,
    preferredClusterId: location.clusterId,
    startCoordinates:
      location.latitude != null && location.longitude != null
        ? {
            latitude: location.latitude,
            longitude: location.longitude,
          }
        : null,
    venuePool: liveVenuePool,
    liveMode,
    liveClusterLabel,
    liveClusterAccent,
  });

  useEffect(() => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        prompt: inputPrompt,
        location,
        timeSelection,
        activeTimeBudgetMinutes,
        scenario,
        ugcReads,
      })
    );
  }, [activeTimeBudgetMinutes, inputPrompt, location, scenario, timeSelection, ugcReads]);

  useEffect(() => {
    setSelectedRouteId((current) =>
      current && routes.some((route) => route.id === current) ? current : null
    );
  }, [routes]);

  useEffect(() => {
    const nextNote = buildLiveDataNote(
      liveDataState.status,
      liveDataState.source,
      language,
      liveDataState.radiusMeters,
      liveDataState.poiCount
    );

    if (liveDataState.note !== nextNote) {
      setLiveDataState((current) => ({ ...current, note: nextNote }));
    }
  }, [
    language,
    liveDataState.note,
    liveDataState.poiCount,
    liveDataState.radiusMeters,
    liveDataState.source,
    liveDataState.status,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenedStop(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!openDataEnabled) {
      setLiveVenuePool([]);
      setLiveDataState({
        status: "fallback",
        source: "demo",
        note: "当前已退回演示数据模式。",
        radiusMeters: null,
        poiCount: 0,
      });
      return;
    }

    if (location.latitude == null || location.longitude == null || location.permission !== "granted") {
      setLiveVenuePool([]);
      setLiveDataState({
        status: "idle",
        source: "open",
        note: "允许定位后，Wander 会用 Nominatim / Overpass / OSRM 搜索你附近可去的地点并实时规划路线。",
        radiusMeters: null,
        poiCount: 0,
      });
      return;
    }

    let cancelled = false;
    const radiusPlan = buildSearchRadiusPlan(activeTimeBudgetMinutes);
    const initialRadiusMeters = radiusPlan[0];
    const searchOrigin = {
      latitude: location.latitude,
      longitude: location.longitude,
    };
    const parsedForSearch = parseRequest(activePrompt, {
      language,
      scenario,
      timeOverrideMinutes: activeTimeBudgetMinutes,
      startPointOverride: location.label,
    });
    const searchCategories = buildLiveSearchCategories(parsedForSearch.categories, scenario.weather);
    const localFallback = buildLocalFallbackVenuePool(
      searchOrigin,
      searchCategories,
      parsedForSearch.searchTerms
    );

    if (localFallback) {
      setLiveVenuePool(localFallback.venues);
    }

    setLiveDataState((current) => ({
      status: "loading",
      source: "open",
      note: `正在用 OpenStreetMap / Overpass 搜索 ${formatRadius(initialRadiusMeters)} 内的附近地点；如果结果太少会自动扩展半径。`,
      radiusMeters: initialRadiusMeters,
      poiCount: current.poiCount,
    }));

    (async () => {
      let bestResult: {
        venues: Venue[];
        radiusMeters: number;
        note: string;
      } | null = null;

      for (const radiusMeters of radiusPlan) {
        const result = await searchNearbyVenuePool({
          coordinates: searchOrigin,
          categories: searchCategories,
          searchTerms: parsedForSearch.searchTerms,
          radiusMeters,
        });

        if (cancelled) {
          return;
        }

        if (!bestResult || result.venues.length > bestResult.venues.length) {
          bestResult = result;
        }

        if (hasEnoughLiveVenues(result.venues)) {
          break;
        }
      }

      if (cancelled || !bestResult) {
        return;
      }

      const mergedVenues = mergeVenuePools(bestResult.venues, localFallback?.venues ?? []);

      if (mergedVenues.length) {
        setLiveVenuePool(mergedVenues);
        setLiveDataState({
          status: bestResult.venues.length ? "live" : localFallback ? "fallback" : "empty",
          source: bestResult.venues.length ? "open" : localFallback ? "demo" : "open",
          note: bestResult.note,
          radiusMeters: bestResult.venues.length
            ? bestResult.radiusMeters
            : (localFallback?.radiusMeters ?? bestResult.radiusMeters),
          poiCount: mergedVenues.length,
        });
        return;
      }

      setLiveVenuePool([]);
      setLiveDataState({
        status: "empty",
        source: "open",
        note: bestResult.note,
        radiusMeters: bestResult.radiusMeters,
        poiCount: 0,
      });
    })().catch(() => {
      if (cancelled) {
        return;
      }

      if (localFallback) {
        setLiveVenuePool(localFallback.venues);
        setLiveDataState({
          status: "fallback",
          source: "demo",
          note: localFallback.note,
          radiusMeters: localFallback.radiusMeters,
          poiCount: localFallback.venues.length,
        });
        return;
      }

      setLiveVenuePool([]);
      setLiveDataState({
        status: "error",
        source: "open",
        note: "附近地点搜索失败了，稍后再试一次会更稳。",
        radiusMeters: radiusPlan[radiusPlan.length - 1] ?? initialRadiusMeters,
        poiCount: 0,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    activePrompt,
    activeTimeBudgetMinutes,
    language,
    location.label,
    location.latitude,
    location.longitude,
    location.permission,
    openDataEnabled,
    scenario.weather,
  ]);

  const selectedRoute = routes.find((route) => route.id === selectedRouteId) || null;
  const activeStop = openedStop
    ? routes
        .find((route) => route.id === openedStop.routeId)
        ?.stops.find((stop) => stop.id === openedStop.stopId) || null
    : null;

  const routeFit = selectedRoute ? `${selectedRoute.fitScore}%` : "--";
  const adjustmentState =
    selectedRoute && selectedRoute.adjustments.length ? "有自动替换建议" : "当前可直接执行";
  const generationLabel = formatLocalizedGenerationLabel(lastGeneratedAt, activeTemplateId, language);

  useEffect(() => {
    setLastGeneratedAt(new Date().toISOString());
  }, [
    activePrompt,
    activeTimeBudgetMinutes,
    activeTemplateId,
    liveDataState.poiCount,
    liveDataState.status,
    location.label,
    location.latitude,
    location.longitude,
    scenario.weather,
    scenario.venue,
  ]);

  const requestCurrentLocation = () => {
    if (!hasGeolocationSupport()) {
      setLocation(createUnsupportedLocation());
      return;
    }

    setLocation((current) => ({
      ...current,
      permission: "requesting",
      label: "正在请求定位权限",
      detail: "请在浏览器弹窗里允许 Wander 获取你的当前位置。",
    }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const immediateLocation = createResolvedLocation(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy
        );
        setLocation(immediateLocation);

        try {
          const reverseGeocode = await reverseGeocodeFromOpenMap({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });

          setLocation((current) => {
            if (
              current.latitude !== position.coords.latitude ||
              current.longitude !== position.coords.longitude
            ) {
              return current;
            }

            return createResolvedLocation(
              position.coords.latitude,
              position.coords.longitude,
              position.coords.accuracy,
              reverseGeocode
            );
          });
        } catch {
          setLocation((current) => {
            if (
              current.latitude !== position.coords.latitude ||
              current.longitude !== position.coords.longitude
            ) {
              return current;
            }

            return {
              ...current,
              label: current.nearbyPlaceName || "当前位置附近",
              detail: `${current.formattedAddress || "已拿到当前位置"} · 定位精度约 ${
                current.accuracyMeters ?? "--"
              } 米 · 暂时无法解析最近建筑名`,
            };
          });
        }
      },
      (error) => {
        setLocation(createLocationError(error));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const value = useMemo<WanderContextValue>(
    () => ({
      inputPrompt,
      activePrompt,
      setInputPrompt,
      location,
      locationReady,
      requestCurrentLocation,
      generationLabel,
      liveDataState,
      openDataEnabled,
      timeSelection,
      setTimeSelection,
      canGenerate,
      scenario,
      setScenario,
      ugcReads,
      parsed,
      routes,
      selectedRouteId,
      setSelectedRouteId,
      selectedRoute,
      routeFit,
      adjustmentState,
      activeTemplateId,
      commitPrompt: () => {
        if (!canGenerate) {
          return;
        }

        setSelectedRouteId(null);
        setActiveTemplateId(null);
        setActiveTimeBudgetMinutes(selectedTimeMinutes);
        setActivePrompt(inputPrompt.trim() || cityDriftData.defaults.prompt);
      },
      applyQuickPrompt: (prompt: string) => {
        setSelectedRouteId(null);
        setActiveTemplateId(null);
        setInputPrompt(prompt);
        setActiveTimeBudgetMinutes(selectedTimeMinutes);
        setActivePrompt(prompt);
      },
      applySharedRoute: (routeId: string) => {
        const sharedRoute = cityDriftData.sharedRoutes.find((route) => route.id === routeId);
        if (!sharedRoute) {
          return;
        }

        const effectiveTimeBudget =
          selectedTimeMinutes > 0 ? selectedTimeMinutes : sharedRoute.timeHours * 60;
        const draftParsed = parseRequest(inputPrompt.trim() || cityDriftData.defaults.prompt, {
          language,
          scenario,
          timeOverrideMinutes: effectiveTimeBudget,
          startPointOverride: locationReady ? location.label : null,
          preferredClusterId: location.clusterId,
        });
        const nextPrompt = buildPromptFromSharedRoute(sharedRoute, draftParsed, language);
        setSelectedRouteId(null);
        setActiveTemplateId(routeId);
        setTimeSelection(selectionFromMinutes(effectiveTimeBudget));
        setActiveTimeBudgetMinutes(effectiveTimeBudget);
        setInputPrompt(nextPrompt);
        setActivePrompt(nextPrompt);
      },
      activeStop,
      openStop: (routeId: string, stopId: string) => {
        setOpenedStop({ routeId, stopId });
        setUgcReads((count) => count + 1);
      },
      closeStop: () => setOpenedStop(null),
    }),
    [
      activePrompt,
      activeStop,
      activeTemplateId,
      adjustmentState,
      canGenerate,
      generationLabel,
      inputPrompt,
      language,
      liveDataState,
      location,
      locationReady,
      openDataEnabled,
      parsed,
      routeFit,
      routes,
      scenario,
      selectedRoute,
      selectedRouteId,
      selectedTimeMinutes,
      timeSelection,
      ugcReads,
    ]
  );

  return <WanderContext.Provider value={value}>{children}</WanderContext.Provider>;
}

export function useWander() {
  const context = useContext(WanderContext);

  if (!context) {
    throw new Error("useWander must be used within WanderProvider");
  }

  return context;
}

function selectionFromMinutes(totalMinutes: number): TimeSelection {
  const safeMinutes = Math.max(0, Math.min(12 * 60, totalMinutes));

  return {
    hours: Math.floor(safeMinutes / 60),
    minutes: safeMinutes % 60,
  };
}

function hasGeolocationSupport() {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

function createInitialLocation(storedLocation?: DeviceLocation | null): DeviceLocation {
  if (storedLocation) {
    return {
      ...storedLocation,
      accuracyMeters: storedLocation.accuracyMeters ?? null,
      isApproximate: storedLocation.isApproximate ?? true,
      cityName: storedLocation.cityName ?? null,
      districtName: storedLocation.districtName ?? null,
      formattedAddress: storedLocation.formattedAddress ?? null,
      nearbyPlaceName: storedLocation.nearbyPlaceName ?? null,
      adcode: storedLocation.adcode ?? null,
    };
  }

  if (!hasGeolocationSupport()) {
    return createUnsupportedLocation();
  }

  return {
    permission: "idle",
    label: "等待定位授权",
    detail: "先允许 GPS 定位，Wander 才能围绕你当前所在位置实时规划路线。",
    clusterId: null,
    latitude: null,
    longitude: null,
    accuracyMeters: null,
    isApproximate: true,
    updatedAt: null,
    cityName: null,
    districtName: null,
    formattedAddress: null,
    nearbyPlaceName: null,
    adcode: null,
  };
}

function createUnsupportedLocation(): DeviceLocation {
  return {
    permission: "unsupported",
    label: "当前浏览器不支持定位",
    detail: "这个浏览器环境没有开放定位能力，Wander 会退回非实时演示模式。",
    clusterId: null,
    latitude: null,
    longitude: null,
    accuracyMeters: null,
    isApproximate: true,
    updatedAt: null,
    cityName: null,
    districtName: null,
    formattedAddress: null,
    nearbyPlaceName: null,
    adcode: null,
  };
}

function createResolvedLocation(
  latitude: number,
  longitude: number,
  accuracyMeters = 0,
  reverseGeocode?: ReverseGeocodeSnapshot
): DeviceLocation {
  const clusterId = findNearestCluster(latitude, longitude);
  const roundedAccuracy = Math.round(accuracyMeters);
  const offlineLandmark = findNearestOfflineLandmark({ latitude, longitude });
  const nearbyPlaceName = reverseGeocode?.nearbyPlaceName || offlineLandmark?.label || "当前位置附近";
  const formattedAddress =
    reverseGeocode?.formattedAddress || offlineLandmark?.detail || "已拿到当前位置";
  const district =
    reverseGeocode?.districtName || reverseGeocode?.cityName || offlineLandmark?.label || "附近";

  return {
    permission: "granted",
    label: nearbyPlaceName,
    detail: `${formattedAddress} · 定位精度约 ${roundedAccuracy} 米 · 正在围绕 ${district} 规划附近路线`,
    clusterId,
    latitude,
    longitude,
    accuracyMeters: roundedAccuracy,
    isApproximate: !reverseGeocode,
    updatedAt: new Date().toISOString(),
    cityName: reverseGeocode?.cityName ?? null,
    districtName: reverseGeocode?.districtName ?? null,
    formattedAddress,
    nearbyPlaceName,
    adcode: reverseGeocode?.adcode ?? null,
  };
}

function createLocationError(error: GeolocationPositionError): DeviceLocation {
  if (error.code === error.PERMISSION_DENIED) {
    return {
      permission: "denied",
      label: "定位权限被拒绝",
      detail: "没有定位权限就没法按你当前下班或下课的位置实时规划路线。",
      clusterId: null,
      latitude: null,
      longitude: null,
      accuracyMeters: null,
      isApproximate: true,
      updatedAt: null,
      cityName: null,
      districtName: null,
      formattedAddress: null,
      nearbyPlaceName: null,
      adcode: null,
    };
  }

  if (error.code === error.TIMEOUT) {
    return {
      permission: "error",
      label: "定位超时",
      detail: "这次没有在预期时间内拿到 GPS 结果，可以再试一次。",
      clusterId: null,
      latitude: null,
      longitude: null,
      accuracyMeters: null,
      isApproximate: true,
      updatedAt: null,
      cityName: null,
      districtName: null,
      formattedAddress: null,
      nearbyPlaceName: null,
      adcode: null,
    };
  }

  return {
    permission: "error",
    label: "定位失败",
    detail: "这次没有顺利解析当前位置，请稍后重试。",
    clusterId: null,
    latitude: null,
    longitude: null,
    accuracyMeters: null,
    isApproximate: true,
    updatedAt: null,
    cityName: null,
    districtName: null,
    formattedAddress: null,
    nearbyPlaceName: null,
    adcode: null,
  };
}

function findNearestCluster(latitude: number, longitude: number): AppClusterId {
  return (Object.entries(clusterLocationMeta) as [AppClusterId, (typeof clusterLocationMeta)[AppClusterId]][])
    .map(([clusterId, meta]) => ({
      clusterId,
      distance: haversine(latitude, longitude, meta.latitude, meta.longitude),
    }))
    .sort((left, right) => left.distance - right.distance)[0].clusterId;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
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

function buildSearchRadiusPlan(timeMinutes: number) {
  const baseRadius = Math.min(5000, Math.max(1800, Math.round(timeMinutes * 18)));
  const expandedRadius = Math.min(8000, Math.max(baseRadius + 2000, 4200));
  const extendedRadius = Math.min(12000, Math.max(expandedRadius + 2500, 7500));

  return [...new Set([baseRadius, expandedRadius, extendedRadius])];
}

function hasEnoughLiveVenues(venues: Venue[]) {
  const distinctCategories = new Set(venues.flatMap((venue) => venue.categories));
  return venues.length >= 6 || (venues.length >= 3 && distinctCategories.size >= 2);
}

function buildLiveSearchCategories(categories: CategoryId[], weather: ScenarioState["weather"]) {
  const merged = new Set<CategoryId>([...categories, "food", "cafe", "dessert", "grocery", "bookstore"]);

  if (weather !== "rain") {
    merged.add("walk");
    merged.add("park");
  } else {
    merged.add("gallery");
  }

  return [...merged];
}

function buildLiveClusterLabel(location: DeviceLocation) {
  return `${location.districtName || location.cityName || "附近"}实时路线`;
}

function buildLiveClusterAccent(liveDataState: LiveDataState) {
  const radius = liveDataState.radiusMeters ? formatRadius(liveDataState.radiusMeters) : "附近";

  if (liveDataState.status === "live") {
    return `开源实时搜索 · ${liveDataState.poiCount} 个候选点 · 控制在 ${radius} 内`;
  }

  if (liveDataState.status === "loading") {
    return `正在围绕 ${radius} 搜索附近地点`;
  }

  if (liveDataState.status === "empty") {
    return `附近暂时只找到很少可用地点，已经扩展到 ${radius}`;
  }

  if (liveDataState.status === "error") {
    return "开源地图服务暂时不可用";
  }

  return liveClusterAccentFallback;
}

function mergeVenuePools(primary: Venue[], backup: Venue[]) {
  const merged = new Map<string, Venue>();
  const signatures = new Set<string>();

  const appendVenue = (venue: Venue) => {
    if (merged.has(venue.id)) {
      return;
    }

    const signature = [
      normalizeVenueToken(venue.name),
      venue.latitude.toFixed(4),
      venue.longitude.toFixed(4),
    ].join("|");

    if (signatures.has(signature)) {
      return;
    }

    merged.set(venue.id, venue);
    signatures.add(signature);
  };

  primary.forEach(appendVenue);
  backup.forEach(appendVenue);

  return [...merged.values()];
}

function normalizeVenueToken(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function formatRadius(radiusMeters: number) {
  if (radiusMeters < 1000) {
    return `${radiusMeters} 米`;
  }

  return `${(radiusMeters / 1000).toFixed(1)} 公里`;
}

function formatGenerationLabel(isoString: string, activeTemplateId: string | null) {
  const formatted = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(isoString));

  return activeTemplateId ? `模板已按当前条件实时重算 · ${formatted}` : `实时规划生成 · ${formatted}`;
}
