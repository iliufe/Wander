import type { CategoryId, SharedRoute } from "../types";

interface SharedRouteCardProps {
  route: SharedRoute;
  onApply: (routeId: string) => void;
  getCategoryLabel: (category: CategoryId) => string;
}

export function SharedRouteCard({ route, onApply, getCategoryLabel }: SharedRouteCardProps) {
  return (
    <article className="shared-card">
      <div className="shared-top">
        <div>
          <span className="eyebrow">PUBLIC ROUTE</span>
          <strong>{route.title}</strong>
          <p>{route.description}</p>
        </div>
        <span className="route-rank">{route.timeHours}h</span>
      </div>
      <div className="shared-meta">
        {route.desiredCategories.map((category) => (
          <span className="meta-pill" key={`${route.id}-${category}`}>
            {getCategoryLabel(category)}
          </span>
        ))}
      </div>
      <div className="shared-bottom">
        <p>复制后会保留你当前输入里的起点和时间预算，再自动重算。</p>
        <button className="shared-button" type="button" onClick={() => onApply(route.id)}>
          复制并重算
        </button>
      </div>
    </article>
  );
}
