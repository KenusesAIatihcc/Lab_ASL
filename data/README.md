# Starter training data for GitHub Pages

This folder intentionally has no `starter-examples.json` yet because SignLab does not and cannot access personal browser training from GitHub.

1. Open SignLab in the browser where the signs have been trained.
2. Click **Export training JSON** and save `starter-examples.json`.
3. Copy it into this `data/` folder next to this README.
4. Commit and push the JSON file to GitHub.
5. New visitors with no saved training will automatically load it on their first visit.

**Do not publish anyone else's training examples without their informed permission.** These are numeric hand landmarks, not photos, but can still be potentially identifying biometric data.

Importing replaces training data after confirmation. 

The starter JSON never overwrites a visitor's existing training, and clearing the examples does **not** silently restore the starter training.
