import { scoreVenueSearchTerms } from "./intent";
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

type LocalVenueSeed = Omit<Venue, "cluster" | "sourceType" | "sourceLabel">;

const localSourceLabel = "Wander local expanded pack";
const localTag = "本地扩展包";

function localVenue(seed: LocalVenueSeed): Venue {
  return {
    ...seed,
    cluster: "live",
    sourceType: "curated",
    sourceLabel: localSourceLabel,
  };
}

const taicangCampusPack: FallbackPack = {
  id: "taicang-campus-core",
  label: "太仓·西浦校园周边",
  anchorLabel: "西浦创业家学院（太仓）",
  anchorAddress: "太仓大道 111 号",
  center: {
    latitude: 31.5052,
    longitude: 121.1433,
  },
  activationRadiusMeters: 18000,
  venues: [
    localVenue({
      id: "taicang-spice-kitchen",
      name: "川流火锅小馆",
      area: "西浦南侧生活带",
      address: "太仓大道 111 号南侧街区",
      latitude: 31.5059,
      longitude: 121.1431,
      categories: ["sichuan", "food"],
      duration: 58,
      outdoor: false,
      rating: 4.7,
      hours: "11:00-21:00",
      crowd: "课后 18:00 前后最稳，翻台也比较快。",
      summary: "离校园很近，适合作为下课后或下班后的第一站，不需要额外绕路。",
      tags: ["课后出发", "火锅", "川味补能量", localTag],
      demoCanClose: true,
      ugc: {
        author: "@太仓试走组",
        verified: "近 7 天到访",
        title: "从教学楼出来直接过去很顺，吃完还能接着散步。",
        stay: "建议停留 45-60 分钟",
        tip: "如果时间紧，优先点主食和一份小菜，整体收得更快。",
      },
    }),
    localVenue({
      id: "taicang-maker-walk",
      name: "创客邦步道",
      area: "科教新城",
      address: "文渊路步行带中段",
      latitude: 31.5071,
      longitude: 121.1456,
      categories: ["walk", "park"],
      duration: 28,
      outdoor: true,
      rating: 4.5,
      hours: "全天开放",
      crowd: "傍晚风感最好，走 20 多分钟就够舒服。",
      summary: "适合饭后轻量散步，节奏不会太重，也很适合碎片时间。",
      tags: ["轻步行", "低门槛放松", localTag],
      ugc: {
        author: "@校园短线",
        verified: "近 14 天试走",
        title: "十几分钟就能切换状态，很适合课后短空档。",
        stay: "建议停留 20-30 分钟",
        tip: "如果后面还想补给，这里别走太久，留一点时间给尾站。",
      },
    }),
    localVenue({
      id: "taicang-neighborhood-center",
      name: "科教新城邻里中心",
      area: "科教新城",
      address: "文治路 88 号",
      latitude: 31.5038,
      longitude: 121.1487,
      categories: ["grocery", "market"],
      duration: 20,
      outdoor: false,
      rating: 4.5,
      hours: "09:00-21:30",
      crowd: "晚间补给也稳，拿完就能直接回程。",
      summary: "很适合作为回程前补给站，把买东西这件事顺手做掉。",
      tags: ["顺路补货", "回程友好", localTag],
      ugc: {
        author: "@本地轻路线",
        verified: "近 10 天到访",
        title: "不用专门跑一趟，路线尾声顺手买完就能回去。",
        stay: "建议停留 10-20 分钟",
        tip: "先想好清单，进去直拿会更省时间。",
      },
    }),
    localVenue({
      id: "taicang-yueye-books",
      name: "阅野书房",
      area: "科教新城",
      address: "文治路 126 号二层",
      latitude: 31.5019,
      longitude: 121.1462,
      categories: ["bookstore", "cafe"],
      duration: 45,
      outdoor: false,
      rating: 4.7,
      hours: "10:00-21:00",
      crowd: "工作日傍晚人不多，适合安静坐一下。",
      summary: "下雨或者不想走太多时，这里很适合作为慢节奏替代。",
      tags: ["书店咖啡", "室内稳妥", localTag],
      ugc: {
        author: "@课后散策",
        verified: "近 12 天到访",
        title: "可以坐一会，也可以只翻几本书，不会有打卡压力。",
        stay: "建议停留 35-50 分钟",
        tip: "如果后面还想去湖边，这里放在第二站最平衡。",
      },
    }),
    localVenue({
      id: "taicang-lakebox-gallery",
      name: "湖边小展厅",
      area: "天镜湖片区",
      address: "文景路 18 号艺术盒子",
      latitude: 31.4998,
      longitude: 121.1498,
      categories: ["gallery"],
      duration: 48,
      outdoor: false,
      rating: 4.6,
      hours: "10:30-19:00",
      crowd: "周末下午略热闹，平日傍晚更从容。",
      summary: "当天气不适合散步时，这里可以稳稳接住整条路线。",
      tags: ["室内替代", "轻展览", localTag],
      ugc: {
        author: "@太仓样机组",
        verified: "近 9 天到访",
        title: "体量不大，但很适合塞进两三个小时的路线里。",
        stay: "建议停留 35-50 分钟",
        tip: "时间不多时直接看主展厅，节奏会更干净。",
      },
    }),
    localVenue({
      id: "taicang-tianjing-east-loop",
      name: "天镜湖慢行环",
      area: "天镜湖",
      address: "文景路天镜湖东入口",
      latitude: 31.4978,
      longitude: 121.1514,
      categories: ["park", "walk", "riverside"],
      duration: 36,
      outdoor: true,
      rating: 4.8,
      hours: "全天开放",
      crowd: "黄昏最舒服，风景感和松弛感都比较完整。",
      summary: "很适合把课后或下班后的情绪切换做完整，又不会太远。",
      tags: ["湖边散步", "放空", localTag],
      ugc: {
        author: "@傍晚出去走走",
        verified: "近 6 天到访",
        title: "走半圈就已经很够了，不需要把自己走累。",
        stay: "建议停留 25-40 分钟",
        tip: "如果风大就别走太久，转去室内点会更舒服。",
      },
    }),
    localVenue({
      id: "taicang-southgate-lab",
      name: "南门咖啡实验室",
      area: "校园南门",
      address: "太仓大道 111 号南门生活街",
      latitude: 31.5044,
      longitude: 121.1412,
      categories: ["cafe", "dessert"],
      duration: 32,
      outdoor: false,
      rating: 4.6,
      hours: "09:30-21:30",
      crowd: "下午和晚饭后都适合，停留压力不大。",
      summary: "适合作为路线开头的缓冲站，也适合收尾时坐一会。",
      tags: ["短坐", "甜口补给", localTag],
      ugc: {
        author: "@碎片时间局",
        verified: "近 8 天到访",
        title: "不用久待也成立，很适合 20 分钟的快速恢复。",
        stay: "建议停留 20-35 分钟",
        tip: "如果后面还有晚饭，这里点小杯咖啡或甜点即可。",
      },
    }),
    localVenue({
      id: "taicang-lakeside-bakery",
      name: "湖畔烘焙屋",
      area: "天镜湖片区",
      address: "文景路 66 号湖畔商业街",
      latitude: 31.4989,
      longitude: 121.1504,
      categories: ["dessert", "cafe"],
      duration: 25,
      outdoor: false,
      rating: 4.5,
      hours: "10:00-21:00",
      crowd: "傍晚外带最快，适合做甜点尾站。",
      summary: "适合作为散步后的甜点尾站，不用额外再拐远。",
      tags: ["甜品收尾", "可外带", localTag],
      ugc: {
        author: "@太仓晚间线",
        verified: "近 11 天到访",
        title: "和湖边路线衔接得很自然，结束感比较完整。",
        stay: "建议停留 15-25 分钟",
        tip: "如果想快一点，直接外带面包和饮品就好。",
      },
    }),
    localVenue({
      id: "taicang-campus-mini-mart",
      name: "校园便利补给站",
      area: "西浦北侧",
      address: "太仓大道 111 号学习街区一层",
      latitude: 31.5065,
      longitude: 121.1405,
      categories: ["grocery", "market"],
      duration: 15,
      outdoor: false,
      rating: 4.4,
      hours: "08:00-22:00",
      crowd: "全天都比较稳，适合快速拿完就走。",
      summary: "如果时间特别碎，这里可以充当最轻量的补给尾站。",
      tags: ["极速补给", "离校园近", localTag],
      ugc: {
        author: "@下课就走",
        verified: "近 5 天到访",
        title: "买完就能回去，不会让路线变得拖沓。",
        stay: "建议停留 8-15 分钟",
        tip: "把它留到最后一站，执行成本最低。",
      },
    }),
  ],
};

