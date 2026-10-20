# Parliamo · Italian audio cards

A buildless, mobile-first GitHub Pages prototype for **A1-M2-U2: AVERE & possession**, based on the agreed Sentence Bank / Audio Practice Specification v1.0. Concepts repeat. Sentences vary.

## Use

Read the preparation guide, choose first or later practice and a session length, then start. Tap **Play** for English → thinking pause → Italian → repeat pause. **Pause** stops audio and timers; Play restarts that card. **Reveal** shows the answer silently. **Repeat** plays Italian again. **Next** advances. Optional continuous playback remains off by default. Keep the page foregrounded; changing tabs pauses playback.

48 cards across all six types. First practice prepends seven MODEL cards; selected length counts production cards. Session selection balances types and downweights recent exposures stored only in this browser. Base sessions have unique cards; missed cards may return as spaced retries. History can be cleared in settings. No account, microphone, speech recognition or scoring.

Italian voice availability and pronunciation depend on browser/device settings. Voice selection and slower playback are available. If speech fails, text practice remains usable. Real-device iPhone/Android audio testing is still needed; do not assume background or lock-screen playback.

## Iterate

- `cards.json`: stable IDs, prompts, targets, accepted alternatives, type, unit, grammar, vocabulary, difficulty and editorial status.
- `docs/preparation.md`: explicit prerequisite contract for this standalone sample.
- `docs/content-notes.md`: pedagogical scope and editorial assumptions.
- `app.js`: simple session selection and audio lifecycle.
- `style.css` / `index.html`: responsive UI.

Enable GitHub Pages from `main`, `/ (root)`. No build or dependencies. Local preview: `python3 -m http.server 8000` from this directory, then open http://localhost:8000. Opening index.html directly may block JSON loading.

The full source companion guide was unavailable; this prototype introduces all required items in its preparation guide rather than claiming verified alignment to the full course. Content is curated and internally checked; further native-speaker editorial review is welcome.

On phones, an active session uses the visible area above the software keyboard. The card count and controls stay visible while the card body scrolls. **Setup** returns to session settings. Browser toolbar and keyboard changes are tracked through the Visual Viewport API when available.

Audio waits 1.5 seconds after Return so keyboard dictation can release audio. The pause is adjustable in Audio & review settings. Next, Pause, Setup and changing browser visibility cancel pending playback. Automatic voice selection prefers Alice; an explicitly selected voice is saved locally. Duplicate names receive separate numbers and any Compact/Enhanced/Premium hints present in the voice identifier. When no quality hint is exposed, the app reports quality as unknown.

The preparation guide renders headings, paragraphs and individual vocabulary rows from its Markdown source.

## Learning reviews

The app now remembers first-attempt outcomes in this browser. Missed/assisted cards are due again next session; when space allows, a missed card also returns after three intervening cards (up to six extra retries). Related sentences are used for pattern reinforcement. Due cards take priority over the usual randomized mix. Successful due reviews in later sessions move through 1, 3, 7, 14 and 30 day intervals.

After a mismatch, **Accept my answer** removes that attempt’s penalty and treats it as self-assessed success. It does not permanently add the transcription as a valid translation. Rechecking after the model appears does not create extra successes. Clearing local practice history resets reviews as well. No answer text is saved and reviews do not sync across devices.

See `docs/review-rules.md` for exact limits and edge cases. Run `node tests/review.test.cjs` to verify scheduling, retry spacing, override behavior and persistence.
