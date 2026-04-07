import { NavLink, Outlet } from "react-router-dom";
import { StopSheet } from "../components/StopSheet";
import { getLocalizedCategoryLabel, useCopy, useLanguage } from "../i18n";
import { useWander } from "../wander-state";

export function AppLayout() {
  const { activeStop, closeStop } = useWander();
  const { language, setLanguage } = useLanguage();
  const copy = useCopy();

  const navLinks = [
    { label: copy.layout.navHome, to: "/" },
    { label: copy.layout.navRoutes, to: "/routes" },
    { label: copy.layout.navCommunity, to: "/community" },
    { label: copy.layout.navProfile, to: "/profile" },
  ];

  return (
    <>
      <div className="background-orb orb-one"></div>
      <div className="background-orb orb-two"></div>
      <div className="app-shell">
        <section className="topbar surface">
          <div className="brand-lockup">
            <div className="brand-mark">W</div>
            <div className="brand-copy">
              <strong>Wander</strong>
              <span>{copy.layout.brandTagline}</span>
            </div>
          </div>
          <nav className="topnav" aria-label="Primary">
            {navLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="topbar-actions">
            <div className="language-switch" aria-label={copy.layout.language}>
              <button
                className={`lang-button ${language === "zh" ? "is-active" : ""}`}
                type="button"
                onClick={() => setLanguage("zh")}
              >
                中
              </button>
              <button
                className={`lang-button ${language === "en" ? "is-active" : ""}`}
                type="button"
                onClick={() => setLanguage("en")}
              >
                EN
              </button>
            </div>
            <NavLink className="nav-cta" to="/">
              {copy.layout.cta}
            </NavLink>
          </div>
        </section>

        <Outlet />
      </div>

      <StopSheet
        stop={activeStop}
        getCategoryLabel={(category) => getLocalizedCategoryLabel(category, language)}
        onClose={closeStop}
      />
    </>
  );
}
