import { pinyin } from "pinyin-pro";
import { getLocalizedCategoryLabel, type Language } from "./i18n";
import type { DeviceLocation, RouteOption, RouteStop } from "./types";

const cjkPattern = /[\u3400-\u9fff]/;
const mojibakePattern = /(?:Ã|Â|Ä|Å|Æ|Ç|È|É|Ê|Ë|Ì|Í|Î|Ï|Ð|Ñ|Ò|Ó|Ô|Õ|Ö|Ø|Ù|Ú|Û|Ü|Ý|Þ|ß|�|¤|¥|¦|§|¨|©|ª|«|¬|®|¯|°|±|²|³|´|µ|¶|·|¸|¹|º|»|¼|½|¾|¿|é|è|å|æ|ç|閺|鐠|娴|鍦|鏉|婵|瀹|闁|濞|绾|绋|鍑|锛|銆|€|路){2,}/;

const properNameOverrides: Array<[string, string]> = [
  ["\u897f\u4ea4\u5229\u7269\u6d66\u5927\u5b66", "Xi'an Jiaotong Liverpool University"],
  ["\u897f\u5317\u5de5\u4e1a\u5927\u5b66", "Northwestern Polytechnical University"],
  ["\u4e07\u8fbe", "Wanda"],
  ["\u5b9d\u9f99", "Baolong"],
  ["\u592a\u4ed3", "Taicang"],
  ["\u82cf\u5dde", "Suzhou"],
  ["\u4e0a\u6d77", "Shanghai"],
];

export function hasNonEnglishText(value: string | null | undefined) {
  return Boolean(value && (cjkPattern.test(value) || mojibakePattern.test(value)));
}

export function localizePlainText(value: string | null | undefined, language: Language, fallback: string) {
  if (!value) {
    return fallback;
  }

  if (language === "zh") {
    return value;
  }

  return toReadablePinyin(value, fallback);
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
  if (language === "zh") {
    return value || "\u5f53\u524d\u4f4d\u7f6e";
  }

  return toReadablePinyin(value, "Current location area");
}

export function localizeLocationAddress(location: DeviceLocation, language: Language) {
  const value = location.formattedAddress || location.detail || location.label || "";
  if (language === "zh") {
    return value || "\u5f53\u524d\u4f4d\u7f6e";
  }

  return toReadablePinyin(value, "Current location");
}

export function localizeStopName(stop: RouteStop, language: Language, index?: number) {
  if (language === "zh") {
    return stop.name;
  }

  const category = getLocalizedCategoryLabel(stop.requestedCategory || stop.categories?.[0] || "stop", "en");
  return toReadablePinyin(stop.name, index == null ? category : `Stop ${index + 1} - ${category}`);
}

export function localizeStopAddress(stop: RouteStop, language: Language) {
  const value = stop.address || stop.area || "";
  if (language === "zh") {
    return value || "\u5730\u5740\u5f85\u786e\u8ba4";
  }

  return toReadablePinyin(value, stop.area || "Address pending");
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
    name: toReadablePinyin(place.name, `Search result ${index + 1}`),
    address: toReadablePinyin(rawAddress, place.area || "Address pending"),
  };
}

function toReadablePinyin(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const normalized = normalizeMaybeMojibake(value);
  if (!hasNonEnglishText(normalized)) {
    return normalized;
  }

  const protectedText = applyProperNameOverrides(normalized);
  const converted = pinyin(protectedText, {
    toneType: "none",
    separator: " ",
    type: "string",
  });
  const formatted = formatPinyinDisplay(converted);
  return formatted || fallback;
}

function applyProperNameOverrides(value: string) {
  return properNameOverrides.reduce(
    (current, [source, replacement]) => current.split(source).join(` ${replacement} `),
    value
  );
}

function formatPinyinDisplay(value: string) {
  return titleCasePinyin(value)
    .replace(/\s+/g, " ")
    .replace(/(\d)(?:\s+)(?=\d)/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\s*-\s*/g, "-")
    .trim();
}

function titleCasePinyin(value: string) {
  return value.replace(/[A-Za-z][A-Za-z']*/g, (word) => {
    if (isKnownAcronymOrBrand(word)) {
      return word;
    }

    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

function isKnownAcronymOrBrand(word: string) {
  return /^(Xi'an|Liverpool|University|Northwestern|Polytechnical|Wanda|Baolong|Taicang|Suzhou|Shanghai)$/i.test(word);
}

function normalizeMaybeMojibake(value: string) {
  try {
    const decoded = decodeURIComponent(escape(value));
    return cjkPattern.test(decoded) ? decoded : value;
  } catch {
    return value;
  }
}
