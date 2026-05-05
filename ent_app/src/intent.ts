import type { CategoryId, IntentSignals, Venue } from "./types";

type IntentDefinition = {
  matchers: string[];
  categories: CategoryId[];
  searchTerms: string[];
  requiredCategories?: CategoryId[];
};

type MatchedIntentDefinition = {
  definition: IntentDefinition;
  firstIndex: number;
  matchCount: number;
};

type SearchableVenue = Pick<
  Venue,
  "name" | "area" | "address" | "summary" | "tags" | "ugc" | "categories"
>;

export type ExtractedIntentData = IntentSignals;

const categorySearchAliases: Record<CategoryId, string[]> = {
  food: ["吃饭", "正餐", "餐厅", "restaurant", "meal", "food"],
  sichuan: ["川菜", "麻辣", "sichuan", "spicy", "hotpot", "火锅"],
  cinema: ["电影", "电影院", "影院", "影城", "movie", "cinema", "film", "imax"],
  park: ["公园", "park", "garden", "绿地"],
  walk: ["散步", "走走", "walk", "stroll", "步道", "city walk"],
  grocery: ["超市", "便利店", "grocery", "supermarket", "convenience"],
  cafe: ["咖啡", "coffee", "cafe"],
  bookstore: ["书店", "bookstore", "books", "reading"],
  gallery: ["展览", "看展", "gallery", "museum", "exhibition"],
  dessert: ["甜品", "蛋糕", "dessert", "cake"],
  bakery: ["面包", "面包店", "烘焙", "贝果", "吐司", "bakery", "bread", "pastry", "bagel"],
  noodles: ["面馆", "面条", "拉面", "拌面", "汤面", "牛肉面", "米粉", "河粉", "noodle", "noodles"],
  riverside: ["江边", "河边", "湖边", "riverside", "waterfront"],
  market: ["市集", "市场", "market", "marketplace"],
};

const intentDefinitions: IntentDefinition[] = [
  {
    matchers: ["火锅", "hotpot", "串串", "冒菜"],
    categories: ["sichuan", "food"],
    searchTerms: ["火锅", "hotpot", "串串", "冒菜"],
    requiredCategories: ["sichuan", "food"],
  },
  {
    matchers: ["川菜", "麻辣", "sichuan", "spicy"],
    categories: ["sichuan", "food"],
    searchTerms: ["川菜", "sichuan", "麻辣"],
    requiredCategories: ["sichuan", "food"],
  },
  {
    matchers: ["电影", "电影院", "影院", "影城", "movie", "cinema", "film", "imax"],
    categories: ["cinema"],
    searchTerms: ["电影", "电影院", "影院", "影城", "movie", "cinema", "film", "imax"],
    requiredCategories: ["cinema"],
  },
  {
    matchers: ["公园", "park", "garden", "绿地"],
    categories: ["park", "walk"],
    searchTerms: ["公园", "park", "garden"],
    requiredCategories: ["park", "walk"],
  },
  {
    matchers: ["散步", "走走", "stroll", "walk", "city walk", "步道"],
    categories: ["walk"],
    searchTerms: ["散步", "walk", "步道"],
    requiredCategories: ["walk"],
  },
  {
    matchers: ["咖啡", "coffee", "cafe"],
    categories: ["cafe"],
    searchTerms: ["咖啡", "coffee", "cafe"],
    requiredCategories: ["cafe"],
  },
  {
    matchers: ["书店", "bookstore", "bookshop", "阅读"],
    categories: ["bookstore"],
    searchTerms: ["书店", "bookstore", "reading"],
    requiredCategories: ["bookstore"],
  },
  {
    matchers: ["看展", "展览", "gallery", "museum", "exhibition"],
    categories: ["gallery"],
    searchTerms: ["展览", "gallery", "museum"],
    requiredCategories: ["gallery"],
  },
  {
    matchers: ["面包", "面包店", "烘焙", "贝果", "吐司", "bakery", "bread", "pastry", "bagel"],
    categories: ["bakery"],
    searchTerms: ["面包", "面包店", "烘焙", "bakery", "bread", "pastry"],
    requiredCategories: ["bakery"],
  },
  {
    matchers: ["面馆", "面条", "拉面", "拌面", "汤面", "牛肉面", "米粉", "河粉", "noodle", "noodles"],
    categories: ["noodles", "food"],
    searchTerms: ["面馆", "面条", "拉面", "米粉", "noodle", "noodles"],
    requiredCategories: ["noodles", "food"],
  },
  {
    matchers: ["甜品", "甜点", "蛋糕", "冰淇淋", "dessert", "cake", "ice cream"],
    categories: ["dessert"],
    searchTerms: ["甜品", "甜点", "蛋糕", "dessert", "cake"],
    requiredCategories: ["dessert"],
  },
  {
    matchers: ["超市", "便利店", "grocery", "supermarket", "snacks"],
    categories: ["grocery", "market"],
    searchTerms: ["超市", "便利店", "grocery", "supermarket"],
    requiredCategories: ["grocery", "market"],
  },
  {
    matchers: ["江边", "河边", "湖边", "riverside", "waterfront"],
    categories: ["riverside", "walk"],
    searchTerms: ["江边", "河边", "湖边", "riverside", "waterfront"],
    requiredCategories: ["riverside", "walk"],
  },
];

