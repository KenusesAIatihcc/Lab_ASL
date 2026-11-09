# How I Used AI — SignLab Final Project

> **Student note:** This is a starting template. Keep only details that are true and add your own work, testing, and decisions before submitting.

## AI tool used

ChatGPT was used as a coding assistant while developing SignLab 2.0.

## Example prompt / task

On November 9, 2026, I asked ChatGPT to begin expanding my existing SignLab app into an AI final project. We decided to start with **Practice & Test Mode** rather than rebuild the entire app.

## What the AI helped draft

- New HTML for a quiz card with a target letter, hint, buttons, and progress counts.
- Responsive CSS for desktop and phone layouts.
- `practice.js` to compare stable classifier guesses to practice targets and save attempts.
- A small addition to `app.js` that shares live guesses with the new quiz code.
- Documentation and a simulated test script.

## What I reviewed or changed myself

**Fill this in after doing the work:**

- The parts of the code I understood and checked: _____________________
- A bug or design choice I changed: _____________________
- How I tested the app with my webcam: _____________________
- What worked and what did not: _____________________

## Limitations I identified

SignLab uses a nearest-example comparison. A matching guess does not prove a sign was correct. Motion-based ASL letters J and Z are not scored by this single-frame quiz. Training examples and practice history are saved only in the user's browser, not to GitHub.

## Future AI assistance

Record each major additional AI-assisted step below with the date, example prompt, files changed, and your own testing/decisions.
