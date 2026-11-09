# SignLab AI Final project

SignLab teaches the ASL **fingerspelling alphabet** using webcam hand tracking, saved training examples, practice rounds, word generation, and a local learning dashboard. It is a **learning prototype**, not a validated ASL interpreter.

## New final-project capabilities

- **Web UI:** responsive camera, prediction card, per-letter training, Practice & Test mode, word playground and learning dashboard.
- **Hosting:** HTML/CSS/JS can be served by GitHub Pages with HTTPS. See `PROJECT_SETUP.md`.
- **External API:** `dictionary.js` uses the public Free Dictionary API to fetch definitions for the word generator. The site itself runs without an API key.
- **Bash scripting:** `scripts/check-project.sh` checks key files, alphabet images and JavaScript syntax. Execute it using Git Bash and document the output.
- **Writable database:** `database.js` stores, reads, and deletes actual practice-attempt records in IndexedDB in the browser. This is distinct from `localStorage`, which saves training examples.

## How SignLab recognizes letters

For the 24 static letters, `ml5.handPose` estimates 21 landmarks from a video frame. `app.js` converts them to 42 wrist-relative, palm-width-normalized coordinates and compares them to saved examples. The **nearest example** supplies the guess.

**J and Z are different:** `motion.js` records about 1.8 seconds of fingertip landmarks, creates a normalized movement path and compares that path (plus simple handshape data) to saved movement examples. J tracks the pinky tip; Z tracks the index fingertip. This motion recognizer is experimental. The checker and automated tests simulate paths, but **real webcam recognition must be tested manually**.

Practice Mode compares a stable guess to a target letter. A match reflects the classifier's agreement, **not a verified assessment of ASL correctness**. The app does not interpret full sign language, facial expressions, or grammar.

## Make the website usable immediately for new visitors

A **new visitor with no existing training** automatically downloads and imports the published examples on first visit, then starts the camera and practices. Your visitor's browser saves its own changes.

Existing examples are **not silently overwritten**. If someone clears training, the starter set does not automatically reappear on the next refresh. Visitors can manually import a training JSON file if they want to replace their saved examples (with confirmation).

**Privacy:** The JSON contains no raw camera frames, but hand-landmark data may be sensitive biometric information. Only publish data that you personally collected and consent to share; do not publish someone else's data without permission. A shared example set may perform less accurately for hands or camera setups different from yours.

## Other storage notes

- `localStorage` keeps user's static examples, word position, and J/Z motion recordings. These are specific to a browser and site origin.
- `IndexedDB` stores checked practice attempts: target, guess, model-match flag, and timestamp. It can read and clear the history.
- No backend or account synchronization is included. GitHub Pages serves **static files**; it does not let visitors write to the repository. Visitors' practice history stays local.

## Automated tests and script

From the repository root in Git Bash / a terminal with Node installed:

```bash
node tests/practice-mode-test.js
node tests/motion-test.js
node tests/training-share-test.js
bash scripts/check-project.sh
```

These are simulated tests. Additional tests: webcam access, static letter training, J/Z recordings, a new browser loading `data/starter-examples.json`, dictionary definitions when online, and that practice history survives reloading.

## Project resources

- `index.html`, `style.css`, `app.js` — main site
- `motion.js` — J/Z path recognition and training
- `practice.js` — quiz and practice scoring
- `database.js` — IndexedDB learning dashboard
- `dictionary.js` — Free Dictionary API integration
- `training-share.js` — export, import, and automatic starter examples
- `assets/letters/` — 26 letter reference images
- `data/README.md` — how to publish a shared starter set
- `scripts/check-project.sh` — Bash project checker
- `tests/` — tests runnable with Node
- `docs/` — earlier flowchart and write-up, which can be edited independently
- `AI_USAGE.md` — documented real AI-assisted development experience
- `PROJECT_SETUP.md` — Git Bash install, GitHub Pages, and rubric demo instructions
