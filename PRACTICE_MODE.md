# SignLab 2.0 — Milestone 1: Practice & Test Mode

This is the first new feature for the final project. It keeps the original webcam hand-tracking classifier, the A–Z reference images, saved training examples, individual-letter reset, and the word generator.

## How to try it

1. Run the app from **localhost** or an **HTTPS** website, with an internet connection for the ml5 library and model files.
2. Start the webcam and save some example handshapes for **at least two different letters** (for example, A and B). Use several examples for each letter to improve the comparisons.
3. Scroll to **Practice & Test** and click **Start practice**.
4. Look at the **target letter**. Click **Show hint** if you want to see its ASL reference picture.
5. Make that letter with your hand. Wait for the **steady model guess** to appear (at least six consistent video frames spanning 450 milliseconds).
6. Click **Check sign**. A **match** means the classifier's nearest example has the same letter label as the target. A **different guess** means the labels don't match; it is **not** a definitive test of your ASL technique.
7. Choose **Try again**, **Next letter**, or **End session**. The **Next letter** button also works as **Skip letter** before checking; skipped letters do not count as checked attempts.
8. Close and reopen the page on the **same browser and website**. Your attempts and match rate should remain visible.

## Important limitations

- The quiz only uses letters for which **you saved training examples**. At least two distinct still-handshape letters must be trained, so a one-class classifier cannot claim every attempt as correct.
- **J and Z are excluded** from scored rounds because they rely on motion and this classifier only uses a single video frame.
- A steady guess is just a guess repeated across several frames. It is **not a calibrated confidence score**. The app compares hand landmarks to saved examples using nearest-example matching; it does not recognize the full ASL language.
- Practice attempts are saved locally under `signlab-practice-v1`. Your original handshape training examples remain stored separately under `signlab-progress-v1`. Clearing quiz history **does not clear training examples**.
- No camera frames or images are stored in the new practice history. Each record contains a target letter, guessed letter, match flag, and timestamp. The last **500** checked attempts are kept, in the current browser/origin only.
- If browser storage is blocked, attempts still work for the open visit but might not remain after reloading.

## Files added or changed

- `index.html` — new Practice & Test card, controls, and separate script import.
- `style.css` — responsive practice card styling.
- `app.js` — tiny read-only bridge and hand-prediction events for the new script.
- `practice.js` — stable-guess gate, rounds, scoring, history, hint and reset actions.
- `tests/practice-mode-test.js` — automated logic tests using Node.js (optional for running the website).
- `AI_USAGE_TEMPLATE.md` — starter log for documenting AI assistance honestly.

## Test cases

- With zero or one trained letter, **Start practice** should stay disabled.
- With two trained still letters, practice should start and show a target.
- Check sign should stay disabled until the same guess stays steady for at least six frames and 450 ms.
- Check sign records **one** attempt; it cannot be double-counted.
- Try again keeps the same target. Skip creates **no** attempt. Next letter picks a new target.
- Reloading restores the total number of checked attempts.
- Clear practice history only clears the history, not your trained letters.
- Resetting a trained letter may end an active quiz if its current target is no longer available.
- The layout should fit desktop and mobile screens.

### Run the automated logic tests (optional)

If Node.js is installed, run from the repository root:

```bash
node --check app.js
node --check practice.js
node tests/practice-mode-test.js
```

**Still to do for the final project:** test real webcam recognition on your computer; add the dictionary API, deploy or verify hosting, write a useful Bash script and run it, and document exactly how you used AI while building and testing. These features are separate final-project milestones; this update alone does not earn all the rubric points.
