# SignLab AI : Learning ASL Through Machine Vision

## About the Project

SignLab AI is a web application I developed to explore how artificial intelligence and machine vision can be used to make learning more interactive.

The idea behind the project is simple: what if someone could use their webcam to practice the American Sign Language (ASL) alphabet and have a computer try to recognize the letters they're signing?

I started with a basic hand recognition application and gradually expanded it into a learning tool. Users can teach the app different ASL handshapes, practice individual letters, generate words to fingerspell, and track their progress.

This project gave me an opportunity to experiment with AI in a way that connects technology, accessibility, and education.

## What SignLab Can Do

- **Recognize ASL letters:** Uses a webcam and hand-tracking technology to identify handshapes.
- **Learn from examples:** Users can teach the app by saving examples of different letters.
- **Recognize movement:** Includes experimental motion tracking for J and Z, the two letters that require hand movement.
- **Practice letters:** Provides challenges where users can test their signing.
- **Generate words:** Gives users words to practice fingerspelling.
- **Track progress:** Keeps a record of practice attempts and learning activity.
- **Remember training:** Saves examples in the browser so users don't have to start over every time.
- **Share training examples:** Allows trained examples to be exported and imported, with the option to provide a starter set for new visitors.

## How It Works

SignLab uses a machine vision library called ml5.js to find points along the user's hand and fingers through the webcam.

The application takes those points and turns them into numbers that describe the hand's position and shape. It then compares that information with examples the user has already saved to make its best guess about the letter being signed.

For J and Z, the process is a little different. Since these letters require movement, the app records the path of the moving fingertip and compares it with saved movement examples.

The app is still a learning experiment, so its predictions aren't always perfect. Lighting, camera position, and differences in how people sign can affect the results.

## Technologies Used

- HTML, CSS, and JavaScript
- ml5.js and HandPose
- Browser localStorage
- IndexedDB
- Free Dictionary API
- Git and GitHub
- GitHub Pages
- Bash scripting

## Try SignLab

**Live Website:** https://kenusesaiatihcc.github.io/Lab_ASL/

To run the project on your own computer:

1. Clone or download this repository.
2. Open a terminal in the project folder.
3. Start a local server using:

```bash
python -m http.server 8000
```

4. Open `http://localhost:8000` in your browser.
5. Allow webcam access and start practicing.

An internet connection is needed to load the hand-tracking library and model.

## What I Learned

Working on SignLab helped me better understand how machine vision works beyond just reading about it in class.

One of the most interesting parts was seeing how a computer could recognize patterns from hand positions. I also learned that recognizing a still handshape is different from recognizing movement, especially when working with letters like J and Z.

Another important part of the project was learning how to improve an application over time. Adding features, fixing problems, testing changes, and keeping everything organized through GitHub became part of the learning process.

I also used ChatGPT during development to help understand code, troubleshoot errors, and explore possible improvements. I reviewed and tested the changes as I worked on the project.

## Limitations and Future Improvements

Although SignLab can recognize trained handshapes, it is not a complete ASL translation system. American Sign Language involves more than individual letters, including movement, facial expressions, and its own grammar.

Recognition accuracy can also vary between users, and the movement recognition for J and Z is still experimental.

In the future, I would like to improve recognition accuracy, provide better feedback during practice, and make the application more useful for people who are just beginning to learn ASL.

## Final Thoughts

SignLab started as a small experiment with hand recognition, but it grew into something more interesting as I continued working on it.

What I enjoy most about the project is that it demonstrates how AI can be used for something practical. Even though there is still plenty of room for improvement, it shows how machine vision can support learning and create new ways for people to interact with technology.

---

As always Fine print to CYA

**SignLab AI is an educational project and is not intended to replace professional ASL instruction or interpretation.**