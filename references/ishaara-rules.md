# Codenames: Rules & Design Reference
*Reference for designing Ishaara. Compiled 9 Nov 2026 from the Czech Games Edition (CGE) rulebook, CGE's pages on Codenames Online (codenames.game) and secondary sources listed at the end. All rules are paraphrased, not quoted.*

**How to read this document**
- ✅ **Verified**: stated in the CGE rulebook or on CGE's own pages.
- 🔎 **Secondary**: from retailer listings, reviews or Wikipedia.
- 💡 **Analysis**: my design reading. It is not an official rule or a statement of the designer's intent.

> **Corrections to the brief.** Four points in the original outline don't match the sources:
> 1. The rulebook gives **no formal penalty for breaking the straight-face rule**. That rule is etiquette. The only formal penalty is for invalid clues.
> 2. **codenames.game does not enforce rules.** It doesn't check clues, and when the timer runs out it doesn't end the turn. The separate paid *Codenames App* is the version that validates clues.
> 3. The online timer has **four modes**: none, manual, per-team pool and per-role. There is no "hourglass vs chess clock" choice as such, though manual works like an hourglass and per-team works like a chess clock.
> 4. Foreign words aren't banned outright. A foreign word is fine if English speakers actually use it in English. Rhymes and letters aren't banned outright either: each is legal when it points to meaning.

---

## 1. Game Overview & Core Loop

| Item | Detail |
|---|---|
| Designer / publisher | Vlaada Chvátil / Czech Games Edition, 2015 🔎 |
| Awards | Spiel des Jahres 2016, Origins Awards 2015 🔎 |
| Players | Standard play needs 4 or more in two teams. The box says 4–8+, with 6 recommended 🔎. The rulebook adds 2- and 3-player variants ✅ |
| Time | 15–30 minutes 🔎 |

**Premise ✅.** Two rival teams, red and blue, each have a set of secret agents hidden among 25 codewords. Each team's spymaster knows which words are theirs. The spymaster gives one-word clues, and the team's field operatives try to touch only their own team's words.

**Roles (asymmetric) ✅**
- **Spymaster (one per team).** Sees the secret key card. Gives exactly one clue per turn, made of one word and one number. Must not react while teammates discuss. Covers each touched card with the colour the key shows.
- **Field operatives (everyone else).** Can't see the key. They discuss the clue, then touch one word at a time.

**Win and loss ✅**
- **Win:** your team's agents are all covered first. This can happen on the *other* team's turn, if they touch your last agent.
- **Instant loss:** one of your operatives touches the **assassin**.

**Core loop:** Spymaster gives a clue → operatives discuss → operatives touch a word → the result is revealed → they keep guessing or the turn ends → the other team takes its turn.

---

## 2. Board Setup & Mathematical Distribution (5×5)

### Box contents (original and 2025 refresh) 🔎
- 200 double-sided word cards, giving 400 codewords
- 40 key cards
- 16 agent cards (8 red, 8 blue), 1 double agent card, 7 bystander cards and 1 assassin card
- A sand timer and a card stand
- The 2025 refresh revised the word list, art and rulebook layout. The listings mention **no rule changes**.

### Setup ✅
1. Deal 25 random word cards face up in a 5×5 grid.
2. The spymasters draw a random key card and put it in the stand between them. Either way up is fine, so each key card gives two layouts.
3. The four lights on the key card's edge show which team **starts**.
4. The starting team takes the **double agent** card, turned to its own colour. That gives it **9** agents; the other team has **8**.

### Distribution
| Identity | Cards | Share of grid | What happens if it's touched |
|---|---|---|---|
| Starting team's agents | 9 (8 + double agent) | 36% | Good for that team |
| Second team's agents | 8 | 32% | Good for that team |
| Innocent bystanders | 7 | 28% | Turn ends |
| Assassin | 1 | 4% | The team that touched it loses |

💡 **Odds of a blind first guess** (starting team): 36% own agent, 32% enemy agent, 28% bystander, 4% assassin. Clues exist to beat these odds.

### Turn order and the 9:8 asymmetry
- The key card decides who starts. Because key cards are random, so is the first team.
- The team that moves first must find one extra word. 💡 This offsets the tempo advantage of going first. Section 5 covers it in more detail.

---

## 3. Turn Structure & Guessing Mechanics

