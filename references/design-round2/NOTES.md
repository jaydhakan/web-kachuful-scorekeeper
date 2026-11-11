# Notes — round 2

## Decisions I made
- **Same layout in every theme.** Borders are 1 px everywhere; Yerba’s heavy outline is a box-shadow, so nothing shifts. Headlines are short (“Pick a game”) so Cinzel caps fit on one line at the same size as the other faces.
- **Landing grows by switching layout, not size.** 1–3 games: a list (phone) / three big cards (desktop). 4+ games: a 2-column grid (phone) / 3 × 2 compact cards (desktop).
- **Game availability rules on the landing:** Kachuful and Kaali Teeri work signed out and offline. Ishaara shows “Sign in to play” when signed out and “Needs a connection” when offline, and the card says so instead of hiding.
- **Resume lists every unfinished game on this device**, newest first, Kachuful wording as you specified.
- **Landing menu:** account (photo, email, sync status, Sign out), Theme with an “Admins only” tag (hidden for everyone else), Credits, About.
- **Transition:** the tapped card’s art scales up uniformly from its own spot to cover the screen while the landing fades and shrinks to 0.96; the game then fades in and rises 16 px. Back reverses in 240 ms. Reduced motion: 150 ms opacity cross-fade both ways, nothing moves.
- **Kachuful changes are minimal:** the menu gets an “All games” card on top (with “Kachuful stays saved at round 8”); the desktop rail’s gold K becomes the Baithak tile labelled “All games”, with the current game named under it.
- **Loading** shows the seat-ring as a progress ring around the game icon with MB downloaded. **Couldn’t load** explains the one-time connection and offers Retry and Back.
- **Kaali Teeri:** 5-player example (“Take out 2♣ and 2♦ · deal 10 each”). Bidding starts at the dealer’s left; the pad is −5 / +5 / +10 / +25 with Pass and Bid, and an auction log underneath. Quick mode collapses the auction to “who won + how much”. The bidder can’t be picked as their own partner. Two decks add “1st / 2nd copy played”. Results take one number (0–250, steps of 5) and preview every player’s change before Confirm. Bidder and partners are marked by icon and word (crown / link), never colour alone.
- **Ishaara:** a picked card waits for Confirm (prevents mis-taps on a shared screen). Reveal moments put the result in the turn panel and flash the card; the trap ends the game with a dialog. Reconnecting dims the board and pauses taps. The clue-giver phone is the same plain dark design in every theme; the key cells are dark tints so they don’t glow across the table. Number choices 0–9 and ∞.
- **Kachuful tile art:** the green-felt + gold version is the canonical art (OG image, sharing). Inside the app each theme uses its own table colour (fix 2). Under Emerald the two match.
- **Emerald stand-in cards:** ivory face, gold double rule, Cinzel rank, standard pip layouts; A = pip in a gold ring with 8 points, J = shield, Q = arch with three pearls, K = crown. **3♠** gets a black band inside the gold rules, gold corner diamonds, a ring round the centre pip and a “30” points tab. All drawn from scratch; no deck’s illustrations copied. Text is outlined, so the SVGs need no fonts.

## Please decide
1. **Which card is the sixth photographed one?** The brief says six but lists five (back, Q♥, K♠, K♦, K♣). I drew a stand-in K♥; tell me if that one is photographed.
2. **Kachuful’s landing tile in Sunset, Yerba and Paper:** theme table colour (as now) or always green felt?
3. **Kaali Teeri “missed” scoring:** whole bidding team −bid (as drawn) or bidder only? And the default minimum bid (150 drawn) and partners per player count.
4. **Coming-soon names** (Mendikot, Teen Do Paanch, Callbreak) are placeholders for the six-game layout.
5. **Sign-in methods:** the account chip and menu assume Google with a photo; tell me the real providers.
6. **Spoken clue mode in Ishaara:** should the table still show a “Clue given” confirmation the guessers tap?

## What I couldn’t fit, or left as is
- Screens are **static** HTML (one state per file), not clickable prototypes; the transition is a frame-by-frame storyboard.
- Ishaara table screens other than the board are Sunset only, and Kaali Teeri is Sunset + Emerald, per the brief.
- Seating (Kaali Teeri setup 2) is a full screen; the only changes from Kachuful are the “Bids 1st” badge and the info card lines.
- HTML files load fonts from Google Fonts; offline they fall back to system fonts. The PNGs were rendered with the real fonts.
- Not checked on real devices; PNGs are from Chromium at 2×.