const taicangLakesidePack: FallbackPack = {
  id: "taicang-lakeside-extension",
  label: "太仓·天镜湖扩展",
  anchorLabel: "天镜湖生活带",
  anchorAddress: "文景路与文治路周边",
  center: {
    latitude: 31.4994,
    longitude: 121.1518,
  },
  activationRadiusMeters: 18000,
  venues: [
    localVenue({
      id: "taicang-evening-sichuan",
      name: "晚风铜炉火锅",
      area: "文治路口",
      address: "文治路 166 号",
      latitude: 31.5016,
      longitude: 121.1479,
      categories: ["sichuan", "food"],
      duration: 62,
      outdoor: false,
      rating: 4.6,
      hours: "11:00-21:30",
      crowd: "晚饭时段稳定，适合先吃再走。",
      summary: "如果你说想吃点带情绪强度的东西，这里比普通简餐更对味。",
      tags: ["晚饭优先", "火锅", "川味", localTag],
      demoCanClose: true,
      ugc: {
        author: "@湖边试路",
        verified: "近 9 天到访",
        title: "离湖边不远，吃完接散步很顺。",
        stay: "建议停留 50-65 分钟",
        tip: "如果后面还要走路，别点太满，保留一点节奏会更舒服。",
      },
    }),
    localVenue({
      id: "taicang-wenyuan-noodles",
      name: "文渊夜面档",
      area: "文渊路",
      address: "文渊路 58 号",
      latitude: 31.5028,
      longitude: 121.1495,
      categories: ["food"],
      duration: 38,
      outdoor: false,
      rating: 4.4,
      hours: "17:00-23:00",
      crowd: "傍晚到晚间都好操作，适合轻量吃一顿。",
      summary: "适合时间不太长、只想快速吃点热食再继续路线的时候。",
      tags: ["热食", "快节奏", localTag],
      ugc: {
        author: "@快出门局",
        verified: "近 6 天到访",
        title: "不需要久坐，很适合两小时内的路线。",
        stay: "建议停留 25-40 分钟",
        tip: "如果后面还想喝咖啡，这一站就尽量简洁一点。",
      },
    }),
    localVenue({
      id: "taicang-science-pocket-park",
      name: "科教新城口袋公园",
      area: "科教新城",
      address: "文景路 102 号旁绿地",
      latitude: 31.5036,
      longitude: 121.1518,
      categories: ["park", "walk"],
      duration: 24,
      outdoor: true,
      rating: 4.4,
      hours: "全天开放",
      crowd: "适合饭后轻走，不需要专门去一个大公园。",
      summary: "属于那种很好塞进路线里的小停留，几分钟就能切换状态。",
      tags: ["口袋绿地", "轻散步", localTag],
      ugc: {
        author: "@碎片散步",
        verified: "近 4 天到访",
        title: "不是目的地型公园，但很适合塞在路线中段。",
        stay: "建议停留 15-25 分钟",
        tip: "风大时缩短一点，保留体力给下一站。",
      },
    }),
    localVenue({
      id: "taicang-culture-box",
      name: "天镜文化盒子",
      area: "天镜湖片区",
      address: "文景路 128 号",
      latitude: 31.4992,
      longitude: 121.1532,
      categories: ["gallery", "bookstore"],
      duration: 46,
      outdoor: false,
      rating: 4.7,
      hours: "10:00-20:00",
      crowd: "工作日晚间更安静，适合慢一点的路线。",
      summary: "当你想看展或找一个更安静的室内点，这里会比纯商场更贴题。",
      tags: ["文化空间", "雨天友好", localTag],
      ugc: {
        author: "@慢节奏路线",
        verified: "近 7 天到访",
        title: "书和展混在一起，停留感会比普通商铺更完整。",
        stay: "建议停留 35-50 分钟",
        tip: "如果只剩两小时，挑一个主区域看就够了。",
      },
    }),
    localVenue({
      id: "taicang-fresh-hub",
      name: "文景鲜活市集",
      area: "湖畔商业街",
      address: "文景路 138 号",
      latitude: 31.5007,
      longitude: 121.1538,
      categories: ["market", "grocery"],
      duration: 18,
      outdoor: false,
      rating: 4.5,
      hours: "09:00-22:00",
      crowd: "补货效率很高，适合作为最后一站。",
      summary: "如果你的主题里带着顺路补货，这里比单一便利店更有选择。",
      tags: ["生活补货", "回程友好", localTag],
      ugc: {
        author: "@回家前买一点",
        verified: "近 5 天到访",
        title: "买明天早餐和零食都很方便，不会破坏路线节奏。",
        stay: "建议停留 10-18 分钟",
        tip: "走之前列清单，会更像一条成熟路线而不是临时乱逛。",
      },
    }),
    localVenue({
      id: "taicang-waterfront-cafe",
      name: "临水咖啡台",
      area: "天镜湖东侧",
      address: "文景路 176 号",
      latitude: 31.4971,
      longitude: 121.1549,
      categories: ["cafe"],
      duration: 35,
      outdoor: false,
      rating: 4.6,
      hours: "10:00-21:30",
      crowd: "黄昏窗边最舒服，适合路线中段缓一下。",
      summary: "如果你说想坐一会儿、放松一点，这类点会比纯打卡店更合适。",
      tags: ["咖啡缓冲", "安静", localTag],
      ugc: {
        author: "@放学后坐一会",
        verified: "近 8 天到访",
        title: "不需要待太久，但很适合把状态往下放一格。",
        stay: "建议停留 25-35 分钟",
        tip: "如果后面还有甜品站，这里就以饮品为主。",
      },
    }),
    localVenue({
      id: "taicang-lakefront-dessert",
      name: "湖前甜点吧",
      area: "天镜湖东侧",
      address: "文景路 188 号",
      latitude: 31.4968,
      longitude: 121.1534,
      categories: ["dessert"],
      duration: 22,
      outdoor: false,
      rating: 4.5,
      hours: "11:00-22:00",
      crowd: "晚间外带效率很高，适合作为结尾。",
      summary: "很适合做路线尾声的一小个句号，不会把执行成本拉高。",
      tags: ["甜品尾站", "可快进", localTag],
      ugc: {
        author: "@吃完就回",
        verified: "近 6 天到访",
        title: "不用久坐，买完走到湖边再吃也成立。",
        stay: "建议停留 10-20 分钟",
        tip: "如果时间卡得很紧，直接外带更顺。",
      },
    }),
    localVenue({
      id: "taicang-reading-terrace",
      name: "湖景阅读台",
      area: "天镜湖片区",
      address: "文景路 156 号二层",
      latitude: 31.4984,
      longitude: 121.1527,
      categories: ["bookstore", "cafe"],
      duration: 42,
      outdoor: false,
      rating: 4.6,
      hours: "10:00-20:30",
      crowd: "工作日晚间更适合一个人待会儿。",
      summary: "书店和小坐结合得很自然，适合做安静路线的核心站点。",
      tags: ["阅读", "慢节奏", localTag],
      ugc: {
        author: "@周中回血",
        verified: "近 9 天到访",
        title: "不是那种必须久待的店，但 30 分钟也能成立。",
        stay: "建议停留 30-45 分钟",
        tip: "如果后面还想散步，这里放在前半段会比较平衡。",
      },
    }),
    localVenue({
      id: "taicang-canal-boardwalk",
      name: "湖东滨水步道",
      area: "湖东水岸",
      address: "文景路沿湖慢行带",
      latitude: 31.4964,
      longitude: 121.1557,
      categories: ["riverside", "walk"],
      duration: 30,
      outdoor: true,
      rating: 4.7,
      hours: "全天开放",
      crowd: "傍晚和晚饭后最适合，路线氛围感会明显提升。",
      summary: "如果你明确说想走走、想看看水边，这一类点会比普通道路更贴合。",
      tags: ["滨水散步", "氛围感", localTag],
      ugc: {
        author: "@今晚想出去走走",
        verified: "近 5 天到访",
        title: "不是特别长，但就这段已经足够有“出来了”的感觉。",
        stay: "建议停留 20-30 分钟",
        tip: "雨天就换成附近室内点，不用硬走。",
      },
    }),
    localVenue({
      id: "taicang-weekend-market",
      name: "天镜周末市集带",
      area: "湖畔商业街",
      address: "文景路 146 号",
      latitude: 31.5021,
      longitude: 121.1524,
      categories: ["market", "food"],
      duration: 26,
      outdoor: false,
      rating: 4.3,
      hours: "10:00-21:30",
      crowd: "周末更热闹，平日则适合快速看看再走。",
      summary: "当你想找一点生活感和轻量吃喝，这里能给路线增加层次。",
      tags: ["市集感", "轻逛", localTag],
      ugc: {
        author: "@周末补能量",
        verified: "近 11 天到访",
        title: "不一定是主站，但很适合给路线加一点生活味。",
        stay: "建议停留 15-25 分钟",
        tip: "如果总时长不长，把它当成可选替补更稳。",
      },
    }),
    localVenue({
      id: "taicang-lake-green-lawn",
      name: "湖边草坡停留点",
      area: "天镜湖南侧",
      address: "文景路南侧草地入口",
      latitude: 31.4975,
      longitude: 121.1492,
      categories: ["park", "walk"],
      duration: 22,
      outdoor: true,
      rating: 4.4,
      hours: "全天开放",
      crowd: "适合短暂停一下，不需要完整走一圈湖。",
      summary: "很适合碎片时间，只停 15 到 20 分钟也能成立。",
      tags: ["轻停留", "草坡", localTag],
      ugc: {
        author: "@想透口气",
        verified: "近 4 天到访",
        title: "不像景点，更像一个让路线呼吸一下的地方。",
        stay: "建议停留 12-22 分钟",
        tip: "如果风大或太晒，就缩短停留，留给下一站。",
      },
    }),
  ],
};

