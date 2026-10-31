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
8. **Large text / zoom.** Increase system text size one step: nothing overlaps or clips.

## Device specific

- **Wake lock (Android and iPhone 16.4+).** Start a game and leave the phone untouched for the screen-timeout period: the screen stays on. Lock and unlock the phone: it stays on again. End the game: it may now sleep.
- **Haptics (Android only).** Bids, results and seat changes give a short buzz. iPhone has none by design; the app must not complain.
- **Update prompt.** After a new deploy, reopen the app: a "New version / Reload" pill appears. It must not reload on its own mid-round.
- **Reduced motion.** Turn on _Reduce Motion_ (iPhone) or _Remove animations_ (Android): slides become fades, no confetti shake.
