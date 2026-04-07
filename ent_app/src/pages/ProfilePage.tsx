import { useCopy, useLanguage } from "../i18n";
import { useWander } from "../wander-state";

export function ProfilePage() {
  const copy = useCopy();
  const { language, setLanguage } = useLanguage();
  const { location, routeFit, ugcReads, selectedRoute, parsed } = useWander();

  return (
    <>
      <section className="page-hero surface">
        <span className="eyebrow">{copy.profile.eyebrow}</span>
        <h1>{copy.profile.title}</h1>
        <p>{copy.profile.description}</p>
      </section>

      <section className="profile-grid">
        <section className="surface panel profile-card">
          <div className="section-heading">
            <span className="eyebrow">{copy.profile.account}</span>
            <div className="profile-identity">
              <div className="community-avatar profile-avatar">W</div>
              <div>
                <h2>Wander User</h2>
                <p className="hero-text compact">{copy.profile.description}</p>
              </div>
            </div>
          </div>
          <div className="summary-list single-column">
            <li>
              <span>{copy.profile.currentLocation}</span>
              <strong>{location.label}</strong>
            </li>
            <li>
              <span>{copy.profile.uiLanguage}</span>
              <strong>{language === "zh" ? "中文" : "English"}</strong>
            </li>
            <li>
              <span>{copy.profile.selectedRoute}</span>
              <strong>{selectedRoute?.title ?? "--"}</strong>
            </li>
          </div>
        </section>

        <section className="surface panel profile-card">
          <div className="section-heading">
            <span className="eyebrow">{copy.profile.stats}</span>
            <h2>Wander Snapshot</h2>
          </div>
          <div className="metric-kpi-grid profile-stat-grid">
            <article>
              <span>{copy.profile.readCards}</span>
              <strong>{ugcReads}</strong>
            </article>
            <article>
              <span>{copy.profile.routeScore}</span>
              <strong>{routeFit}</strong>
            </article>
            <article>
              <span>{copy.profile.selectedRoute}</span>
              <strong>{selectedRoute?.stops.length ?? 0}</strong>
            </article>
            <article>
              <span>{copy.profile.request}</span>
              <strong>{parsed.categories.length}</strong>
            </article>
          </div>
        </section>

        <section className="surface panel profile-card">
          <div className="section-heading">
            <span className="eyebrow">{copy.profile.preferences}</span>
            <h2>{copy.profile.languageSetting}</h2>
            <p>{copy.profile.preferencesDesc}</p>
          </div>
          <div className="profile-setting-list">
            <div className="setting-row">
              <span>{copy.profile.pref1}</span>
              <strong>ON</strong>
            </div>
            <div className="setting-row">
              <span>{copy.profile.pref2}</span>
              <strong>ON</strong>
            </div>
            <div className="setting-row">
              <span>{copy.profile.pref3}</span>
              <strong>ON</strong>
            </div>
          </div>
          <div className="language-switch profile-language-switch">
            <button
              className={`lang-button ${language === "zh" ? "is-active" : ""}`}
              type="button"
              onClick={() => setLanguage("zh")}
            >
              中文
            </button>
            <button
              className={`lang-button ${language === "en" ? "is-active" : ""}`}
              type="button"
              onClick={() => setLanguage("en")}
            >
              English
            </button>
          </div>
          <p className="hero-text compact">{copy.profile.languageDesc}</p>
        </section>
      </section>
    </>
  );
}
