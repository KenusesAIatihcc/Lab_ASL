# SignLab AI — Intro to AI final project

SignLab teaches the ASL **fingerspelling alphabet** using webcam hand tracking, saved training examples, practice rounds, word generation, and a local learning dashboard. It is a **learning prototype**, not a validated ASL interpreter.

## Run it on your computer

From the repository root, run:

```bash
python -m http.server 8000
```

Open **http://localhost:8000** in a browser. Allow camera access after clicking **Start camera**. An internet connection is required for the external `ml5` handPose library/model and the optional word dictionary lookup.

## New final-project capabilities

- **Web UI (4 points):** responsive camera, prediction card, per-letter training, Practice & Test mode, word playground and learning dashboard.
- **Hosting (3 points, after live deployment):** HTML/CSS/JS can be served by GitHub Pages with HTTPS. See `PROJECT_SETUP.md`.
- **AI-assisted development (2 points, if documented):** write up your actual prompts, decisions, edits and testing in `AI_USAGE.md`.
- **External API (3 points):** `dictionary.js` uses the public Free Dictionary API to fetch definitions for the word generator. The site itself runs without an API key.
- **Bash scripting (2 points):** `scripts/check-project.sh` checks key files, alphabet images and JavaScript syntax. Execute it using Git Bash and document the output.
- **Writable database (4 additional points, subject to instructor acceptance):** `database.js` stores, reads, and deletes actual practice-attempt records in IndexedDB in the browser. This is distinct from `localStorage`, which saves training examples.

**Point tally:** 14 points for the first five implemented-and-demonstrated categories, up to 18 if your instructor accepts IndexedDB for the database criterion. The rubric score is awarded by your instructor; the code or this README alone does not guarantee points.

## How SignLab recognizes letters

For the 24 static letters, `ml5.handPose` estimates 21 landmarks from a video frame. `app.js` converts them to 42 wrist-relative, palm-width-normalized coordinates and compares them to saved examples. The **nearest example** supplies the guess.

**J and Z are different:** `motion.js` records about 1.8 seconds of fingertip landmarks, creates a normalized movement path and compares that path (plus simple handshape data) to saved movement examples. J tracks the pinky tip; Z tracks the index fingertip. This motion recognizer is experimental. The checker and automated tests simulate paths, but **real webcam recognition must be tested manually**.

Practice Mode compares a stable guess to a target letter. A match reflects the classifier's agreement, **not a verified assessment of ASL correctness**. The app does not interpret full sign language, facial expressions, or grammar.

## Make the website usable immediately for new visitors

Your saved examples live in **your browser's localStorage**, not in GitHub. The app now has **Export training JSON** and **Import training JSON** buttons.

To publish default training examples:

1. Open SignLab in the **same browser and same origin** where you already trained the letters. (For example, `http://localhost:8000`, if that's where you trained.)
2. Train the letters you want to share, including J and Z motion examples if you want those included.
3. Click **Export training JSON**; the browser downloads `starter-examples.json` with normalized landmark values, not images or video.
4. Copy that exported file to **`data/starter-examples.json`** in your local repository. The file is intentionally **not** included until you export your own data.
5. Commit and push the JSON along with this code. GitHub Pages will serve it as a static file.
6. A **new visitor with no existing training** automatically downloads and imports the published examples on first visit, then starts the camera and practices. Your visitor's browser saves its own changes.

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

These are simulated tests. For final submission, additionally test: webcam access, static letter training, J/Z recordings, a new browser loading `data/starter-examples.json`, dictionary definitions when online, and that practice history survives reloading.

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
- `AI_USAGE.md` — document your real AI-assisted development experience
- `PROJECT_SETUP.md` — Git Bash install, GitHub Pages, and rubric demo instructions
