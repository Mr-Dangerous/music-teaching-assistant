# Quick Guide: Your Classroom Assistant

Hello! This is a guide to help you use this powerful tool in your classroom. Think of it as a digital assistant for your Promethean Board, allowing you to create and use interactive activities quickly and easily.

## Section 1: Setting Up Your Class

Before you begin, you need to prepare two very important files. These files tell the application who your students are and what activities you have available.

### 1. Student List (`students.csv`)

This file is your digital class roster. You should fill it with your student information using a program like Microsoft Excel or Google Sheets and save it as `students.csv`.

**Format:**

| student_id | student_name | grade | class |
| :--- | :--- | :--- | :--- |
| 101 | Ana Garcia | 2 | Mrs. Rodriguez |
| 102 | Bruno Diaz | 2 | Mrs. Rodriguez |
| 103 | Carla Perez | 3 | Mr. Gonzalez |

- **student_id**: A **unique** number for each student. This is kept private and is only used by the app to save responses in a FERPA-compliant way. The number used doesn't matter as long as it is unique.'
- **student_name**: The student's name.
- **grade**: The student's grade level (K, 1, 2, 3, etc.).
- **class**: The name of the class. You can have multiple classes in the same file!

### 2. Task List (`tasks.csv`)

This file is your activity catalog. This is where you tell the application what tasks exist.

**Format:**

| task_id | question | grade | module_path |
| :--- | :--- | :--- | :--- |
| vocab_colors | What color is the object? | 2 | modules/string.html |
| conjugate_ser | Conjugate the verb| 2 | modules/conjugation-practice.html|

- **task_id**: A short, unique name for the task.
- **question**: The prompt or instruction the student will see.
- **grade**: The grade level the task is intended for.
- **module_path**: The path to the activity file. This is where the magic happens!

### 3.  Result List ('results.csv')
Results will be saved automatically to this file, and it will be created if it doesn't exisist.'

---

## Section 2: Using the Assistant in the Classroom

Once your `.csv` files are ready, it's time to use the application!

1.  **Open `index.html`**. You will see a list of your classes.
2.  **Load your data folder**.  You can select any folder to be your data folder, but make sure it has a 'students.csv' and 'tasks.csv'.  Other csv files will be generated automatically, including the results csv.
2.  **Click on your class**. The screen will split in two:
    *   **Left**: A list of the students in that class.  You cna long press a student name to mark them absent for that day (generates a record, refreshes every day), or mark them as a merit or a demerit
    *   **Right**: The module viewer, where activities will appear.
3.  **Select an activity** from the dropdown menu at the top.

### Modes of Use:

**A. Whole-Class Practice:**
- Select an activity from the menu. Click "Practice"
- That's it! The activity will appear on the board for everyone to see and participate in. This is great for group practice.

**B. Individual Student Assessment:**
- Click on a student's name from the list on the left.
- Select an activity from the menu.
- The activity will load, and the student's response will be saved when you switch to another student or click the "Save" button.

---

## Section 3: Creating Your Own Module

This is where the tool becomes truly powerful. You can create your own custom activities! Let's build one together. Since this guide is for a Spanish teacher, we'll create a verb conjugation exercise.

**The Idea:** An activity that displays a pronoun (e.g., "yo") and a verb (e.g., "hablar"), and the student must type the correct conjugation ("hablo").

### Step 1: Copy the Template

Every activity (a "module") is an HTML file. To make things easy, we'll use a template.
1. Go to the `modules/` folder.
2. Copy the `_template.html` file.
3. Paste the copy and rename it to `conjugation-practice.html`.

### Step 2: Add the HTML and Style

Now, open your new `conjugation-practice.html` file in a text editor. Erase everything inside and paste this code. This code creates the visual elements of our activity.

