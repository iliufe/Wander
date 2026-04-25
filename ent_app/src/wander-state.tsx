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
} from "./services/plans-api";
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
  login: (payload: { email: string; name?: string; password: string }) => boolean;
  register: (payload: { email: string; name: string; password: string }) => void;
  logout: () => void;
  updateUserProfile: (profile: Partial<Omit<UserProfile, "isAuthenticated">>) => void;
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
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [openedStop, setOpenedStop] = useState<OpenedStop>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState(() => new Date().toISOString());
  const [plannedRoutes, setPlannedRoutes] = useState<RouteOption[]>([]);
  const [plannedIntent, setPlannedIntent] = useState<IntentSignals | null>(null);
  const [generationRunId, setGenerationRunId] = useState(0);
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
      })
    );
  }, [activeTimeBudgetMinutes, inputPrompt, location, savedAddresses, scenario, timeSelection, ugcReads, userProfile]);

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
        language,
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
        setPlannedRoutes(result.routes);
        setLiveDataState(
          result.liveData || {
            status: result.routes.length ? "live" : "empty",
            source: "amap",
            note:
              language === "zh"
                ? "已完成真实路线生成。"
                : "Real routes are ready.",
            radiusMeters: null,
            poiCount: 0,
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
                  language
                )
              : current
          );

          if (result.location.weatherMode) {
            setScenario((current) => ({ ...current, weather: result.location?.weatherMode || current.weather }));
          }
        }
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }

        setPlannedIntent(null);
        setPlannedRoutes([]);
        setLiveDataState({
          status: "error",
          source: "amap",
          note:
            language === "zh"
              ? "真实路线生成失败了，可以稍后再试一次。"
              : "Real route generation failed. Trying again shortly should be more stable.",
          radiusMeters: null,
          poiCount: 0,
        });
      });

    return () => controller.abort();
  }, [
    activePrompt,
    activeTimeBudgetMinutes,
    generationRunId,
    language,
    location.label,
    location.latitude,
    location.longitude,
    locationReady,
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
      login: ({ email, name, password }) => {
        if (userProfile.email && userProfile.email !== email) {
          return false;
        }

        if (userProfile.password && userProfile.password !== password) {
          return false;
        }

        setUserProfile((current) => ({
          ...current,
          isAuthenticated: true,
          email,
          password,
          name: name?.trim() || current.name || email.split("@")[0] || "Wander User",
        }));
        return true;
      },
      register: ({ email, name, password }) => {
        setUserProfile((current) => ({
          ...current,
          isAuthenticated: true,
          hasCompletedOnboarding: false,
          email,
          password,
          name: name.trim() || "Wander User",
        }));
      },
      logout: () => {
        setUserProfile((current) => ({
          ...current,
          isAuthenticated: false,
        }));
      },
      updateUserProfile: (profile) => {
        setUserProfile((current) => ({
          ...current,
          ...profile,
        }));
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

function hasGeolocationSupport() {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

function createUserProfile(storedProfile?: UserProfile | null): UserProfile {
  return {
    isAuthenticated: storedProfile?.isAuthenticated ?? false,
    hasCompletedOnboarding: storedProfile?.hasCompletedOnboarding ?? false,
    name: storedProfile?.name || "Wander User",
    email: storedProfile?.email || "",
    password: storedProfile?.password || "",
    gender: storedProfile?.gender || "private",
    profession: storedProfile?.profession || "student",
    avatarDataUrl: storedProfile?.avatarDataUrl || null,
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
