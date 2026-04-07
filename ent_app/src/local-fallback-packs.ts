import type { CategoryId, Coordinates, Venue } from "./types";

type FallbackPack = {
  id: string;
  label: string;
  anchorLabel: string;
  anchorAddress: string;
  center: Coordinates;
  activationRadiusMeters: number;
  venues: Venue[];
};

type LocalFallbackResult = {
  venues: Venue[];
  packLabel: string;
  note: string;
  radiusMeters: number;
  landmarkName: string;
};

const taicangPack: FallbackPack = {
  id: "taicang-campus",
  label: "太仓 · 西浦周边",
  anchorLabel: "西浦创业家学院（太仓）",
  anchorAddress: "太仓市太仓大道111号",
  center: {
    latitude: 31.5052,
    longitude: 121.1433,
  },
  activationRadiusMeters: 18000,
  venues: [
    {
      id: "taicang-spice",
      name: "川流小馆",
      cluster: "live",
      area: "西浦创业家学院南侧",
      address: "太仓市太仓大道111号西浦创业家学院南侧街区",
      latitude: 31.5059,
      longitude: 121.1431,
      categories: ["sichuan", "food"],
      duration: 58,
      outdoor: false,
      rating: 4.7,
      hours: "11:00-21:00",
      crowd: "课后 18:00 前后最稳",
      summary: "离校园很近，适合把晚饭安排成路线第一站，不需要额外绕路。",
      tags: ["课后出发", "川味补能量", "本地精选"],
      demoCanClose: true,
      sourceType: "curated",
      sourceLabel: "Wander local offline pack",
      ugc: {
        author: "@太仓试走组",
        verified: "近 7 天到访",
        title: "从教学楼出来直接过去很顺，吃完还能接着散步。",
        stay: "建议停留 45-60 分钟",
        tip: "如果时间紧，优先点一份主食和一份小菜，收得更快。",
      },
    },
    {
      id: "taicang-campus-walk",
      name: "创客邦步道",
      cluster: "live",
      area: "科教新城",
      address: "太仓市科教新城文渊路步行带",
      latitude: 31.5071,
      longitude: 121.1456,
      categories: ["walk", "park"],
      duration: 28,
      outdoor: true,
      rating: 4.5,
      hours: "全天开放",
      crowd: "傍晚更舒服",
      summary: "适合作为饭后轻量散步点，节奏不会太重。",
      tags: ["轻步行", "低门槛放松", "本地精选"],
      sourceType: "curated",
      sourceLabel: "Wander local offline pack",
      ugc: {
        author: "@Wander 校园线",
        verified: "近 14 天试走",
        title: "十几分钟就能切换状态，很适合课后短空档。",
        stay: "建议停留 20-30 分钟",
        tip: "如果后面还要补给，这里别走太久，留一点时间给尾站。",
      },
    },
    {
      id: "taicang-neighborhood",
      name: "科教新城邻里中心",
      cluster: "live",
      area: "科教新城",
      address: "太仓市文治路88号邻里中心",
      latitude: 31.5038,
      longitude: 121.1487,
      categories: ["grocery", "market"],
      duration: 20,
      outdoor: false,
      rating: 4.5,
      hours: "09:00-21:30",
      crowd: "晚间补给也稳定",
      summary: "适合作为回程前的补给站，把买东西这件事顺手做掉。",
      tags: ["顺路补货", "回程友好", "本地精选"],
      sourceType: "curated",
      sourceLabel: "Wander local offline pack",
      ugc: {
        author: "@本地轻路线",
        verified: "近 10 天到访",
        title: "不用专门跑一趟，路线尾声顺手买完就能回去。",
        stay: "建议停留 10-20 分钟",
        tip: "先想好清单，进去直拿会更省时间。",
      },
    },
    {
      id: "taicang-books",
      name: "阅野书房",
      cluster: "live",
      area: "科教新城",
      address: "太仓市文治路126号二层",
      latitude: 31.5019,
      longitude: 121.1462,
      categories: ["bookstore", "cafe"],
      duration: 45,
      outdoor: false,
      rating: 4.7,
      hours: "10:00-21:00",
      crowd: "工作日下午人更少",
      summary: "下雨或者不想走太多时，这里很适合作为慢节奏替代。",
      tags: ["书店咖啡", "室内稳妥", "本地精选"],
      sourceType: "curated",
      sourceLabel: "Wander local offline pack",
      ugc: {
        author: "@课后散策",
        verified: "近 12 天到访",
        title: "可以坐一会，也可以只翻几本书，不会有打卡压力。",
        stay: "建议停留 35-50 分钟",
        tip: "如果你后面还想去湖边，这里放在第二站最平衡。",
      },
    },
    {
      id: "taicang-gallery",
      name: "湖边小展厅",
      cluster: "live",
      area: "天镜湖片区",
      address: "太仓市文景路18号艺术盒子",
      latitude: 31.4998,
      longitude: 121.1498,
      categories: ["gallery"],
      duration: 48,
      outdoor: false,
      rating: 4.6,
      hours: "10:30-19:00",
      crowd: "周末下午略热闹",
      summary: "当散步条件不理想时，这里可以稳稳接住整条路线。",
      tags: ["室内替代", "轻展览", "本地精选"],
      sourceType: "curated",
      sourceLabel: "Wander local offline pack",
      ugc: {
        author: "@太仓样机组",
        verified: "近 9 天到访",
        title: "体量不大，但很适合塞进两三个小时的路线里。",
        stay: "建议停留 35-50 分钟",
        tip: "时间不多时直接看主展厅，节奏会更干净。",
      },
    },
    {
      id: "taicang-lake-walk",
      name: "天镜湖慢行环",
      cluster: "live",
      area: "天镜湖",
      address: "太仓市文景路天镜湖东入口",
      latitude: 31.4978,
      longitude: 121.1514,
      categories: ["park", "walk", "riverside"],
      duration: 36,
      outdoor: true,
      rating: 4.8,
      hours: "全天开放",
      crowd: "黄昏最舒服",
      summary: "很适合把课后或下班后的情绪切换做完整，又不会太远。",
      tags: ["湖边散步", "放空", "本地精选"],
      sourceType: "curated",
      sourceLabel: "Wander local offline pack",
      ugc: {
        author: "@傍晚出去走走",
        verified: "近 6 天到访",
        title: "走半圈就已经很够了，不需要把自己走累。",
        stay: "建议停留 25-40 分钟",
        tip: "如果风大就别走太久，转去室内点会更舒服。",
      },
    },
    {
      id: "taicang-coffee",
      name: "南门咖啡实验室",
      cluster: "live",
      area: "校园南门",
      address: "太仓市太仓大道111号南门生活街",
      latitude: 31.5044,
      longitude: 121.1412,
      categories: ["cafe", "dessert"],
      duration: 32,
      outdoor: false,
      rating: 4.6,
      hours: "09:30-21:30",
      crowd: "下午和晚饭后都合适",
      summary: "适合作为路线开头的缓冲站，也适合收尾时坐一会。",
      tags: ["短坐", "甜口补给", "本地精选"],
      sourceType: "curated",
      sourceLabel: "Wander local offline pack",
      ugc: {
        author: "@碎片时间党",
        verified: "近 8 天到访",
        title: "不用久待也成立，很适合 20 分钟的快速恢复。",
        stay: "建议停留 20-35 分钟",
        tip: "如果后面还有晚饭，这里就点小杯咖啡或甜点即可。",
      },
    },
    {
      id: "taicang-bakery",
      name: "湖畔烘焙屋",
      cluster: "live",
      area: "天镜湖片区",
      address: "太仓市文景路66号湖畔商业街",
      latitude: 31.4989,
      longitude: 121.1504,
      categories: ["dessert", "cafe"],
      duration: 25,
      outdoor: false,
      rating: 4.5,
      hours: "10:00-21:00",
      crowd: "傍晚外带最快",
      summary: "很适合作为散步后的甜点尾站，不用额外再拐远。",
      tags: ["甜品收尾", "可外带", "本地精选"],
      sourceType: "curated",
      sourceLabel: "Wander local offline pack",
      ugc: {
        author: "@太仓晚间线",
        verified: "近 11 天到访",
        title: "和湖边路线衔接得很自然，结束感比较完整。",
        stay: "建议停留 15-25 分钟",
        tip: "如果想快一点，直接外带面包和饮品就好。",
      },
    },
    {
      id: "taicang-mini-mart",
      name: "校园便利补给站",
      cluster: "live",
      area: "西浦创业家学院北侧",
      address: "太仓市太仓大道111号学习街区一层",
      latitude: 31.5065,
      longitude: 121.1405,
      categories: ["grocery", "market"],
      duration: 15,
      outdoor: false,
      rating: 4.4,
      hours: "08:00-22:00",
      crowd: "全天都比较稳",
      summary: "如果时间特别碎，这里可以充当最轻量的补给尾站。",
      tags: ["极速补给", "离校园近", "本地精选"],
      sourceType: "curated",
      sourceLabel: "Wander local offline pack",
      ugc: {
        author: "@下课就走",
        verified: "近 5 天到访",
        title: "买完就能回去，不会让路线变得拖沓。",
        stay: "建议停留 8-15 分钟",
        tip: "把它留到最后一站，执行成本最低。",
      },
    },
  ],
};

