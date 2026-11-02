# Plan — edit the players you added

Status: **edit sheet built (sheet, email hidden when signed out). Reset below is a proposal, not built.**

## What exists today
- **Players** is already in the hub menu (`hubNav.tsx`) and `PlayersPage` lists/searches everyone in the registry. Rows only open the player's stats page.
- Signed out: `patchLocal()` in `registry.ts` can rename a local player and set first/last name, but **no screen calls it**.
- Signed in: `ep.patchPlayer(id, {displayName, email, firstName, lastName, emoji, color})` exists and the Account page uses it for *your own* player. `PlayerPage` lets admin / creator / linked user change the **photo** only (`mayEdit`).
- So the gap is the UI, plus one open backend question (see `backend-requests.md`).

## Proposal
1. **Edit from the list.** Each row in `PlayersPage` gets an Edit button (44px target, beside the row's open button). It opens a sheet with: Name, First name, Last name, Email (+ Save / Cancel). Same fields and validation as the Account page, reusing its form pieces where possible.
2. **Who can edit what.**
   - Signed out: every player is local, all fields except email are editable via `patchLocal` (email is not stored locally).
   - Signed in: edit shown only when `mayEdit(player, user)`; others show no button. Save calls `ep.patchPlayer`, then `keepPlayer` updates the registry copy.
3. **Errors/states.** Name taken (local `patchLocal` returns false; server 409 `name_taken`), invalid email, offline/failed save (stay open, message inline), saving spinner. Email can be added or changed, never cleared (matches Account page).
4. **Offline signed-in edits.** Outbox already has a `patchPlayer` kind; queue the edit when offline instead of failing. Needs a check that the engine actually drains it for non-self players.
5. **Strings** in `src/strings/hub.tsx` (`people.*`), tests for the sheet and for the `mayEdit` gating.

## Files (~5, hence this plan)
`PlayersPage.tsx`, new `sheets/EditPlayerSheet.tsx`, `strings/hub.tsx`, `state/registry.ts` (small: return reason on name clash), tests.

## Open questions for Jay
- Edit as a **sheet** (my pick) or a separate page?
- Should signed-out users be able to set an email at all? (My pick: hide the field.)

## Proposed next: "Start fresh" (reset)
Worth having, but two very different things, so two buttons in Account:
1. **Reset this device** (no backend needed): clears the current game, archive, saved players and prefs, with a typed confirmation. Signed in, it signs out first.
2. **Delete my data on the server**: removes the games this account owns and the players it created. Only per-game delete exists today (`DELETE /games/{id}`), and games are shared with other people's stats and the global board, so this needs a backend decision (see `backend-requests.md` §3). The app should not loop over per-game deletes as a stand-in.
Both need a "this cannot be undone" confirm and an offer to export first.
