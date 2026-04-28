import { getLocalizedCategoryLabel, type Language } from "./i18n";
import type { DeviceLocation, RouteOption, RouteStop } from "./types";

const cjkPattern = /[\u3400-\u9fff]/;
const mojibakePattern = /(?:Ã|Â|Ä|Å|Æ|Ç|È|É|Ê|Ë|Ì|Í|Î|Ï|Ð|Ñ|Ò|Ó|Ô|Õ|Ö|Ø|Ù|Ú|Û|Ü|Ý|Þ|ß|�|¤|¥|¦|§|¨|©|ª|«|¬|®|¯|°|±|²|³|´|µ|¶|·|¸|¹|º|»|¼|½|¾|¿|é|è|å|æ|ç|閺|鐠|娴|鍦|鏉|婵|瀹|闁|濞|绾|绋|鍑|锛|銆|€|路){2,}/;

const phrasePinyin: Array<[string, string]> = [
  ["\u897f\u4ea4\u5229\u7269\u6d66\u5927\u5b66\u592a\u4ed3\u6821\u533a", "Xi'an Jiaotong Liverpool Daxue Taicang Xiaoqu"],
  ["\u897f\u4ea4\u5229\u7269\u6d66\u5927\u5b66", "Xi'an Jiaotong Liverpool Daxue"],
  ["\u897f\u5317\u5de5\u4e1a\u5927\u5b66", "Xibei Gongye Daxue"],
  ["\u592a\u4ed3\u5e02", "Taicang Shi"],
  ["\u82cf\u5dde\u5e02", "Suzhou Shi"],
  ["\u4e0a\u6d77\u5e02", "Shanghai Shi"],
  ["\u6c5f\u82cf\u7701", "Jiangsu Sheng"],
  ["\u79d1\u6559\u65b0\u57ce", "Kejiao Xincheng"],
  ["\u57ce\u53a2\u9547", "Chengxiang Zhen"],
  ["\u5a04\u4e1c\u8857\u9053", "Loudong Jiedao"],
  ["\u4eba\u6c11\u5357\u8def", "Renmin Nan Lu"],
  ["\u4eba\u6c11\u5317\u8def", "Renmin Bei Lu"],
  ["\u4eba\u6c11\u8def", "Renmin Lu"],
  ["\u4e0a\u6d77\u4e1c\u8def", "Shanghai Dong Lu"],
  ["\u4e0a\u6d77\u897f\u8def", "Shanghai Xi Lu"],
  ["\u65b0\u534e\u4e1c\u8def", "Xinhua Dong Lu"],
  ["\u65b0\u534e\u897f\u8def", "Xinhua Xi Lu"],
  ["\u90d1\u548c\u4e2d\u8def", "Zhenghe Zhong Lu"],
  ["\u53bf\u5e9c\u4e1c\u8857", "Xianfu Dong Jie"],
  ["\u4e1c\u4ed3\u8def", "Dongcang Lu"],
  ["\u4e1c\u4ead\u8def", "Dongting Lu"],
  ["\u6d77\u8fd0\u5824\u8def", "Haiyundi Lu"],
  ["\u592a\u4ed3\u5927\u9053", "Taicang Dadao"],
  ["\u6587\u666f\u8def", "Wenjing Lu"],
  ["\u6587\u6cbb\u8def", "Wenzhi Lu"],
  ["\u6587\u6e0a\u8def", "Wenyuan Lu"],
  ["\u53e4\u677e\u5f04", "Gusong Nong"],
  ["\u5357\u6d0b\u5e7f\u573a", "Nanyang Guangchang"],
  ["\u5929\u955c\u6e56", "Tianjing Hu"],
  ["\u4e07\u8fbe\u5e7f\u573a", "Wanda Guangchang"],
  ["\u5b9d\u9f99\u5e7f\u573a", "Baolong Guangchang"],
  ["\u5c0f\u8001\u5f1f\u5ddd\u83dc\u9986", "Xiao Lao Di Chuan Cai Guan"],
  ["\u5c0f\u8001\u5f1f", "Xiao Lao Di"],
  ["\u5ddd\u83dc\u9986", "Chuan Cai Guan"],
  ["\u5b9d\u9f99\u5e97", "Baolong Dian"],
  ["\u5b9d\u9f99", "Baolong"],
  ["\u5ddd\u83dc", "Chuan Cai"],
  ["\u83dc\u9986", "Cai Guan"],
  ["\u8001\u5f1f", "Lao Di"],
  ["\u706b\u9505", "Huo Guo"],
  ["\u516c\u56ed", "Gong Yuan"],
  ["\u7535\u5f71\u9662", "Dian Ying Yuan"],
];