```html
<!DOCTYPE html>
<html>
<head>
    <title>Verb Conjugation Task</title>
    <style>
        /* Styles to make it look great on a smartboard */
        body, html {
            height: 100%;
            margin: 0;
            padding: 0;
            font-family: 'Comic Sans MS', cursive, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background-color: #f0f8ff; /* AliceBlue */
            overflow: hidden;
        }
        .prompt-container {
            display: flex;
            align-items: baseline;
            gap: 20px;
            margin-bottom: 30px;
        }
        .prompt-text {
            font-size: 80px;
            color: #4682b4; /* SteelBlue */
            font-weight: bold;
        }
        #answer-input {
            font-size: 80px;
            width: 300px;
            border: 5px solid #4682b4;
            border-radius: 15px;
            text-align: center;
            color: #ff6347; /* Tomato */
        }
    </style>
</head>
<body>

    <div class="prompt-container">
        <div id="pronoun" class="prompt-text"></div>
        <div id="verb" class="prompt-text"></div>
    </div>
    
    <input type="text" id="answer-input" placeholder="..." />

</body>
</html>
```

### Step 3: Add the "Brain" (JavaScript)

Now, just before the closing `</body>` tag, paste the following JavaScript code. This is the brain that will make our activity work.

```javascript
<script>
    // --- Our list of verbs ---
    // You can add as many as you want here
    const verbos = [
        { pronoun: 'Yo', verb: 'hablar', answer: 'hablo' },
        { pronoun: 'Tú', verb: 'hablar', answer: 'hablas' },
        { pronoun: 'Él', verb: 'comer', answer: 'come' },
        { pronoun: 'Ella', verb: 'comer', answer: 'come' },
        { pronoun: 'Nosotros', verb: 'vivir', answer: 'vivimos' },
        { pronoun: 'Ellos', verb: 'vivir', answer: 'viven' }
    ];

    // --- Variables to hold the state ---
    let currentVerb = null;
    const pronounEl = document.getElementById('pronoun');
    const verbEl = document.getElementById('verb');
    const inputEl = document.getElementById('answer-input');

    // --- The interface the main app needs ---
    window.TaskModule = {
        
        // This is called when the module loads
        init: function(context) {
            // Choose a random verb from our list
            currentVerb = verbos[Math.floor(Math.random() * verbos.length)];
            
            // Display the pronoun and verb on the screen
            pronounEl.textContent = currentVerb.pronoun;
            verbEl.textContent = currentVerb.verb;
            
            // If the student already answered, show their previous answer
            if (context.existingResponse) {
                inputEl.value = context.existingResponse;
            }

            // Focus the input field so the student can start typing right away
            inputEl.focus();
        },

        // Returns the student's current answer
        getResponse: function() {
            return inputEl.value;
        },

        // Tells the main app if the task is "complete" (and can be saved)
        isComplete: function() {
            // We'll consider it complete if the student has typed something
            return inputEl.value.trim() !== '';
        },

        // (Optional) Resets the activity
        reset: function() {
            inputEl.value = '';
            // We could load a new verb here if we wanted to
        }
    };

    // --- Communication with the main app ---
    // Every time the student types, we notify the main app
    inputEl.addEventListener('input', () => {
        window.parent.postMessage({
            type: 'taskmodule:response',
            value: TaskModule.getResponse(),
            isComplete: TaskModule.isComplete()
        }, '*');
    });

</script>
```

### Step 4: Test Your New Module

1.  **Save** the `conjugation-practice.html` file.
2.  **Open `tasks.csv`** and add a new line for your activity:
    ```csv
    conjugate_verbs,Conjugation Practice,2,modules/conjugation-practice.html
    ```
3.  **Reload `index.html`** in your browser.
4.  Select "Conjugation Practice" from the menu and try it out! You will see a pronoun and a verb, with a field for the student to type the answer.

Congratulations! You have created your first custom activity. You can copy and modify this example to create all sorts of "fill-in-the-blank" exercises.

---
Have fun creating interactive learning experiences for your students!
