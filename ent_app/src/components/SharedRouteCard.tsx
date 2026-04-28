import { localizePlainText } from "../display-text";
import { useLanguage } from "../i18n";
import type { CategoryId, SharedRoute } from "../types";

interface SharedRouteCardProps {
  route: SharedRoute;
  onApply: (routeId: string) => void;
  getCategoryLabel: (category: CategoryId) => string;
}

export function SharedRouteCard({ route, onApply, getCategoryLabel }: SharedRouteCardProps) {
  const { language } = useLanguage();

  return (
    <article className="shared-card">
      <div className="shared-top">
        <div>
          <span className="eyebrow">{language === "zh" ? "PUBLIC ROUTE" : "PUBLIC ROUTE"}</span>
          <strong>{localizePlainText(route.title, language, "Shared Route")}</strong>
          <p>{localizePlainText(route.description, language, "A reusable route shared by the Wander community.")}</p>
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
        <p>{language === "zh" ? "Route can be recalculated around your start point." : "Route can be recalculated around your start point."}</p>
        <button className="shared-button" type="button" onClick={() => onApply(route.id)}>
          {language === "zh" ? "Use Route" : "Use Route"}
        </button>
      </div>
    </article>
  );
}