### Step by step ✅
1. **Clue.** The spymaster says **one word and one number**. The number is how many grid words the clue relates to.
2. **Discussion.** Operatives talk it through. The spymaster keeps a straight face and doesn't reach for cards.
3. **Contact.** An operative **touches** a word. In the official rules, touching is the commitment; pointing while you talk doesn't count.
4. **Resolution.** The spymaster checks the key and covers the word with the matching card. If the team touched a different word from the one they meant, the touched word still counts.
5. **Continue or stop.** If the word was the team's own agent, they may guess again. Otherwise the turn ends.

### Guess limits ✅
| Rule | Detail |
|---|---|
| Minimum | **At least one guess per turn**, even for a 0 clue |
| Maximum | **Clue number + 1** |
| The +1 | Lets the team catch a word missed on an earlier clue. Guesses at older clues count toward the current limit |
| Stopping | Operatives may stop at any time after the first guess |

### Special clue numbers ✅
| Clue | Meaning | Guesses allowed |
|---|---|---|
| **0** | "None of our words relate to this." Use it to warn the team away from words | Unlimited, but at least one guess is still required |
| **Unlimited (∞)** | "Several earlier words are still out there." Gives no count | Unlimited, at least one |
| **1–9** | Normal | Up to number + 1 |

### Outcome of touching each card ✅
| Card touched | Covered with | Turn | Game |
|---|---|---|---|
| Own agent | Own colour | **Continues** if guesses remain | Your team wins if it was your last agent |
| Enemy agent | Enemy colour | **Ends immediately** | The enemy wins if it was their last agent |
| Innocent bystander | Bystander card | **Ends immediately** | Continues |
| Assassin | Assassin card | — | **Ends immediately: the touching team loses** |

---

## 4. Clue-Giving Rules, Edge Cases & Penalties

### A legal clue ✅
- **One word and one number**, with nothing added: no explanations, gestures or tone hints.
- It must be about **meaning**. Clues about spelling, letters, word length, grid position, or the number itself are invalid.
- It **may not be a word still visible on the grid**, nor any form of one: a different tense, a plural, a derivative, or part of a compound word. A word becomes usable once it is covered.
- It must be in **English**, or a foreign word that English speakers use naturally.

### Invalid clues (core rules) ✅
| Type | Status |
|---|---|
| Sound-only rhyme | Invalid. A rhyme that also points to meaning is fine |
| Letter count or starting letter | Invalid. A letter is valid when it means something, as in "letter-shaped" uses |
| Grid position ("top row") | Invalid |
| Translating a grid word into another language | Invalid. Foreign words are allowed only when used in English |
| Any form, root or compound part of a visible word | Invalid until that word is covered |
| Made-up words or invented compounds | Invalid |
| Made-up proper names | Invalid. Real names are fine |

### Edge cases in the core rules ✅
- **Homonyms.** Words spelled the same count as the same word, however they're pronounced. Words that sound alike but are spelled differently count as different words.
- **Spelling.** The spymaster may spell a clue out, and must if asked. British and American spellings count as one word.
- **Letters and numbers** are fine as clues when they refer to meaning.

### Flexible rules (the group decides before play) ✅
| Topic | Option |
|---|---|
| Compound words | May allow existing compounds, never invented ones |
| Proper names | May allow multi-word names, titles and place names |
| Acronyms and abbreviations | May allow common ones. Words that began as acronyms, like *laser*, *radar* and *sonar*, are always fine |
| Homonyms | May allow sound-alikes |
| Rhymes | May allow any rhyme, but the spymaster mustn't say it's a rhyme |
| Disputes | If the **opposing spymaster approves** a doubtful clue, it is valid. It's fine to ask them quietly |

### Penalties ✅
- **Invalid clue:** the team's turn **ends immediately**. The **opposing spymaster may cover one of their own agents** for free before giving their next clue.
- **An invalid clue nobody notices** stands as valid.
- **Straight face:** the spymaster shouldn't react while operatives deliberate, and operatives should watch the table, not the spymaster. **The rulebook gives no formal penalty for this.** 💡 Groups that want one usually apply the invalid-clue penalty.

---

## 5. Game Design Principles & Balancing (💡 analysis)

**1. Polysemy is the engine.** About 400 words, mostly concrete nouns with several meanings (*bank*, *bark*, *spring*), mean any single clue can pull in several unrelated words. That overlap makes the game: each clue tries to tie several of your words together while steering clear of everyone else's.

