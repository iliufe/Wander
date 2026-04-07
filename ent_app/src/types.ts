export type CategoryId =
  | "food"
  | "sichuan"
  | "park"
  | "walk"
  | "grocery"
  | "cafe"
  | "bookstore"
  | "gallery"
  | "dessert"
  | "riverside"
  | "market";

export type AppClusterId = "jingan" | "xuhui" | "huangpu";
export type ClusterId = AppClusterId | "live";
export type RouteStyle = "balanced" | "scenic" | "efficient";
export type WeatherMode = "clear" | "rain";
export type VenueMode = "live" | "closed";
export type LocationPermissionState = "idle" | "requesting" | "granted" | "denied" | "unsupported" | "error";
export type LiveDataStatus = "idle" | "loading" | "live" | "empty" | "fallback" | "error";

export interface TimeSelection {
  hours: number;
  minutes: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
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
  sourceType?: "curated" | "open-live";
  sourceLabel?: string;
  distanceFromStartMeters?: number | null;
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

export interface ParsedRequest {
  rawText: string;
  startPoint: string;
  timeHours: number;
  timeMinutes: number;
  timeLabel: string;
  categories: CategoryId[];
  mood: "balanced" | "scenic" | "efficient" | "slow";
  scenario: ScenarioState;
  templateId: string | null;
}

export interface RouteStop extends Venue {
  requestedCategory: CategoryId;
  visitLabel: string;
  travelFromPrevious?: string;
  travelMinutesFromPrevious?: number;
  travelDistanceMetersFromPrevious?: number;
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
}

export interface LiveDataState {
  status: LiveDataStatus;
  source: "demo" | "open";
  note: string;
  radiusMeters: number | null;
  poiCount: number;
}

export interface GenerationOptions {
  template?: SharedRoute | null;
  scenario?: ScenarioState;
  timeOverrideMinutes?: number | null;
  startPointOverride?: string | null;
  preferredClusterId?: ClusterId | null;
  startCoordinates?: Coordinates | null;
  venuePool?: Venue[] | null;
  liveMode?: boolean;
  liveClusterLabel?: string | null;
  liveClusterAccent?: string | null;
}
