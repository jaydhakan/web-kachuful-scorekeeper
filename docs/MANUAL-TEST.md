# Manual test checklist (about 5 minutes per device)

Run once on a mid-range Android phone (Chrome) and once on an iPhone (Safari). Use the deployed HTTPS build; service workers, wake lock and share need a secure origin.

## Both devices

1. **Install.** Open the site. Android: menu → _Install app_. iPhone: Share → _Add to Home Screen_. Launch from the icon: no browser bar, dark status bar, spade icon.
2. **Offline.** With the app open once, turn on airplane mode, force-quit, relaunch. The demo game and fonts still load.
3. **Play a round.** New Game → 5 players → seat names → Deal. Tap through bids; check the dealer's locked number is dashed and explained. Start playing → Enter results → mark one miss → Confirm. Summary counts up.
4. **Undo.** On the summary tap _Undo_ in the toast: you are back on the results.
5. **Refresh mid-round.** Pull to refresh or relaunch during bidding: same round, same bids.
6. **Share.** Finish a game → Share. Android: the system sheet offers the PNG. iPhone: same. If the sheet is dismissed nothing breaks. On a desktop browser the PNG downloads and the text is copied.
7. **Rotate / safe areas.** Portrait only. Buttons clear the home indicator; nothing sits under the notch.
8. **Decks.** New Game: _1 deck_ is selected and offers 3 to 7 players. Pick _2 decks_: 3 to 10 are offered. Choose 10 players, seat everyone, Deal: the table shows ten avatars (no names), nothing overlaps, and the Rules sheet explains the decks. Switch back to _1 deck_: the count clears.
9. **Large text / zoom.** Increase system text size one step: nothing overlaps or clips.

## Device specific

- **Wake lock (Android and iPhone 16.4+).** Start a game and leave the phone untouched for the screen-timeout period: the screen stays on. Lock and unlock the phone: it stays on again. End the game: it may now sleep.
- **Haptics (Android only).** Bids, results and seat changes give a short buzz. iPhone has none by design; the app must not complain.
- **Update prompt.** After a new deploy, reopen the app: a "New version / Reload" pill appears. It must not reload on its own mid-round.
- **Reduced motion.** Turn on _Reduce Motion_ (iPhone) or _Remove animations_ (Android): slides become fades, no confetti shake.

## Online (staging; about 10 minutes)

1. **Signed out stays offline.** With airplane mode on and signed out, play a round: nothing complains about the network. History, Boards (This device), Players and Awards all work.
2. **Invite.** As the admin: Account → Admin → Invite someone → copy the link → open it on the second phone. Take an existing player ("Is this you?") or make one; set a 3-letter password. A second open of the link says it was used.
3. **First sign-in import.** On a phone with signed-out games, sign in: it offers to add them. Choose, match players (an existing name asks "Is this the same …?"), add.
4. **Sync.** Signed in, play a round with airplane mode on, then turn it off: the dot in the Home chip goes from a number to ✓ within a minute, and the game shows on the global board.
5. **Same name.** In setup, type a name the server has: "Is this the same …?" appears once; Yes uses that player.
6. **Conflict.** Open the same game on two phones, play a round on each offline, reconnect both: one copy wins, the other is in History as a conflict copy with Keep this one / Keep the other.
7. **Live link.** Game menu → Links → Live link → Make link. Scan the QR with the other phone: the table follows each bid. Turn it off: the viewer says so.
8. **Recap preview.** Make a recap link and paste it in WhatsApp: the preview shows the title and image (needs the backend's `/r/` pages).
9. **Back gesture.** Open Boards → a player → head-to-head; Android back walks back one screen at a time and closes sheets first.
10. **Sign out.** With an upload waiting, Sign out asks first, then Keep or Remove.
