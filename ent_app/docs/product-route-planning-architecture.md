# Wander 产品级路线规划技术方案

## 1. 目标

Wander 的路线规划不能依赖大语言模型直接“编路线”。真实产品里，LLM 应该负责理解用户自然语言，地图数据和确定性算法负责选择真实地点、计算路线、控制时间和排序结果。

核心目标：

- 快速：常见请求 2-5 秒内返回可执行路线。
- 准确：用户明确提出的需求必须被满足，例如“火锅”必须命中火锅类 POI。
- 真实：所有地点来自地图/商户数据源，并带有可验证地址、坐标、评分、价格等信息。
- 可解释：系统知道每条路线为什么被选中，也知道哪些需求没有被满足。
- 可扩展：未来可以接入高德、腾讯地图、点评/美团、自有 UGC 和个性化画像。

## 2. 总体架构

推荐架构：

```txt
User Input
  -> Intent Parser
  -> POI Retriever
  -> Constraint Validator
  -> Route Composer
  -> Route Ranker
  -> Narrative Generator
  -> Frontend Route UI
```

LLM 只参与两件事：

- 把用户自然语言转成结构化意图。
- 在路线已经确定后，生成标题和简短描述。

LLM 不直接决定最终地点，也不直接输出不可验证路线。

## 3. 输入数据

前端提交给后端的核心字段：

```ts
{
  prompt: string;
  start: {
    latitude: number;
    longitude: number;
    label: string;
    source: "gps" | "map_pick" | "search";
  };
  timeBudgetMinutes: number;
  language: "zh" | "en";
  userContext?: {
    homeArea?: string;
    workArea?: string;
    schoolArea?: string;
    preferences?: string[];
  };
}
```

其中 `start.source` 很重要。搜索选点或地图手动选点的可信度高于浏览器 GPS 粗定位。

## 4. 意图解析

### 4.1 快速规则解析

先用本地规则识别高频需求，避免每次都调用 LLM。

例子：

```txt
火锅 -> category: hotpot, requiredTerms: ["火锅", "涮锅", "牛肉锅"]
电影 -> category: cinema, requiredTerms: ["影院", "影城", "电影"]
公园 -> category: park, requiredTerms: ["公园", "绿地", "步道"]
咖啡 -> category: cafe, requiredTerms: ["咖啡", "coffee"]
超市 -> category: grocery, requiredTerms: ["超市", "生鲜", "便利店"]
```

如果规则置信度足够高，直接进入 POI 检索。

### 4.2 LLM 兜底解析

复杂需求再调用千问，例如：

```txt
下班后想找个不太吵的地方坐坐，顺便吃点热乎的，最后买点明天早餐
```

LLM 输出固定 JSON：

```ts
{
  mustHave: [
    {
      category: "food",
      requiredTerms: ["热食", "简餐", "面", "汤"],
      durationMinutes: 60
    }
  ],
  niceToHave: [
    {
      category: "quiet_place",
      requiredTerms: ["咖啡", "书店", "茶馆"],
      durationMinutes: 60
    }
  ],
  avoid: ["too_far", "too_crowded"],
  sequence: ["quiet_place", "food", "grocery"],
  routeStyles: ["efficient", "balanced", "explore"]
}
```

关键原则：LLM 输出的是“搜索意图”，不是最终店铺。

## 5. POI 检索

每个需求节点独立检索 POI。

检索策略：

- 并发搜索所有 category。
- 先搜起点附近，再逐步扩大半径。
- 使用地图 POI 类型、名称、标签、地址共同判断。
- 对高频关键词做缓存，例如“火锅”“电影院”“公园”。

推荐半径策略：

```txt
<= 2 小时：2-4 km
2-4 小时：4-8 km
4-8 小时：8-15 km
8 小时以上：15-25 km
```

缓存策略：

```txt
cache key = city/adcode + keyword + radius bucket
TTL = 10-30 minutes
```

## 6. 约束校验

这是准确性的核心。

每个 POI 必须通过两类校验：

### 6.1 硬约束

用户明确提出的内容必须满足。

例子：

- 用户说“火锅”，POI 名称、类型或标签必须包含火锅相关词。
- 用户说“电影”，必须是影院/影城类 POI。
- 用户说“公园”，必须是公园/绿地/步道/景区类 POI。

如果硬约束不满足，POI 直接丢弃。

### 6.2 软约束

用于排序，不满足不一定丢弃。

例子：

- 距离更近加分。
- 评分更高加分。
- 价格符合用户偏好加分。
- 营业状态正常加分。
- UGC 热度高加分。

## 7. 路线组合

Route Composer 负责把 POI 组合成路线。

输入：

- 起点坐标
- 每类候选 POI
- 时间预算
- 每站建议停留时长
- 用户顺序偏好

输出：

- 3 条候选路线
- 每条路线包含 2-5 个 stop
- 每条路线都在时间预算附近

