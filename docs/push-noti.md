# Push notifications when a game is created

Phase 1 (opt-in + FCM worker) and Phase 2 (notify on create) are implemented. Staff create still succeeds if push fails. Players must enable **New game notifications** on Profile. Tapping a notification opens `/games/{gameId}`.

Staff already create matches from the Games page (`createGame` → Firestore `games/{id}`). The product ask is: **when that happens, ping players who opted in**, even if Ollyo FC is closed.

That is Web Push. It is not an in-app toast and not a Firestore listener while the tab is open. Those only work when the app is already running.

`docs/pwa.md` listed this as Phase 3. The PWA shell is in place, which is the prerequisite: Chrome/Android can receive Web Push in the browser; iOS only after Add to Home Screen (16.4+).

---



## What this app is today


| Piece                  | State                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Game create            | Staff UI on `/games` → `createGame()` in `game.service.ts` → `addDoc("games")` with `status: "upcoming"`             |
| Who can create (UI)    | Staff (`admin` / `moderator`)                                                                                        |
| Who can create (rules) | Any signed-in user (`allow create: if isSignedIn()`). Do not rely on rules for “only staff may notify”.              |
| Live data              | Client `onSnapshot` on games. Fine for the open tab; useless when the phone is locked.                               |
| PWA                    | `vite-plugin-pwa` `generateSW` → `/sw.js`. Precache shell. Does **not** handle `push` events.                        |
| Firebase Messaging     | `VITE_FIREBASE_MESSAGING_SENDER_ID` is already in config. No `getMessaging`, no VAPID, no token store, no send path. |
| Server                 | Vercel Edge: `/api/time`, `/api/image`. No `firebase-admin`. No Cloud Functions in `firebase.json`.                  |


The browser cannot push to other people’s devices. A **server** must call FCM (or Web Push) with a secret. Putting the FCM server key in the Vite bundle would let anyone spam the squad.

---



## Product scope for v1

**In scope**

- One notification when a **new** game document is created (not on edit, kick-off, or finish).
- Recipients: signed-in users who **granted notification permission** and have a stored FCM token.
- Title/body from the game: display title, Bangladesh date/time, location.
- Tap opens `/games/{gameId}` (fallback `/games`).
- Opt-in from Profile (or a small prompt after sign-in). Never auto-prompt on first visit.
- Production only (`ollyofc.vercel.app` + Firestore `(default)`). `pnpm dev` writes `ollyofcdev`; do not notify prod users from local creates.

**Out of scope for v1**

- “Kick-off in 10 minutes” reminders.
- Notify on join, score, toss, or result.
- Guests (not signed in).
- Email / WhatsApp / SMS.
- Topics like `all-players` until we know we need them (tokens-per-user is enough for a club).

**Skip the creator?** Optional. Default: notify every opted-in device, including the staff phone that just saved the game. They already saw the toast “Game created”; a system notification is harmless.

---



## Why not “just listen in the client”

`useGames()` already updates every open tab. You could `new Notification(...)` when the games list grows.

That is **not** push:

- App closed or iOS suspended → nothing.
- Battery optimizations kill background tabs.
- You would notify the same user on every device that happens to be open, and never on the ones that are not.

Use that only as a **foreground** extra (in-app toast) once FCM `onMessage` fires while the PWA is focused.

---



## Recommended stack: FCM + Vercel Node API

Firebase Cloud Messaging is the fit: the project already has a sender ID, users already have Firebase Auth, and tokens live next to `users/{uid}`.

### 1. Opt-in (client)

**Signed-in user taps “Notify me about new games” on Profile:**

1. `Notification.requestPermission()`
2. `getMessaging(app)` + `getToken(messaging, { vapidKey, serviceWorkerRegistration })`
3. Save the token under that user in Firestore

Need a **Web Push certificate (VAPID key)** from Firebase Console → Project settings → Cloud Messaging → Web Push certificates. Expose it as `VITE_FIREBASE_VAPID_KEY`.

