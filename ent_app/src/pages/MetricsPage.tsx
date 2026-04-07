import { useWander } from "../wander-state";

export function MetricsPage() {
  const { routeFit, ugcReads, selectedRoute, parsed } = useWander();

  return (
    <>
      <section className="page-hero surface">
        <span className="eyebrow">SUCCESS METRICS</span>
        <h1>这一页用来对应课程 brief 里的测试指标。</h1>
        <p>把路线相关性、UGC 阅读行为、跟随意愿和平台替代性拆成更清楚的展示模块。</p>
      </section>

      <section className="surface panel metric-band">
        <div className="metric-kpi-grid">
          <article>
            <span>路线相关性</span>
            <strong>{routeFit}</strong>
          </article>
          <article>
            <span>已读 UGC</span>
            <strong>{ugcReads}</strong>
          </article>
          <article>
            <span>当前路线</span>
            <strong>{selectedRoute?.stops.length ?? 0} stops</strong>
          </article>
          <article>
            <span>主题数</span>
            <strong>{parsed.categories.length}</strong>
          </article>
        </div>
      </section>

      <section className="surface panel notes-panel">
        <div className="section-heading">
          <span className="eyebrow">Evaluation Mapping</span>
          <h2>把课程原型包装成更像正式产品的测试视角</h2>
        </div>
        <div className="success-grid">
          <article>
            <strong>路线相关性</strong>
            <p>路线卡明确显示主题命中、总时长与生成理由，方便测试时打相关性分。</p>
          </article>
          <article>
            <strong>UGC 阅读行为</strong>
            <p>点击任何 stop 都会累计 UGC 打开次数，便于记录用户是否真的在读内容。</p>
          </article>
          <article>
            <strong>真实跟随意愿</strong>
            <p>路线带交通方式、站点顺序和停留时间，能更接近“我会不会真的照着走”。</p>
          </article>
          <article>
            <strong>避免平台切换</strong>
            <p>推荐、路线、笔记和替换建议都在 Wander 内部完成，降低去别的平台补信息的必要。</p>
          </article>
        </div>
      </section>
    </>
  );
}
