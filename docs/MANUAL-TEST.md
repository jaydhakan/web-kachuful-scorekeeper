# Manual test checklist (about 5 minutes per device)

Run once on a mid-range Android phone (Chrome) and once on an iPhone (Safari). Use the deployed HTTPS build; service workers, wake lock and share need a secure origin.

## Both devices

1. **Install.** Open the site. Android: menu → _Install app_. iPhone: Share → _Add to Home Screen_. Launch from the icon: no browser bar, the Baithak icon, and it opens on the landing page with every game listed.
2. **Offline.** With the app open once, turn on airplane mode, force-quit, relaunch. The landing page, Kachuful, Kaali Teeri and their fonts still load; Ishaara cannot be played offline.
3. **Play a round.** Landing page → Kachuful → New Game → 5 players → seat names → Deal. Tap through bids; check the dealer's locked number is dashed and explained. Start playing → Enter results → mark one miss → Confirm. Summary counts up.
4. **Undo.** On the summary tap _Undo_ in the toast: you are back on the results.
5. **Refresh mid-round.** Pull to refresh or relaunch during bidding: same round, same bids.
6. **Share.** Finish a game → Share. Android: the system sheet offers the PNG. iPhone: same. If the sheet is dismissed nothing breaks. On a desktop browser the PNG downloads and the text is copied.
7. **Rotate / safe areas.** Portrait only. Buttons clear the home indicator; nothing sits under the notch.
8. **Decks.** New Game: _1 deck_ is selected and offers 3 to 7 players. Pick _2 decks_: 3 to 14 are offered. Choose 14 players, seat everyone, Deal: the table shows fourteen avatars (no names), nothing overlaps, and the Rules sheet explains the decks. Switch back to _1 deck_: the count clears.
9. **Large text / zoom.** Increase system text size one step: nothing overlaps or clips.

## Moving between games

1. **Landing page.** Kachuful and Kaali Teeri open signed out; Ishaara shows _Sign in to play_. A game in progress shows a resume line on its card.
2. **Into a game and back.** Tap a game: its card grows to fill the screen, then the game appears. _All games_ (the menu on a phone, the top of the rail on a large screen) returns to the landing page, and the game is still there to resume. The system Back gesture does the same.
3. **Kaali Teeri.** Start a game, bid, call the cards, play a hand and enter the result: the partners are revealed as their called cards are played, and the hand summary adds up.
4. **Motion (with animations on).** In Kachuful: the trump card turns before it is named; the table does not move between bidding and playing; the dealer's forbidden number fades to locked; at the end the podium rises 3rd, 2nd, 1st, the name fills in and the confetti starts from the winner. Leaving for Home, a chip of the winner flies to History.

## Device specific

- **Wake lock (Android and iPhone 16.4+).** Start a game and leave the phone untouched for the screen-timeout period: the screen stays on. Lock and unlock the phone: it stays on again. End the game: it may now sleep.
- **Haptics (Android only).** Bids, results and seat changes give a short buzz. iPhone has none by design; the app must not complain.
- **Update.** After a new deploy, reopen the app: a dialog covers it with one button and no way round it. Tap it: the app reloads into the new version on the same round with the same bids.
- **Reduced motion.** Turn on _Reduce Motion_ (iPhone) or _Remove animations_ (Android): slides become fades, the deal shows the trump and closes, the winner screen is in place at once, and there is no confetti.

## Online (staging; about 15 minutes)

1. **Signed out stays offline.** With airplane mode on and signed out, play a round: nothing complains about the network. History, Boards (This device), Players and Awards all work.
2. **Invite.** As the admin: Account → Admin → Invite someone → copy the link → open it on the second phone. Take an existing player ("Is this you?") or make one; set a 3-letter password. A second open of the link says it was used.
3. **First sign-in import.** On a phone with signed-out games, sign in: it offers to add them. Choose, give each player an email, Check players (name and email of someone already there asks "Is this …?"; a taken name or email says so without naming anyone), add.
4. **Sync.** Signed in, play a round with airplane mode on, then turn it off: the dot in the Home chip goes from a number to ✓ within a minute, and the game shows on the global board.
5. **Someone new to you.** In setup, your own players are suggested. Type someone else's name and email: both right asks "Is this …?"; their name with another email (or another name with their email) is refused without saying whose.
6. **Photo.** Account → Add photo → take one with the camera: it shows instead of the emoji on Home, the boards and the table, and on the other phone after a sync. A live link shows it too. Remove photo brings the emoji back.
7. **Conflict.** Open the same game on two phones, play a round on each offline, reconnect both: one copy wins, the other is in History as a conflict copy with Keep this one / Keep the other.
8. **Live link.** Game menu → Links → Live link → Make link. Scan the QR with the other phone: the table follows each bid. Turn it off: the viewer says so.
9. **Recap preview.** Make a recap link and paste it in WhatsApp: the preview shows the title and image (needs the backend's `/r/` pages).
10. **Back gesture.** Open Boards → a player → head-to-head; Android back walks back one screen at a time and closes sheets first.
11. **Sign out.** With an upload waiting, Sign out asks first, then Keep or Remove.
12. **Ishaara.** Signed in and online, start a game. The key shows only on a clue-giver's own phone, signed in as that player, and never on the table device. Go offline mid-game: the app says so, and nothing is lost when the connection returns.
