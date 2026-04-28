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
          <span className="eyebrow">{language === "zh" ? "\u516c\u5f00\u8def\u7ebf" : "PUBLIC ROUTE"}</span>
          <strong>{localizePlainText(route.title, language, language === "zh" ? "\u793e\u533a\u8def\u7ebf" : "Shared Route")}</strong>
          <p>
            {localizePlainText(
              route.description,
              language,
              language === "zh" ? "\u6765\u81ea Wander \u793e\u533a\u7684\u53ef\u590d\u7528\u8def\u7ebf\u3002" : "A reusable route shared by the Wander community."
            )}
          </p>
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
        <p>
          {language === "zh"
            ? "\u53ef\u6839\u636e\u4f60\u7684\u51fa\u53d1\u70b9\u91cd\u65b0\u8ba1\u7b97\u8def\u7ebf\u3002"
            : "Route can be recalculated around your start point."}
        </p>
        <button className="shared-button" type="button" onClick={() => onApply(route.id)}>
          {language === "zh" ? "\u4f7f\u7528\u8def\u7ebf" : "Use Route"}
        </button>
      </div>
    </article>
  );
}