**2. 25 words in a 9/8/7/1 split.** About two-thirds of the board is a hazard to any given team. That's enough for 2–3-word clues to be risky without being impossible. One assassin among 25 words (4%) gives a constant, catastrophic risk without making a blind guess hopeless.

**3. Risk vs reward.** Higher numbers end the game sooner, but each extra word widens the clue's meaning and pulls in enemy agents, bystanders or the assassin. Operatives also face a stop-or-push choice after every correct guess. The assassin turns "push" into a real gamble.

**4. The +1 guess as catch-up.** A bold clue that only partly lands leaves "orphan" words behind. The +1 lets the team collect them on a later turn without the spymaster spending a clue on them. A team that falls behind can recover several words in one turn, which stops leads from snowballing. The 0 and ∞ clues extend the same idea.

**5. First-turn advantage.** The first team gets more turns on average, so it must find 9 words against 8. Wrong guesses also hand words to the other team: touching an enemy agent ends your turn *and* moves them closer to winning. That's a second balancing force, because mistakes help the opponent directly.

**6. Mixed cooperation and competition.** A team agrees inside itself and races against the other team, and the spymaster is trusted but has to stay silent. That tension drives the party energy: the spymaster can see the team's mistakes coming and can't say a word.

---

## 6. Web Implementation (codenames.game)

### Basics
| Item | Detail |
|---|---|
| Cost and access | Free, in the browser, no install or account ✅ |
| Rules | Same as the tabletop game; **the site enforces nothing** ✅ |
| Room size | Up to 64 players, at most 32 per team ✅ |
| Word languages | About 40–45 languages (CGE pages give different counts). The interface comes in fewer languages ✅ |
| Voice | None built in. Players use Zoom, Discord or similar ✅ |
| Launch | Duet was announced free online in Feb 2021 🔎. Wikipedia dates the official web versions to 2022, so sources disagree |

### Lobby and roles ✅
- **Create room** → pick the interface language → pick the word language and word packs → share the room link (found under *Players*).
- Change team or role from your nickname menu (top right): *Switch to…* (spymaster or operative) or *Become spectator*.
- Classic mode needs at least 4 players; Duet needs at least 2.
- One room runs one game at a time. Starting a new game ends the current one.
- **One shared device:** the spymaster types the clue, then switches to operative view so the others can guess without seeing colours. Separate browser windows with different nicknames also work.

### Suggesting vs committing a guess ✅
- **Clicking a card's body** adds a tag with your name. This **suggests** the card to teammates without revealing it.
- **Clicking the hand icon** in the card's top-right corner **confirms the guess** and reveals the card. This replaces the physical touch.

### Timers ✅ (set by the host, top-left button)
| Mode | How it works | Tabletop equivalent |
|---|---|---|
| Off | No timer | — |
| Manual | Any player starts it when someone is taking too long | The sand timer |
| Automatic, per team | Each team has one time pool to split between clue and guesses | Chess clock |
| Automatic, per role | Spymasters and operatives get separate limits | — |

When time runs out, **the turn does not pass automatically.** Players decide what happens, as they would at a table.

### Custom words and packs ✅
Use the standard list or upload your own words, and choose how many words a session uses.

### Accessibility ✅
A colour-blind mode adds a symbol to each card's top-left corner.

### Duet (2-player co-op) on the same site ✅
- Two players or two teams cooperate on one 5×5 grid, and **each side sees a different key**.
- Each side's key has **9 agents and 3 assassins**, with the rest bystanders. The keys overlap partly, so there are **15 agents** to find between them.
- Players take turns giving clues to each other. A bystander ends the turn; an assassin loses the game for both.
- **Time bank:** the standard game has 9 turns. When it runs out, **sudden death** starts: no more clues, guess freely, and any wrong guess loses.
- The tabletop Duet adds a mission map, where different missions change the number of turns and errors allowed, and a scoring system. I didn't find confirmation that the online version has the full mission map.

### The separate paid app (not codenames.game) ✅
**Codenames App** (iOS/Android, Sept 2024) differs from the website:
- It **checks clues automatically**: it blocks forms of board words and letter- or length-based clues, and sends unknown words to a player jury.
- It plays asynchronously, with at most 4 players.
- Zero and ∞ clues are set with a slider.
- It keeps a clue log.

---

## 7. Summary Tables

### Card types and outcomes
| Card | Count (starting / second team) | Turn | Game | Cover |
|---|---|---|---|---|
| Own agent | 9 / 8 | Continues (within the limit) | Win when your last one is covered | Own colour |
| Enemy agent | 8 / 9 | Ends | Enemy wins if it was their last | Enemy colour |
| Innocent bystander | 7 | Ends | — | Bystander |
| Assassin | 1 | — | **Toucher loses** | Assassin |

