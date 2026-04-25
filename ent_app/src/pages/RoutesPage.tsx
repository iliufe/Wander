import { RouteCard } from "../components/RouteCard";
import { SelectedRoutePanel } from "../components/SelectedRoutePanel";
import { formatHours } from "../engine";
import { getLocalizedCategoryLabel, useCopy, useLanguage } from "../i18n";
import { useWander } from "../wander-state";

export function RoutesPage() {
  const { routes, selectedRouteId, setSelectedRouteId, parsed, location } = useWander();
  const { language } = useLanguage();
  const copy = useCopy();

  return (
    <>
      <section className="page-hero surface">
        <span className="eyebrow">{copy.routes.eyebrow}</span>
        <h1>{copy.routes.title}</h1>
        <div className="meta-row page-hero-meta">
          <span className="meta-pill">
            {routes.length} {language === "zh" ? "条方案" : "options"}
          </span>
          <span className="meta-pill">{parsed.timeLabel}</span>
          <span className="meta-pill">{location.label}</span>
        </div>
      </section>

      <section className="route-stack">
        <section className="surface panel route-panel route-selection-panel">
          <div className="route-selection-top">
            <div className="section-heading">
              <span className="eyebrow">{copy.routes.allRoutes}</span>
              <h2>{copy.routes.allRoutesTitle}</h2>
            </div>
          </div>
          {routes.length ? (
            <div className="route-options route-options-grid">
              {routes.map((route, index) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  index={index}
                  selected={route.id === selectedRouteId}
                  onSelect={setSelectedRouteId}
                  getCategoryLabel={(category) => getLocalizedCategoryLabel(category, language)}
                  formatHours={(minutes) => formatHours(minutes, language)}
                />
              ))}
            </div>
          ) : (
            <div className="route-empty-state">
              <span className="eyebrow">{copy.routes.allRoutes}</span>
              <h3>{copy.routeDetail.waitingTitle}</h3>
            </div>
          )}
        </section>

        <section className="surface panel detail-panel detail-panel-stacked">
          <div className="section-heading">
            <span className="eyebrow">{copy.routes.selectedRoute}</span>
            <h2>{copy.routes.selectedRouteTitle}</h2>
          </div>
          <SelectedRoutePanel />
        </section>
      </section>
    </>
  );
}
