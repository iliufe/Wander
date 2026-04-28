import type { CategoryId, RouteOption } from "../types";
import { useCopy, useLanguage } from "../i18n";

interface RouteCardProps {
  route: RouteOption;
  index: number;
  selected: boolean;
  onSelect: (routeId: string) => void;
  getCategoryLabel: (category: CategoryId) => string;
  formatHours: (minutes: number) => string;
}

export function RouteCard({
  route,
  index,
  selected,
  onSelect,
  getCategoryLabel,
  formatHours,
}: RouteCardProps) {
  const copy = useCopy();
  const { language } = useLanguage();
  const actionLabel = selected ? copy.routeCard.selected : copy.routeCard.continue;

  return (
    <article className={`route-card ${selected ? "is-selected" : ""}`}>
      <div className="route-top">
        <div>
          <span className="eyebrow">
            {copy.routeCard.option} {index + 1}
          </span>
          <strong>{route.title}</strong>
          <p>{route.summary}</p>
        </div>
        <span className="route-rank">{route.fitScore}%</span>
      </div>
      <div className="meta-row">
        <span className="meta-pill">
          {copy.routeCard.total} {formatHours(route.totalMinutes)}
        </span>
        <span className="meta-pill">{route.transitSummary}</span>
        <span className="meta-pill">
          {copy.routeCard.buffer} {route.bufferMinutes} {language === "zh" ? "分钟" : "min"}
        </span>
      </div>
      <div className="route-flags">
        <span className="status-chip">{route.clusterAccent}</span>
      </div>
      <div className="stop-preview">
        {route.stops.map((stop, stopIndex) => (
          <article key={stop.id}>
            <div className="stop-index">{stopIndex + 1}</div>
            <div>
              <strong>{stop.name}</strong>
              <span>
                {stop.address} · {stop.visitLabel}
              </span>
            </div>
            <span className="status-chip">{getCategoryLabel(stop.requestedCategory)}</span>
          </article>
        ))}
      </div>
      <div className="route-actions">
        <button className="route-action" type="button" onClick={() => onSelect(route.id)}>
          {actionLabel}
        </button>
      </div>
    </article>
  );
}
