# Backend requests from the three-theme redesign

Contract today: `../backend-kachuful-scorekeeper/HANDOFF.md`
(§6 API reference). Nothing here is faked in the app: every request has a client fallback that works signed out,
offline and against today's backend.

## Summary

| #   | Feature                                    | Screen               | Priority | Client fallback in place                              |
| --- | ------------------------------------------ | -------------------- | -------- | ----------------------------------------------------- |
| 1   | Appearance settings (theme for everyone)   | Admin › Appearance   | must     | yes: saved on this device only, with a notice         |
| 2   | Per-player theme preference                | Menu › Theme         | should   | yes: saved on this device                             |
| 3   | Setup defaults per account (count, decks)  | Setup step 1         | should   | yes: last group on this device (`kachuful.lastGroup`) |
| 4   | Resume summary on Home for signed-in users | Home › Continue card | nice     | yes: the game saved on this device                    |
| 5   | Remembered names across devices            | Setup step 2         | none     | already served by `GET /api/players` (see below)      |
| 6   | Standings trend per round                  | Scoreboard, Summary  | none     | derived on the client from stored rounds (see below)  |

## Request 1: Appearance settings

- **Screen and design element:** Admin page, new "Appearance" section (`src/screens/pages/AdminPage.tsx`): three live
  preview cards, "Preview on this device", "Apply to everyone" with an 8-second Undo, "Let players choose their own
  theme", and "Last changed by … on …" (`docs/codebase/DESIGN-SYSTEM.md`, Switching themes).
- **What the app does today:** one look, built in. Nothing to read or store.
- **What the new design needs:** an admin picks the theme everyone sees, at runtime, without a deploy; optionally lets
  each player pick their own; and everyone's app picks up a change soon after.
- **Proposed API:**
  - `GET /api/settings/appearance`: public (signed out allowed), `ETag` and `Cache-Control: max-age=60`.
    ```json
    {
      "theme": "sunset-glass",
      "allowUserOverride": false,
      "updatedAt": "2026-11-01T10:00:00Z",
      "updatedBy": "Jay"
    }
    ```
    `updatedBy` is the admin's display name, or `null` before anyone has changed it. Before the first change the
    server answers with the default (`"sunset-glass"`, `false`, `null`, `null`), never 404.
  - `PUT /api/admin/settings/appearance`: admins only.
    ```json
    // request
    { "theme": "yerba-sun", "allowUserOverride": true }
    // 200 response: the stored object, as GET returns it
    { "theme": "yerba-sun", "allowUserOverride": true, "updatedAt": "2026-11-01T10:40:00Z", "updatedBy": "Jay" }
    ```
    `422 invalid` when `theme` is not one of `sunset-glass`, `yerba-sun`, `editorial-paper`, or `allowUserOverride`
    is not a boolean. Same error shape as HANDOFF §6.1.
  - Optionally also return `appearance` inside `GET /api/bootstrap`, so a signed-in start makes one request, not two.
- **Data model change:** an `app_settings` table, one row per key (`theme.default`, `theme.allow_user_override`),
  defaults `sunset-glass` and `false`; and `app_settings_audit (id, key, old_value, new_value, changed_by_user_id,
changed_at)`, one row per change, so "who changed the theme and when" is answerable. No change to existing rows.
- **Auth and permissions:** read is public (the theme is not private and signed-out devices need it too). Write is
  admin only, checked on the server: 401 signed out, 403 `forbidden` for members (as HANDOFF §6.4). The UI hides the
  section from members, but that is not the enforcement.
- **Freshness:** the app has no per-user push channel (the only SSE stream is the public live link, HANDOFF §6.7), so
  clients read the setting at start, when the app comes back to the front (`visibilitychange`), and every 5 minutes
  while open, with `If-None-Match`, so an unchanged setting costs a 304. If a per-user event stream is added later, a
  `settings.appearance` event should replace the polling.