const taicangUrbanPack: FallbackPack = {
  id: "taicang-urban-core",
  label: "太仓市区总包",
  anchorLabel: "太仓市区生活核心带",
  anchorAddress: "城厢镇人民路与上海路周边",
  center: {
    latitude: 31.4552,
    longitude: 121.1112,
  },
  activationRadiusMeters: 26000,
  venues: [
    localVenue({
      id: "taicang-urban-sichuan-bistro",
      name: "城厢铜炉火锅",
      area: "人民路商圈",
      address: "人民路 218 号",
      latitude: 31.4548,
      longitude: 121.1071,
      categories: ["sichuan", "food"],
      duration: 60,
      outdoor: false,
      rating: 4.7,
      hours: "11:00-21:30",
      crowd: "晚饭时段稳定，适合下班后直接切进去。",
      summary: "如果你说想吃点更有记忆点的正餐，这类城市核心点会比校园周边选择更多。",
      tags: ["市区正餐", "火锅", "川味", localTag],
      demoCanClose: true,
      ugc: {
        author: "@太仓晚饭局",
        verified: "近 8 天到访",
        title: "味型更完整，吃完去公园或河边都比较顺。",
        stay: "建议停留 45-60 分钟",
        tip: "如果后面还要走路，点菜不要太满，保留一点机动性更舒服。",
      },
    }),
    localVenue({
      id: "taicang-urban-night-kitchen",
      name: "人民路夜食堂",
      area: "市中心",
      address: "人民路 156 号",
      latitude: 31.4515,
      longitude: 121.1099,
      categories: ["food"],
      duration: 36,
      outdoor: false,
      rating: 4.5,
      hours: "17:00-23:00",
      crowd: "适合两小时到三小时预算的轻量晚饭站。",
      summary: "当你只想快速吃点热食再继续走，这种站点会比完整餐厅更高效。",
      tags: ["快节奏", "热食", localTag],
      ugc: {
        author: "@今晚别太复杂",
        verified: "近 6 天到访",
        title: "不需要久坐，适合短时间路线。",
        stay: "建议停留 25-35 分钟",
        tip: "如果后面还有咖啡或甜品，这一站就尽量简洁一点。",
      },
    }),
    localVenue({
      id: "taicang-urban-zhenghe-park",
      name: "郑和公园慢走环",
      area: "郑和路",
      address: "郑和中路公园东入口",
      latitude: 31.4567,
      longitude: 121.1064,
      categories: ["park", "walk"],
      duration: 30,
      outdoor: true,
      rating: 4.6,
      hours: "全天开放",
      crowd: "傍晚最舒服，适合饭后缓一缓。",
      summary: "如果你想在市区里也有一个不费脑子的散步站，这里很适合塞进路线。",
      tags: ["市区散步", "轻松", localTag],
      ugc: {
        author: "@下班后出去走走",
        verified: "近 5 天到访",
        title: "不是目的地型公园，但对碎片时间很友好。",
        stay: "建议停留 20-30 分钟",
        tip: "如果天气一般，走核心一段就够了，不用追求完整绕圈。",
      },
    }),
    localVenue({
      id: "taicang-urban-dongcang-riverside",
      name: "东仓河滨水步道",
      area: "东仓路沿线",
      address: "东仓路滨水慢行带",
      latitude: 31.4589,
      longitude: 121.1135,
      categories: ["riverside", "walk"],
      duration: 32,
      outdoor: true,
      rating: 4.7,
      hours: "全天开放",
      crowd: "夜里灯光和水边反射感更完整。",
      summary: "如果主题里带着水边走走，这类点会比普通街道更有完成感。",
      tags: ["滨水", "氛围感", localTag],
      ugc: {
        author: "@河边晚风",
        verified: "近 7 天到访",
        title: "不需要走很久，走一小段就已经有出来放风的感觉。",
        stay: "建议停留 20-30 分钟",
        tip: "下雨天就不要硬走，切到附近室内站点会更稳。",
      },
    }),
    localVenue({
      id: "taicang-urban-nanyuan-books",
      name: "南园书社",
      area: "上海东路",
      address: "上海东路 268 号二层",
      latitude: 31.4523,
      longitude: 121.1118,
      categories: ["bookstore", "cafe"],
      duration: 44,
      outdoor: false,
      rating: 4.7,
      hours: "10:00-21:00",
      crowd: "工作日晚间更安静，适合一个人待一会。",
      summary: "适合想安静一点、想看书或者喝杯咖啡再继续路线的时候。",
      tags: ["阅读", "咖啡", localTag],
      ugc: {
        author: "@一个人的晚间路线",
        verified: "近 9 天到访",
        title: "不是纯打卡店，30 到 40 分钟也能待得很舒服。",
        stay: "建议停留 30-45 分钟",
        tip: "如果总时间不长，把它放在第二站通常最平衡。",
      },
    }),
    localVenue({
      id: "taicang-urban-museum-hall",
      name: "太仓城市展厅",
      area: "县府东街",
      address: "县府东街 88 号",
      latitude: 31.4597,
      longitude: 121.1161,
      categories: ["gallery"],
      duration: 50,
      outdoor: false,
      rating: 4.6,
      hours: "09:30-20:00",
      crowd: "雨天和夏天都更稳，适合作为室内替换站。",
      summary: "如果你想看展或想找一个不会太吵的室内段，这里会比普通商场更贴题。",
      tags: ["展览", "室内", localTag],
      ugc: {
        author: "@城市漫游样机",
        verified: "近 10 天到访",
        title: "体量刚好，不会把一条晚间路线拖得太重。",
        stay: "建议停留 35-50 分钟",
        tip: "如果还想留时间散步，优先看主展区就够了。",
      },
    }),
    localVenue({
      id: "taicang-urban-wanda-market",
      name: "万达邻里精选",
      area: "上海西路",
      address: "上海西路 188 号 B1",
      latitude: 31.4479,
      longitude: 121.1104,
      categories: ["grocery", "market"],
      duration: 18,
      outdoor: false,
      rating: 4.5,
      hours: "09:00-22:00",
      crowd: "补货效率高，适合做尾站。",
      summary: "如果你想顺路买点明天要用的东西，这里比普通便利店更完整。",
      tags: ["顺路补货", "回程友好", localTag],
      ugc: {
        author: "@买完就回",
        verified: "近 5 天到访",
        title: "路线尾声顺手补货很方便，不会破坏整体节奏。",
        stay: "建议停留 10-18 分钟",
        tip: "提前想好清单，进去直拿会更像一条成熟路线。",
      },
    }),
    localVenue({
      id: "taicang-urban-haiyundi-cafe",
      name: "海运堤咖啡码头",
      area: "海运堤",
      address: "海运堤路 52 号",
      latitude: 31.4608,
      longitude: 121.1184,
      categories: ["cafe"],
      duration: 34,
      outdoor: false,
      rating: 4.6,
      hours: "10:00-22:00",
      crowd: "傍晚窗边最好，适合路线中段稍微坐一会。",
      summary: "如果你只是想恢复一下状态，而不是专门长时间坐店，这里很合适。",
      tags: ["短坐", "恢复状态", localTag],
      ugc: {
        author: "@晚风咖啡",
        verified: "近 6 天到访",
        title: "不用待太久就能成立，很适合下班后切一段节奏。",
        stay: "建议停留 20-35 分钟",
        tip: "如果后面还有甜品站，这里就以饮品为主。",
      },
    }),
    localVenue({
      id: "taicang-urban-haiyundi-dessert",
      name: "海运堤甜点铺",
      area: "海运堤",
      address: "海运堤路 68 号",
      latitude: 31.4614,
      longitude: 121.1191,
      categories: ["dessert", "cafe"],
      duration: 24,
      outdoor: false,
      rating: 4.5,
      hours: "11:00-22:00",
      crowd: "作为结束站很轻，不需要专门久坐。",
      summary: "适合给整条路线一个小句号，尤其是在晚饭或散步之后。",
      tags: ["甜品收尾", "可外带", localTag],
      ugc: {
        author: "@路线句号",
        verified: "近 8 天到访",
        title: "不是重目的地，但收尾感很完整。",
        stay: "建议停留 12-24 分钟",
        tip: "如果时间很卡，外带会比坐下更顺。",
      },
    }),
    localVenue({
      id: "taicang-urban-pocket-green",
      name: "古松弄口袋绿地",
      area: "古松弄",
      address: "古松弄 31 号旁",
      latitude: 31.4507,
      longitude: 121.1052,
      categories: ["park", "walk"],
      duration: 20,
      outdoor: true,
      rating: 4.3,
      hours: "全天开放",
      crowd: "适合短暂停一下，不需要完整走很久。",
      summary: "很适合两小时以内的路线，停 10 到 15 分钟也不会显得勉强。",
      tags: ["口袋公园", "碎片时间", localTag],
      ugc: {
        author: "@就想透口气",
        verified: "近 4 天到访",
        title: "很轻，但正因为轻才适合平日晚间。",
        stay: "建议停留 10-20 分钟",
        tip: "天气一般时快速经过就好，留时间给后面的室内点。",
      },
    }),
    localVenue({
      id: "taicang-urban-weekend-market",
      name: "南洋生活市集",
      area: "南洋广场",
      address: "南洋广场 1 号楼一层",
      latitude: 31.4531,
      longitude: 121.1147,
      categories: ["market", "food"],
      duration: 26,
      outdoor: false,
      rating: 4.4,
      hours: "10:00-21:30",
      crowd: "周末更热闹，平日适合轻逛一圈。",
      summary: "如果你想加一点生活感和随手吃点东西，这类站点会让路线更有层次。",
      tags: ["轻逛", "生活感", localTag],
      ugc: {
        author: "@周末城市线",
        verified: "近 7 天到访",
        title: "不一定要久待，但很适合作为中段的过渡站。",
        stay: "建议停留 15-25 分钟",
        tip: "时间不多时，把它当成替补站点会更稳。",
      },
    }),
    localVenue({
      id: "taicang-urban-night-convenience",
      name: "城厢夜归补给站",
      area: "城厢镇",
      address: "新华东路 96 号",
      latitude: 31.4556,
      longitude: 121.1029,
      categories: ["grocery"],
      duration: 12,
      outdoor: false,
      rating: 4.3,
      hours: "08:00-23:00",
      crowd: "拿完就走最方便，适合最后一站。",
      summary: "如果你的路线只剩一点预算时间，这类站点能把补给动作压得很轻。",
      tags: ["快速补给", "临走前", localTag],
      ugc: {
        author: "@最后一站刚刚好",
        verified: "近 3 天到访",
        title: "执行成本非常低，买完就能直接回去。",
        stay: "建议停留 8-12 分钟",
        tip: "把它留在最后，整条路线会更干净。",
      },
    }),
    localVenue({
      id: "taicang-urban-art-reading-room",
      name: "城中艺术阅览室",
      area: "东亭路",
      address: "东亭路 120 号三层",
      latitude: 31.4571,
      longitude: 121.1152,
      categories: ["gallery", "bookstore"],
      duration: 42,
      outdoor: false,
      rating: 4.6,
      hours: "10:00-20:30",
      crowd: "适合慢一点的路线，也适合作为雨天替换段。",
      summary: "书和展混在一起的点位，对“想安静一点”的输入会更贴合。",
      tags: ["安静", "看展", localTag],
      ugc: {
        author: "@城市慢路线",
        verified: "近 9 天到访",
        title: "比单一书店更有停留感，但也不会太重。",
        stay: "建议停留 30-45 分钟",
        tip: "如果后面还想去河边，这里放在前半段比较舒服。",
      },
    }),
  ],
};

