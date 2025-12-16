# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A browser-based smartboard teaching assistant for conducting student assessments. Pure HTML/CSS/JS with no build process - open `index.html` directly in a browser.

## Running the App

```bash
# Option 1: Just open index.html in a browser
open index.html

# Option 2: Use a local server (recommended for development)
python3 -m http.server 8080
# Then open: http://localhost:8080
```

No build, compile, or bundle steps needed.

## Architecture

### Three-File CSV System

The app uses a normalized relational data structure across three CSV files:

1. **students.csv** - Student roster (entities)
   - `student_id, name, grade, class`
   - Single source of truth for student data

2. **tasks.csv** - Task definitions (metadata)
   - `task_id, question, question_type, input_type, grade, question_module, response_module`
   - Grade field is informational only (all tasks available to all grades)
   - question_module and response_module enable custom HTML modules (optional)

3. **results.csv** - Student responses (relationships)
   - `student_id, task_id, response, completed_date`
   - Links students to tasks with responses

This replaces an older "wide format" single CSV with artifact_1, artifact_2 columns.

### Module Responsibilities

**app.js** - Main application controller
- Manages UI state and navigation between screens
- Coordinates between other modules
- Displays all tasks for all grades (no grade-level filtering)
- Includes random student picker for selecting students who haven't completed the current task
- Key methods: `loadFile()`, `showClassScreen()`, `showStudentScreen()`, `displayStudentTask()`, `pickRandomStudent()`

**file-manager.js** - File I/O operations
- Uses File System Access API (Chrome/Edge) for persistent file access
- Fallback to download links for Firefox/Safari
- `loadFiles()` supports batch loading: select all 3 CSVs at once with auto-detection by filename
- Auto-detects file types based on keywords: "student", "task", "result"
- Falls back to step-by-step prompts if batch loading fails
- `saveResults()` only saves results.csv (students.csv and tasks.csv are read-only)

**csv-handler.js** - CSV parsing
- Handles CSV string parsing with proper quote/comma handling
- Used by app.js parsers: `parseStudentsCSV()`, `parseTasksCSV()`, `parseResultsCSV()`

**response-handler.js** - Dynamic input rendering
- Renders different input types based on task's `input_type` field
- Supports: `free_type`, `multiple_choice(option1|option2|...)`, custom types
- Handles keyboard input for free_type responses

**config.js** - Question type configurations (legacy)
- Defines input renderers for buttons, checkboxes, scales, text
- UI settings for smartboard (colors, fonts, touch targets)
- Note: Mostly superseded by custom modules, but still used for some built-in types

**module-loader.js** - Custom module system
- Loads HTML modules as sandboxed iframes
- Manages communication via postMessage API
- Supports custom question displays and response inputs
- See MODULE_GUIDE.md for creating custom modules

### Data Flow

```
1. Load: file-manager → CSVs (batch or individual) → app.js parsers → in-memory arrays
2. Select class → filter students by class → show all available tasks
3. Select task → find/create result entry → display task module
4. Student responds → update result.response → start countdown timer
5. Countdown completes → save results.csv via file-manager
```

### Random Student Picker

Feature to help teachers randomly select students for participation:
- Button appears at bottom of student roster (labeled "Random")
- Only selects from students who haven't completed the current task
- Shows student's first name in a full-screen popup for 3 seconds
- Click popup to dismiss early
- Shows notification if all students have completed the task

Implementation: `pickRandomStudent()` filters available students and calls `showRandomStudentPopup()` with the selected student's first name.

### Key Design Decisions

