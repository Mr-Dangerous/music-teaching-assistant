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
   - `task_id, question, question_type, input_type, grade`
   - Grade field enables filtering tasks by grade level

3. **results.csv** - Student responses (relationships)
   - `student_id, task_id, response, completed_date`
   - Links students to tasks with responses

This replaces an older "wide format" single CSV with artifact_1, artifact_2 columns.

### Module Responsibilities

**app.js** - Main application controller
- Manages UI state and navigation between screens
- Coordinates between other modules
- Implements grade-based task filtering in `populateTaskSelector(filterGrade)`
- Key methods: `loadFile()`, `showClassScreen()`, `showStudentScreen()`, `displayStudentTask()`

**file-manager.js** - File I/O operations
- Uses File System Access API (Chrome/Edge) for persistent file access
- Fallback to download links for Firefox/Safari
- `loadFiles()` prompts for all three CSVs with step-by-step guidance
- `saveResults()` only saves results.csv (students.csv and tasks.csv are read-only)

**csv-handler.js** - CSV parsing
- Handles CSV string parsing with proper quote/comma handling
- Used by app.js parsers: `parseStudentsCSV()`, `parseTasksCSV()`, `parseResultsCSV()`

**response-handler.js** - Dynamic input rendering
- Renders different input types based on task's `input_type` field
- Supports: `free_type`, `multiple_choice(option1|option2|...)`, custom types
- Handles keyboard input for free_type responses

### Data Flow

```
1. Load: file-manager → CSVs → app.js parsers → in-memory arrays
2. Select class → filter students by class → extract grade → filter tasks by grade
3. Select task → find/create result entry → render input based on task.input_type
4. Student responds → update result.response → start countdown timer
5. Countdown completes → save results.csv via file-manager
```

### Grade-Based Filtering

Critical feature: When a class is selected, tasks are filtered to show only those matching the class's grade level.

Implementation: `showStudentScreen()` extracts the class grade and calls `populateTaskSelector(classGrade)`, which filters `this.tasks` array by the `grade` field.

### Key Design Decisions

**File System Access API with fallback:**
- Chrome/Edge: Can read/write files in place with permission
- Firefox/Safari: Downloads files on save (can't write in place)

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

**input_type:**
- `free_type` - Keyboard input, displays on screen as typed
- `multiple_choice(opt1|opt2|...)` - Renders buttons for each option
- Parsed and handled by response-handler.js

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

## Notes for Future Changes

- README.md is outdated (describes old single-file system). THREE_FILE_SYSTEM.md is current.
- Student roster uses two-column layout with duplicate name detection (shows last initial if needed)
- Response input is dynamically rendered - new input types need updates to response-handler.js
- Grade filtering assumes students in same class have same grade (uses first student's grade)
