# Backend requests — Emerald Gilt theme

Working doc for `../backend-kachuful-scorekeeper`. Delete it once the work below is committed. Never commit it.
Do this after the whole frontend for the theme is done (see `docs/EMERALD-GILT-PLAN.md`).

## 1. Accept the theme id `emerald-gilt`

**What:** add `EMERALD_GILT = "emerald-gilt"` to `Theme` in `app/domain/appearance.py`.

**Why:** the app is adding a fourth theme. Today `PUT /api/admin/settings/appearance` and
`PATCH` on the preferences endpoint validate `theme` against that enum (`app/schemas/appearance.py`,
`app/schemas/auth.py`), so the server answers 422 for the new id. The app then keeps the admin's choice on that
device only and it never reaches anyone else.

**What stays the same:** the request and response shapes, the default (`sunset-glass`), and every existing id.
The theme is stored as a plain string in the settings and preferences tables, so **no migration is needed**.

**Tests to add** (in `tests/api/`):

- `test_appearance.py`: an admin can `PUT` `emerald-gilt`, and `GET /api/settings/appearance` returns it.
- `test_preferences.py`: a player can save `emerald-gilt` as their own theme.
- The existing "unknown theme → 422" case still passes.

**Also:** update the API contract doc and the OpenAPI field descriptions if they list the themes. The project's
CLAUDE.md calls the contract `HANDOFF.md`, but it isn't at the backend root; find where the contract lives now and
update it there.

## 2. Worth considering: a stored id the code no longer knows

`app/services/appearance.py` builds `Theme(values[THEME_KEY])`. If the enum ever lost an id that is already stored
(for example, rolling back this change after an admin picked Emerald Gilt), that line would raise and the public
`GET /api/settings/appearance` would fail. Falling back to the default when the stored value is unknown would make a
rollback safe. This is the backend's own robustness and doesn't change the API; your call.