**File System Access API with fallback:**
- Chrome/Edge: Can read/write files in place with permission
- Firefox/Safari: Downloads files on save (can't write in place)

**Batch file loading:**
- Users can select all 3 CSV files at once (Ctrl+click or Cmd+click)
- Auto-detects file types based on filename keywords: "student", "task", "result"
- Falls back to individual file prompts if auto-detection fails
- Significantly faster than the old 3-step file selection process

**Auto-save on countdown:**
- After student responds, 5-second countdown timer
- On completion, saves results.csv automatically
- Also saves on window close/visibility change (Chrome/Edge only)

**Task images organized by grade:**
- Task images stored in: `tasks/Grade 1/task_id.png`
- `loadTaskImage()` constructs path using student's grade

**Completion highlighting:**
- Student roster buttons show green gradient if `hasCompletedTask(student_id, task_id)` returns true
- Updated after countdown completes via `updateStudentButtonState()`

## Styling

Kid-friendly colorful theme:
- Animated rainbow gradient background
- Rounded buttons (20-25px border-radius) with gradients
- Color-coded states: purple (default), pink (active), green (completed), orange (response buttons)
- Header: gradient blue→purple→pink

Task dropdown options have white background with dark text (fixed readability issue).

## Task Types

**question_type:**
- `picture` - Loads image from tasks/Grade X/ folder
- `string` - Displays text directly (large font for smartboard)
- `custom` - Loads custom HTML module from question_module path

**input_type:**
- `free_type` - Keyboard input, displays on screen as typed
- `multiple_choice(opt1|opt2|...)` - Renders buttons for each option
- `custom` - Loads custom HTML module from response_module path
- Parsed and handled by response-handler.js (except custom, which uses module-loader.js)

## Custom Module System

The app supports custom HTML modules for both question display and response collection. This enables interactive tasks like:
- Sheet music display with note selection
- Audio/video recording from webcam/mic
- Rhythm games and interactive exercises
- Any custom HTML/CSS/JS interactive content

### Module Architecture

**iframe sandboxing:**
- Modules load in iframes with `sandbox="allow-scripts allow-same-origin"`
- Isolates custom code from main app
- Prevents module errors from breaking the app

**postMessage communication:**
- Parent app sends `taskmodule:init` message with context
- Modules send `taskmodule:response` messages with response data
- Unidirectional data flow ensures safety

**TaskModule interface:**
Every custom module must implement:
```javascript
window.TaskModule = {
  init(context) { },        // Receive studentId, taskId, grade, existingResponse
  getResponse() { },        // Return current response value
  isComplete() { },         // Return true if response is complete
  reset() { }               // Optional: clear module state
}
```

### Shared Module System

For complex modules (especially music composers), reusable ES6 modules are available in `modules/shared/`:

- **MusicNotation.js** - Music theory utilities, pitch ordering, interval calculations
- **MusicStaffRenderer.js** - Renders musical staff with notes on canvas
- **AudioPlayer.js** - Web Audio API wrapper for playing notes/melodies
- **DragDropHandler.js** - Unified drag-and-drop for mouse and touch events
- **ComposerState.js** - State management for music composition tasks
- **ComposerJSON.js** - Serialization/deserialization of compositions
- **ComposerScreenshot.js** - Canvas-to-image conversion for submissions
- **VersionDisplay.js** - Version badge rendering

**Usage pattern:**
```html
<script type="module">
  import { MusicNotation } from './shared/MusicNotation.js';
  import { AudioPlayer } from './shared/AudioPlayer.js';
  // Use in module code
</script>
```

**Benefits:**
- Code reuse across multiple music modules
- Consistent behavior for common tasks
- Easier maintenance (fix once, applies everywhere)
- Smaller individual module file sizes

**4K Display Support:**
Some modules include responsive scaling via CSS custom properties:
```css
:root { --module-scale: 1; }
body.resolution-4k { --module-scale: 2; }
```
This doubles all dimensions on high-resolution displays for better smartboard visibility.

### Module Integration Points

**app.js integration:**
- `displayStudentTask()` checks for `question_type === 'custom'` and calls `loadCustomQuestionModule()`
- `showResponseArea()` checks for `input_type === 'custom'` and calls `loadCustomResponseModule()`
- `setupUI()` listens for `taskmodule:response` messages to update results
- `moduleLoader.reset()` called when switching students to clean up iframes

**module-loader.js methods:**
- `loadModule(url, container, context)` - Creates iframe, loads module, sends init context
- `getResponse()` - Retrieves response from current response module
- `isComplete()` - Checks if response module has valid response
- `reset()` - Unloads and removes module iframes

### File Organization

```
modules/
  _template.html          - Starting template for creating new modules
  (custom modules...)     - Teacher-created or AI-generated modules
```

### Creating Modules

Teachers can use AI (Claude, ChatGPT) to generate modules:
1. Start with `modules/_template.html`
2. Describe desired functionality in natural language
3. AI generates self-contained HTML with TaskModule interface
4. Add module path to tasks.csv
5. Test in app

See MODULE_GUIDE.md for detailed instructions and examples.

## Common Patterns

**Creating a new result entry:**
```javascript
const result = this.getOrCreateResult(student_id, task_id);
// Creates minimal entry: { student_id, task_id, response: '', completed_date: '' }
// Task metadata comes from tasks array, NOT stored in results
```

**Adding a new task:**
1. Add row to tasks.csv with appropriate grade level
2. Reload app - task appears in dropdown for matching grade classes
3. App auto-creates result entries as students are assigned the task

**CSV writing:**
- Only results.csv is written (students and tasks are source files)
- `resultsToCSV()` outputs 4 columns only (no task metadata duplication)

## UI State Management

Screens: `file-load` → `class-select` → `student-select`

Back button visibility managed in:
- `loadFile()` - hides initially
- `showClassScreen()` - hides button
- `showStudentScreen()` - shows button

Countdown timer is a global overlay, shown after response submission via `startCountdown()`.

## Additional Utilities

**results-viewer.html** - Standalone results analysis tool
- Load results.csv to view student responses
- Filter by class, task, or student
- Export filtered views
- Does not modify data (read-only viewer)

**version.json** - Version tracking
- Current version and last updated date
- Description of latest changes
- Referenced by modules that display version badges

## Fullscreen Mode

The app supports fullscreen mode for immersive student task display:
- Triggered when displaying task modules
- Maximizes vertical space for module iframe
- Header becomes more compact in fullscreen
- Press ESC to exit fullscreen

## Notes for Future Changes

- README.md is outdated (describes old single-file system). THREE_FILE_SYSTEM.md is current.
- Student roster uses two-column layout with duplicate name detection (shows last initial if needed)
- Response input is dynamically rendered - new input types need updates to response-handler.js
- Grade filtering assumes students in same class have same grade (uses first student's grade)
- Custom modules are self-contained (no external dependencies except modules/shared/) to ensure offline functionality
- Module responses stored as strings in results.csv - for media files, consider data URLs or separate storage
- Recent commits focus on vertical space optimization for module display
