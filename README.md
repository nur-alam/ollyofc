# Ollyo FC

Office football team management — React + TypeScript, Firebase, and shadcn/ui.

## Run locally

1. Copy `.env.example` to `.env`
2. Add your Firebase project credentials
3. Enable Google sign-in in Firebase Console
4. Deploy Firestore rules: `firebase deploy --only firestore:rules`
5. Install dependencies: `pnpm install`
6. Start the app: `pnpm dev`

## Scripts

- `pnpm dev` — start the dev server
- `pnpm build` — typecheck and build for production
- `pnpm typecheck` — run TypeScript checks only
- `pnpm preview` — preview the production build

## Firebase setup (Phase 1)

After your first Google sign-in, a document is created at `users/{uid}` with `role: "user"`.

To make yourself admin, open Firestore and set:

```
users/{your-uid}
  role: "admin"
```

Valid roles: `admin`, `moderator`, `user`.

Deploy Firestore rules after pulling changes:

```bash
firebase deploy --only firestore:rules
```

## Phase 2 — Players

Staff (`admin` / `moderator`) can manage players at `/players`:

- Add and edit players (category, position, active status)
- Search and filter the squad list
- Link a player to a user account (updates both `players/{id}.userId` and `users/{uid}.playerId`)
- **Admin only:** hard-delete a player
- **Moderator:** can deactivate/reactivate but not delete

Player stats (matches, goals, etc.) show `0` until Phase 6 derives them from match events.

## Project structure

```
src/
  app/           # router + providers
  components/    # shared UI + layout
  features/      # feature modules (auth, players, games, …)
  lib/firebase/  # Firebase init
  pages/         # route pages
  types/         # shared TypeScript types
```

See `project-spec-mvp.md` for the full product roadmap.
