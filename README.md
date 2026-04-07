<<<<<<< HEAD
# Wander Prototype

这是一个为课程 brief 设计的移动端前端原型，核心目标是把“发现地点”“确认路线”“查看真实笔记”合并到一套界面里，降低城市轻出门前的准备成本。

## 当前架构

- 前端采用 `React + TypeScript + Vite`
- Node / NPM 安装在项目内的独立环境：`.conda/envs/entapp_node`
- 地图与路线演示使用开源栈：
  - `OpenStreetMap` 底图与开放数据
  - `Nominatim` 逆地理编码
  - `Overpass API` 周边 POI 搜索
  - `OSRM` 路线距离与时间估算
  - `MapLibre GL JS` 地图渲染
- 主要目录：
  - `src/App.tsx`：路由入口
  - `src/layout/AppLayout.tsx`：共享顶栏和页面外壳
  - `src/pages/`：`Planner / Routes / Library / Metrics` 四个独立页面
  - `src/components/`：路线卡片、共享路线卡片、路线地图、UGC 抽屉
  - `src/data.ts`：示例地点、共享路线、分类元数据
  - `src/engine.ts`：输入解析、路线生成、天气与闭店替换逻辑
  - `src/services/openmap.ts`：开源地图服务封装
  - `styles/main.css`：视觉系统与移动端布局

## 已覆盖的 brief 功能

- 品牌统一为 `Wander`
- 顶部导航已拆成真实页面路由：`Planner / Routes / Library / Metrics`
- 自然语言输入：识别主题关键词与时间预算
- 多站点路线生成：生成 3 条不同风格路线，并给出总时长与顺路逻辑
- Per-stop 卡片：点击站点即可查看停留建议、摘要与 tips
- 一键复用公开路线：复制共享路线后按用户当前起点和时间重新计算
- 实时 stop 调整：切换为“下雨”或“店铺关闭”时自动替换为更稳妥的室内站点或备选站点
- 开放地图实时附近地点：定位后优先显示附近建筑/地标，而不是经纬度；候选点优先来自当前位置附近的开放数据 POI
- 开源地图路线预览：在详情页里直接显示 OpenStreetMap 底图和 OSRM 路线线条

## 本地运行

先激活项目里的独立环境：

```powershell
conda activate C:\Users\Roxy\Desktop\project\ent_app\.conda\envs\entapp_node
```

然后运行：

```powershell
npm install
npm run dev
```

打包命令：

```powershell
npm run build
```

## 说明

- 当前课程 demo 默认走公共开源服务，不需要 API Key
- 公共服务可能会限流，因此课堂演示时建议提前打开一次页面，让定位和附近点先预热
- 如果未来转向正式产品，建议把 Nominatim / Overpass / OSRM 改成自部署实例

## 适合课程展示时讲的点

- 这是一个高保真交互原型，重点验证信息整合、路线相关性和决策负担下降
- UI 是移动端优先，用户可以在一条连续流程里完成输入、选路线、读卡片、处理突发变化
- 现在已经是标准工程化前端，后续可以继续接自部署地图服务、账号系统和真实 UGC 数据

git add .
git commit -m "写这次改了什么"
git push