const fallbackPacks = [taicangPack];

export function buildLocalFallbackVenuePool(
  origin: Coordinates,
  requestedCategories: CategoryId[]
): LocalFallbackResult | null {
  const pack = resolveNearestPack(origin);
  if (!pack || pack.distanceMeters > pack.pack.activationRadiusMeters) {
    return null;
  }

  const requestedCategorySet = new Set(requestedCategories);
  const venues = pack.pack.venues
    .map((venue) => {
      const distanceFromStartMeters = distanceMeters(origin, {
        latitude: venue.latitude,
        longitude: venue.longitude,
      });
      const matchedCategoryCount = venue.categories.filter((category) =>
        requestedCategorySet.has(category)
      ).length;

      return {
        ...venue,
        distanceFromStartMeters,
        tags: venue.tags.includes("本地精选") ? venue.tags : [...venue.tags, "本地精选"],
        rating: Number((venue.rating + Math.max(0, 0.2 - distanceFromStartMeters / 15000)).toFixed(1)),
        summary:
          matchedCategoryCount > 0
            ? `${venue.summary} 这站和你当前主题的匹配度更高。`
            : venue.summary,
      };
    })
    .sort((left, right) => {
      const leftMatched = left.categories.filter((category) => requestedCategorySet.has(category)).length;
      const rightMatched = right.categories.filter((category) => requestedCategorySet.has(category)).length;
      return (
        rightMatched - leftMatched ||
        (left.distanceFromStartMeters ?? Number.POSITIVE_INFINITY) -
          (right.distanceFromStartMeters ?? Number.POSITIVE_INFINITY) ||
        right.rating - left.rating
      );
    })
    .slice(0, 18);

  return {
    venues,
    packLabel: pack.pack.label,
    landmarkName: pack.pack.anchorLabel,
    radiusMeters: pack.pack.activationRadiusMeters,
    note: `公共地图服务不可用时，已切换到 ${pack.pack.label} 本地精选包，共 ${venues.length} 个候选点。`,
  };
}

