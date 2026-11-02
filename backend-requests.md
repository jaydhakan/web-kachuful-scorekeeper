# Backend requests

Things the web app needs from `../backend-kachuful-scorekeeper`. The API in `HANDOFF.md` is the contract, so these are asks, not changes the app assumes.

**Note:** the backend repo was not on this machine when this was written, so the items below are *unverified* against `HANDOFF.md`. Please tick off what already works.

## 1. Edit players you created (name, first/last name, email)
App calls `PATCH /api/players/{id}` with any of `displayName`, `email`, `firstName`, `lastName` (already used for the user's own player).

Need confirmed or added:
- [ ] A player's **creator** (and admin) may change `displayName`, `firstName`, `lastName` and `email` of players they created, not only their own. (HANDOFF §5.7 as the app reads it covers email and photo only.)
- [ ] `displayName` clash returns a distinguishable `409` with code `name_taken`, and an email clash `email_taken`.
- [ ] The response is the full updated `Player` with a new `updatedAt`, so other devices pick it up through `updatedSince`.
- [ ] Renaming does not break past games: games reference players by id, names shown come from the player record.

## 2. (Only if needed) clearing fields
- [ ] `firstName`/`lastName` accept `null` to clear. The app already sends `null`.

## 3. Delete my data / start fresh
Only `DELETE /api/games/{id}` exists as far as the app knows. Asks:
- [ ] An endpoint (e.g. `DELETE /api/me/data`) that removes the games the caller owns and the players they created, or anonymises them.
- [ ] Decide what happens to games shared with others (the other players' stats, the global board): keep with the caller's seat anonymised, or delete.
- [ ] Whether the account itself is kept (fresh start) or also deleted (`DELETE /api/me`).
- [ ] Returns once done, so the app can then clear its own copy.
