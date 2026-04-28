import { getLocalizedCategoryLabel, type Language } from "./i18n";
import type { DeviceLocation, RouteOption, RouteStop } from "./types";

const cjkPattern = /[\u3400-\u9fff]/;
const mojibakePattern = /(?:Ã|Â|Ä|Å|Æ|Ç|È|É|Ê|Ë|Ì|Í|Î|Ï|Ð|Ñ|Ò|Ó|Ô|Õ|Ö|Ø|Ù|Ú|Û|Ü|Ý|Þ|ß|�|¤|¥|¦|§|¨|©|ª|«|¬|®|¯|°|±|²|³|´|µ|¶|·|¸|¹|º|»|¼|½|¾|¿|é|è|å|æ|ç|閺|鐠|娴|鍦|鏉|婵|瀹|闁|濞|绾|绋|鍑|锛|銆|€|路){2,}/;

export function hasNonEnglishText(value: string | null | undefined) {
  return Boolean(value && (cjkPattern.test(value) || mojibakePattern.test(value)));
}

export function localizePlainText(value: string | null | undefined, language: Language, fallback: string) {
  if (!value) {
    return fallback;
  }

  if (language === "zh" || !hasNonEnglishText(value)) {
    return value;
  }

  return fallback;
}

export function localizeRouteTitle(route: RouteOption, language: Language, index?: number) {
  return localizePlainText(route.title, language, `Route option ${index == null ? "" : index + 1}`.trim());
}

export function localizeRouteSummary(route: RouteOption, language: Language) {
  return localizePlainText(
    route.summary,
    language,
    `A live route plan with ${route.stops.length} planned stop${route.stops.length === 1 ? "" : "s"}.`
  );
}

export function localizeTransitSummary(route: RouteOption, language: Language) {
  return localizePlainText(route.transitSummary, language, "Travel modes available");
}

export function localizeRouteAccent(route: RouteOption, language: Language) {
  return localizePlainText(route.clusterAccent, language, "Ready to navigate");
}

export function localizeLocationLabel(location: DeviceLocation, language: Language) {
  const value = location.nearbyPlaceName || location.label || location.formattedAddress || "";
  if (language === "zh" || !hasNonEnglishText(value)) {
    return value || (language === "zh" ? "Current location" : "Current location area");
  }

  if (location.districtName && !hasNonEnglishText(location.districtName)) {
    return `Current area near ${location.districtName}`;
  }

  if (location.cityName && !hasNonEnglishText(location.cityName)) {
    return `Current area in ${location.cityName}`;
  }

  return "Current location area";
}

export function localizeLocationAddress(location: DeviceLocation, language: Language) {
  const value = location.formattedAddress || location.detail || location.label || "";
  if (language === "zh" || !hasNonEnglishText(value)) {
    return value || (language === "zh" ? "Current location" : "Current location");
  }

  return "Address available in AMap";
}

export function localizeStopName(stop: RouteStop, language: Language, index?: number) {
  if (language === "zh" || !hasNonEnglishText(stop.name)) {
    return stop.name;
  }

  const category = getLocalizedCategoryLabel(stop.requestedCategory || stop.categories?.[0] || "stop", "en");
  return index == null ? category : `Stop ${index + 1} · ${category}`;
}

export function localizeStopAddress(stop: RouteStop, language: Language) {
  const value = stop.address || stop.area || "";
  if (language === "zh" || !hasNonEnglishText(value)) {
    return value || (language === "zh" ? "Address pending" : "Address pending");
  }

  return stop.area && !hasNonEnglishText(stop.area) ? stop.area : "Address available in AMap";
}

export function localizeSearchPlace(
  place: { name: string; address?: string; area?: string },
  language: Language,
  index: number
) {
  const rawAddress = place.address || place.area || "";
  if (language === "zh") {
    return {
      name: place.name,
      address: rawAddress,
    };
  }

  return {
    name: hasNonEnglishText(place.name) ? `Search result ${index + 1}` : place.name,
    address: hasNonEnglishText(rawAddress) ? "Address available in AMap" : rawAddress,
  };
}
