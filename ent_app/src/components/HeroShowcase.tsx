import { getCategoryLabel, formatHours } from "../engine";
import { useWander } from "../wander-state";

const workflowSignals = [
  "GPS 起点",
  "小红书发现",
  "Amap 路线",
  "Dianping 验证",
  "实时天气",
  "营业状态",
  "到访 UGC",
];

const heroNotes = [
  "让“想出门”从授权当前位置开始，变成一个连续动作",
  "把路线解释、站点理由和替代建议同时给到用户",
  "把课程项目包装成更像真实产品的发布体验",
];

export function HeroShowcase() {
  const { activePrompt, selectedRoute, routeFit, ugcReads, adjustmentState, startPoint, timeLabel } =
    useWanderHero();
  const heroPreviewStops = selectedRoute?.stops.slice(0, 3) ?? [];

  return (
    <>
      <header className="hero surface">
        <div className="hero-copy">
          <span className="eyebrow">WANDER PRODUCT PREVIEW</span>
          <h1>让城市探索从切换三个平台，变成一句话的决定。</h1>
          <p className="hero-text">
            Wander 把灵感、路线、UGC 笔记和实时替换整合到一套移动端体验里，让用户在
            “刚好想出门”的那一刻更快进入行动。
          </p>
          <div className="hero-badges">
            <span className="stat-pill">
              路线相关性 <strong>{routeFit}</strong>
            </span>
            <span className="stat-pill">
              已读 UGC <strong>{ugcReads}</strong>
            </span>
            <span className="stat-pill">
              平台切换 <strong>0 次</strong>
            </span>
            <span className="stat-pill">
              实时替换 <strong>{adjustmentState}</strong>
            </span>
          </div>
          <div className="hero-note-list">
            {heroNotes.map((note) => (
              <article key={note}>
                <span className="note-index"></span>
                <p>{note}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="hero-card">
          <div className="hero-card-top">
            <span>Live Product Preview</span>
            <strong>{selectedRoute?.title ?? "路线预览"}</strong>
          </div>
          <div className="hero-console-shell">
            <div className="hero-console-top">
              <span className="console-dot"></span>
              <span className="console-dot"></span>
              <span className="console-dot"></span>
              <strong>Natural-language route command</strong>
            </div>
            <div className="hero-command-card">
              <span className="mini-label">Input</span>
              <p>{activePrompt}</p>
              <div className="hero-command-meta">
                <span className="meta-pill">GPS 起点 {startPoint}</span>
                <span className="meta-pill">时间预算 {timeLabel}</span>
              </div>
            </div>
            <div className="hero-preview-grid">
              <section className="hero-preview-primary">
                <div className="preview-head">
                  <span className="mini-label">Recommended Route</span>
                  <span className="status-chip">{adjustmentState}</span>
                </div>
                <div className="preview-metrics">
                  <article>
                    <span>总时长</span>
                    <strong>{selectedRoute ? formatHours(selectedRoute.totalMinutes) : "--"}</strong>
                  </article>
                  <article>
                    <span>缓冲时间</span>
                    <strong>{selectedRoute?.bufferMinutes ?? 0} 分钟</strong>
                  </article>
                </div>
                <div className="preview-stop-stack">
                  {heroPreviewStops.map((stop, index) => (
                    <article key={`hero-${stop.id}`}>
                      <div className="stop-index">{index + 1}</div>
                      <div>
                        <strong>{stop.name}</strong>
                        <span>
                          {stop.address} · {getCategoryLabel(stop.requestedCategory)}
                        </span>
                      </div>
                      <em>{stop.visitLabel}</em>
                    </article>
                  ))}
                </div>
              </section>

              <section className="hero-preview-secondary">
                <div className="preview-head">
                  <span className="mini-label">System Layer</span>
                  <strong>What ships with the route</strong>
                </div>
                <div className="hero-mini-grid">
                  <article>
                    <span>Stops</span>
                    <strong>{selectedRoute?.stops.length ?? 0}</strong>
                  </article>
                  <article>
                    <span>UGC Reads</span>
                    <strong>{ugcReads}</strong>
                  </article>
                  <article>
                    <span>Theme Match</span>
                    <strong>{routeFit}</strong>
                  </article>
                  <article>
                    <span>Copyable</span>
                    <strong>Public routes</strong>
                  </article>
                </div>
                <div className="hero-chip-column">
                  <span className="meta-pill">一句话输入</span>
                  <span className="meta-pill">站点级理由</span>
                  <span className="meta-pill">动态替换建议</span>
                  <span className="meta-pill">用户验证笔记</span>
                </div>
              </section>
            </div>
          </div>
        </div>
      </header>

      <section className="trust-band surface" aria-label="Workflow signals">
        <span className="mini-label">Workflow Collapsed Into One Product</span>
        <div className="workflow-ticker">
          {workflowSignals.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>
    </>
  );
}

function useWanderHero() {
  const wander = useWander();

  return {
    activePrompt: wander.activePrompt,
    startPoint: wander.parsed.startPoint,
    timeLabel: wander.parsed.timeLabel,
    selectedRoute: wander.selectedRoute,
    routeFit: wander.routeFit,
    ugcReads: wander.ugcReads,
    adjustmentState: wander.adjustmentState,
  };
}