const fallbackPacks = [taicangCampusPack, taicangLakesidePack, taicangUrbanPack];

export function buildLocalFallbackVenuePool(
  origin: Coordinates,
  requestedCategories: CategoryId[],
  searchTerms: string[] = []
): LocalFallbackResult | null {
  const selectedPacks = resolveRelevantPacks(origin);
  if (!selectedPacks.length) {
    return null;
  }

  const primaryPack = selectedPacks[0];
  const requestedCategorySet = new Set(requestedCategories);
  const mergedVenues = dedupeVenues(selectedPacks.flatMap((item) => item.pack.venues));

  const venues = mergedVenues
    .map((venue) => {
      const distanceFromStartMeters = distanceMeters(origin, {
        latitude: venue.latitude,
        longitude: venue.longitude,
      });
      const matchedCategoryCount = venue.categories.filter((category) =>
        requestedCategorySet.has(category)
      ).length;
      const localTags = venue.tags.includes(localTag) ? venue.tags : [...venue.tags, localTag];

      return {
        ...venue,
        distanceFromStartMeters,
        keywordMatchScore: scoreVenueSearchTerms(venue, searchTerms),
        tags: localTags,
        rating: Number(
          (
            venue.rating +
            matchedCategoryCount * 0.15 +
            Math.max(0, 0.18 - distanceFromStartMeters / 18000)
          ).toFixed(1)
        ),
        summary:
          matchedCategoryCount > 0
            ? `${venue.summary} 这站和你当前主题的匹配度更高。`
            : venue.summary,
      };
    })
    .sort((left, right) => {
      const keywordDelta = right.keywordMatchScore - left.keywordMatchScore;
      const leftMatched = left.categories.filter((category) => requestedCategorySet.has(category)).length;
      const rightMatched = right.categories.filter((category) => requestedCategorySet.has(category)).length;

      return (
        keywordDelta ||
        rightMatched - leftMatched ||
        (left.distanceFromStartMeters ?? Number.POSITIVE_INFINITY) -
          (right.distanceFromStartMeters ?? Number.POSITIVE_INFINITY) ||
        right.rating - left.rating
      );
    })
    .map(({ keywordMatchScore: _keywordMatchScore, ...venue }) => venue)
    .slice(0, 36);

  return {
    venues,
    packLabel: selectedPacks.map((item) => item.pack.label).join(" + "),
    landmarkName: primaryPack.pack.anchorLabel,
    radiusMeters: Math.max(...selectedPacks.map((item) => item.pack.activationRadiusMeters)),
    note: `公共地图服务不可用时，已切到太仓本地扩展包，当前合并 ${selectedPacks.length} 个本地包，共 ${venues.length} 个候选点。`,
  };
}

