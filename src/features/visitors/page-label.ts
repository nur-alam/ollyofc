export function pageLabel(path: string) {
  if (path === "/") {
    return "Home";
  }

  if (path === "/squad") {
    return "Squad";
  }

  if (path === "/leaderboard") {
    return "Leaderboard";
  }

  if (path === "/games") {
    return "Games";
  }

  if (path.startsWith("/games/")) {
    return "Game";
  }

  if (path.startsWith("/player/")) {
    return "Player";
  }

  if (path === "/dashboard") {
    return "Dashboard";
  }

  if (path === "/notification") {
    return "Notifications";
  }

  if (path === "/visitors") {
    return "Visitors";
  }

  if (path === "/profile") {
    return "Profile";
  }

  if (path === "/login") {
    return "Sign in";
  }

  return path || "Home";
}
