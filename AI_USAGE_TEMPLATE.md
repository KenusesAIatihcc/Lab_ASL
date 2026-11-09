# How I Used AI — SignLab Final Project


## AI tool used

ChatGPT was used as a coding assistant while developing SignLab 2.0.

## What the AI helped draft

- New HTML for a quiz card with a target letter, hint, buttons, and progress counts.
- Responsive CSS for desktop and phone layouts.
- `practice.js` to compare stable classifier guesses to practice targets and save attempts.
- A small addition to `app.js` that shares live guesses with the new quiz code.

## What I reviewed or changed myself

Planning the project: I chose to expand the ASL application into a more complete learning tool rather than build something from scratch.

Improving the user experience: I made changes to the interface, individual ASL letter references, and the ability to save and reset training examples.

Identifying recognition limitations: I recognized that J and Z require movement and pushed to include motion recognition rather than leave those letters out. This is still a work in progress.

Training the application: I practiced ASL hand gestures in front of the webcam and saved training examples for recognition.

Testing and debugging: I used Git Bash to run the project checker, discovered missing alphabet image files, and worked through fixing the issues until the script reported zero errors.

Managing the project with Git: I worked with repositories, corrected Git folder issues, and kept the application files organized through GitHub.

Improving documentation: I edited the README and recognition flowchart to make the explanations clearer and more natural.

## Limitations I identified

SignLab uses a nearest-example comparison. A matching guess does not prove a sign was correct. 

Motion-based ASL letters J and Z are not scored by this single-frame quiz. 

Training examples and practice history are saved only in the user's browser, not to GitHub.

