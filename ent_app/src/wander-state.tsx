import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cityDriftData } from "./data";
import { buildPromptFromSharedRoute, parseRequest } from "./engine";
import { useLanguage } from "./i18n";
import { findNearestOfflineLandmark } from "./local-fallback-packs";
import {
  describeLocationWithApi,
  generatePlansWithApi,
  type LocationDescribeResponse,
  type StartPlaceSearchResult,
} from "./services/plans-api";
import {
  fetchCurrentUser,
  isEmailAlreadyUsedError,
  isAccountNotFoundError,
  loginAccount,
  logoutAccount,
  registerAccount,
  resetAccountPassword,
  updateAccountProfile,
} from "./services/auth-api";
import { formatLocalizedGenerationLabel } from "./wander-copy";
import type {
  AppClusterId,
  DeviceLocation,
  IntentSignals,
  LiveDataState,
  RouteOption,
  SavedAddress,
  SavedAddressId,
  ScenarioState,
  TimeSelection,
  UserProfile,
} from "./types";

const storageKey = "wander-demo-state";
const navigationAccuracyTargetMeters = 100;
const acceptableFirstFixAccuracyMeters = 100;
const maxLocationWatchMs = 30000;

type OpenedStop = {
  routeId: string;
  stopId: string;
} | null;

export type AuthActionResult = {
  ok: boolean;
  reason?: "email-used" | "not-found" | "invalid";
};

interface WanderContextValue {
  inputPrompt: string;
  activePrompt: string;
  setInputPrompt: (value: string) => void;
  location: DeviceLocation;
  locationReady: boolean;
  requestCurrentLocation: () => void;
  selectStartCoordinates: (latitude: number, longitude: number) => Promise<void>;
  selectStartPlace: (place: {
    name: string;
    address: string;
    area?: string;
    latitude: number;
    longitude: number;
    amapId?: string | null;
  }) => void;
  generationLabel: string;
  liveDataState: LiveDataState;
  openDataEnabled: boolean;
  timeSelection: TimeSelection;
  setTimeSelection: (value: TimeSelection | ((current: TimeSelection) => TimeSelection)) => void;
  canGenerate: boolean;
  scenario: ScenarioState;
  setScenario: (updater: ScenarioState | ((current: ScenarioState) => ScenarioState)) => void;
  userProfile: UserProfile;
  login: (payload: { email: string; name?: string; password: string }) => Promise<AuthActionResult>;
  register: (payload: { email: string; name: string; password: string }) => Promise<AuthActionResult>;
  resetPassword: (payload: { email: string; password: string }) => Promise<AuthActionResult>;
  logout: () => void;
  updateUserProfile: (profile: Partial<Omit<UserProfile, "isAuthenticated" | "password">>) => Promise<void>;
  savedAddresses: SavedAddress[];
  updateSavedAddress: (id: SavedAddressId, address: Partial<Omit<SavedAddress, "id">>) => void;
  setSavedAddressFromCurrentLocation: (id: SavedAddressId) => void;
  clearSavedAddress: (id: SavedAddressId) => void;
  ugcReads: number;
  parsed: ReturnType<typeof parseRequest>;
  routes: RouteOption[];
  selectedRouteId: string | null;
  setSelectedRouteId: (routeId: string) => void;
  selectedRoute: RouteOption | null;
  moveRouteStop: (routeId: string, stopId: string, direction: "up" | "down") => void;
  moveRouteStopToIndex: (routeId: string, stopId: string, targetIndex: number) => void;
  removeRouteStop: (routeId: string, stopId: string) => void;
  addRouteStopFromPlace: (routeId: string, place: StartPlaceSearchResult) => void;
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
  savedAddresses?: SavedAddress[];
  userProfile?: UserProfile;
  ugcReads?: number;
  plannedRoutes?: RouteOption[];
  plannedIntent?: IntentSignals | null;
  selectedRouteId?: string | null;
  lastGeneratedAt?: string;
};

type ReverseGeocodeSnapshot = LocationDescribeResponse;

