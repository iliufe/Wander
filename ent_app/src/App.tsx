import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";
import { LanguageProvider } from "./i18n";
import { WanderProvider } from "./wander-state";
import { CommunityPage } from "./pages/CommunityPage";
import { PlannerPage } from "./pages/PlannerPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RoutesPage } from "./pages/RoutesPage";

export default function App() {
  return (
    <LanguageProvider>
      <WanderProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<PlannerPage />} />
            <Route path="/planner" element={<Navigate to="/" replace />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/library" element={<Navigate to="/community" replace />} />
            <Route path="/metrics" element={<Navigate to="/profile" replace />} />
          </Route>
        </Routes>
      </WanderProvider>
    </LanguageProvider>
  );
}
