import { getLocalizedCategoryLabel, type Language } from "./i18n";
import type { DeviceLocation, RouteOption, RouteStop } from "./types";

const cjkPattern = /[\u3400-\u9fff]/;
const mojibakePattern = /(?:Ã|Â|Ä|Å|Æ|Ç|È|É|Ê|Ë|Ì|Í|Î|Ï|Ð|Ñ|Ò|Ó|Ô|Õ|Ö|Ø|Ù|Ú|Û|Ü|Ý|Þ|ß|�|¤|¥|¦|§|¨|©|ª|«|¬|®|¯|°|±|²|³|´|µ|¶|·|¸|¹|º|»|¼|½|¾|¿|é|è|å|æ|ç|閺|鐠|娴|鍦|鏉|婵|瀹|闁|濞|绾|绋|鍑|锛|銆|€|路){2,}/;

const phraseTranslations: Array<[RegExp, string]> = [
  [/西交利物浦大学太仓校区/g, "Xi'an Jiaotong-Liverpool University Taicang Campus"],
  [/西交利物浦大学/g, "Xi'an Jiaotong-Liverpool University"],
  [/太仓市/g, "Taicang"],
  [/苏州市/g, "Suzhou"],
  [/上海市/g, "Shanghai"],
  [/江苏省/g, "Jiangsu"],
  [/城厢镇/g, "Chengxiang Town"],
  [/娄东街道/g, "Loudong Subdistrict"],
  [/科教新城/g, "Science and Education New Town"],
  [/人民南路/g, "Renmin South Road"],
  [/人民北路/g, "Renmin North Road"],
  [/人民路/g, "Renmin Road"],
  [/上海东路/g, "Shanghai East Road"],
  [/上海西路/g, "Shanghai West Road"],
  [/新华东路/g, "Xinhua East Road"],
  [/新华西路/g, "Xinhua West Road"],
  [/郑和中路/g, "Zhenghe Middle Road"],
  [/县府东街/g, "Xianfu East Street"],
  [/东仓路/g, "Dongcang Road"],
  [/东亭路/g, "Dongting Road"],
  [/海运堤路/g, "Haiyundi Road"],
  [/太仓大道/g, "Taicang Avenue"],
  [/文景路/g, "Wenjing Road"],
  [/文治路/g, "Wenzhi Road"],
  [/文渊路/g, "Wenyuan Road"],
  [/古松弄/g, "Gusong Lane"],
  [/南洋广场/g, "Nanyang Plaza"],
  [/天镜湖/g, "Tianjing Lake"],
  [/西北工业大学/g, "Northwestern Polytechnical University"],
  [/万达广场/g, "Wanda Plaza"],
  [/宝龙广场/g, "Powerlong Plaza"],
];

const characterPinyin: Record<string, string> = {
  餐: "Can",
  厅: "Ting",
  饭: "Fan",
  店: "Dian",
  火: "Huo",
  锅: "Guo",
  川: "Chuan",
  流: "Liu",
  小: "Xiao",
  馆: "Guan",
  公: "Gong",
  园: "Yuan",
  影: "Ying",
  城: "Cheng",
  电: "Dian",
  院: "Yuan",
  超: "Chao",
  市: "Shi",
  咖: "Ka",
  啡: "Fei",
  书: "Shu",
  屋: "Wu",
  路: "Road",
  街: "Street",
  巷: "Lane",
  弄: "Lane",
  号: "No.",
  楼: "Building",
  层: "Floor",
  区: "District",
  镇: "Town",
  东: "East",
  西: "West",
  南: "South",
  北: "North",
  中: "Middle",
  入口: "Entrance",
};

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

  return toEnglishDisplay(value, fallback);
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

  return toEnglishDisplay(
    value,
    location.formattedAddress || location.districtName || location.cityName || "Current location area"
  );
}

export function localizeLocationAddress(location: DeviceLocation, language: Language) {
  const value = location.formattedAddress || location.detail || location.label || "";
  if (language === "zh" || !hasNonEnglishText(value)) {
    return value || (language === "zh" ? "Current location" : "Current location");
  }

  return toEnglishDisplay(value, "Current location");
}

export function localizeStopName(stop: RouteStop, language: Language, index?: number) {
  if (language === "zh" || !hasNonEnglishText(stop.name)) {
    return stop.name;
  }

  const category = getLocalizedCategoryLabel(stop.requestedCategory || stop.categories?.[0] || "stop", "en");
  return toEnglishDisplay(stop.name, index == null ? category : `Stop ${index + 1} · ${category}`);
}

export function localizeStopAddress(stop: RouteStop, language: Language) {
  const value = stop.address || stop.area || "";
  if (language === "zh" || !hasNonEnglishText(value)) {
    return value || (language === "zh" ? "Address pending" : "Address pending");
  }

  return toEnglishDisplay(value, stop.area || "Address pending");
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
    name: toEnglishDisplay(place.name, `Search result ${index + 1}`),
    address: toEnglishDisplay(rawAddress, place.area || "Address pending"),
  };
}

function toEnglishDisplay(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  if (!hasNonEnglishText(value)) {
    return value;
  }

  const normalized = normalizeMojibake(value);
  if (!cjkPattern.test(normalized)) {
    return fallback;
  }

  const translated = translateKnownAddressParts(normalized);
  const cleaned = translated
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/^\s*[,，]\s*/, "")
    .trim();

  return cleaned || fallback;
}

function translateKnownAddressParts(value: string) {
  let output = value;
  phraseTranslations.forEach(([pattern, replacement]) => {
    output = output.replace(pattern, ` ${replacement} `);
  });

  output = output.replace(/(\d+)\s*号/g, " No. $1 ");
  output = output.replace(/(\d+)\s*幢/g, " Building $1 ");
  output = output.replace(/(\d+)\s*栋/g, " Building $1 ");
  output = output.replace(/(\d+)\s*楼/g, " Building $1 ");
  output = output.replace(/(\d+)\s*层/g, " Floor $1 ");
  output = output.replace(/B(\d+)/gi, " B$1 ");

  return output
    .split("")
    .map((char) => {
      if (!cjkPattern.test(char)) {
        return char;
      }
      return characterPinyin[char] ? ` ${characterPinyin[char]} ` : "";
    })
    .join("")
    .replace(/\s+(Road|Street|Lane|Avenue|Plaza|District|Town|Building|Floor|No\.)/g, " $1")
    .replace(/\bNo\.\s+(\d+)/g, "No. $1")
    .replace(/\s+/g, " ");
}

function normalizeMojibake(value: string) {
  try {
    const decoded = decodeURIComponent(escape(value));
    return cjkPattern.test(decoded) ? decoded : value;
  } catch {
    return value;
  }
}
