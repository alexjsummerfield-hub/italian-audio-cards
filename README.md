# Parliamo · Italian audio practice

A mobile-first GitHub Pages testing app based on AF-LCS: **Concepts repeat. Sentences vary.**

384 cards across 28 units: **A0 24**, **A1 264**, **A2 96**. All 20 A0/A1 Companion Guide units are represented; eight additional A2 topic samples extend testing into past narration, descriptions, comparisons, future plans, past modals and health expressions. This is a testing bank, not a complete A2 course or certification.

## Practise

Choose Level and Unit. Read that unit's Preparation. Select either the unit alone or cumulative practice through that unit. Cumulative practice assumes earlier preparation has been read; future units are excluded.

Start and Next automatically play the English prompt. Dictate using the iPhone's Italian keyboard, or type into the focused field. Return submits. The app compares your text and plays Italian after the configurable post-dictation pause. Reveal shows the answer silently; Repeat replays Italian. It waits for Next and keeps the card count and controls in the visible phone area above the keyboard. Setup returns to the unit selection.

A0 Sounds uses listen-and-repeat models only. Production sessions use up to the selected number of available cards. Optional models are extra where available; same-session learning retries can add up to six cards.

## Reviews

First-attempt mismatches and assisted answers remain due. A miss can return after three intervening cards. A related sentence may be moved into the gap. Due cards are prioritized next session; successful due reviews in later sessions use 1, 3, 7, 14 and 30 day intervals. Accept my answer reverses a false-mismatch penalty for that presentation. Rechecking cannot inflate successes. No typed/dictated answer text is stored.

Reviews and exposure history are local to this browser/device, without sync. Changing levels does not erase history. Clearing local practice history resets it across all units. Voice preference is separate. See docs/review-rules.md.

## Audio

Italian uses device speech synthesis. Automatic selection prefers Alice. Refresh voices and Preview Italian voice allow testing what the browser exposes; higher-quality installed voices may not be exposed by Safari. Duplicate names have distinct labels and quality hints where reported. The 1.5-second pause after Return is adjustable. Keep the page foregrounded.

## Iterate and verify

- catalog.json: levels, unit order, guide and bank paths.
- cards.json: original 48 stable cards; banks/: additional cards.
- guides/: readable preparation for each unit.
- app.js / course.js: UI, course eligibility and audio.
- scheduler.js: local review rules.
- docs/expansion-notes.md: source provenance and limitations.

Run `node tests/review.test.cjs` and `node tests/course.test.cjs`. No build or external dependencies. Local preview: `python3 -m http.server 8000`; open http://localhost:8000. GitHub Pages serves main, root. Opening index.html as a file can block data loading.