export function extractIntentData(text: string): ExtractedIntentData {
  const normalizedText = normalizeText(text);
  const matchedDefinitions = intentDefinitions
    .map<MatchedIntentDefinition | null>((definition) => {
      const matcherIndexes = definition.matchers
        .map((matcher) => normalizedText.indexOf(normalizeText(matcher)))
        .filter((index) => index >= 0);

      if (!matcherIndexes.length) {
        return null;
      }

      return {
        definition,
        firstIndex: Math.min(...matcherIndexes),
        matchCount: matcherIndexes.length,
      };
    })
    .filter((match): match is MatchedIntentDefinition => match != null)
    .sort(
      (left, right) =>
        left.firstIndex - right.firstIndex || right.matchCount - left.matchCount
    );

  const categories: CategoryId[] = [];
  const searchTerms: string[] = [];
  const requiredTermsByCategory: Partial<Record<CategoryId, string[]>> = {};

  matchedDefinitions.forEach(({ definition }) => {
    categories.push(...definition.categories);
    searchTerms.push(...definition.searchTerms);

    (definition.requiredCategories ?? definition.categories).forEach((category) => {
      const currentTerms = requiredTermsByCategory[category] ?? [];
      requiredTermsByCategory[category] = dedupe([...currentTerms, ...definition.searchTerms]);
    });
  });

  return {
    categories: compressIntentCategories(dedupe(categories)),
    searchTerms: dedupe(searchTerms),
    requiredTermsByCategory,
  };
}

export function mergeIntentSignals(
  primary?: IntentSignals | null,
  fallback?: IntentSignals | null
): IntentSignals {
  const categories = compressIntentCategories(
    dedupe([...(primary?.categories ?? []), ...(fallback?.categories ?? [])])
  );
  const searchTerms = dedupe([...(primary?.searchTerms ?? []), ...(fallback?.searchTerms ?? [])]);
  const requiredTermsByCategory = mergeRequiredTermsByCategory(
    primary?.requiredTermsByCategory,
    fallback?.requiredTermsByCategory
  );

  return {
    categories,
    searchTerms,
    requiredTermsByCategory,
    preferredStyle: primary?.preferredStyle ?? fallback?.preferredStyle ?? null,
    routeSummary: primary?.routeSummary ?? fallback?.routeSummary ?? null,
    timePlanSummary: primary?.timePlanSummary ?? fallback?.timePlanSummary ?? null,
    stopSignals: mergeStopSignals(primary?.stopSignals, fallback?.stopSignals),
  };
}

export function venueMatchesSearchTerms(venue: SearchableVenue, searchTerms: string[]) {
  return scoreVenueSearchTerms(venue, searchTerms) > 0;
}

export function scoreVenueSearchTerms(venue: SearchableVenue, searchTerms: string[]) {
  const expandedTerms = dedupe(searchTerms.flatMap((term) => expandSearchTerm(term)));
  if (!expandedTerms.length) {
    return 0;
  }

  const titleHaystack = normalizeText(
    [
      venue.name,
      venue.tags.join(" "),
      venue.ugc.title,
      ...venue.categories.flatMap((category) => categorySearchAliases[category]),
    ].join(" ")
  );
  const detailHaystack = normalizeText(
    [
      venue.area,
      venue.address,
      venue.summary,
      venue.ugc.tip,
      venue.ugc.verified,
      ...venue.categories.flatMap((category) => categorySearchAliases[category]),
    ].join(" ")
  );

  let score = 0;
  expandedTerms.forEach((term) => {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm) {
      return;
    }

    if (titleHaystack.includes(normalizedTerm)) {
      score += 5;
      return;
    }

    if (detailHaystack.includes(normalizedTerm)) {
      score += 2;
    }
  });

  return score;
}

