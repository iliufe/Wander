import type {
  AppLanguage,
  IntentSignals,
  LiveDataState,
  RouteOption,
  ScenarioState,
} from "../types";

export interface LocationDescribeResponse {
  nearbyPlaceName: string;
  formattedAddress: string;
  cityName: string | null;
  districtName: string | null;
  adcode: string | null;
  weatherMode?: ScenarioState["weather"] | null;
  weatherText?: string | null;
  weatherReportTime?: string | null;
}

export interface StartPlaceSearchResult {
  id: string;
  name: string;
  address: string;
  area: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  amapId?: string | null;
}

export interface GeneratePlansContext {
  prompt: string;
  language: AppLanguage;
  latitude: number;
  longitude: number;
  locationLabel: string;
  timeBudgetMinutes: number;
  weather: ScenarioState["weather"];
  venueStatus: ScenarioState["venue"];
}

interface GeneratePlansResponse {
  ok: boolean;
  intent?: IntentSignals;
  routes?: RouteOption[];
  liveData?: LiveDataState;
  location?: LocationDescribeResponse;
  note?: string;
}

interface ReverseLocationResponse {
  ok: boolean;
  location?: LocationDescribeResponse;
  note?: string;
}

interface StartPlaceSearchResponse {
  ok: boolean;
  places?: StartPlaceSearchResult[];
  note?: string;
}

export async function describeLocationWithApi(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<LocationDescribeResponse> {
  const response = await fetch("/api/location/reverse", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      latitude,
      longitude,
    }),
  });

  if (!response.ok) {
    throw new Error("Location reverse API request failed");
  }

  const payload = (await response.json()) as ReverseLocationResponse;
  if (!payload.ok || !payload.location) {
    throw new Error(payload.note || "Location reverse API returned no data");
  }

  return payload.location;
}

export async function generatePlansWithApi(
  context: GeneratePlansContext,
  signal?: AbortSignal
): Promise<{
  intent: IntentSignals | null;
  routes: RouteOption[];
  liveData: LiveDataState | null;
  location: LocationDescribeResponse | null;
}> {
  const response = await fetch("/api/plans/generate", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(context),
  });

  if (!response.ok) {
    throw new Error("Plan generation API request failed");
  }

  const payload = (await response.json()) as GeneratePlansResponse;
  if (!payload.ok) {
    throw new Error(payload.note || "Plan generation failed");
  }

  return {
    intent: payload.intent ?? null,
    routes: payload.routes ?? [],
    liveData: payload.liveData ?? null,
    location: payload.location ?? null,
  };
}

export async function searchStartPlacesWithApi(
  context: {
    query: string;
    latitude: number | null;
    longitude: number | null;
    city?: string | null;
    adcode?: string | null;
  },
  signal?: AbortSignal
): Promise<StartPlaceSearchResult[]> {
  const response = await fetch("/api/location/search", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(context),
  });

  if (!response.ok) {
    throw new Error("Location search API request failed");
  }

  const payload = (await response.json()) as StartPlaceSearchResponse;
  if (!payload.ok) {
    throw new Error(payload.note || "Location search failed");
  }

  return payload.places ?? [];
}
