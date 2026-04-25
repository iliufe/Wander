export type CategoryId = string;

export type AppLanguage = "zh" | "en";

export type AppClusterId = "jingan" | "xuhui" | "huangpu";
export type ClusterId = AppClusterId | "live";
export type RouteStyle = "balanced" | "scenic" | "efficient";
export type RouteMode = "walking" | "riding" | "driving";
export type WeatherMode = "clear" | "rain";
export type VenueMode = "live" | "closed";
export type LocationPermissionState = "idle" | "requesting" | "granted" | "denied" | "unsupported" | "error";
export type LiveDataStatus = "idle" | "loading" | "live" | "empty" | "fallback" | "error";
export type UserGender = "male" | "female" | "private";
export type UserProfession =
  | "student"
  | "teacher"
  | "engineer"
  | "designer"
  | "product"
  | "marketing"
  | "finance"
  | "healthcare"
  | "service"
  | "freelancer"
  | "other";

export interface UserProfile {
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  name: string;
  email: string;
  password: string;
  gender: UserGender;
  profession: UserProfession;
  avatarDataUrl: string | null;
}

export interface TimeSelection {
  hours: number;
  minutes: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type SavedAddressId = "home" | "work" | "school";

export interface SavedAddress {
  id: SavedAddressId;
  label: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  updatedAt: string | null;
}

export interface DeviceLocation {
  permission: LocationPermissionState;
  label: string;
  detail: string;
  clusterId: ClusterId | null;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  isApproximate: boolean;
  updatedAt: string | null;
  cityName: string | null;
  districtName: string | null;
  formattedAddress: string | null;
  nearbyPlaceName: string | null;
  adcode: string | null;
}

export interface CategoryMeta {
  label: string;
  short: string;
}

export interface ClusterMeta {
  label: string;
  accent: string;
}

export interface UGCEntry {
  author: string;
  verified: string;
  title: string;
  stay: string;
  tip: string;
}

export interface TravelModeEstimate {
  mode: RouteMode;
  label: string;
  durationMinutes: number;
  distanceMeters: number;
  navigationUrl?: string | null;
}

export interface Venue {
  id: string;
  name: string;
  cluster: ClusterId;
  area: string;
  address: string;
  latitude: number;
  longitude: number;
  categories: CategoryId[];
  duration: number;
  outdoor: boolean;
  rating: number;
  hours: string;
  crowd: string;
  summary: string;
  tags: string[];
  sourceType?: "curated" | "open-live" | "amap-live";
  sourceLabel?: string;
  distanceFromStartMeters?: number | null;
  averageCostCny?: number | null;
  groupbuyCount?: number | null;
  amapId?: string | null;
  phone?: string | null;
  merchantIntro?: string | null;
  merchantHighlights?: string[];
  demoCanClose?: boolean;
  ugc: UGCEntry;
}

export interface SharedRoute {
  id: string;
  title: string;
  description: string;
  promptSeed: string;
  desiredCategories: CategoryId[];
  timeHours: number;
}

export interface CityDriftData {
  defaults: {
    prompt: string;
  };
  quickPrompts: string[];
  categoryMeta: Record<CategoryId, CategoryMeta>;
  clusters: Record<AppClusterId, ClusterMeta>;
  venues: Venue[];
  sharedRoutes: SharedRoute[];
}

export interface ScenarioState {
  weather: WeatherMode;
  venue: VenueMode;
}

export interface PlannedStopSignal {
  category: CategoryId;
  label: string;
  durationMinutes: number;
  searchTerms: string[];
  requiredTerms: string[];
  rationale: string;
  indoorPreferred: boolean;
}

export interface IntentSignals {
  categories: CategoryId[];
  searchTerms: string[];
  requiredTermsByCategory: Partial<Record<CategoryId, string[]>>;
  preferredStyle?: RouteStyle | null;
  routeSummary?: string | null;
  timePlanSummary?: string | null;
  stopSignals?: PlannedStopSignal[];
}

export interface ParsedRequest {
  rawText: string;
  startPoint: string;
  timeHours: number;
  timeMinutes: number;
  timeLabel: string;
  categories: CategoryId[];
  searchTerms: string[];
  requiredTermsByCategory: Partial<Record<CategoryId, string[]>>;
  mood: "balanced" | "scenic" | "efficient" | "slow";
  scenario: ScenarioState;
  templateId: string | null;
  preferredStyle: RouteStyle | null;
  routeSummary: string | null;
  timePlanSummary: string | null;
  stopSignals: PlannedStopSignal[];
}

export interface RouteStop extends Venue {
  requestedCategory: CategoryId;
  visitLabel: string;
  travelFromPrevious?: string;
  travelMinutesFromPrevious?: number;
  travelDistanceMetersFromPrevious?: number;
  travelModesFromPrevious?: TravelModeEstimate[];
  navigationUrls?: Partial<Record<RouteMode, string>>;
}

export interface RouteOption {
  id: string;
  clusterId: ClusterId;
  clusterLabel: string;
  clusterAccent: string;
  title: string;
  subtitle: string;
  style: RouteStyle;
  fitScore: number;
  totalMinutes: number;
  bufferMinutes: number;
  hitCount: number;
  stops: RouteStop[];
  adjustments: string[];
  summary: string;
  transitSummary: string;
  routeModes?: TravelModeEstimate[];
  navigationUrl?: string | null;
  routeGeometry?: [number, number][];
  routeDistanceMeters?: number;
  routeDurationMinutes?: number;
  routeMode?: RouteMode | "cycling";
}

export interface LiveDataState {
  status: LiveDataStatus;
  source: "demo" | "open" | "amap";
  note: string;
  radiusMeters: number | null;
  poiCount: number;
}

export interface GenerationOptions {
  language?: AppLanguage;
  template?: SharedRoute | null;
  scenario?: ScenarioState;
  intentOverride?: IntentSignals | null;
  timeOverrideMinutes?: number | null;
  startPointOverride?: string | null;
  preferredClusterId?: ClusterId | null;
  startCoordinates?: Coordinates | null;
  venuePool?: Venue[] | null;
  liveMode?: boolean;
  liveClusterLabel?: string | null;
  liveClusterAccent?: string | null;
}
