# Custom Task Module Guide

## Overview

The teaching assistant uses a **module-based architecture** where every task loads an HTML module. Modules are self-contained files that handle both question display and response collection. This makes the system infinitely customizable while keeping it simple.

## For Teachers: Using Modules

### Understanding the System

The app automatically discovers all modules in the `modules/` folder. Each `.html` file (except those starting with `_`) becomes an available task.

**Module filename → Task name:**
- `rhythm-trainer.html` → "Rhythm Trainer"
- `so_la_mi_trainer.html` → "So La Mi Trainer"
- `interval_trainer.html` → "Interval Trainer"

**Built-in modules:**
- `modules/picture.html` - Displays an image from `tasks/Grade X/task_id.png`, keyboard input
- `modules/string.html` - Displays text question, keyboard input
- `modules/word-ending.html` - Word + tense display, drag-and-drop endings

### Adding a New Task

1. **Create your module** (e.g., `my-module.html`) in the `modules/` folder

2. **⚠️ REQUIRED: Add to the fallback module list**
   - Edit `js/app.js`
   - Find the `loadKnownModules()` function (around line 480)
   - Add your module filename to the `knownModules` array
   - Example: `'my-module.html',`
   - **This step is REQUIRED - your module will not appear without it!**

3. **Reload the app** - your module now appears in the task dropdown

