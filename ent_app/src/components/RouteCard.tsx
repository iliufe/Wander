import {
  localizePlainText,
  localizeRouteTitle,
  localizeStopAddress,
  localizeStopName,
} from "../display-text";
import { useCopy, useLanguage } from "../i18n";
import type { CategoryId, RouteOption } from "../types";

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
          <strong>{localizeRouteTitle(route, language, index)}</strong>
        </div>
      </div>
      <div className="meta-row">
        <span className="meta-pill">
          {copy.routeCard.total} {formatHours(route.totalMinutes)}
        </span>
      </div>
      <div className="stop-preview">
        {route.stops.map((stop, stopIndex) => (
          <article key={stop.id}>
            <div className="stop-index">{stopIndex + 1}</div>
            <div>
              <strong>{localizeStopName(stop, language, stopIndex)}</strong>
              <span>
                {[localizeStopAddress(stop, language), localizePlainText(stop.visitLabel, language, language === "zh" ? "\u5efa\u8bae\u505c\u7559" : "Suggested visit")]
                  .filter(Boolean)
                  .join(" · ")}
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