- **Offline behaviour:** the last setting seen is cached on the device (`kf.theme.appearance`, `kf.theme`) and applied
  before the app draws (the boot script in `index.html`). An admin change made offline is not queued: the section says
  it was saved on this device only, and the admin applies it again when online. No conflicts to resolve: last write
  wins, and the audit table keeps every write.
- **Client fallback shipped meanwhile:** when `GET /api/settings/appearance` fails (404 today, or offline), the
  Appearance section still works, stores the choice on this device and says "Saved on this device only". Every other
  device keeps its own theme, defaulting to Sunset Glass.
- **Open questions:** should a theme change also be announced in Activity? Should "Let players choose" reset existing
  player choices when switched off (the client simply ignores them while it is off)?

## Request 2: Per-player theme preference

- **Screen and design element:** the Menu's "Theme" row, shown when the admin allows players to choose
  (`docs/codebase/DESIGN-SYSTEM.md`, Switching themes: resolution order).
- **What the app does today:** nothing (new).
- **What the new design needs:** a signed-in player's choice follows them to their other devices.
- **Proposed API:** `PATCH /api/me/preferences` with `{ "theme": "editorial-paper" }`, or `{ "theme": null }` to go
  back to the admin's default; 200 returns `{ "theme": "editorial-paper" }`. Also returned by `GET /api/auth/me` as
  `preferences.theme`. `422 invalid` for an unknown theme. Honoured only while `allowUserOverride` is true; the server
  keeps the value either way so switching the option back on restores it.
- **Data model change:** `users.preferences` (JSON, default `{}`), or a `user_preferences` table.
- **Auth and permissions:** the signed-in user, for themselves only. Signed out: the choice stays on the device.
- **Offline behaviour:** applied at once on the device (`kf.theme.user`) and sent when online; the latest write wins.
- **Client fallback shipped meanwhile:** the choice is stored on this device only.

## Request 3: Setup defaults per account

- **Screen and design element:** Setup step 1, "Last-used count preselected" and the deck choice
- **What the app does today:** remembers the last group on this device (`kachuful.lastGroup`: names, avatars, colours,
  direction, decks) and offers "Use last group".
- **What the new design needs:** the same defaults on any device the player signs in on.
- **Proposed API:** the same `PATCH /api/me/preferences`, with
  `{ "setup": { "playerCount": 5, "decks": 1, "direction": "cw" } }`; returned by `GET /api/auth/me`.
- **Data model change:** inside `users.preferences` (Request 2).
- **Auth and permissions:** the signed-in user only.
- **Offline behaviour:** the device's last group wins locally; the newest `updatedAt` wins when both exist.
- **Client fallback shipped meanwhile:** the device's own last group, as today. No UI change was needed for this.

## Request 4: Resume summary on Home for signed-in users

- **Screen and design element:** Home, game in progress: the Continue card.
- **What the app does today:** shows the game saved on this device. A game started on another device appears in
  History once it finishes.
- **What the new design needs:** a signed-in player sees their unfinished game from another device as "Resume".
- **Proposed API:** a filter on the existing list, `GET /api/games?status=active&limit=1`, answering the newest
  unfinished game the user owns with its `summary` (round, leader, progress), or `[]`.
- **Data model change:** none if unfinished games are already synced (HANDOFF §5.1); an index on `(owner, finished_at)`.
- **Auth and permissions:** the signed-in owner only.
- **Offline behaviour:** not shown offline; the local game always wins over a remote one.
- **Client fallback shipped meanwhile:** the device's own saved game, as today.
- **Open questions:** taking over a game mid-round from another device needs a rule for two devices playing at once;
  until then the card would open it read-only.

## Not requests (checked)

- **Remembered names across devices:** signed in, setup already suggests the account's circle from `GET /api/players`
  (HANDOFF §6.5), which is the same on every device. No new endpoint is needed.
- **Standings trend (up or down per round):** derived on the client from the stored rounds (`src/domain/timeline.ts`),
  so it works signed out and offline. No server field is needed.
- **New awards, stats or preferences:** the redesign adds none.