const charPinyin: Record<string, string> = {
  "\u4e00": "Yi",
  "\u4e8c": "Er",
  "\u4e09": "San",
  "\u56db": "Si",
  "\u4e94": "Wu",
  "\u516d": "Liu",
  "\u4e03": "Qi",
  "\u516b": "Ba",
  "\u4e5d": "Jiu",
  "\u5341": "Shi",
  "\u4e0b": "Xia",
  "\u4e1c": "Dong",
  "\u897f": "Xi",
  "\u5317": "Bei",
  "\u4e2d": "Zhong",
  "\u5927": "Da",
  "\u5c0f": "Xiao",
  "\u65b0": "Xin",
  "\u8001": "Lao",
  "\u5f1f": "Di",
  "\u592a": "Tai",
  "\u4ed3": "Cang",
  "\u82cf": "Su",
  "\u5dde": "Zhou",
  "\u6c5f": "Jiang",
  "\u4e0a": "Shang",
  "\u6d77": "Hai",
  "\u5e02": "Shi",
  "\u7701": "Sheng",
  "\u533a": "Qu",
  "\u9547": "Zhen",
  "\u8857": "Jie",
  "\u9053": "Dao",
  "\u8def": "Lu",
  "\u5df7": "Xiang",
  "\u5f04": "Nong",
  "\u53f7": "Hao",
  "\u697c": "Lou",
  "\u5c42": "Ceng",
  "\u5e7f": "Guang",
  "\u573a": "Chang",
  "\u5165": "Ru",
  "\u53e3": "Kou",
  "\u95e8": "Men",
  "\u5357": "Nan",
  "\u4fa7": "Ce",
  "\u65c1": "Pang",
  "\u6e56": "Hu",
  "\u6cb3": "He",
  "\u5824": "Di",
  "\u6c34": "Shui",
  "\u6e7e": "Wan",
  "\u6b65": "Bu",
  "\u884c": "Xing",
  "\u5e26": "Dai",
  "\u7eff": "Lv",
  "\u5730": "Di",
  "\u8349": "Cao",
  "\u751f": "Sheng",
  "\u6d3b": "Huo",
  "\u5546": "Shang",
  "\u4e1a": "Ye",
  "\u5b66": "Xue",
  "\u6821": "Xiao",
  "\u56ed": "Yuan",
  "\u9986": "Guan",
  "\u5e97": "Dian",
  "\u9910": "Can",
  "\u5385": "Ting",
  "\u996d": "Fan",
  "\u9762": "Mian",
  "\u5403": "Chi",
  "\u5ddd": "Chuan",
  "\u83dc": "Cai",
  "\u6d41": "Liu",
  "\u706b": "Huo",
  "\u9505": "Guo",
  "\u70e7": "Shao",
  "\u70e4": "Kao",
  "\u5496": "Ka",
  "\u5561": "Fei",
  "\u8336": "Cha",
  "\u751c": "Tian",
  "\u54c1": "Pin",
  "\u86cb": "Dan",
  "\u7cd5": "Gao",
  "\u5305": "Bao",
  "\u8d85": "Chao",
  "\u4fbf": "Bian",
  "\u5229": "Li",
  "\u4e66": "Shu",
  "\u5c4b": "Wu",
  "\u5f71": "Ying",
  "\u7535": "Dian",
  "\u9662": "Yuan",
  "\u57ce": "Cheng",
  "\u5de5": "Gong",
  "\u4f5c": "Zuo",
  "\u5ba4": "Shi",
  "\u5fc3": "Xin",
  "\u5929": "Tian",
  "\u955c": "Jing",
  "\u4eba": "Ren",
  "\u6c11": "Min",
  "\u53bf": "Xian",
  "\u5e9c": "Fu",
  "\u90d1": "Zheng",
  "\u548c": "He",
  "\u6587": "Wen",
  "\u666f": "Jing",
  "\u6cbb": "Zhi",
  "\u6e0a": "Yuan",
  "\u53e4": "Gu",
  "\u677e": "Song",
  "\u8fd0": "Yun",
  "\u4ead": "Ting",
  "\u5eb7": "Kang",
  "\u8fbe": "Da",
  "\u5b9d": "Bao",
  "\u9f99": "Long",
  "\u6e14": "Yu",
  "\u9c9c": "Xian",
  "\u725b": "Niu",
  "\u7f8a": "Yang",
  "\u9e21": "Ji",
  "\u732a": "Zhu",
  "\u9c7c": "Yu",
  "\u867e": "Xia",
  "\u87f9": "Xie",
  "\u996e": "Yin",
  "\u9152": "Jiu",
  "\u5427": "Ba",
  "\u6c64": "Tang",
  "\u7ca5": "Zhou",
  "\u7c89": "Fen",
  "\u997a": "Jiao",
  "\u9984": "Tun",
  "\u660e": "Ming",
  "\u6708": "Yue",
  "\u661f": "Xing",
  "\u5bb6": "Jia",
  "\u5ba2": "Ke",
  "\u9999": "Xiang",
  "\u5473": "Wei",
  "\u798f": "Fu",
  "\u6ee1": "Man",
  "\u5174": "Xing",
  "\u9686": "Long",
};

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

  return toPinyinDisplay(value, fallback);
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

  return toPinyinDisplay(value, "Current location area");
}