**iOS:** permission only works in the **installed** Home Screen app, not in a Safari tab. Document that on the Profile toggle.

### 2. Token storage

Prefer a subcollection so one person can have phone + laptop:

```
users/{uid}/fcmTokens/{tokenId}
  token: string
  userAgent: string
  updatedAt: timestamp
```

Rules: only that user can read/write their tokens. The send path uses the Admin SDK and bypasses rules.

On `getToken` / refresh: upsert. On permission revoked or `messaging/registration-token-not-registered` from FCM: delete that token.

Do not put an unbounded array of tokens on `users/{uid}`; it fights the existing user-update rules (`affectedKeys` allowlists).

### 3. Send path (server)

After a game exists, something trusted must:

1. Load all `fcmTokens` (collection group query).
2. `sendEachForMulticast` (or batched `sendEach`) with a **notification** + **data** payload.
3. Drop tokens FCM marks invalid.

Two ways to trigger that:


| Trigger                                                                          | Pros                                       | Cons                                                                                           |
| -------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| **A. Vercel** `/api/notify-game-created` called from `createGame` after `addDoc` | Stays in this repo; same deploy as the app | If the API fails, the game exists with no push. Client must send an ID token.                  |
| **B. Cloud Function** `onDocumentCreated("games/{gameId}")`                      | Always fires, even if UI is bypassed       | New Firebase Functions product in this repo; extra deploy (`firebase deploy --only functions`) |


**v1 recommendation: A.** Ollyo FC already ships APIs on Vercel. Use **Node** runtime, not Edge (`firebase-admin` is not an Edge library). Protect the route:

- `Authorization: Bearer <Firebase ID token>`
- Verify token with Admin SDK
- Load `users/{uid}` and require `role` in `admin` | `moderator`
- Body: `{ gameId }` only; the server re-reads the game from Firestore (never trust client title/body)

Env on Vercel (server only, not `VITE_`):

- `FIREBASE_SERVICE_ACCOUNT` — full service account JSON string  
or the usual `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`

`createGame` in the client: after a successful `addDoc`, `POST /api/notify-game-created` with the user’s ID token. Failure → `toast.error` for staff (“Game saved, but players were not notified”) without rolling back the game.

**v2 (optional):** move the send to a Firestore trigger so a scripted `addDoc` still notifies.

### 4. Service worker (background)

The current Workbox `generateSW` worker **does not** show notifications. FCM background messages need a `push` handler.

Two workable shapes:

**Prefer for v1 — second worker, default FCM file**

Add `public/firebase-messaging-sw.js` that initializes Firebase (compat or bundled config) and calls `onBackgroundMessage` → `self.registration.showNotification(...)`.

`getToken()` looks for this file by default. `/sw.js` stays the app-shell worker. Do **not** let Workbox precache or navigate-fallback this file. `vercel.json` already serves real files before the SPA rewrite.

**Later — one worker**

Switch `vite-plugin-pwa` to `injectManifest` and handle FCM inside `src/sw.ts`. Cleaner long-term; bigger change than a dedicated messaging worker.

Background payload should include `data.url` (e.g. `/games/{id}`) so a `notificationclick` handler can `clients.openWindow`.

Foreground: `onMessage` in the page → toast, and skip a duplicate system banner if the tab is focused.

### 5. Payload shape

```json
{
  "notification": {
    "title": "New Ollyo FC game",
    "body": "Fri 28 Aug · 6:00 PM · Roof"
  },
  "data": {
    "gameId": "abc",
    "url": "/games/abc"
  },
  "webpush": {
    "fcmOptions": { "link": "https://ollyofc.vercel.app/games/abc" }
  }
}
```

Keep `body` short. Use the same display title helper as the games list (`getGameDisplayTitle`). Icon: `/pwa-192x192.png`.

---



## Platform limits (do not promise “everyone’s phone”)


