# Review rules · prototype v1

This is a small deterministic scheduler, not a full adaptive course engine.

- Store card outcomes, consecutive successful review count, due time and session number locally under `parliamo-learning-v1`. Do not store dictated/typed text.
- First unassisted success schedules a review in 1 day. Further successful due reviews in later sessions schedule 3, 7, 14 and 30 days. The maximum interval is 30 days.
- A mismatch resets the interval and leaves the card due. Due cards are selected first, up to the chosen production session size; remaining places use the existing type mix and recency weighting. If more cards are due than fit, missed/assisted cards and older due dates take priority.
- Before a review is due, optional extra practice does not extend its interval. A successful same-session retry does not clear the next-session review.
- On Next after a mismatch or assisted answer, insert one retry after three intervening cards, if at least three cards remain. Add at most six retries per session and one per card; late misses and repeat misses remain due for a later session. The visible total grows to include inserted retries.
- Where a different sentence with the same grammar pattern is already later in the session, move it into the intervening practice. Remaining session selection gives extra weight to patterns that need review. This does not diagnose which individual word or grammatical feature caused a mismatch.
- `Accept my answer` replaces that presentation's mismatch with a self-assessed success using its pre-attempt record. It removes the false penalty before retries are queued. It does not add arbitrary text to the bank's permanent accepted translations.
- Only the first checked outcome per presentation is counted automatically. Rechecking or editing cannot inflate successes or repeatedly penalize a single presentation. Revealing/repeating the model before attempting counts as assisted practice and leaves the card due. Skipping an unseen card is not a failure.
- Clear local practice history resets both recency history and review outcomes. Voice preference is separate. No cross-device sync is provided. If browser storage is unavailable, review data lasts only for the current tab.

Intervals and retry limits are initial product defaults to refine through use. This is not a pronunciation assessment: keyboard transcription and a limited set of translations can produce false mismatches, hence the explicit override.
