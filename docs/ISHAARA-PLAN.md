# Ishaara plan

**Status:** final, for approval · **Date:** 2026-11-09 · **Working doc:** delete when the game ships in both repos,
never commit.
**Depends on:** [PLATFORM-PLAN.md](PLATFORM-PLAN.md) P0, P1a, P1, P2, P3, P6 (platform-level sign-in) and P8
(`games.kind`). Kaali Teeri's K3 (shared seating flow) if Kaali Teeri goes first; otherwise Ishaara does that lift.
**Sources:** `references/ishaara-rules.md` (Jay's genre research, used for mechanics only) + decisions below; screens
from Claude Design round 2 (`references/design-round2/png/ishaara-*`) with the additions in §3.1.

## 1. What we're building

**Ishaara** is our own two-team word game: our name, words, look and rules text; the genre's mechanics. Unlike Kachuful
and Kaali Teeri, **the app is the game**: it deals 25 words, holds the secret key and runs the turns. So it is
**signed-in only** and needs a connection.

- One **table screen** (the host's phone, tablet or laptop) shows the 25 words. Guessers pick words on it.
- Each team's **clue-giver** sees the **key** on their own phone, signed in.
- The **server** holds the key and decides what each pick reveals. The table screen never receives the key.

**Who signs in** (decided): the **host** and the **two clue-givers**. Guessers are seated from the players registry
by name and email, exactly as in Kachuful, so nobody needs an invite just to guess, and their results still count. If
a chosen clue-giver has no account, the host invites them (existing flow) or picks someone else.

## 2. Rules

Each rule becomes a test in phase I1.

### 2.1 The game

| Rule | Ishaara |
|---|---|
| Players | 4 or more, two teams of at least 2: **Sun** (orange, dot) and **Moon** (blue, crescent) |
| Roles | One **clue-giver** per team (sees the key on their phone); everyone else guesses |
| Grid | 25 words, 5 × 5 |
| Cards | Starting team **9**, other team **8**, **7 blank**, **1 trap** |
| Who starts | Random, drawn by the server; the starting team gets the 9 |
| A clue | **One word and one number** (0–9 or ∞) on the clue-giver's turn |
| Guesses allowed | Clue 1–9: up to **number + 1**. Clue **0** or **∞**: unlimited. **At least one guess every turn**: End turn is disabled until the first guess |
| Picking a word | Select, then **Confirm** (the shared screen's version of touching a card) |
| Own team's word | Revealed; guess again if guesses remain |
| Other team's word | Revealed for them; turn ends |
| Blank | Turn ends |
| **Trap** | The guessing team **loses at once** |
| Win | First team with all its words revealed, **even on the other team's turn** |
| Turn ends | End turn (after one guess), out of guesses, a miss, the timer, or a penalty |

### 2.2 Clues: language, checks, penalty

- **Language:** English, plus Hindi / Hinglish words the table actually uses.
- **One word:** no spaces; hyphenated words allowed.
- **Typed clues are checked by the app** as they're typed: blocked if equal to a word still face down, or a simple
  form of one (plural; `-s`, `-es`, `-ed`, `-ing`, `-er`), or containing one as a whole part (`sunlight` while `SUN` is
  face down). Case-insensitive. A word becomes usable once it's revealed.
- **What the app can't judge** (sound-only rhymes, letter or length clues, grid position, translating a grid word,
  invented words) is the table's call: the **other team's clue-giver** has **Not allowed** on their phone for the
  current clue until the first guess is confirmed.
- **Penalty, applied by the app:** the turn ends, and the other team's clue-giver **picks one of their own words to
  reveal** for free. If they haven't picked within 60 s, the host can tap **Skip** on the table (no free word).
- An invalid clue nobody challenges stands.
- **Spoken mode** (clue said aloud; the clue-giver taps only the number): no automatic check; the table shows
  "Clue given · 2"; Not allowed still works.

### 2.3 Timer

| Option | Behaviour |
|---|---|
| **Off** (default) | No timer |
| **Per turn: 1, 2 or 3 min** | Starts when the clue is sent; shown on the table and both clue phones; **when it runs out the turn ends automatically** |

How "automatically" works without a server scheduler (the backend runs no in-process scheduler): the server stores the
turn's deadline; the table screen sends `timeout` when it passes; the server accepts it only after the deadline. If the
table is offline at that moment, the next action after the deadline ends the turn first.

Not in v1: per-team time pools, separate clue-giver / guesser limits.

### 2.4 Words

Packs: **English (everyday)**, **Hinglish**, **Desi** (food, places, films, cricket), **Family** (simple words),
about 400 each, **written for Ishaara**: mostly concrete nouns with several meanings. **Never taken from another
game's list.** The host picks packs; no repeats within a session; custom words can be added. Draft lists go to you for
review in phase I0.

### 2.5 Match

Best of 1 by default, best of 3 as an option. **Rematch** keeps the seats, passes the clue-giver role to the next
player on each team (only players with accounts can take it; otherwise the host picks), and gives the first turn to
the team that went second.

### 2.6 Staying our own game

Our names and look everywhere: Sun / Moon, trap / blank, clue-giver; no spy or agent theme, no "double agent" card,
no key-card lights; our own word lists, rules text and examples. **The other game's name appears nowhere**: not in
the app, strings, code, commits, store text or marketing. The research file is a working doc (never committed,
deleted at the end). Before Ishaara is promoted publicly, a short IP review (your file's suggestion).

## 3. Screens

All four themes for the board, Sunset for the rest as drawn; both shells; loading, empty and error states.

**Table screen (host)**
1. **Setup — teams:** seat players into Sun and Moon (shared seating flow); pick each team's clue-giver from players
   linked to an account; "Invite" for someone who isn't.
2. **Setup — words and rules:** packs, custom words, timer, clue entry (typed / spoken), best of 1 / 3. **Start**
   creates the game on the server.
3. **Waiting for clue-givers:** "Riya and Dev, open play.vectanix.com/ishaara on your phone" + QR of that URL (public;
   the key is behind sign-in); each shows as joined when their key opens.
4. **Board** (phone portrait, phone landscape, tablet/laptop): team banner + shape, clue and number, guesses left,
   words left per team, timer; select → Confirm; End turn; reveal moments for own word, other team's word, blank, trap.
5. **Win:** winner and how (all found / trap / resign), the whole key, clue log, Rematch, Back to games.
6. **Reconnecting:** board dimmed and visible, picks disabled (never queued).
7. **Penalty pending:** "Dev is picking a Moon word to reveal" with Skip after 60 s.

**Clue-giver's phone** (plain and dark in every theme)
8. **Your games:** active games where this account is a clue-giver.
9. **Key gate:** "Make sure nobody else can see · Show key".
10. **Key + clue entry:** the 5 × 5 key (colour, shape, word), revealed words dimmed; on your turn the clue field
    (board-word check live) and number 0–9 / ∞; on the other team's turn their clue and **Not allowed** (until the
    first guess); after a penalty against them, "Pick one of your words to reveal". Wake lock on.

**Hub pages:** History (with clue logs), Leaderboard, Player stats, How to play.

### 3.1 Additions to the round-2 screens

Round 2 covers 1–6 and 8–10. Built in-repo in the same style: **Not allowed** on the clue phone, the **penalty pick**
on the clue phone and **penalty pending** (7) on the table, the live **clue check** message, **spoken mode**'s
"Clue given · 2", **best of 3** score. The clue phone's fixed hex tints become theme-independent tokens in
`themes.css` (no hex in components).

### 3.2 Accessibility and fairness

- Identity is never colour alone: Sun = orange + dot, Moon = blue + crescent, blank = grey + stripes, trap = black + ✕.
  Words contrast-tested on every card colour.
- The board is a grid of buttons ("RIVER, face down" / "RIVER, Sun's word"); turn changes announced politely.
- The table device never requests the key, even when the host is also a clue-giver (they use a second device).

## 4. How it works: the server runs the game

```
table screen ─ POST action (guess / endTurn / timeout / undoLast / resign) ─▶ server (holds the key)
clue phones  ─ POST action (clue / notAllowed / penaltyReveal) ────────────▶     │ NOTIFY
clue phones  ─ GET key (only the two clue-giver accounts)                        ▼
table + clue phones ◀──────────────────────────── SSE (public state only) ── live hub
```

- **Create:** the host sends seats, teams, clue-givers, 25 words (picked on the device from the packs: words are
  public) and rules. The server draws the key and the starting team with `secrets` and stores the key apart from the
  public state.
- **Actions** carry a client `actionId` (a retry never acts twice) and the `rev` the device saw (stale → 409 with the
  current state). The server checks role and turn, applies the rules, bumps `rev`, and NOTIFYs.
- **Public state** never contains an unrevealed word's identity. The **key** is a separate endpoint, never in SSE, a
  list or bootstrap.
- **Undo:** only the last reveal, only from the table, within 10 s and before any other action (a mis-tap). Logged.
- **Abandoned games** end after 2 h idle via the existing auto-end CLI job pattern.

## 5. Data model

### 5.1 TS domain (`src/games/ishaara/domain/`, pure; the backend's Python mirrors it)

```ts
type Team = 'sun' | 'moon';
type Identity = Team | 'blank' | 'trap';
type ClueNumber = number | 'inf';                  // 0–9 or ∞

interface IshaaraPublic {
  kind: 'ishaara'; schemaVersion: 1;
  id: string; rev: number; createdAt: number; updatedAt: number; finishedAt?: number;
  players: Array<Player & { team: Team; role: 'clue-giver' | 'guesser' }>;
  words: string[];                                 // 25
  revealed: Array<Identity | null>;                // 25; null = face down
  starting: Team; turn: Team;
  clue: { team: Team; word: string | null; number: ClueNumber } | null;   // word null in spoken mode
  guessesLeft: number | 'inf'; guessedThisTurn: number;
  deadline: number | null;                         // epoch ms, timer on
  pending: { penaltyFor: Team; since: number } | null;
  log: Array<{ at: number; team: Team; type: 'clue' | 'guess' | 'end' | 'timeout' | 'undo' | 'not-allowed' | 'penalty' | 'skip';
               word?: string; number?: ClueNumber; card?: number; identity?: Identity }>;
  rules: { timerSec: 60 | 120 | 180 | null; clueEntry: 'typed' | 'spoken'; packs: string[]; bestOf: 1 | 3 };
  match: { game: number; sunWins: number; moonWins: number };
  status: 'waiting' | 'active' | 'finished';
  winner: Team | null; endedBy: 'all-found' | 'trap' | 'resign' | 'abandoned' | null;
}
```

Pure functions, each tested: `dealKey(seed)` (tests and mock API only; production randomness is the server's),
`applyAction(state, key, action, now) → state | error`, `guessesFor(number)`, `remaining(state, key, team)`,
`clueAllowed(word, state)`, `isOver`, `stats(game, key)`.

### 5.2 Backend tables
- `games` row with `kind = 'ishaara'`, `payload` = public state, `rev`, `status`.
- **`ishaara_keys`**: game_id (PK, FK), key (25 identities), created_at. Only the key endpoint and finishing a game read
  it.
- **`ishaara_roles`**: game_id, player_id, user_id (nullable), team, role; one clue-giver per team.
- **`ishaara_actions`**: game_id, action_id (unique per game), seq, type, body, at, by_user_id: the audit log and the
  idempotency record.
- **`ishaara_game_players`** (derived when a game ends): game_id, player_id, team, role, won, words_found, wrong_picks,
  trap_hit, clues_given, avg_clue_number, penalties.
- **`ishaara_player_day`** for leaderboard periods.

## 6. Backend routes (written into `backend-requests.md` at I2, then built in the same task)

Players are shared with every game: include platform §8 item 5 (player-wide queries, unused-player delete, counters
and merge must count Ishaara games) in this phase's `backend-requests.md`.

| Route | Who | Purpose |
|---|---|---|
| `POST /api/ishaara/games` | signed in | Create: seats, teams, clue-givers (players linked to accounts), 25 words, rules |
| `GET /api/ishaara/games/{id}` | host, seated accounts, admin | Public state |
| `GET /api/ishaara/games/{id}/key` | **only the two clue-giver accounts** | The key (403 to everyone else, admin included) |
| `POST /api/ishaara/games/{id}/actions` | table (host): `guess`, `endTurn`, `timeout`, `undoLast`, `resign`, `skip`; that team's clue-giver: `clue`; the other team's clue-giver: `notAllowed` (before the first guess), `penaltyReveal` (one of their own words) | `{actionId, rev, type, …}` → new state; 409 `stale`, 403 `not_your_turn`, 422 `invalid_action {reason}` |
| `GET /api/ishaara/games/{id}/events` | as GET | SSE: `state` (id = rev), `joined`, `ping`, `ended` |
| `GET /api/ishaara/games?role=clue-giver&status=active` | signed in | "Your games" on the clue phone |
| `GET /api/ishaara/games` | signed in | History (`cursor`, `mine`, `involving`) |
| `DELETE /api/ishaara/games/{id}` | host, admin | Soft delete |
| `POST /api/ishaara/games/{id}/rematch` | host | Next game of the match, roles rotated |
| `GET /api/ishaara/leaderboard`, `/players/{id}/stats`, `/{a}/vs/{b}` | as Kachuful's | Boards |

New error codes (`not_your_turn`, `invalid_action`) are contract additions, listed in `backend-requests.md`.
Rate limits: 60 actions per minute per game; 20 creates per hour per user. SSE through the existing live hub (channel
`live` after the platform rename) with a `kind` field. nginx: the events path gets the same no-buffering block as
Kachuful's live events.

### 6.1 Security checks (each a test)
- The key never appears in GET game, lists, SSE, bootstrap, logs, error bodies or share images.
- Property test: over random games and action sequences, public state never holds an unrevealed identity.
- Only the two clue-giver accounts get the key; the host only if they are one.
- Replaying an `actionId` changes nothing and returns the same result.
- Wrong role, wrong turn, finished game, revealed card, `notAllowed` after the first guess, `timeout` before the
  deadline: error, no change.

## 7. Frontend structure

```
src/games/ishaara/
  domain/    types, applyAction, clue check, stats, word packs (JSON, lazy-loaded), fixtures
  state/     server state + a pending flag (no local engine of record); SSE client
  screens/   setup/, Waiting, Board, Win, Penalty, clue/ (YourGames, KeyGate, Key), desk/
  sheets/    rules, clue log, word packs
  strings/
  sync/      endpoints (one function per route), events (src/sync/ stays the only network code)
  index.tsx
```

- **No offline play.** Signed out: "Sign in to play" on the landing card and at `/ishaara`. Offline: "Ishaara needs a
  connection"; cached history still readable.
- Local storage: `ishaara.lastSetup` and recently used words (through `persistence.ts`). Cached history in an
  `ishaaraGames` archive store (read-only copies).
- Wake lock on the board and the key screen.
- Mock API implements the routes with the TS domain, so e2e runs without the backend.

## 8. Phases

Percentages are of this plan.

| # | Phase | Size | % at end |
|---|---|---|---|
| I0 | Word packs drafted (4 × ~400) for your review | M | 8% |
| I1 | TS domain: applyAction, clue check, stats, fixtures; every rule in §2 tested; property tests | M | 20% |
| I2 | Backend: `backend-requests.md`, then migration (5 tables), routes, Python rules mirror, key endpoint, actions, SSE, rematch, auto-end, security tests | L | 45% |
| I3 | Mock API routes + endpoints and events client | M | 52% |
| I4 | Table screens: setup, waiting, board, penalty, win, reconnecting | L | 68% |
| I5 | Clue phone: your games, key gate, key, clue entry, Not allowed, penalty pick | M | 78% |
| I6 | Landscape phone and tablet/laptop board | M | 85% |
| I7 | Hub pages: history, leaderboard, stats, how to play | M | 92% |
| I8 | Themes (all 4), a11y, two-device e2e, SSE load test, docs | M | 100% |

## 9. Testing

- **Domain:** every rule in §2; property tests (always 9 / 8 / 7 / 1; a revealed card changes only by undo; the game
  ends exactly when it should; guesses never exceed the limit; at least one guess before End turn).
- **Backend:** §6.1, plus happy path, every error code and permission; fixture parity; two concurrent picks on one game
  (row lock): one applies, one gets 409.
- **e2e with two browser contexts** (table + clue phone) on the mock API: full game to all-found; trap loss; clue
  blocked by the check; Not allowed → penalty pick; timer ends a turn; mis-tap undo; clue-giver joins late; table
  drops and recovers; rematch; signed-out landing; axe; 44px targets.
- **Manual:** a real game at a real table on phones before launch.

## 10. Risks

| Risk | Mitigation |
|---|---|
| Seen as a copy of a commercial word game | Own name, words, visuals and text; the other game's name nowhere; IP review before promoting publicly |
| A clue-giver can't sign in at the table | Host swaps clue-givers before Start; invite from the waiting screen |
| Bad connection at the table | Picks disabled while reconnecting, never queued; state reloads by `rev`; idempotent actions |
| Key leaks | Separate table and endpoint, never in SSE, security tests |
| Word lists offend or bore | You review the packs; Family pack kept simple; custom words |
| Server load (three SSE connections per game) | Same hub as live links; load test in I8 |

## 11. Out of scope (for now)

Everyone-on-their-own-phone mode, spectator links, more than two teams, a two-player co-op variant (would be designed
from scratch), per-team timers, achievements / awards / seasons (phase 2), UI translations.