组合规则：

```txt
短时间：少站点，低通勤
长时间：多站点，但限制最大站点数
用户有顺序表达：尽量保持顺序
没有顺序表达：用最短路径/最低通勤成本排序
```

推荐站点数：

```txt
<= 2h：2-3 stops
2-4h：3 stops
4-8h：3-4 stops
8h+：4-5 stops
```

## 8. 路线计算

先用直线距离粗排，再调用地图路线 API 精算。

流程：

```txt
候选 POI 组合
  -> 直线距离估算
  -> 过滤明显超时路线
  -> 对前 N 条调用地图路线 API
  -> 得到步行/骑行/打车时间
  -> 计算总时长
```

总时长计算：

```txt
totalMinutes = travelMinutes + stayMinutes + bufferMinutes
```

路线时间必须满足：

```txt
timeBudget * 0.75 <= totalMinutes <= timeBudget * 1.1
```

如果超出：

- 先减少可选 stop。
- 再缩短可调停留时间。
- 仍超出则丢弃该路线。

## 9. 排序模型

路线评分建议：

```txt
score =
  mustMatchScore * 0.35 +
  timeFitScore * 0.20 +
  travelEfficiencyScore * 0.15 +
  poiQualityScore * 0.15 +
  diversityScore * 0.10 +
  personalizationScore * 0.05
```

说明：

- `mustMatchScore`：用户明确需求是否全部命中。
- `timeFitScore`：路线总时长是否贴近预算。
- `travelEfficiencyScore`：路上时间占比越低越好。
- `poiQualityScore`：评分、人均、热度、营业状态。
- `diversityScore`：三条路线之间不能太像。
- `personalizationScore`：未来可接用户偏好。

## 10. 返回格式

推荐后端返回：

```ts
{
  requestId: string;
  status: "ok" | "partial" | "no_match";
  intent: ParsedIntent;
  routes: [
    {
      id: string;
      title: string;
      style: "efficient" | "balanced" | "explore";
      totalMinutes: number;
      confidence: number;
      unmetRequirements: string[];
      stops: [
        {
          id: string;
          name: string;
          category: string;
          address: string;
          latitude: number;
          longitude: number;
          rating?: number;
          averageCostCny?: number;
          stayMinutes: number;
          matchReasons: string[];
        }
      ];
      legs: [
        {
          fromStopId: string;
          toStopId: string;
          modeOptions: ["walking", "riding", "driving"];
          walkingMinutes: number;
          drivingMinutes?: number;
          distanceMeters: number;
          polyline: [number, number][];
        }
      ];
    }
  ];
}
```

如果找不到可靠路线，不要硬编：

```ts
{
  status: "no_match",
  unmetRequirements: ["附近没有找到可靠的火锅店"],
  suggestions: ["扩大搜索范围", "更换起点", "减少一个目的"]
}
```

## 11. 性能优化

必须做：

- 高频关键词本地规则解析。
- POI 搜索并发。
- POI 搜索缓存。
- 地图路线 API 分层调用。
- 先返回可用路线，再后台补全更优路线。

推荐目标：

```txt
P50 首条路线：2-3s
P90 首条路线：5s 内
P90 三条路线完整返回：8s 内
```

## 12. 可靠性策略

必须避免以下情况：

- 用户说火锅，结果没有火锅。
- 用户说电影，结果没有影院。
- 路线总时长严重短于或长于预算。
- POI 没有真实坐标。
- 地图路线失败但仍显示为可导航。

处理方式：

- 硬约束不满足则丢弃路线。
- 只找到 1-2 条可靠路线时，就返回 1-2 条，不强行凑 3 条。
- 明确提示未满足条件。
- 所有路线都带 confidence。

## 13. 当前项目重构建议

建议把当前 `server/planner.mjs` 拆成这些模块：

```txt
server/planning/intent-parser.mjs
server/planning/poi-retriever.mjs
server/planning/constraint-validator.mjs
server/planning/route-composer.mjs
server/planning/route-ranker.mjs
server/planning/narrative-generator.mjs
server/planning/cache.mjs
```

第一阶段先做：

- 本地关键词解析器。
- 硬约束校验。
- POI 并发搜索。
- 路线数量允许少于 3。
- 去掉不必要的二次 LLM 文案调用。

第二阶段再做：

- 缓存层。
- 首条路线流式返回。
- 用户偏好画像。
- 多地图/商户数据源融合。

## 14. 推荐落地顺序

1. 先实现本地意图解析和硬约束校验。
2. 把 POI 搜索改成并发。
3. 缩短 LLM 链路，只让 LLM 兜底。
4. 改路线返回逻辑，允许返回 1-3 条高可信路线。
5. 加缓存和性能埋点。
6. 做首条路线优先返回。

这样可以优先解决当前最痛的问题：不满足条件和生成慢。