function expandSearchTerm(term: string) {
  const normalizedTerm = normalizeText(term);

  if (["火锅", "hotpot", "串串", "冒菜"].includes(normalizedTerm)) {
    return ["火锅", "hotpot", "串串", "冒菜", "川锅", "麻辣锅"];
  }

  if (["电影", "电影院", "影院", "影城", "movie", "cinema", "film", "imax"].includes(normalizedTerm)) {
    return ["电影", "电影院", "影院", "影城", "movie", "cinema", "film", "imax", "theatre"];
  }

  if (["公园", "park", "garden", "绿地"].includes(normalizedTerm)) {
    return ["公园", "park", "garden", "绿地", "口袋公园"];
  }

  if (["散步", "walk", "stroll", "步道", "city walk"].includes(normalizedTerm)) {
    return ["散步", "walk", "stroll", "步道", "慢行", "city walk"];
  }

  if (["咖啡", "coffee", "cafe"].includes(normalizedTerm)) {
    return ["咖啡", "coffee", "cafe"];
  }

  if (["书店", "bookstore", "bookshop", "reading"].includes(normalizedTerm)) {
    return ["书店", "bookstore", "bookshop", "reading", "books"];
  }

  if (["展览", "gallery", "museum", "exhibition"].includes(normalizedTerm)) {
    return ["展览", "gallery", "museum", "exhibition", "看展"];
  }

  if (["面包", "面包店", "烘焙", "bakery", "bread", "pastry"].includes(normalizedTerm)) {
    return ["面包", "面包店", "烘焙", "bakery", "bread", "pastry"];
  }

  if (["面馆", "面条", "拉面", "米粉", "noodle", "noodles"].includes(normalizedTerm)) {
    return ["面馆", "面条", "拉面", "米粉", "noodle", "noodles"];
  }

  if (["甜品", "甜点", "蛋糕", "dessert", "cake"].includes(normalizedTerm)) {
    return ["甜品", "甜点", "蛋糕", "dessert", "cake"];
  }

  if (["超市", "便利店", "grocery", "supermarket"].includes(normalizedTerm)) {
    return ["超市", "便利店", "grocery", "supermarket", "market"];
  }

  if (["江边", "河边", "湖边", "riverside", "waterfront"].includes(normalizedTerm)) {
    return ["江边", "河边", "湖边", "riverside", "waterfront", "滨水"];
  }

  return [term];
}

function mergeRequiredTermsByCategory(
  primary?: Partial<Record<CategoryId, string[]>>,
  fallback?: Partial<Record<CategoryId, string[]>>
) {
  const merged: Partial<Record<CategoryId, string[]>> = {};
  const categories = dedupe([
    ...Object.keys(primary ?? {}),
    ...Object.keys(fallback ?? {}),
  ]) as CategoryId[];

  categories.forEach((category) => {
    merged[category] = dedupe([
      ...(primary?.[category] ?? []),
      ...(fallback?.[category] ?? []),
    ]);
  });

  return merged;
}

function mergeStopSignals(
  primary?: IntentSignals["stopSignals"],
  fallback?: IntentSignals["stopSignals"]
) {
  const merged = [...(primary ?? []), ...(fallback ?? [])];
  const seen = new Set<string>();

  return merged.filter((stop) => {
    const key = `${stop.category}:${normalizeText(stop.label)}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function compressIntentCategories(categories: CategoryId[]) {
  return categories.filter((category) => {
    if (
      category === "food" &&
      categories.some((item) =>
        ["sichuan", "hotpot", "bbq", "noodles", "bakery", "dessert"].includes(item)
      )
    ) {
      return false;
    }

    if (category === "walk" && (categories.includes("park") || categories.includes("riverside"))) {
      return false;
    }

    if (category === "market" && categories.includes("grocery")) {
      return false;
    }

    return true;
  });
}

function normalizeText(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function dedupe<T>(items: T[]) {
  return [...new Set(items)];
}