export function localizeLocationAddress(location: DeviceLocation, language: Language) {
  const value = location.formattedAddress || location.detail || location.label || "";
  if (language === "zh") {
    return value || "\u5f53\u524d\u4f4d\u7f6e";
  }

  return toPinyinDisplay(value, "Current location");
}

export function localizeStopName(stop: RouteStop, language: Language, index?: number) {
  if (language === "zh") {
    return stop.name;
  }

  const category = getLocalizedCategoryLabel(stop.requestedCategory || stop.categories?.[0] || "stop", "en");
  return toPinyinDisplay(stop.name, index == null ? category : `Stop ${index + 1} · ${category}`);
}

export function localizeStopAddress(stop: RouteStop, language: Language) {
  const value = stop.address || stop.area || "";
  if (language === "zh") {
    return value || "\u5730\u5740\u5f85\u786e\u8ba4";
  }

  return toPinyinDisplay(value, stop.area || "Address pending");
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
    name: toPinyinDisplay(place.name, `Search result ${index + 1}`),
    address: toPinyinDisplay(rawAddress, place.area || "Address pending"),
  };
}

function toPinyinDisplay(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const normalized = normalizeMaybeMojibake(value);
  if (!hasNonEnglishText(normalized)) {
    return normalized;
  }

  const pinyin = toPinyinLike(normalized);
  return pinyin || fallback;
}

function toPinyinLike(value: string) {
  let output = value;
  [...phrasePinyin].sort((left, right) => right[0].length - left[0].length).forEach(([phrase, pinyin]) => {
    output = output.split(phrase).join(` ${pinyin} `);
  });

  output = output.replace(/(\d+)\s*\u53f7/g, " $1 Hao ");
  output = output.replace(/(\d+)\s*\u5e62/g, " $1 Zhuang ");
  output = output.replace(/(\d+)\s*\u680b/g, " $1 Dong ");
  output = output.replace(/(\d+)\s*\u697c/g, " $1 Lou ");
  output = output.replace(/(\d+)\s*\u5c42/g, " $1 Ceng ");

  const tokens: string[] = [];
  for (const char of output) {
    if (cjkPattern.test(char)) {
      const mapped = charPinyin[char];
      if (mapped) {
        tokens.push(mapped);
      } else {
        tokens.push(char);
      }
      continue;
    }

    if (/[\w.-]/.test(char)) {
      tokens.push(char);
      continue;
    }

    if (/[，,、/()\s·-]/.test(char)) {
      tokens.push(" ");
    }
  }

  return tokens
    .join("")
    .replace(/\s+/g, " ")
    .replace(/\s+([A-Za-z])/g, " $1")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+([）)])/g, "$1")
    .replace(/([（(])\s+/g, "$1")
    .trim();
}

function normalizeMaybeMojibake(value: string) {
  try {
    const decoded = decodeURIComponent(escape(value));
    return cjkPattern.test(decoded) ? decoded : value;
  } catch {
    return value;
  }
}
