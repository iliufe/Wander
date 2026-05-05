import { RouteCard } from "../components/RouteCard";
import { SelectedRoutePanel } from "../components/SelectedRoutePanel";
import { localizeLocationLabel } from "../display-text";
import { formatHours } from "../engine";
import { getLocalizedCategoryLabel, useCopy, useLanguage } from "../i18n";
import { useWander } from "../wander-state";

export function RoutesPage() {
  const {
    routes,
    selectedRouteId,
    setSelectedRouteId,
    parsed,
    location,
    liveDataState,
    activePrompt,
  } = useWander();
  const { language } = useLanguage();
  const copy = useCopy();
  const labels = buildRoutesLabels(language);
  const hasOverBudgetRoute = routes.some((route) => route.totalMinutes > parsed.timeMinutes);

  return (
    <>
      <section className="page-hero surface">
        <div className="page-hero-content">
          <div>
            <span className="eyebrow">{copy.routes.eyebrow}</span>
            <h1>{copy.routes.title}</h1>
            <div className="meta-row page-hero-meta">
              <span className="meta-pill">
                {routes.length} {language === "zh" ? "条方案" : "options"}
              </span>
              <span className="meta-pill">{localizeLocationLabel(location, language)}</span>
            </div>
          </div>
          <aside className="route-request-summary" aria-label={labels.summaryAria}>
            <span>{labels.request}</span>
            <strong>{activePrompt || labels.emptyRequest}</strong>
            <div>
              <small>{labels.timeBudget}</small>
              <b>{parsed.timeLabel}</b>
            </div>
            {hasOverBudgetRoute ? <p>{labels.overBudget}</p> : null}
          </aside>
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
              <h3>
                {liveDataState.status === "loading"
                  ? language === "zh"
                    ? "路线正在生成中"
                    : "Routes are still generating"
                  : copy.routeDetail.waitingTitle}
              </h3>
              {liveDataState.status === "loading" ? (
                <p>
                  {language === "zh"
                    ? "你可以停留在本页，后台规划完成后会自动显示。"
                    : "Stay on this page. Results will appear when the background plan finishes."}
                </p>
              ) : null}
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

function buildRoutesLabels(language: "zh" | "en") {
  return language === "zh"
    ? {
        summaryAria: "当前路线需求摘要",
        request: "用户需求",
        emptyRequest: "暂无需求",
        timeBudget: "时间预算",
        overBudget: "为满足需求，规划路线时长可能会超出预算时间。",
      }
    : {
        summaryAria: "Current route request summary",
        request: "Request",
        emptyRequest: "No request yet",
        timeBudget: "Time budget",
        overBudget: "To satisfy your request, the planned route may exceed your time budget.",
      };
}
