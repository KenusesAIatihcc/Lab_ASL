    # Starter training data for GitHub Pages

This folder contains starter-examples.json, which stores ASL handshape training data/examples I exported from SignLab.

I added this file so new visitors can start using the application without having to train every letter themselves, with the exception of J and Z. 

When someone opens SignLab for the first time, the application can load these examples automatically. Users can also add their own examples to improve recognition for their hands. ( for example this training data was performed by my right hand, left handed users may not score well)

The application keeps each user's training data in their browser using localStorage, so their personal training is separate from the starter examples.

The starter file contains hand-tracking measurements rather than pictures or videos.

Recognition may not always be accurate because everyone's hands, movements, and camera conditions are different.

In the event my hand gestures are simply not ideal for the advanced user, i added the "share a starter training set" feature for advanced users to export/import their more refined hand gestures. 

Procedure to make that happen is 

1. Open SignLab in the browser where the signs have been trained.
2. Click **Export training JSON** and save `starter-examples.json`.
3. Copy it into this `data/` folder next to this README.
4. Commit and push the JSON file to GitHub.
5. New visitors with no saved training will automatically load it on their first visit.

Importing replaces training data after confirmation. 

The starter JSON never overwrites a visitor's existing training, and clearing the examples does **not** silently restore the starter training.

As always fine print CYA 

it is not lost on me that my **Training examples** are numeric hand landmarks, not photos, but can still be potentially identifying biometric data.I do not consent for my data to be used in any commercial capacity without prior consent.