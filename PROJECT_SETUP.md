# SignLab final project — Git Bash & GitHub Pages

## 1. Work from the correct local repository

```bash
cd ~/Desktop/Lab_ASL_GitHub
git remote -v
git status
```

The `origin` must be `https://github.com/KenusesAIatihcc/Lab_ASL.git`. Do not use the earlier class-journal repository by mistake.

## 2. Install the update

Extract `signlab-final-project-update.zip` **into the repository root**, so `index.html`, `app.js`, `motion.js`, `practice.js`, `training-share.js`, etc. are next to each other. The update archive deliberately **does not include `docs/`** so your personally edited flowchart and write-up aren't overwritten. It also doesn't include a starter training dataset, because that must be exported from your browser.

Git Bash command if you downloaded the ZIP to Downloads:

```bash
unzip -o ~/Downloads/signlab-final-project-update.zip -d .
```

This **overwrites** matching app source files; commit/back up any app-code edits you want to keep first.

## 3. Run checks and test locally

```bash
bash scripts/check-project.sh
node tests/motion-test.js
node tests/practice-mode-test.js
node tests/training-share-test.js
python -m http.server 8000
```

Visit `http://localhost:8000`. Train several still letters, test J/Z motion, check practice rounds, word definitions, and the learning dashboard. The app requires camera permission, ml5 model loading, and good lighting. Code-only tests do **not** verify live recognition quality.

## 4. Share your own starter data with visitors

In the **browser where you previously trained the letters**, open the app at the **same URL** where that data was saved, then click **Export training JSON**.

From Git Bash, after downloading the JSON file:

```bash
mkdir -p data
cp ~/Downloads/starter-examples.json data/starter-examples.json
```

This file contains normalized numeric hand landmarks and motion paths. It is not your camera video, but don't publish hand data belonging to someone else without permission.

## 5. Push the update

```bash
cd ~/Desktop/Lab_ASL_GitHub
git status
git add .
git commit -m "Add J and Z motion practice, dashboard, API, and starter data"
git push origin main
```

If you haven't exported a starter dataset yet, you can push the code now and add `data/starter-examples.json` later; automatic starter training won't work until that file is published.

## 6. Turn on GitHub Pages

At `https://github.com/KenusesAIatihcc/Lab_ASL`, open **Settings → Pages**, choose **Deploy from a branch**, select **main** and **/(root)**, then **Save**. Once GitHub finishes deploying, the expected public URL is:

`https://kenusesaiatihcc.github.io/Lab_ASL/`

Your instructor should be able to open the public URL using HTTPS. This is **static hosting**; hand tracking and the practice database run in the visitor's browser.

## 7. Test using a separate browser / private window

1. Open the public URL in a browser that has never used SignLab.
2. Confirm the training panel says the starter examples were loaded (only after you published `data/starter-examples.json`).
3. Check the sample counts; start the camera and allow permission.
4. Try recognition and the practice quiz. If the shared examples don't match the visitor's hand reliably, the visitor can train their own.
5. Generate a word and confirm the definition appears when online.
6. Record quiz attempts and refresh; confirm the IndexedDB dashboard still shows them.
7. In Git Bash, run the checker and show its output to your instructor.

## Proof for your grading rubric

| Criterion | Demo evidence | Potential points |
|---|---|---:|
| Web UI | Show responsive training, practice and dashboard | 4 |
| Hosting | Open live HTTPS GitHub Pages URL on another device | 3 |
| Vibe coding | Show `AI_USAGE.md` prompts, tools, edits and testing | 2 |
| API | Generate a word and display a fetched dictionary meaning | 3 |
| Bash scripting | Run `bash scripts/check-project.sh` and show output | 2 |
| Database (if accepted) | Show IndexedDB add/read/delete of practice records | +4 |

Core target: **14 potential points**; with accepted database: **18**. Confirm with your instructor whether local browser IndexedDB satisfies the database requirement.