export function findNearestOfflineLandmark(origin: Coordinates) {
  const selectedPacks = resolveRelevantPacks(origin);
  if (!selectedPacks.length) {
    return null;
  }

  const primaryPack = selectedPacks[0];
  const nearestVenue = dedupeVenues(selectedPacks.flatMap((item) => item.pack.venues))
    .map((venue) => ({
      venue,
      distanceMeters: distanceMeters(origin, {
        latitude: venue.latitude,
        longitude: venue.longitude,
      }),
    }))
    .sort((left, right) => left.distanceMeters - right.distanceMeters)[0];

  if (primaryPack.distanceMeters <= 1400) {
    return {
      label: primaryPack.pack.anchorLabel,
      detail: primaryPack.pack.anchorAddress,
    };
  }

  if (!nearestVenue) {
    return {
      label: primaryPack.pack.label,
      detail: `${primaryPack.pack.label} 本地扩展范围内`,
    };
  }

  return {
    label: nearestVenue.venue.name,
    detail: nearestVenue.venue.address,
  };
}

function resolveRelevantPacks(origin: Coordinates) {
  const rankedPacks = fallbackPacks
    .map((pack) => ({
      pack,
      distanceMeters: distanceMeters(origin, pack.center),
    }))
    .sort((left, right) => left.distanceMeters - right.distanceMeters);

  const primaryPack = rankedPacks[0];
  if (!primaryPack || primaryPack.distanceMeters > primaryPack.pack.activationRadiusMeters) {
    return [];
  }

  return rankedPacks
    .filter((item) => item.distanceMeters <= item.pack.activationRadiusMeters)
    .slice(0, 3);
}

function dedupeVenues(venues: Venue[]) {
  const seen = new Set<string>();
  const deduped: Venue[] = [];

  venues.forEach((venue) => {
    if (!seen.has(venue.id)) {
      seen.add(venue.id);
      deduped.push(venue);
    }
  });

  return deduped;
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
