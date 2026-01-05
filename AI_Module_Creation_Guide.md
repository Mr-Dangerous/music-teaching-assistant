# AI-Powered Learning: A Guide to Creating Custom Activities

This guide explains how to use an AI assistant (like the one you're talking to now, or others like ChatGPT/Claude) to create your own custom learning activities ("modules"). This is the fastest and most powerful way to build new, unique content for your students.

The process is simple: you provide the AI with the "rules" of the system and describe your desired activity in plain English. The AI then writes the code for you.

These modules can serve as standalone general features or tightly integrated assessment builders. When integrated into the main app, it enables robust data collection.

---

## Section 1: The Context - What to Show the AI

To create a working module, the AI needs to understand the rules and see examples. You should provide it with a "context" containing the content of a few key files. **These are the only files you need.**

### 1. **The Rulebook: `MODULE_GUIDE.md`** (HIGHLY IMPORTANT)

This is the **most critical file**. It contains the complete technical specification for how a module must work. Think of it as the instruction manual for the AI. It explains:
- The required `TaskModule` JavaScript interface (`init`, `getResponse`, `isComplete`).
- How the module must communicate with the main application (`window.parent.postMessage`).
- The data it will receive (`context` object).
- Design best practices (large buttons, high contrast, etc.).

**Why:** Without this, the AI has no idea how to make a module that is compatible with your application.

### 2. **The Skeleton: `modules/_template.html`**

This file is a clean, empty skeleton of a module. It provides a perfect starting point for the AI to build upon.

**Why:** It gives the AI the basic HTML structure and ensures it starts with a clean slate, rather than a more complex, specific module.

### 3. **A Working Example: `modules/simple-button-test.html` or `modules/string.html`**

Providing a simple, complete, and working example is extremely helpful. These files show the AI exactly what a finished product looks like, including the inline CSS and the JavaScript `TaskModule` implementation.

**Why:** A concrete example is often clearer than rules alone. It helps the AI match the correct style and structure, reducing errors.

### Files to AVOID Giving the AI

- **`index.html`**: Do NOT include this file. It is the code for the main application, not for a module. It is far too complex and will confuse the AI. The `MODULE_GUIDE.md` already contains everything the AI needs to know about how to interface with the main app.
- **`app.js`, `module-loader.js`, etc.**: These are also part of the main application. The AI does not need to know how the main app works internally, only how a module is supposed to behave.

---

## Section 2: The Prompt - How to Ask the AI

A "prompt" is the instruction you give to the AI. A well-written prompt is the key to getting a perfect result on the first try.

### The Formula for a Great Prompt:

1.  **State the Goal:** Begin with a clear, high-level purpose.
    > "I want to create a module for my 2nd-grade Spanish class."

2.  **Describe the Visuals & Interaction:** Explain what the student should see and do. Be specific about the layout and design, keeping the smartboard in mind.
    > "Display a large question text at the top that says '¿Cómo se dice...?' Below it, show four large, colorful, touch-friendly buttons in a 2x2 grid. Each button should show a picture."

3.  **Explain the Logic:** Describe what happens when the student interacts with the module.
    > "When a student clicks a button, it should become highlighted with a thick green border. If they click another button, the old one should un-highlight and the new one should become highlighted."

4.  **Define the "Response":** Specify exactly what piece of information the module should send back to the main app. This is also where you can define what gets saved to results.csv for future data viewing.
    > "The module's response should be the text content of the button that was selected, for example, 'el gato'. When an answer is completed, save this answer along with the original question to results.csv for that student."

5.  **The Magic Words:** Crucially, end your prompt by explicitly telling the AI to follow the rules you provided in the context.
    > "Please generate a single, self-contained HTML file. Implement the `TaskModule` interface and follow all the rules and best practices outlined in the provided `MODULE_GUIDE.md`. Use the provided `_template.html` as a starting point."

---

## Section 3: Example 1 - Animal Sound Matching

Let's tie this all together. Imagine you want a "What's that sound?" game for kindergarteners.

**Your prompt to the AI would look like this:**

> Hello! I am providing you with three files: `MODULE_GUIDE.md`, `modules/_template.html`, and `modules/simple-button-test.html`.
> 
> Based on those, please create a new module with the following functionality for my kindergarten class:
> 
> **Goal:** An animal sound matching game.
> 
> **Visuals and Interaction:**
> 1.  At the top, display a large, friendly "Play Sound" button.
> 2.  Below it, show a 2x2 grid of four large (at least 150px square) image buttons. The images should be of a 'cat', 'dog', 'cow', and 'duck'.
> 3.  When the "Play Sound" button is clicked, it should play a random animal sound. For this code, you can use placeholder audio file paths like `/audio_files/cat.mp3`; I will provide the real audio files myself.
> 4.  The student then clicks on the animal picture they think made the sound. The selected image should get a bright blue border to show it's selected.
> 
> **Response:** The module should return the name of the selected animal as a string (e.g., "cat").
> 
> **Technical Requirements:** Please generate a single, self-contained HTML file. It must correctly implement the `window.TaskModule` interface (`init`, `getResponse`, `isComplete`) as specified in the `MODULE_GUIDE.md`. All CSS and JavaScript should be inline.

**The Result:** The AI will generate a complete HTML file (e.g., `animal-sounds.html`) that you can save directly into your `modules` folder.

---

## Section 4: Example 2 - Spanish Verb Conjugation

Here is a more text-focused example, perfect for a language class.

**Your prompt to the AI would look like this:**

> Hello! Using the provided context files (`MODULE_GUIDE.md`, etc.), please create the following module:
>
> **Goal:** A "fill-in-the-blank" verb conjugation drill for my Spanish class.
>
> **Visuals and Interaction:**
> 1.  The screen should be very simple.
> 2.  Display a pronoun (e.g., "Yo") and a verb infinitive (e.g., "hablar") in a large, clear font (at least 80px).
> 3.  Next to them, show a text input box where the student can type their answer.
>
> **Logic:**
> 1.  Inside the module, create a small list of JavaScript objects, where each object is a problem containing a pronoun, a verb, and the correct answer (for potential future validation).
> 2.  When the module loads, it should randomly pick one of these problems and display it.
>
> **Response:** The module should return the text that the student has typed into the input box as its response string.
>
> **Technical Requirements:** Please generate a single, self-contained HTML file. It must correctly implement the `window.TaskModule` interface as specified in `MODULE_GUIDE.md`. All CSS and JavaScript should be inline.

---

## Section 5: Testing Your New Module

1.  **Save the Code:** Save the code the AI gives you into a new file inside your `modules/` folder (e.g., `conjugation-practice.html`).
2.  **Update `tasks.csv`:** Add a new line to your `tasks.csv` file to register your new activity.
    ```csv
    conjugate_verbs,Spanish Conjugation,2,modules/conjugation-practice.html
    ```
3.  **Reload & Test:** Refresh `index.html` in your browser. Your new activity should appear in the dropdown list.
4.  **Debug (If Necessary):** If something doesn't work, tell the AI! Copy any error messages from the browser's console (press F12 to open it) and ask the AI to fix its own code.

This workflow allows you to create a virtually unlimited number of custom, interactive, and fun activities for your classroom with minimal coding required.