### Clue numbers compared
| Clue | Message to team | Max guesses | Min guesses | +1 applies? | Typical use |
|---|---|---|---|---|---|
| 1–9 | "This many words fit" | N + 1 | 1 | Yes | Normal play |
| 0 | "None of ours; avoid these" | Unlimited | 1 | No (already unlimited) | Warn off the assassin or an enemy cluster |
| ∞ (Unlimited) | "Several earlier words are still unfound" | Unlimited | 1 | No | Catch-up near the end of a game |

### Penalties and enforcement
| Situation | Tabletop | codenames.game | Codenames App |
|---|---|---|---|
| Invalid clue | Turn ends; opposing spymaster covers one of their own agents | Not detected; players police it | Blocked before it's sent |
| Unnoticed invalid clue | Stands | Stands | — |
| Spymaster reacts to discussion | No formal penalty | — | — |
| Time runs out | Players decide | Players decide (no auto-pass) | Asynchronous |

---

## Appendix: What this means for Ishaara (💡)

**Stay clear of their protected expression.** Game mechanics generally aren't protected by copyright. Names, rule text, art, terminology and look generally are. Ishaara already differs:
- Teams are Sun and Moon, not red and blue.
- "Trap" and "Blank" replace "assassin" and "bystander".
- "Clue-giver" replaces "spymaster", and there are no spy or "agent" themes.

Keep it that way. Also avoid:
- Copying their rulebook wording or structure, or their example clues.
- A "double agent" card, key-card "lights", or a word list taken from theirs.
- Using "Codenames" in your marketing.

I'm not a lawyer. If Ishaara goes public, a short IP review would be worth the cost.

**Decisions this research raises for Ishaara**
1. **Clue checking.** Their website checks nothing; their app blocks board-word forms. Typed Ishaara clues could block exact matches and simple forms of grid words (plurals, tenses), and let the opposing clue-giver approve anything doubtful.
2. **Invalid-clue penalty.** Automate it: the turn ends and one of the other team's words is revealed for them. That is the same rule, applied by the app instead of a person.
3. **+1, 0 and ∞.** Keep all three; the round-2 clue entry already offers 0–9 and ∞. Show *guesses left* as number + 1, unlimited for 0 and ∞, and require at least one guess.
4. **Suggest vs confirm.** This matches Ishaara's select-then-Confirm board, which is the right choice for a shared table screen.
5. **Timer.** Offer Off, Manual, Per team and Per clue-giver/guessers. Decide whether a timeout **auto-ends the turn**. The online version doesn't, but on a single table screen auto-ending is clearer.
6. **Colour-blind mode** shouldn't be needed: Sun ●, Moon ◐, Blank stripes and Trap ✕ are always visible.
7. **Co-op or 2-player variant.** Their Duet needs two different keys and a turn bank. If you want a 2-player Ishaara, design your own co-op structure rather than copying Duet's 9/3 layout and missions.

---

## Sources
- [CGE Codenames rulebook (archived PDF)](https://cs.uwaterloo.ca/~dtompkin/archive/dtlib/base/Codenames.pdf)
- [Codenames Duet rules (PDF)](https://lot.ahml.info/CodenamesDuet.pdf)
- [codenames.game FAQ](https://codenames.game/faq)
- [codenames.game news: timers](https://www.codenames.game/news/2)
- [CGE: Codenames App vs Codenames Online](https://codenamesgame.com/news/codenames-app-vs-codenames-online-whats-the-difference)
- [CGE: Play online](https://codenamesgame.com/play-online)
- [Codenames App FAQ: rules and clues](https://faq.codenamesapp.com/en/gameplay/how-to-play/rules-and-clues/)
- [Board Game Quest: Duet playable online (2021)](https://www.boardgamequest.com/codenames-duet-is-now-playable-online/)
- [Wikipedia: Codenames (board game)](https://en.wikipedia.org/wiki/Codenames_(board_game))
- [Miniature Market: box contents](https://www.miniaturemarket.com/cge00031.html)
- [Goblin Games: 2025 refresh listing](https://goblingames.nz/products/codenames-2025-refresh)
- [Common Sense Media: Codenames Online review](https://www.commonsensemedia.org/website-reviews/codenames-online)