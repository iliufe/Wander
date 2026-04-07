import { startTransition } from "react";
import { useNavigate } from "react-router-dom";
import { cityDriftData } from "../data";
import type { DeviceLocation, LiveDataStatus } from "../types";
import { TimeWheelPicker } from "./TimeWheelPicker";
import { getLocalizedCategoryLabel, useCopy, useLanguage } from "../i18n";
import { useWander } from "../wander-state";

export function PlannerPanel() {
  const {
    inputPrompt,
    setInputPrompt,
    location,
    locationReady,
    requestCurrentLocation,
    generationLabel,
    liveDataState,
    timeSelection,
    setTimeSelection,
    canGenerate,
    scenario,
    setScenario,
    parsed,
    activeTemplateId,
    commitPrompt,
    applyQuickPrompt,
  } = useWander();
  const { language } = useLanguage();
  const copy = useCopy();
  const navigate = useNavigate();

  const activeTemplate =
    cityDriftData.sharedRoutes.find((route) => route.id === activeTemplateId) || null;
  const selectedTimeMinutes = timeSelection.hours * 60 + timeSelection.minutes;
  const plannerBadges =
    language === "zh"
      ? ["GPS 优先", "碎片时间友好", "中英双语"]
      : ["GPS First", "Free-time Friendly", "ZH / EN"];

  const handleGenerate = () => {
    if (!canGenerate) {
      return;
    }

    commitPrompt();
    startTransition(() => {
      navigate("/routes");
    });
  };

  return (
    <section className="surface panel planner-panel planner-home-panel">
      <div className="planner-stage-header">
        <div className="section-heading planner-heading">
          <span className="eyebrow">{copy.planner.eyebrow}</span>
          <h2>{copy.planner.title}</h2>
          <p className="planner-lead">{copy.planner.lead}</p>
        </div>
        <div className="planner-stage-badges">
          {plannerBadges.map((badge) => (
            <span className="planner-stage-badge" key={badge}>
              {badge}
            </span>
          ))}
        </div>
      </div>

      <div className="planner-stage-grid">
        <div className="planner-stage-main">
          <section className="planner-input-card">
            <label className="input-label" htmlFor="request-input">
              {copy.planner.requestLabel}
            </label>
            <p className="input-help">{copy.planner.requestHelp}</p>
            <textarea
              id="request-input"
              rows={6}
              value={inputPrompt}
              onChange={(event) => setInputPrompt(event.target.value)}
              placeholder={copy.planner.requestPlaceholder}
            />

            <div className="prompt-row">
              <span className="mini-label">{copy.planner.quickExamples}</span>
              <div className="chip-wrap">
                {cityDriftData.quickPrompts.map((prompt) => (
                  <button className="chip" key={prompt} type="button" onClick={() => applyQuickPrompt(prompt)}>
                    {prompt.length > 22 ? `${prompt.slice(0, 22)}…` : prompt}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="planner-control-grid">
            <section className="planner-control-card">
              <TimeWheelPicker value={timeSelection} onChange={setTimeSelection} />
            </section>

            <section className="planner-control-card planner-decision-card">
              <div className="scenario-grid planner-scenario-grid">
                <div className="scenario-block">
                  <span className="mini-label">{copy.planner.weather}</span>
                  <div className="segmented-group">
                    <button
                      className={`segment ${scenario.weather === "clear" ? "is-active" : ""}`}
                      type="button"
                      onClick={() => setScenario((current) => ({ ...current, weather: "clear" }))}
                    >
                      {copy.planner.clear}
                    </button>
                    <button
                      className={`segment ${scenario.weather === "rain" ? "is-active" : ""}`}
                      type="button"
                      onClick={() => setScenario((current) => ({ ...current, weather: "rain" }))}
                    >
                      {copy.planner.rain}
                    </button>
                  </div>
                </div>
                <div className="scenario-block">
                  <span className="mini-label">{copy.planner.venueStatus}</span>
                  <div className="segmented-group">
                    <button
                      className={`segment ${scenario.venue === "live" ? "is-active" : ""}`}
                      type="button"
                      onClick={() => setScenario((current) => ({ ...current, venue: "live" }))}
                    >
                      {copy.planner.venueOpen}
                    </button>
                    <button
                      className={`segment ${scenario.venue === "closed" ? "is-active" : ""}`}
                      type="button"
                      onClick={() => setScenario((current) => ({ ...current, venue: "closed" }))}
                    >
                      {copy.planner.venueClosed}
                    </button>
                  </div>
                </div>
              </div>

              <button className="primary-button" type="button" onClick={handleGenerate} disabled={!canGenerate}>
                {locationReady ? copy.planner.generate : copy.planner.needLocation}
              </button>
              {!locationReady ? <p className="time-warning">{copy.planner.needLocationHint}</p> : null}
              {locationReady && selectedTimeMinutes === 0 ? (
                <p className="time-warning">{copy.planner.needTimeHint}</p>
              ) : null}
            </section>
          </div>
        </div>

        <aside className="planner-stage-side">
          <section className="location-card planner-side-card">
            <div className="location-copy">
              <span className="mini-label">{copy.planner.currentStart}</span>
              <strong>{location.label}</strong>
              <p>{location.detail}</p>
              {location.permission === "granted" ? (
                <div className="location-meta-row">
                  <span className="location-meta-pill">
                    {copy.planner.precision} {location.accuracyMeters ?? "--"} {language === "zh" ? "米" : "m"}
                  </span>
                  <span className="location-meta-pill">
                    {liveDataState.source === "demo" ? copy.planner.sourceFallback : copy.planner.sourceOpen}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="location-actions">
              <button
                className={`location-button ${locationReady ? "is-ready" : ""}`}
                type="button"
                onClick={requestCurrentLocation}
                disabled={location.permission === "requesting" || location.permission === "unsupported"}
              >
                {getLocationButtonLabel(location, language)}
              </button>
              <span className={`location-state is-${location.permission}`}>
                {getLocationStateLabel(location, language)}
              </span>
            </div>
          </section>

          <section className="summary-card planner-side-card planner-status-card">
            <div className="planner-status-head">
              <div>
                <span className="mini-label">{copy.planner.realtimeSource}</span>
                <h3>{getLiveStateLabel(liveDataState.status, language)}</h3>
                <p>{copy.planner.statusCardLead}</p>
              </div>
              <span className={`planner-status-pill is-${liveDataState.status}`}>
                {copy.planner.realtimeStatus}
              </span>
            </div>

            <div className="planner-status-grid">
              <article className="planner-status-metric">
                <span>{copy.planner.dataSource}</span>
                <strong>
                  {liveDataState.source === "open"
                    ? "Nominatim + Overpass + OSRM"
                    : "Wander Local Pack"}
                </strong>
              </article>
              <article className="planner-status-metric">
                <span>{copy.planner.generatedAt}</span>
                <strong>{generationLabel}</strong>
              </article>
              <article className="planner-status-metric">
                <span>{copy.planner.candidateCount}</span>
                <strong>{liveDataState.poiCount}</strong>
              </article>
              <article className="planner-status-metric">
                <span>{copy.planner.searchRadius}</span>
                <strong>{formatStatusRadius(liveDataState.radiusMeters, language)}</strong>
              </article>
            </div>

            <div className="planner-status-note">
              <span className="mini-label">{copy.planner.systemNote}</span>
              <p>{liveDataState.note}</p>
            </div>
          </section>

          <section className="summary-card planner-side-card planner-parse-card">
            <span className="mini-label">{copy.planner.parsed}</span>
            <ul className="summary-list">
              <li>
                <span>{copy.planner.start}</span>
                <strong>{parsed.startPoint}</strong>
              </li>
              <li>
                <span>{copy.planner.time}</span>
                <strong>{parsed.timeLabel}</strong>
              </li>
              <li>
                <span>{copy.planner.theme}</span>
                <strong>
                  {parsed.categories.map((category) => getLocalizedCategoryLabel(category, language)).join(" · ")}
                </strong>
              </li>
              <li>
                <span>{copy.planner.scenario}</span>
                <strong>
                  {scenario.weather === "rain" ? copy.planner.rain : copy.planner.clear} ·{" "}
                  {scenario.venue === "closed" ? copy.planner.venueClosed : copy.planner.venueOpen}
                </strong>
              </li>
            </ul>
            <p>
              {activeTemplate
                ? copy.planner.templateApplied
                : liveDataState.source === "demo"
                  ? copy.planner.localFallbackNote
                  : copy.planner.livePoiNote}
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}

function getLocationButtonLabel(location: DeviceLocation, language: "zh" | "en") {
  if (location.permission === "requesting") {
    return language === "zh" ? "正在请求定位…" : "Requesting Location…";
  }

  if (location.permission === "granted") {
    return language === "zh" ? "更新当前位置" : "Refresh Location";
  }

  if (location.permission === "denied" || location.permission === "error") {
    return language === "zh" ? "重新请求定位" : "Try Again";
  }

  if (location.permission === "unsupported") {
    return language === "zh" ? "当前浏览器不支持定位" : "Location Unsupported";
  }

  return language === "zh" ? "允许 GPS 定位" : "Allow GPS";
}

function getLocationStateLabel(location: DeviceLocation, language: "zh" | "en") {
  if (location.permission === "granted") {
    return language === "zh" ? "已连接 GPS" : "GPS Ready";
  }

  if (location.permission === "requesting") {
    return language === "zh" ? "等待授权" : "Waiting";
  }

  if (location.permission === "denied") {
    return language === "zh" ? "权限被拒绝" : "Denied";
  }

  if (location.permission === "unsupported") {
    return language === "zh" ? "定位不可用" : "Unsupported";
  }

  if (location.permission === "error") {
    return language === "zh" ? "定位失败" : "Error";
  }

  return language === "zh" ? "尚未授权" : "Idle";
}

function getLiveStateLabel(status: LiveDataStatus, language: "zh" | "en") {
  if (status === "live") {
    return language === "zh" ? "已接入附近实时候选点" : "Live Nearby Data";
  }

  if (status === "loading") {
    return language === "zh" ? "正在刷新附近地点" : "Refreshing Nearby Places";
  }

  if (status === "empty") {
    return language === "zh" ? "附近候选点不足" : "Not Enough Nearby Places";
  }

  if (status === "fallback") {
    return language === "zh" ? "本地精选包已接管" : "Local Fallback Active";
  }

  if (status === "error") {
    return language === "zh" ? "实时搜索异常" : "Realtime Search Error";
  }

  return language === "zh" ? "等待定位" : "Waiting For Location";
}

function formatStatusRadius(radiusMeters: number | null, language: "zh" | "en") {
  if (radiusMeters == null) {
    return "--";
  }

  if (radiusMeters >= 1000) {
    const kilometers = radiusMeters / 1000;
    return language === "zh" ? `${kilometers.toFixed(1)} 公里` : `${kilometers.toFixed(1)} km`;
  }

  return language === "zh" ? `${radiusMeters} 米` : `${radiusMeters} m`;
}
