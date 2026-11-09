# AI usage log — SignLab AI final project

**Purpose:** Document the role of AI coding assistance.

## Assistance used in development

- ChatGPT helped design the SignLab user interface, alphabet-image layout, persistent browser training and word generator.
- ChatGPT helped draft code for static ASL letter matching, J/Z motion paths, Practice & Test Mode, IndexedDB learning history, the dictionary API, and training JSON import/export.
- Helped write unit tests for simulated hand movements, practice-session scoring, and starter-data loading.

## Decisions and limitations

- The model compares landmarks to saved examples; it is not a validated translation tool.
- J/Z recordings track fingertip motion over time but require testing using a real webcam.
- Shared training data is exported only with user action and served from the project's public static files.
- Training and practice history are stored in the browser; GitHub Pages is not a database server.