export function findNearestOfflineLandmark(origin: Coordinates) {
  const pack = resolveNearestPack(origin);
  if (!pack || pack.distanceMeters > pack.pack.activationRadiusMeters) {
    return null;
  }

  const nearestVenue = pack.pack.venues
    .map((venue) => ({
      venue,
      distanceMeters: distanceMeters(origin, {
        latitude: venue.latitude,
        longitude: venue.longitude,
      }),
    }))
    .sort((left, right) => left.distanceMeters - right.distanceMeters)[0];

  if (pack.distanceMeters <= 1400) {
    return {
      label: pack.pack.anchorLabel,
      detail: pack.pack.anchorAddress,
    };
  }

  if (!nearestVenue) {
    return {
      label: pack.pack.label,
      detail: `${pack.pack.label} 本地精选范围内`,
    };
  }

  return {
    label: nearestVenue.venue.name,
    detail: nearestVenue.venue.address,
  };
}

function resolveNearestPack(origin: Coordinates) {
  const rankedPacks = fallbackPacks
    .map((pack) => ({
      pack,
      distanceMeters: distanceMeters(origin, pack.center),
    }))
    .sort((left, right) => left.distanceMeters - right.distanceMeters);

  return rankedPacks[0] ?? null;
}

function distanceMeters(start: Coordinates, end: Coordinates) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(end.latitude - start.latitude);
  const deltaLon = toRadians(end.longitude - start.longitude);
  const startLat = toRadians(start.latitude);
  const endLat = toRadians(end.latitude);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a)) * 1000;
}
