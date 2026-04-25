import type { ReactElement } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";
import { LanguageProvider } from "./i18n";
import { WanderProvider, useWander } from "./wander-state";
import { LoginPage } from "./pages/LoginPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { PlannerPage } from "./pages/PlannerPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RoutesPage } from "./pages/RoutesPage";

export default function App() {
  return (
    <LanguageProvider>
      <WanderProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <RequireSignedIn>
                <OnboardingPage />
              </RequireSignedIn>
            }
          />
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<PlannerPage />} />
            <Route path="/planner" element={<Navigate to="/" replace />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/community" element={<Navigate to="/" replace />} />
            <Route path="/library" element={<Navigate to="/" replace />} />
            <Route path="/metrics" element={<Navigate to="/profile" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </WanderProvider>
    </LanguageProvider>
  );
}

function RequireAuth({ children }: { children: ReactElement }) {
  const { userProfile } = useWander();
  const location = useLocation();

  if (!userProfile.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!userProfile.hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }: { children: ReactElement }) {
  const { userProfile } = useWander();

  if (userProfile.isAuthenticated) {
    return <Navigate to={userProfile.hasCompletedOnboarding ? "/" : "/onboarding"} replace />;
  }

  return children;
}

function RequireSignedIn({ children }: { children: ReactElement }) {
  const { userProfile } = useWander();

  if (!userProfile.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (userProfile.hasCompletedOnboarding) {
    return <Navigate to="/" replace />;
  }

  return children;
}