**Why this step is required:** The app attempts to auto-discover modules by scanning the `modules/` folder, but this requires directory listing to be enabled on your web server (which most don't have for security reasons). The app **always** falls back to the hardcoded `knownModules` list in `js/app.js`. Adding your module to this list ensures it works in all environments. Without this step, your module won't be loadable even though the file exists.

### Getting New Modules

**Option 1: Use existing modules**
- Copy module HTML files from other teachers
- Put them in your `modules/` folder
- Reference them in `tasks.csv`

**Option 2: Create with AI** (see developer section below)

**Option 3: Modify existing modules**
- Copy a module file (like `simple-button-test.html`)
- Edit it in a text editor
- Save with a new name
- Reference it in tasks.csv

---

## For Developers: Creating Modules

### Quick Start with AI

You can use AI tools like Claude or ChatGPT to generate custom modules:

#### 1. Start with the Template
Use `modules/_template.html` or any existing module as a starting point.

#### 2. Describe Your Task
**Example prompt:**
```
Create a music task module for elementary students. Show a large colored
musical staff with 4 notes. Display 4 large touch-friendly buttons below
(one for each note name). When clicked, log which note was selected.
Use bright colors suitable for a smartboard. Implement the TaskModule
interface with init, getResponse, isComplete, and reset methods.
```

#### 3. Register and Test Your Module
- Save as `modules/my-module.html`
- **⚠️ REQUIRED:** Add `'my-module.html'` to the `knownModules` array in `js/app.js` (around line 480)
- Reload the app - your module appears in the task dropdown
- Select it and test!

**Don't skip step 2!** The module will not appear in the task list without being registered in the knownModules array.

---

## Module Requirements

### Required TaskModule Interface

Every module MUST implement this JavaScript interface:

```javascript
window.TaskModule = {
  // Called when module loads
  init: function(context) {
    // context contains:
    // - studentId: "123"
    // - taskId: "task_1_a"
    // - grade: "1"
    // - studentName: "John Doe"
    // - question: "What is 2+2?"
    // - existingResponse: "previous answer" (if any)
  },

  // Return the current response value
  getResponse: function() {
    return "student's answer"; // String, number, or JSON
  },

  // Return true if response is valid/complete
  isComplete: function() {
    return true; // or false
  },

  // Optional: Reset module to initial state
  reset: function() {
    // Clear selections, inputs, etc.
  }
};
```

### Communication with Parent App

Notify the parent app when the response changes:

```javascript
window.parent.postMessage({
  type: 'taskmodule:response',
  value: yourResponseValue,
  isComplete: true
}, '*');
```

This will:
- Update the response in the main app
- Mark the data as unsaved
- Enable the Save button

### Context Object

Your module receives this context when initialized:

```javascript
{
  studentId: "123",           // Unique student ID
  taskId: "task_1_a",         // Task identifier
  grade: "1",                 // Student's grade (K, 1, 2, 3, 4)
  studentName: "John Doe",    // Full name
  question: "What is 2+2?",   // Question text from tasks.csv
  existingResponse: "4"       // Previous response (if returning to task)
}
```

**Use `existingResponse` to restore state** if the teacher navigates back to a previously completed task.

---

## Built-in Module Examples

### Picture Module (`modules/picture.html`)

**What it does:**
- Loads an image from `tasks/Grade X/task_id.png`
- Displays keyboard input area
- Student types response on keyboard
- Shows typed text in large purple display

**File naming:**
The module uses the task_id (filename without .html) to find images.
For example, the module `note_identification.html` looks for `tasks/Grade 1/note_identification.png`.

---

### String Module (`modules/string.html`)

**What it does:**
- Displays question text in large colorful gradient
- Keyboard input for response
- Perfect for math problems or simple questions

The question text comes from the module's task_id (converted to readable format).
For example, `addition_practice.html` displays "Addition Practice" as the question.

---

### Word Ending Module (`modules/word-ending.html`)

**What it does:**
- Shows a tense (Past Tense, Present Continuous, etc.)
- Word fades in (argue, chat, walk, etc.)
- Student drags an ending (-ing, -ed, -s) to the word
- Teacher clicks "Next Word →" to log attempt
- Logs as JSON with correct/incorrect flag

**Response format:**
```json
{
  "attempts": [
    {
      "word": "argue",
      "ending": "ed",
      "tense": "Past Tense",
      "correct": true,
      "timestamp": "2025-12-09T..."
    }
  ]
}
```

**Features:**
- Drag & drop works with mouse and touch
- Word deck shuffles (each word shown once before repeating)
- Random tense assignment
- Infinite retries - each logged when "Next Word" clicked

**Configuration:**
Words and endings are hardcoded in the module. To customize:
1. Copy `word-ending.html` to a new file (e.g., `spanish-verbs.html`)
2. Edit the `words`, `tenses`, and `endings` arrays in the JavaScript
3. Save to `modules/` folder - it automatically appears in the app

---

## Best Practices

### Design for Smartboards

✅ **Large touch targets** - Minimum 60px buttons/clickable areas
✅ **High contrast** - Bright, vibrant colors visible from across room
✅ **Large text** - 24px+ for body, 48px+ for primary content
✅ **Immediate feedback** - Visual response to every interaction

### Keep Modules Self-Contained

✅ **All CSS inline** - Use `<style>` tags, no external stylesheets
✅ **All JavaScript inline** - No external scripts (Web APIs are fine)
✅ **No external dependencies** - No CDN libraries, everything in one file
✅ **Works offline** - No internet required

### Handle State Properly

✅ **Track response in variables** - Store student's answer in JavaScript
✅ **Restore from context** - Use `existingResponse` to show previous work
✅ **Notify on changes** - Call `postMessage` when response updates

### Error Handling

✅ **Graceful failures** - Handle missing resources (images, etc.)
✅ **User-friendly messages** - Show clear error text in the module
✅ **Never throw** - `getResponse()` and `isComplete()` should never error

---

## Example AI Prompts

### Audio Recording Module
```
Create a module with a large "Record" button. When clicked, record 30 seconds
of audio from the microphone using MediaRecorder API. Show recording status.
Return a data URL of the recording as the response. Make buttons 80px tall
for touchscreen use. Include error handling for microphone permissions.
```

### Multiple Choice with Images
```
Create a module showing 4 large image buttons in a 2x2 grid. Each button
is 150px square with a colored background (red, blue, green, yellow).
When clicked, highlight the selected button with a white border. Return
the color name as the response. Make it touch-friendly for smartboards.
```

### Interval Recognition
```
Create a music interval module. Play two notes in sequence using Web Audio API.
Show large buttons for intervals: 2nd, 3rd, 4th, 5th, Octave. When clicked,
highlight selection and return the interval name. Use 60px tall buttons with
gradients suitable for a smartboard display.
```

### Piano Keyboard
```
Create an interactive piano keyboard with one octave (C to C). Each key is
a large clickable div (white keys 80px wide, black keys 50px). Play the note
using Web Audio API when clicked. Return the note name (C, D, E, etc.) as
the response. Include both mouse and touch support.
```

---

## Advanced: Response Formats

### Simple String Response
```javascript
getResponse: function() {
  return "C"; // Note name, word, number, etc.
}
```

### JSON Response (for complex data)
```javascript
getResponse: function() {
  return JSON.stringify({
    answer: "argued",
    correct: true,
    attempts: 3,
    timeSpent: 45
  });
}
```

### Data URL (for media files)
```javascript
getResponse: function() {
  // Return base64-encoded audio/video/image
  return "data:audio/webm;base64,GkXfo59ChoEBQveB...";
}
```

**Note:** Large data URLs can make results.csv very big. For production use with lots of media, consider a separate media storage solution.

---

## Saving & Data Flow

### How Responses Are Saved

1. **Student interacts** with module (drag, click, type, etc.)
2. **Module updates** its internal response variable
3. **Module calls** `postMessage` to notify parent app
4. **Teacher takes action:**
   - Clicks "Next" button in module (if module has one) → logs attempt
   - Clicks another student → `getResponse()` called, response saved to results.csv
   - Clicks "Save" button → entire results.csv saved

### When to Notify Parent

**Notify on every change:**
```javascript
// Student clicks button
function handleClick(value) {
  currentResponse = value;
  notifyParent(); // Tell parent app immediately
}
```

**Or notify only when complete:**
```javascript
// Student completes multi-step task
function handleFinalSubmit() {
  if (allStepsComplete()) {
    notifyParent();
  }
}
```

The `isComplete` flag in your postMessage tells the parent app whether to enable saving.

---

## Troubleshooting

### Module Not Appearing in Dropdown
**Most Common Cause:** Module not registered in the fallback list!

**Check (in order):**
1. **⚠️ MOST IMPORTANT:** Module is registered in the `knownModules` array in `js/app.js` (around line 480)
2. HTML file exists in `modules/` folder
3. Filename doesn't start with `_` (underscore files are ignored)
4. Reload the app to refresh the module list (Ctrl+R or Cmd+R)
5. Browser console (F12) for error messages

**90% of the time, the issue is forgetting to add the module to knownModules in js/app.js!**

### Response Not Saving
**Check:**
- `getResponse()` returns a valid value (not null/undefined)
- `isComplete()` returns true when ready
- `postMessage` is called with correct format
- Browser console for errors

### Module Not Initializing
**Check:**
- `window.TaskModule` is defined globally
- Event listener for `taskmodule:init` exists
- `init()` function is being called (add console.log)

### Styles Not Working
**Check:**
- All CSS is in `<style>` tags (inline)
- No external stylesheet `<link>` tags
- CSS syntax is valid

### Drag & Drop Not Working on Touch
**Check:**
- Both mouse events (dragstart, dragend) and touch events (touchstart, touchend) implemented
- Touch events use `{ passive: true }` option
- Element has `touch-action: none` CSS property

---

## File Organization

```
music_teaching_assistant/
├── index.html
├── students.csv                 # Student roster
├── results.csv                  # Response data
├── modules/
│   ├── _template.html          # Starting template (ignored by loader)
│   ├── picture.html            # Built-in: image display
│   ├── string.html             # Built-in: text display
│   ├── word-ending.html        # Example: drag & drop
│   ├── simple-button-test.html # Example: button selection
│   ├── rhythm-trainer.html     # Your custom module
│   └── (more custom modules)   # Auto-loaded when app starts
└── tasks/
    ├── Grade K/
    ├── Grade 1/
    │   ├── note_identification.png
    │   └── rhythm_reading.png
    └── ...
```

---

## Sharing Modules

### To Share a Module:
1. Copy the HTML file from `modules/`
2. Include any required images/assets
3. Document any special requirements

### To Use a Shared Module:
1. Save HTML to your `modules/` folder
2. Add any required images to appropriate `tasks/Grade X/` folder (if applicable)
3. **⚠️ REQUIRED:** Register the module in `js/app.js` by adding the filename to the `knownModules` array (around line 480)
4. Reload the app - the module appears in the task dropdown
5. Test with a student

**Step 3 is mandatory!** Without registering in knownModules, the module won't appear in the task dropdown.

---

## Getting Help

**Stuck creating a module?**
1. Start with `_template.html` or copy an existing module
2. Use AI (Claude, ChatGPT) with specific prompts
3. Check browser console (F12) for JavaScript errors
4. Verify the TaskModule interface is correctly implemented
5. Test with simple responses first (return hardcoded values)

**Module works but data not saving?**
- Check that `getResponse()` returns a value
- Verify `isComplete()` returns true
- Look at browser console when clicking another student
- Check if results.csv is updating

---

## Tips for Success

💡 **Start simple** - Get basic functionality working before adding features
💡 **Test incrementally** - Add one feature at a time
💡 **Use console.log** - Debug by logging values to browser console
💡 **Copy working modules** - Learn by modifying existing examples
💡 **Ask AI for help** - Provide the template and describe what you want

---

## License & Community

This module system is designed for sharing:
- ✅ Share modules freely with other teachers
- ✅ Modify any module for your needs
- ✅ Create module libraries for your school
- ✅ Use AI to generate new modules

**Building something cool?** Share it with other music teachers!

Have fun creating interactive learning experiences! 🎵
