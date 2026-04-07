import { SharedRouteCard } from "../components/SharedRouteCard";
import { getCategoryLabel } from "../engine";
import { useWander } from "../wander-state";
import { cityDriftData } from "../data";

export function LibraryPage() {
  const { applySharedRoute, activeTemplateId, selectedRoute, parsed } = useWander();

  return (
    <>
      <section className="page-hero surface">
        <span className="eyebrow">SHARED LIBRARY</span>
        <h1>这一页专门展示可复用的公开路线模板。</h1>
        <p>
          用户可以复制别人已经走过的路线，再按自己的起点、时间和当前天气自动重算。
        </p>
      </section>

      <section className="library-layout">
        <section className="surface panel shared-panel">
          <div className="section-heading">
            <span className="eyebrow">Public Routes</span>
            <h2>一键复制，再按你的现实条件重算</h2>
          </div>
          <div className="shared-routes">
            {cityDriftData.sharedRoutes.map((route) => (
              <SharedRouteCard
                key={route.id}
                route={route}
                onApply={applySharedRoute}
                getCategoryLabel={getCategoryLabel}
              />
            ))}
          </div>
        </section>

        <section className="surface panel library-summary-panel">
          <div className="section-heading">
            <span className="eyebrow">Replication Status</span>
            <h2>当前复制状态</h2>
          </div>
          <div className="summary-list single-column">
            <li>
              <span>当前起点</span>
              <strong>{parsed.startPoint}</strong>
            </li>
            <li>
              <span>当前复制来源</span>
              <strong>
                {activeTemplateId
                  ? cityDriftData.sharedRoutes.find((route) => route.id === activeTemplateId)?.title
                  : "尚未复制公开路线"}
              </strong>
            </li>
            <li>
              <span>当前推荐结果</span>
              <strong>{selectedRoute?.title ?? "等待路线生成"}</strong>
            </li>
          </div>
          <p className="hero-text compact">
            这页适合你们答辩时解释“one-tap route replication”这个核心卖点。
          </p>
        </section>
      </section>
    </>
  );
}
