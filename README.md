# Parliamo · Italian audio cards

A buildless, mobile-first GitHub Pages prototype for **A1-M2-U2: AVERE & possession**, based on the agreed Sentence Bank / Audio Practice Specification v1.0. Concepts repeat. Sentences vary.

## Use

Read the preparation guide, choose first or later practice and a session length, then start. Tap **Play** for English → thinking pause → Italian → repeat pause. **Pause** stops audio and timers; Play restarts that card. **Reveal** shows the answer silently. **Repeat** plays Italian again. **Next** advances. Optional continuous playback remains off by default. Keep the page foregrounded; changing tabs pauses playback.

48 cards across all six types. First practice prepends seven MODEL cards; selected length counts production cards. Session selection balances types and downweights recent exposures stored only in this browser. No duplicates within a session. History can be cleared in settings. No account, microphone, speech recognition or scoring.

Italian voice availability and pronunciation depend on browser/device settings. Voice selection and slower playback are available. If speech fails, text practice remains usable. Real-device iPhone/Android audio testing is still needed; do not assume background or lock-screen playback.

## Iterate

- `cards.json`: stable IDs, prompts, targets, accepted alternatives, type, unit, grammar, vocabulary, difficulty and editorial status.
- `docs/preparation.md`: explicit prerequisite contract for this standalone sample.
- `docs/content-notes.md`: pedagogical scope and editorial assumptions.
- `app.js`: simple session selection and audio lifecycle.
- `style.css` / `index.html`: responsive UI.

Enable GitHub Pages from `main`, `/ (root)`. No build or dependencies. Local preview: `python3 -m http.server 8000` from this directory, then open http://localhost:8000. Opening index.html directly may block JSON loading.

The full source companion guide was unavailable; this prototype introduces all required items in its preparation guide rather than claiming verified alignment to the full course. Content is curated and internally checked; further native-speaker editorial review is welcome.