const WanderContext = createContext<WanderContextValue | null>(null);

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
  const [location, setLocation] = useState<DeviceLocation>(() => createInitialLocation(stored?.location, language));
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
  const [userProfile, setUserProfile] = useState<UserProfile>(() =>
    createUserProfile(stored?.userProfile)
  );
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(() =>
    createSavedAddresses(stored?.savedAddresses, language)
  );
  const [ugcReads, setUgcReads] = useState(stored?.ugcReads || 0);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(stored?.selectedRouteId || null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [openedStop, setOpenedStop] = useState<OpenedStop>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState(() => stored?.lastGeneratedAt || new Date().toISOString());
  const [plannedRoutes, setPlannedRoutes] = useState<RouteOption[]>(() => stored?.plannedRoutes || []);
  const [plannedIntent, setPlannedIntent] = useState<IntentSignals | null>(() => stored?.plannedIntent || null);
  const [generationRunId, setGenerationRunId] = useState(0);
  const [planningLanguage, setPlanningLanguage] = useState(language);
  const locationWatchIdRef = useRef<number | null>(null);
  const locationWatchTimeoutRef = useRef<number | null>(null);
  const [liveDataState, setLiveDataState] = useState<LiveDataState>({
    status: "idle",
    source: "amap",
    note:
      language === "zh"
        ? "允许定位后，Wander 会调用千问与高德生成真实路线。"
        : "Once location is allowed, Wander will use Qwen plus AMap to generate real routes.",
    radiusMeters: null,
    poiCount: 0,
  });

  const locationReady =
    location.permission === "granted" &&
    location.latitude != null &&
    location.longitude != null;
  const activeTemplate =
    cityDriftData.sharedRoutes.find((route) => route.id === activeTemplateId) || null;
  const selectedTimeMinutes = timeSelection.hours * 60 + timeSelection.minutes;
  const canGenerate = selectedTimeMinutes > 0 && locationReady;

  const parsed = useMemo(
    () =>
      parseRequest(activePrompt, {
        language,
        template: activeTemplate,
        scenario,
        intentOverride: plannedIntent,
        timeOverrideMinutes: activeTimeBudgetMinutes,
        startPointOverride: location.label,
        preferredClusterId: location.clusterId,
        startCoordinates:
          location.latitude != null && location.longitude != null
            ? {
                latitude: location.latitude,
                longitude: location.longitude,
              }
            : null,
      }),
    [
      activePrompt,
      activeTemplate,
      activeTimeBudgetMinutes,
      language,
      location.clusterId,
      location.label,
      location.latitude,
      location.longitude,
      plannedIntent,
      scenario,
    ]
  );

  const routes = plannedRoutes;

  useEffect(() => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        prompt: inputPrompt,
        location,
        timeSelection,
        activeTimeBudgetMinutes,
        scenario,
        savedAddresses,
        userProfile,
        ugcReads,
        plannedRoutes,
        plannedIntent,
        selectedRouteId,
        lastGeneratedAt,
      })
    );
  }, [activeTimeBudgetMinutes, inputPrompt, lastGeneratedAt, location, plannedIntent, plannedRoutes, savedAddresses, scenario, selectedRouteId, timeSelection, ugcReads, userProfile]);

  useEffect(() => {
    let cancelled = false;
    fetchCurrentUser()
      .then((user) => {
        if (cancelled) {
          return;
        }

        setUserProfile(user ? normalizeRemoteUser(user) : createUserProfile(null));
      })
      .catch(() => {
        if (!cancelled) {
          setUserProfile(createUserProfile(null));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSelectedRouteId((current) =>
      current && routes.some((route) => route.id === current) ? current : routes[0]?.id ?? null
    );
  }, [routes]);

  useEffect(() => {
    if (!activePrompt.trim() || !locationReady || location.latitude == null || location.longitude == null) {
      setPlannedIntent(null);
      setPlannedRoutes([]);
      setLiveDataState((current) => ({
        ...current,
        status: locationReady ? "idle" : "idle",
        source: "amap",
        note:
          language === "zh"
            ? "完成定位后再点击生成路线，系统会结合千问和高德输出真实方案。"
            : "Finish location first, then generate routes from Qwen plus AMap.",
        radiusMeters: null,
        poiCount: 0,
      }));
      return;
    }

    const destinationRoute = buildSavedAddressRoute({
      prompt: activePrompt,
      savedAddresses,
      startLocation: location,
      timeBudgetMinutes: activeTimeBudgetMinutes,
      language: planningLanguage,
    });
    const destinationOnly = destinationRoute
      ? isSavedAddressOnlyPrompt(activePrompt, destinationRoute.destination.id)
      : false;

    if (destinationRoute && destinationOnly) {
      setPlannedIntent({
        categories: ["destination"],
        searchTerms: [destinationRoute.destination.label, destinationRoute.destination.address],
        requiredTermsByCategory: {},
        preferredStyle: "efficient",
        routeSummary: planningLanguage === "zh" ? "直接前往常用地址。" : "Direct route to a saved address.",
        timePlanSummary: null,
        stopSignals: [],
      });
      setPlannedRoutes([destinationRoute.route]);
      setLiveDataState({
        status: "live",
        source: "amap",
        note: planningLanguage === "zh" ? "已根据常用地址生成路线。" : "Route generated from your saved address.",
        radiusMeters: null,
        poiCount: 1,
      });
      setLastGeneratedAt(new Date().toISOString());
      return;
    }

    const controller = new AbortController();
    setPlannedIntent(null);
    setPlannedRoutes([]);
    setLiveDataState((current) => ({
      ...current,
      status: "loading",
      source: "amap",
      note:
        language === "zh"
          ? "正在用千问理解需求，并让高德检索真实店铺与步行路线。"
          : "Qwen is parsing the request while AMap searches real places and walking routes.",
      radiusMeters: null,
    }));

    generatePlansWithApi(
      {
        prompt: activePrompt,
        language: planningLanguage,
        latitude: location.latitude,
        longitude: location.longitude,
        locationLabel: location.label,
        timeBudgetMinutes: activeTimeBudgetMinutes,
        weather: scenario.weather,
        venueStatus: scenario.venue,
      },
      controller.signal
    )
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }

        setPlannedIntent(result.intent);
        const routesWithDestination = destinationRoute
          ? appendSavedAddressDestinationToRoutes(result.routes, destinationRoute.route.stops[0], planningLanguage)
          : result.routes;
        setPlannedRoutes(routesWithDestination);
        setLiveDataState(
          result.liveData || {
            status: routesWithDestination.length ? "live" : "empty",
            source: "amap",
            note:
              language === "zh"
                ? "已完成真实路线生成。"
                : "Real routes are ready.",
            radiusMeters: null,
            poiCount: destinationRoute ? 1 : 0,
          }
        );
        setLastGeneratedAt(new Date().toISOString());

        if (result.location) {
          setLocation((current) =>
            current.latitude === location.latitude && current.longitude === location.longitude
              ? createResolvedLocation(
                  location.latitude as number,
                  location.longitude as number,
                  current.accuracyMeters ?? 0,
                  result.location || undefined,
                  planningLanguage
                )
              : current
          );

          if (result.location.weatherMode) {
            setScenario((current) => ({ ...current, weather: result.location?.weatherMode || current.weather }));
          }
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        setPlannedIntent(null);
        setPlannedRoutes([]);
        const errorNote = buildGenerationErrorNote(error, planningLanguage);
        setLiveDataState({
          status: "error",
          source: "amap",
          /*
            language === "zh"
              ? "真实路线生成失败了，可以稍后再试一次。"
              : "Real route generation failed. Trying again shortly should be more stable.",
          */
          note: errorNote,
          radiusMeters: null,
          poiCount: 0,
        });
      });

    return () => controller.abort();
  }, [
    activePrompt,
    activeTimeBudgetMinutes,
    generationRunId,
    location.label,
    location.latitude,
    location.longitude,
    locationReady,
    planningLanguage,
    savedAddresses,
    scenario.venue,
    scenario.weather,
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
    return () => {
      if (locationWatchIdRef.current != null) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
      if (locationWatchTimeoutRef.current != null) {
        window.clearTimeout(locationWatchTimeoutRef.current);
        locationWatchTimeoutRef.current = null;
      }
    };
  }, []);

  const selectedRoute = routes.find((route) => route.id === selectedRouteId) || null;
  const activeStop = openedStop
    ? routes
        .find((route) => route.id === openedStop.routeId)
        ?.stops.find((stop) => stop.id === openedStop.stopId) || null
    : null;

  const routeFit = selectedRoute ? `${selectedRoute.fitScore}%` : "--";
  const adjustmentState =
    selectedRoute && selectedRoute.adjustments.length
      ? language === "zh"
        ? "路线已根据实时约束微调"
        : "Route adjusted for live constraints"
      : language === "zh"
        ? "当前可直接执行"
        : "Ready to follow";
  const generationLabel = formatLocalizedGenerationLabel(lastGeneratedAt, activeTemplateId, language);

  const requestCurrentLocation = () => {
    if (!hasGeolocationSupport()) {
      setLocation(createUnsupportedLocation(language));
      return;
    }

    if (locationWatchIdRef.current != null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }
    if (locationWatchTimeoutRef.current != null) {
      window.clearTimeout(locationWatchTimeoutRef.current);
      locationWatchTimeoutRef.current = null;
    }

    setLocation((current) => ({
      ...current,
      permission: "requesting",
      label: language === "zh" ? "正在请求定位权限" : "Requesting location access",
      detail:
        language === "zh"
          ? "请在浏览器弹窗里允许 Wander 获取当前位置。"
          : "Allow Wander to access your current location in the browser prompt.",
    }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const immediateLocation = createResolvedLocation(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy,
          undefined,
          language
        );
        if (position.coords.accuracy <= acceptableFirstFixAccuracyMeters) {
          setLocation(immediateLocation);
        } else {
          setLocation((current) => ({
            ...current,
            permission: "requesting",
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: Math.round(position.coords.accuracy),
            updatedAt: new Date().toISOString(),
          }));
        }

        try {
          const reverseGeocode = await describeLocationWithApi(
            position.coords.latitude,
            position.coords.longitude
          );

          setLocation((current) => {
            if (
              current.latitude !== position.coords.latitude ||
              current.longitude !== position.coords.longitude
            ) {
              return current;
            }

            const resolvedLocation = createResolvedLocation(
              position.coords.latitude,
              position.coords.longitude,
              position.coords.accuracy,
              reverseGeocode,
              language
            );

            return shouldAcceptLocationUpdate(current, resolvedLocation) ? resolvedLocation : current;
          });

          if (reverseGeocode.weatherMode) {
            setScenario((current) => ({ ...current, weather: reverseGeocode.weatherMode || current.weather }));
          }
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
              label:
                current.nearbyPlaceName ||
                (language === "zh" ? "当前位置附近" : "Current area"),
              detail:
                language === "zh"
                  ? `${current.formattedAddress || "已拿到当前位置"} · 定位精度约 ${current.accuracyMeters ?? "--"} 米`
                  : `${current.formattedAddress || "Current location captured"} · about ${current.accuracyMeters ?? "--"} m accuracy`,
            };
          });
        }

        locationWatchIdRef.current = navigator.geolocation.watchPosition(
          (watchPosition) => {
            if (
              watchPosition.coords.accuracy > acceptableFirstFixAccuracyMeters &&
              currentLocationIsMoreAccurate(location, watchPosition.coords.accuracy)
            ) {
              return;
            }

            const refinedLocation = createResolvedLocation(
              watchPosition.coords.latitude,
              watchPosition.coords.longitude,
              watchPosition.coords.accuracy,
              undefined,
              language
            );
            setLocation((current) =>
              shouldAcceptLocationUpdate(current, refinedLocation) ? refinedLocation : current
            );

            void describeLocationWithApi(watchPosition.coords.latitude, watchPosition.coords.longitude)
              .then((reverseGeocode) => {
                setLocation((current) => {
                  const resolvedLocation = createResolvedLocation(
                    watchPosition.coords.latitude,
                    watchPosition.coords.longitude,
                    watchPosition.coords.accuracy,
                    reverseGeocode,
                    language
                  );

                  return shouldAcceptLocationUpdate(current, resolvedLocation) ? resolvedLocation : current;
                });
              })
              .catch(() => undefined);

            if (
              watchPosition.coords.accuracy <= navigationAccuracyTargetMeters &&
              locationWatchIdRef.current != null
            ) {
              navigator.geolocation.clearWatch(locationWatchIdRef.current);
              locationWatchIdRef.current = null;
            }
          },
          () => {
            if (locationWatchIdRef.current != null) {
              navigator.geolocation.clearWatch(locationWatchIdRef.current);
              locationWatchIdRef.current = null;
            }
          },
          {
            enableHighAccuracy: true,
            timeout: maxLocationWatchMs,
            maximumAge: 0,
          }
        );

        locationWatchTimeoutRef.current = window.setTimeout(() => {
          if (locationWatchIdRef.current != null) {
            navigator.geolocation.clearWatch(locationWatchIdRef.current);
            locationWatchIdRef.current = null;
          }
          setLocation((current) =>
            current.permission === "requesting"
              ? {
                  ...current,
                  permission: "error",
                  label: language === "zh" ? "定位精度不足" : "Location not precise enough",
                  detail:
                    language === "zh"
                      ? "请开启系统精确定位，或靠近窗边/室外后重试。"
                      : "Please enable precise location or try again near a window or outdoors.",
                }
              : current
          );
          locationWatchTimeoutRef.current = null;
        }, maxLocationWatchMs);
      },
      (error) => {
        setLocation(createLocationError(error, language));
      },
      {
        enableHighAccuracy: true,
        timeout: maxLocationWatchMs,
        maximumAge: 0,
      }
    );
  };

  const selectStartCoordinates = async (latitude: number, longitude: number) => {
    const immediateLocation = createResolvedLocation(latitude, longitude, 0, undefined, language);
    setLocation({
      ...immediateLocation,
      label: language === "zh" ? "地图选点" : "Selected point",
      detail: language === "zh" ? "已使用地图手动选点作为出发位置。" : "Using the selected map point as the start.",
      accuracyMeters: 0,
      isApproximate: false,
    });

    try {
      const reverseGeocode = await describeLocationWithApi(latitude, longitude);
      setLocation(createResolvedLocation(latitude, longitude, 0, reverseGeocode, language));
      if (reverseGeocode.weatherMode) {
        setScenario((current) => ({ ...current, weather: reverseGeocode.weatherMode || current.weather }));
      }
    } catch {
      // Keep the selected coordinates even if reverse geocoding is temporarily unavailable.
    }
  };

  const selectStartPlace = (place: {
    name: string;
    address: string;
    area?: string;
    latitude: number;
    longitude: number;
    amapId?: string | null;
  }) => {
    setLocation({
      permission: "granted",
      label: place.name,
      detail: place.address || place.area || place.name,
      clusterId: findNearestCluster(place.latitude, place.longitude),
      latitude: place.latitude,
      longitude: place.longitude,
      accuracyMeters: 0,
      isApproximate: false,
      updatedAt: new Date().toISOString(),
      cityName: null,
      districtName: place.area || null,
      formattedAddress: place.address || place.name,
      nearbyPlaceName: place.name,
      adcode: null,
    });
  };

  const value = useMemo<WanderContextValue>(
    () => ({
      inputPrompt,
      activePrompt,
      setInputPrompt,
      location,
      locationReady,
      requestCurrentLocation,
      selectStartCoordinates,
      selectStartPlace,
      generationLabel,
      liveDataState,
      openDataEnabled,
      timeSelection,
      setTimeSelection,
      canGenerate,
      scenario,
      setScenario,
      userProfile,
      login: async ({ email, password }) => {
        try {
          const user = await loginAccount({ email, password });
          setUserProfile(normalizeRemoteUser(user));
          return { ok: true };
        } catch {
          return { ok: false, reason: "invalid" };
        }
      },
      register: async ({ email, name, password }) => {
        try {
          const user = await registerAccount({ email, name, password });
          setUserProfile(normalizeRemoteUser(user));
          return { ok: true };
        } catch (error) {
          return { ok: false, reason: isEmailAlreadyUsedError(error) ? "email-used" : "invalid" };
        }
      },
      resetPassword: async ({ email, password }) => {
        try {
          const user = await resetAccountPassword({ email, password });
          setUserProfile(normalizeRemoteUser(user));
          return { ok: true };
        } catch (error) {
          return { ok: false, reason: isAccountNotFoundError(error) ? "not-found" : "invalid" };
        }
      },
      logout: () => {
        logoutAccount();
        setUserProfile(createUserProfile(null));
      },
      updateUserProfile: async (profile) => {
        setUserProfile((current) => ({
          ...current,
          ...profile,
        }));

        try {
          const user = await updateAccountProfile(profile);
          setUserProfile(normalizeRemoteUser(user));
        } catch {
          // Keep the optimistic local update so the UI remains responsive.
        }
      },
      savedAddresses,
      updateSavedAddress: (id, address) => {
        setSavedAddresses((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...address,
                  updatedAt: new Date().toISOString(),
                }
              : item
          )
        );
      },
      setSavedAddressFromCurrentLocation: (id) => {
        setSavedAddresses((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  address: location.formattedAddress || location.label,
                  latitude: location.latitude,
                  longitude: location.longitude,
                  updatedAt: new Date().toISOString(),
                }
              : item
          )
        );
      },
      clearSavedAddress: (id) => {
        setSavedAddresses((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  address: "",
                  latitude: null,
                  longitude: null,
                  updatedAt: null,
                }
              : item
          )
        );
      },
      ugcReads,
      parsed,
      routes,
      selectedRouteId,
      setSelectedRouteId,
      selectedRoute,
      moveRouteStop: (routeId, stopId, direction) => {
        setPlannedRoutes((current) =>
          current.map((route) =>
            route.id === routeId ? reorderRouteStop(route, stopId, direction) : route
          )
        );
      },
      moveRouteStopToIndex: (routeId, stopId, targetIndex) => {
        setPlannedRoutes((current) =>
          current.map((route) =>
            route.id === routeId ? moveStopToIndex(route, stopId, targetIndex) : route
          )
        );
      },
      removeRouteStop: (routeId, stopId) => {
        setPlannedRoutes((current) =>
          current.map((route) =>
            route.id === routeId ? removeStopFromRoute(route, stopId) : route
          )
        );
        setOpenedStop((current) =>
          current?.routeId === routeId && current.stopId === stopId ? null : current
        );
      },
      addRouteStopFromPlace: (routeId, place) => {
        setPlannedRoutes((current) =>
          current.map((route) =>
            route.id === routeId ? appendPlaceToRoute(route, place, language) : route
          )
        );
      },
      routeFit,
      adjustmentState,
      activeTemplateId,
      commitPrompt: () => {
        if (!canGenerate) {
          return;
        }

        setSelectedRouteId(null);
        setActiveTemplateId(null);
        setPlannedIntent(null);
        setPlannedRoutes([]);
        setActiveTimeBudgetMinutes(selectedTimeMinutes);
        setPlanningLanguage(language);
        setActivePrompt(inputPrompt.trim() || cityDriftData.defaults.prompt);
        setGenerationRunId((current) => current + 1);
      },
      applyQuickPrompt: (prompt: string) => {
        setSelectedRouteId(null);
        setActiveTemplateId(null);
        setInputPrompt(prompt);
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
          startPointOverride: location.label,
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
      savedAddresses,
      scenario,
      selectedRoute,
      selectedRouteId,
      selectedTimeMinutes,
      timeSelection,
      ugcReads,
      userProfile,
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

function buildSavedAddressRoute({
  prompt,
  savedAddresses,
  startLocation,
  timeBudgetMinutes,
  language,
}: {
  prompt: string;
  savedAddresses: SavedAddress[];
  startLocation: DeviceLocation;
  timeBudgetMinutes: number;
  language: "zh" | "en";
}): { route: RouteOption; destination: SavedAddress } | null {
  if (startLocation.latitude == null || startLocation.longitude == null) {
    return null;
  }

  const destination = findSavedAddressDestination(prompt, savedAddresses);
  if (!destination || destination.latitude == null || destination.longitude == null) {
    return null;
  }

  const start = {
    latitude: startLocation.latitude,
    longitude: startLocation.longitude,
  };
  const end = {
    latitude: destination.latitude,
    longitude: destination.longitude,
  };
  const distanceMeters = distanceMetersBetweenCoordinates(start, end);
  const walkingMinutes = Math.max(1, Math.round(distanceMeters / 75));
  const ridingMinutes = Math.max(1, Math.round(distanceMeters / 220));
  const drivingMinutes = Math.max(3, Math.round(distanceMeters / 450) + 5);
  const bestMinutes = Math.min(walkingMinutes, ridingMinutes, drivingMinutes);
  const visitMinutes = 0;
  const safeBudget = Math.max(timeBudgetMinutes, bestMinutes);
  const destinationName = destination.label || buildSavedAddressLabel(destination.id, language);
  const destinationAddress = destination.address || destinationName;
  const navigationUrl = buildAmapNavigationUrl({
    start,
    startName: startLocation.label,
    end,
    endName: destinationName,
    mode: "car",
  });

  const stop: RouteOption["stops"][number] = {
    id: `saved-${destination.id}`,
    name: destinationName,
    cluster: "live",
    area: destinationAddress,
    address: destinationAddress,
    latitude: destination.latitude,
    longitude: destination.longitude,
    categories: ["destination"],
    requestedCategory: "destination",
    duration: visitMinutes,
    outdoor: false,
    rating: 5,
    hours: language === "zh" ? "常用地址" : "Saved address",
    crowd: "",
    summary:
      language === "zh"
        ? `从${startLocation.label}前往${destinationName}。`
        : `Go from ${startLocation.label} to ${destinationName}.`,
    tags: [language === "zh" ? "常用地址" : "Saved address"],
    sourceType: "amap-live",
    sourceLabel: "Saved address",
    distanceFromStartMeters: distanceMeters,
    visitLabel: language === "zh" ? "目的地" : "Destination",
    travelFromPrevious: buildTravelModeLabel("driving", drivingMinutes, distanceMeters, language),
    travelMinutesFromPrevious: drivingMinutes,
    travelDistanceMetersFromPrevious: distanceMeters,
    travelModesFromPrevious: [
      buildTravelModeEstimate("walking", walkingMinutes, distanceMeters, start, end, startLocation.label, destinationName, language),
      buildTravelModeEstimate("riding", ridingMinutes, distanceMeters, start, end, startLocation.label, destinationName, language),
      buildTravelModeEstimate("driving", drivingMinutes, distanceMeters, start, end, startLocation.label, destinationName, language),
    ],
    navigationUrls: {
      walking: buildAmapNavigationUrl({ start, startName: startLocation.label, end, endName: destinationName, mode: "walk" }),
      riding: buildAmapNavigationUrl({ start, startName: startLocation.label, end, endName: destinationName, mode: "ride" }),
      driving: navigationUrl,
    },
    ugc: {
      author: "Wander",
      verified: language === "zh" ? "用户常用地址" : "User saved address",
      title: destinationName,
      stay: language === "zh" ? "到达目的地" : "Arrive at destination",
      tip: language === "zh" ? "可直接打开高德导航。" : "Open AMap navigation when ready.",
    },
  };

  const routeModes = stop.travelModesFromPrevious || [];

  return {
    destination,
    route: {
      id: `saved-route-${destination.id}-${Date.now()}`,
      clusterId: "live",
      clusterLabel: language === "zh" ? "常用地址" : "Saved place",
      clusterAccent: language === "zh" ? "直接导航" : "Direct navigation",
      title: language === "zh" ? `去${destinationName}` : `Go to ${destinationName}`,
      subtitle:
        language === "zh"
          ? `预计 ${bestMinutes} 分钟内可到达`
          : `Estimated arrival in ${bestMinutes} min`,
      style: "efficient",
      fitScore: 100,
      totalMinutes: bestMinutes,
      bufferMinutes: Math.max(0, safeBudget - bestMinutes),
      hitCount: 1,
      stops: [stop],
      adjustments: [],
      summary:
        language === "zh"
          ? `已识别你要前往${destinationName}，路线从当前位置直接出发。`
          : `Wander recognized ${destinationName} as your destination and built a direct route.`,
      transitSummary: routeModes.map((mode) => mode.label).join(" · "),
      routeModes,
      navigationUrl,
      routeGeometry: [
        [start.longitude, start.latitude],
        [end.longitude, end.latitude],
      ],
      routeDistanceMeters: distanceMeters,
      routeDurationMinutes: bestMinutes,
      routeMode: "driving",
    },
  };
}

function findSavedAddressDestination(prompt: string, savedAddresses: SavedAddress[]) {
  const normalized = prompt.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const aliasMap: Record<SavedAddressId, string[]> = {
    home: ["回家", "去家", "到家", "home", "go home"],
    work: ["去公司", "回公司", "上班", "公司", "work", "office"],
    school: ["去学校", "回学校", "上课", "学校", "school", "campus", "university"],
  };

  const matchedId = (Object.keys(aliasMap) as SavedAddressId[]).find((id) =>
    aliasMap[id].some((alias) => normalized.includes(alias.toLowerCase()))
  );

  if (!matchedId) {
    return null;
  }

  return savedAddresses.find((address) => address.id === matchedId && address.latitude != null && address.longitude != null) || null;
}

function isSavedAddressOnlyPrompt(prompt: string, destinationId: SavedAddressId) {
  const aliasMap: Record<SavedAddressId, string[]> = {
    home: ["我要回家", "我想回家", "回家", "去家", "到家", "home", "go home"],
    work: ["我要去公司", "我想去公司", "去公司", "回公司", "上班", "公司", "work", "office"],
    school: ["我要去学校", "我想去学校", "去学校", "回学校", "上课", "学校", "school", "campus", "university"],
  };
  let normalized = prompt.trim().toLowerCase();
  aliasMap[destinationId].forEach((alias) => {
    normalized = normalized.replaceAll(alias.toLowerCase(), "");
  });
  normalized = normalized.replace(/[，。,.!?！？\s]/g, "");
  normalized = normalized.replace(/^(我|想|要|去|到|然后|再|最后|顺路|一下)+/g, "");
  return normalized.length === 0;
}

function appendSavedAddressDestinationToRoutes(
  routes: RouteOption[],
  destinationStop: RouteOption["stops"][number],
  language: "zh" | "en"
) {
  return routes.map((route) => {
    if (route.stops.some((stop) => stop.id === destinationStop.id)) {
      return route;
    }

    const lastStop = route.stops[route.stops.length - 1];
    const appendedStop = createDestinationStopFromPrevious(destinationStop, lastStop, language);
    const stops = [...route.stops, appendedStop];
    const totalMinutes = stops.reduce(
      (sum, stop) => sum + stop.duration + (stop.travelMinutesFromPrevious || 0),
      0
    );

    return {
      ...route,
      title:
        language === "zh"
          ? `${route.title} · 最后到${destinationStop.name}`
          : `${route.title} · end at ${destinationStop.name}`,
      stops,
      hitCount: route.hitCount + 1,
      totalMinutes,
      bufferMinutes: Math.max(0, route.bufferMinutes - (appendedStop.travelMinutesFromPrevious || 0)),
      routeGeometry: [
        ...(route.routeGeometry || route.stops.map((stop) => [stop.longitude, stop.latitude] as [number, number])),
        [destinationStop.longitude, destinationStop.latitude] as [number, number],
      ],
      routeDistanceMeters:
        (route.routeDistanceMeters || 0) + (appendedStop.travelDistanceMetersFromPrevious || 0),
      routeDurationMinutes:
        (route.routeDurationMinutes || route.totalMinutes) + (appendedStop.travelMinutesFromPrevious || 0),
    };
  });
}

function createDestinationStopFromPrevious(
  destinationStop: RouteOption["stops"][number],
  previousStop: RouteOption["stops"][number] | undefined,
  language: "zh" | "en"
) {
  if (!previousStop) {
    return destinationStop;
  }

  const start = {
    latitude: previousStop.latitude,
    longitude: previousStop.longitude,
  };
  const end = {
    latitude: destinationStop.latitude,
    longitude: destinationStop.longitude,
  };
  const distanceMeters = distanceMetersBetweenCoordinates(start, end);
  const walkingMinutes = Math.max(1, Math.round(distanceMeters / 75));
  const ridingMinutes = Math.max(1, Math.round(distanceMeters / 220));
  const drivingMinutes = Math.max(3, Math.round(distanceMeters / 450) + 5);
  const travelModesFromPrevious = [
    buildTravelModeEstimate("walking", walkingMinutes, distanceMeters, start, end, previousStop.name, destinationStop.name, language),
    buildTravelModeEstimate("riding", ridingMinutes, distanceMeters, start, end, previousStop.name, destinationStop.name, language),
    buildTravelModeEstimate("driving", drivingMinutes, distanceMeters, start, end, previousStop.name, destinationStop.name, language),
  ];

  return {
    ...destinationStop,
    travelFromPrevious: buildTravelModeLabel("driving", drivingMinutes, distanceMeters, language),
    travelMinutesFromPrevious: drivingMinutes,
    travelDistanceMetersFromPrevious: distanceMeters,
    travelModesFromPrevious,
    navigationUrls: {
      walking: travelModesFromPrevious[0].navigationUrl,
      riding: travelModesFromPrevious[1].navigationUrl,
      driving: travelModesFromPrevious[2].navigationUrl,
    },
    summary:
      language === "zh"
        ? `完成前面的安排后，最后前往${destinationStop.name}。`
        : `After the earlier stops, end the route at ${destinationStop.name}.`,
  };
}

function buildSavedAddressLabel(id: SavedAddressId, language: "zh" | "en") {
  if (language === "zh") {
    if (id === "home") return "家";
    if (id === "work") return "公司";
    return "学校";
  }

  if (id === "home") return "Home";
  if (id === "work") return "Work";
  return "School";
}

function reorderRouteStop(route: RouteOption, stopId: string, direction: "up" | "down"): RouteOption {
  const currentIndex = route.stops.findIndex((stop) => stop.id === stopId);
  if (currentIndex < 0) {
    return route;
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= route.stops.length) {
    return route;
  }

  const stops = [...route.stops];
  const [stop] = stops.splice(currentIndex, 1);
  stops.splice(targetIndex, 0, stop);
  return normalizeEditedRoute({ ...route, stops });
}

function moveStopToIndex(route: RouteOption, stopId: string, targetIndex: number): RouteOption {
  const currentIndex = route.stops.findIndex((stop) => stop.id === stopId);
  const boundedTarget = Math.max(0, Math.min(route.stops.length - 1, targetIndex));
  if (currentIndex < 0 || currentIndex === boundedTarget) {
    return route;
  }

  const stops = [...route.stops];
  const [stop] = stops.splice(currentIndex, 1);
  stops.splice(boundedTarget, 0, stop);
  return normalizeEditedRoute({ ...route, stops });
}

function removeStopFromRoute(route: RouteOption, stopId: string): RouteOption {
  const stops = route.stops.filter((stop) => stop.id !== stopId);
  return normalizeEditedRoute({ ...route, stops });
}

function appendPlaceToRoute(route: RouteOption, place: StartPlaceSearchResult, language: "zh" | "en"): RouteOption {
  const stop = buildManualRouteStop(place, route.stops[route.stops.length - 1], language);
  return normalizeEditedRoute({
    ...route,
    title: route.title,
    stops: [...route.stops, stop],
    hitCount: route.hitCount + 1,
  });
}

function buildManualRouteStop(
  place: StartPlaceSearchResult,
  previousStop: RouteOption["stops"][number] | undefined,
  language: "zh" | "en"
): RouteOption["stops"][number] {
  const baseStop: RouteOption["stops"][number] = {
    id: `manual-${place.id}-${Date.now()}`,
    name: place.name,
    cluster: "live",
    area: place.area || place.address || place.name,
    address: place.address || place.area || place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    categories: ["manual"],
    requestedCategory: "manual",
    duration: 30,
    outdoor: false,
    rating: 4.6,
    hours: language === "zh" ? "用户添加地点" : "Added by user",
    crowd: "",
    summary:
      language === "zh"
        ? "这是用户手动加入路线的地点，可继续拖拽调整顺序。"
        : "This stop was added manually and can be reordered.",
    tags: [language === "zh" ? "手动添加" : "Manual"],
    sourceType: "amap-live",
    sourceLabel: "AMap",
    distanceFromStartMeters: place.distanceMeters,
    amapId: place.amapId,
    visitLabel: language === "zh" ? "建议停留 20-40 分钟" : "Suggested stay 20-40 min",
    ugc: {
      author: "Wander",
      verified: language === "zh" ? "用户添加" : "User added",
      title: place.name,
      stay: language === "zh" ? "按需停留" : "Stay as needed",
      tip: language === "zh" ? "可拖拽调整到合适的路线顺序。" : "Drag it into the right place in your route.",
    },
  };

  if (!previousStop) {
    return baseStop;
  }

  return createDestinationStopFromPrevious(baseStop, previousStop, language);
}

function normalizeEditedRoute(route: RouteOption): RouteOption {
  const totalMinutes = route.stops.reduce(
    (sum, stop) => sum + stop.duration + (stop.travelMinutesFromPrevious || 0),
    0
  );

  return {
    ...route,
    stops: route.stops,
    totalMinutes,
    bufferMinutes: Math.max(0, route.bufferMinutes),
    hitCount: route.stops.length,
    routeGeometry: route.stops.map((stop) => [stop.longitude, stop.latitude] as [number, number]),
  };
}

function buildTravelModeEstimate(
  mode: "walking" | "riding" | "driving",
  durationMinutes: number,
  distanceMeters: number,
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
  startName: string,
  endName: string,
  language: "zh" | "en"
) {
  const amapMode = mode === "walking" ? "walk" : mode === "riding" ? "ride" : "car";

  return {
    mode,
    label: buildTravelModeLabel(mode, durationMinutes, distanceMeters, language),
    durationMinutes,
    distanceMeters,
    navigationUrl: buildAmapNavigationUrl({ start, startName, end, endName, mode: amapMode }),
  };
}

function buildTravelModeLabel(
  mode: "walking" | "riding" | "driving",
  durationMinutes: number,
  distanceMeters: number,
  language: "zh" | "en"
) {
  const modeLabel =
    language === "zh"
      ? mode === "walking"
        ? "步行"
        : mode === "riding"
          ? "骑行"
          : "打车/驾车"
      : mode === "walking"
        ? "Walk"
        : mode === "riding"
          ? "Ride"
          : "Taxi / Drive";

  return `${modeLabel} ${durationMinutes} ${language === "zh" ? "分钟" : "min"} · ${formatDistanceLabel(distanceMeters, language)}`;
}

function buildAmapNavigationUrl({
  start,
  startName,
  end,
  endName,
  mode,
}: {
  start: { latitude: number; longitude: number };
  startName: string;
  end: { latitude: number; longitude: number };
  endName: string;
  mode: "walk" | "ride" | "car";
}) {
  const params = new URLSearchParams({
    from: `${start.longitude},${start.latitude},${startName}`,
    to: `${end.longitude},${end.latitude},${endName}`,
    mode,
    policy: "1",
    src: "wander",
    coordinate: "gaode",
    callnative: "1",
  });

  return `https://uri.amap.com/navigation?${params.toString()}`;
}

function distanceMetersBetweenCoordinates(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(end.latitude - start.latitude);
  const deltaLon = toRadians(end.longitude - start.longitude);
  const startLat = toRadians(start.latitude);
  const endLat = toRadians(end.latitude);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  return Math.round(2 * earthRadiusKm * Math.asin(Math.sqrt(a)) * 1000);
}

function formatDistanceLabel(distanceMeters: number, language: "zh" | "en") {
  if (distanceMeters < 1000) {
    return language === "zh" ? `${distanceMeters}米` : `${distanceMeters}m`;
  }

  return language === "zh"
    ? `${(distanceMeters / 1000).toFixed(1)}公里`
    : `${(distanceMeters / 1000).toFixed(1)}km`;
}

function buildGenerationErrorNote(error: unknown, language: "zh" | "en") {
  const message =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : language === "zh"
        ? "路线生成失败，暂时没有拿到后端错误详情。"
        : "Route generation failed without a detailed backend error.";

  return language === "zh" ? `路线生成失败：${message}` : `Route generation failed: ${message}`;
}

function hasGeolocationSupport() {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

function createUserProfile(storedProfile?: UserProfile | null): UserProfile {
  return {
    isAuthenticated: false,
    hasCompletedOnboarding: storedProfile?.hasCompletedOnboarding ?? false,
    name: storedProfile?.name || "Wander User",
    email: storedProfile?.email || "",
    password: "",
    gender: storedProfile?.gender || "private",
    profession: storedProfile?.profession || "student",
    avatarDataUrl: storedProfile?.avatarDataUrl || null,
  };
}

function normalizeRemoteUser(user: UserProfile): UserProfile {
  return {
    ...createUserProfile(user),
    ...user,
    isAuthenticated: true,
    password: "",
  };
}

function createSavedAddresses(
  storedAddresses: SavedAddress[] | undefined,
  language: "zh" | "en"
): SavedAddress[] {
  const labels: Record<SavedAddressId, string> =
    language === "zh"
      ? {
          home: "家",
          work: "公司",
          school: "学校",
        }
      : {
          home: "Home",
          work: "Work",
          school: "School",
        };

  return (["home", "work", "school"] as SavedAddressId[]).map((id) => {
    const stored = storedAddresses?.find((item) => item.id === id);
    return {
      id,
      label: stored?.label || labels[id],
      address: stored?.address || "",
      latitude: stored?.latitude ?? null,
      longitude: stored?.longitude ?? null,
      updatedAt: stored?.updatedAt ?? null,
    };
  });
}

function createInitialLocation(
  storedLocation?: DeviceLocation | null,
  language: "zh" | "en" = "en"
): DeviceLocation {
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
    return createUnsupportedLocation(language);
  }

  return {
    permission: "idle",
    label: language === "zh" ? "等待定位授权" : "Waiting for location",
    detail:
      language === "zh"
        ? "允许 GPS 后，Wander 才能围绕你当前所在位置生成真实路线。"
        : "Allow GPS so Wander can generate routes around where you are right now.",
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

function createUnsupportedLocation(language: "zh" | "en" = "en"): DeviceLocation {
  return {
    permission: "unsupported",
    label: language === "zh" ? "定位不可用" : "Location unavailable",
    detail:
      language === "zh"
        ? "当前浏览器环境没有开放 GPS 能力。"
        : "This browser environment does not expose GPS access.",
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
  reverseGeocode?: ReverseGeocodeSnapshot,
  language: "zh" | "en" = "en"
): DeviceLocation {
  const clusterId = findNearestCluster(latitude, longitude);
  const roundedAccuracy = Math.round(accuracyMeters);
  const offlineLandmark = findNearestOfflineLandmark({ latitude, longitude });
  const nearbyPlaceName =
    reverseGeocode?.nearbyPlaceName ||
    offlineLandmark?.label ||
    (language === "zh" ? "当前位置附近" : "Current area");
  const formattedAddress =
    reverseGeocode?.formattedAddress ||
    offlineLandmark?.detail ||
    (language === "zh" ? "当前位置" : "Current location");
  const district =
    reverseGeocode?.districtName ||
    reverseGeocode?.cityName ||
    offlineLandmark?.label ||
    (language === "zh" ? "附近" : "Nearby");

  return {
    permission: "granted",
    label: nearbyPlaceName,
    detail:
      language === "zh"
        ? `${formattedAddress} · 定位精度约 ${roundedAccuracy} 米 · 正在围绕 ${district} 生成路线`
        : `${formattedAddress} · accuracy about ${roundedAccuracy} m · building routes around ${district}`,
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

function createLocationError(
  error: GeolocationPositionError,
  language: "zh" | "en"
): DeviceLocation {
  if (error.code === error.PERMISSION_DENIED) {
    return {
      permission: "denied",
      label: language === "zh" ? "定位权限被拒绝" : "Location denied",
      detail:
        language === "zh"
          ? "没有定位权限就无法围绕你当前的下班或下课位置生成路线。"
          : "Wander needs location access to build routes around where you are right now.",
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
      label: language === "zh" ? "定位超时" : "Location timeout",
      detail:
        language === "zh"
          ? "这次没有在预期时间内拿到 GPS 结果，可以再试一次。"
          : "GPS did not respond in time. Trying again usually works.",
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
    label: language === "zh" ? "定位失败" : "Location failed",
    detail:
      language === "zh"
        ? "这次没有顺利解析当前位置，请稍后重试。"
        : "The current location could not be resolved this time. Please try again shortly.",
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

function shouldAcceptLocationUpdate(current: DeviceLocation, next: DeviceLocation) {
  const nextAccuracy = next.accuracyMeters ?? Number.POSITIVE_INFINITY;

  if (current.permission !== "granted") {
    return nextAccuracy <= acceptableFirstFixAccuracyMeters;
  }

  const currentAccuracy = current.accuracyMeters ?? Number.POSITIVE_INFINITY;
  const accuracyImproved = nextAccuracy + 8 < currentAccuracy;
  const becameMoreSpecific = Boolean(next.nearbyPlaceName) && next.nearbyPlaceName !== current.nearbyPlaceName;
  const becameLessApproximate = current.isApproximate && !next.isApproximate;
  const movedMeaningfully =
    current.latitude != null &&
    current.longitude != null &&
    next.latitude != null &&
    next.longitude != null
      ? haversine(current.latitude, current.longitude, next.latitude, next.longitude) > 0.03
      : true;

  return accuracyImproved || becameLessApproximate || (becameMoreSpecific && movedMeaningfully);
}

function currentLocationIsMoreAccurate(current: DeviceLocation, nextAccuracyMeters: number) {
  const currentAccuracy = current.accuracyMeters ?? Number.POSITIVE_INFINITY;
  return current.permission === "granted" && currentAccuracy <= nextAccuracyMeters + 8;
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
