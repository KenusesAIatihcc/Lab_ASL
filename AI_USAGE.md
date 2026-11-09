# AI usage log — SignLab AI final project

**Purpose:** Document the role of AI coding assistance accurately rather than presenting generated code as entirely handwritten.

## Assistance used in development

- ChatGPT helped design the SignLab user interface, alphabet-image layout, persistent browser training and word generator.
- ChatGPT helped draft code for static ASL letter matching, J/Z motion paths, Practice & Test Mode, IndexedDB learning history, the dictionary API, and training JSON import/export.
- ChatGPT helped write unit tests for simulated hand movements, practice-session scoring, and starter-data loading.
- ChatGPT helped prepare setup instructions and project documentation.

## Decisions and limitations

- The model compares landmarks to saved examples; it is not a validated translation tool.
- J/Z recordings track fingertip motion over time but require testing using a real webcam.
- Shared training data is exported only with user action and served from the project's public static files.
- Training and practice history are stored in the browser; GitHub Pages is not a database server.

## Complete this section with your own work before submitting

**Prompts I used:** [Paste 2–4 real examples of what you asked ChatGPT.]  
**Changes I personally made:** [Write the changes you actually made to the project.]  
**Testing I ran:** [Record the commands and actual results from your computer.]  
**What I learned:** [Explain in your own words how the camera, landmarks, nearest-neighbor matcher, API, database, and deployment work.]  
**Problems I fixed:** [Document any real bugs and what solved them.]

Do not claim you've run tests or deployed the site until you've done those steps on your own computer.
