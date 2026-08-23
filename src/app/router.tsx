import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { HomePage } from "@/pages/HomePage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { GamesPage } from "@/features/games/pages/GamesPage";
import { GameDetailPage } from "@/features/games/pages/GameDetailPage";
import { LeaderboardPage } from "@/features/players/pages/LeaderboardPage";
import { PlayerPage } from "@/features/players/pages/PlayerPage";
import { PlayersPage } from "@/features/players/pages/PlayersPage";
import { STAFF_ROLES } from "@/types/user";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<AppLayout />}>
        <Route path="/squad" element={<PlayersPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/player/:playerId" element={<PlayerPage />} />
        <Route path="/games" element={<GamesPage />} />
        <Route path="/games/:gameId" element={<GameDetailPage />} />

        <Route element={<ProtectedRoute />}>
          <Route
            path="/dashboard"
            element={
              <RoleGuard allowedRoles={STAFF_ROLES}>
                <DashboardPage />
              </RoleGuard>
            }
          />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