| Surface                               | New-game push                                       |
| ------------------------------------- | --------------------------------------------------- |
| Android Chrome (tab or installed)     | Works after permission                              |
| Desktop Chrome / Edge                 | Works after permission                              |
| iOS Safari **tab**                    | No                                                  |
| iOS **Add to Home Screen**, iOS 16.4+ | Works after permission **inside** the installed app |
| Firefox                               | No FCM; skip or use raw Web Push later              |


Copy on Profile should say: on iPhone, install Ollyo FC first, then enable notifications.

---



## Security and abuse

- Never send FCM from the browser with a server key.
- Notify API: staff ID token + role check. Rate-limit loosely (one call per create is enough).
- Do not accept an arbitrary token list from the client.
- Collection group `fcmTokens` must not be world-readable in rules.
- `vercel.json` must **not** rewrite `/firebase-messaging-sw.js` to `index.html` (static file wins if it exists in `dist/`).

Firestore today allows any signed-in user to create a game. If that stays, a non-staff user could create a game but **not** call the notify API successfully (role check). Tighten `games` create to `isStaff()` in the same change if we want rules to match the UI.

---



## What not to do

- `new Notification()` from `onSnapshot` as the only mechanism.
- `generateSW` empty `push` handler “to pass Lighthouse”.
- Topics named `games` without a plan to unsubscribe leavers.
- Notifying on `updateGame` (date changes would spam).
- Edge runtime for `firebase-admin`.
- Prompting for permission on the landing page.
- Storing VAPID **private** key in the client (only the public VAPID key is `VITE_`).

---



## Implementation order

Each step is shippable.

### Phase 1 — Receive

1. Create Web Push VAPID key in Firebase Console; add `VITE_FIREBASE_VAPID_KEY`.
2. Add `public/firebase-messaging-sw.js` (background display + click → game URL).
3. Client: `getMessaging`, permission, `getToken`, write `users/{uid}/fcmTokens/{id}`.
4. Profile toggle: enable / disable (delete token + `deleteToken`).
5. Firestore rules for the tokens subcollection.
6. Foreground `onMessage` → toast.



### Phase 2 — Send on create

1. Service account env on Vercel.
2. `api/notify-game-created.ts` (Node): verify staff, load game, multicast, prune dead tokens.
3. `createGame` / Games page: POST after successful create; distinct toast if notify fails.
4. Optional: `allow create` on `games` → `isStaff()`.



### Phase 3 — later

1. Cloud Function trigger so every `games` create notifies.
2. Reminders before kick-off.
3. Merge FCM into a single `injectManifest` worker.
4. Quiet hours / per-user mute.

---



## Console and env checklist

Firebase Console:

- Cloud Messaging enabled.
- Web Push certificates → key pair (VAPID).
- `ollyofc.vercel.app` already an Auth authorized domain.

Vercel:

- `VITE_FIREBASE_VAPID_KEY`
- `FIREBASE_SERVICE_ACCOUNT` (or split service-account fields)
- Redeploy after env changes

Google / Apple:

- No extra OAuth redirect for FCM.
- iOS: users must grant permission in the **installed** PWA.

---



## How to verify

1. Two browsers (or phone + laptop), both signed in, both opted in on Profile.
2. Third session as staff: create a game.
3. Recipients with the app **closed** get a system notification; tap opens the game.
4. Recipient with the app **focused** gets the in-app toast, not a double banner.
5. User who denied permission: no token, no notify, create still succeeds.
6. iPhone Safari tab: permission should fail or be unavailable; Home Screen app can grant it.
7. Invalid token: next send deletes it; later sends still work for other devices.

---



## Success criteria

v1 is done when:

- Staff create on `/games` still saves the match if push fails.
- At least one opted-in Android or desktop Chrome device gets a system notification while the PWA is not focused.
- Tap lands on that game’s page.
- iPhone behaviour is documented (install required), not treated as a bug.
- No FCM server credentials in the client bundle.

That is “new game → ping the squad.” It is not a full match-day notification product.