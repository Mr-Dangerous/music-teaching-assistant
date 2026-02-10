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

## Testing

**IMPORTANT:** The user will always test functionality themselves. Do NOT launch a browser or attempt to verify implementations visually. Make code changes, explain what was done, and let the user test on their smartboard.

## Design Constraints

**NO SCROLLING:** The app is designed for smartboard use and must fit entirely on screen without scrolling. When adding new UI elements:
- **Minimize vertical space** - Keep buttons, controls, and containers compact
- **Dynamic sizing** - Use CSS grid/flexbox to adapt to available space
- **Avoid expansion** - Adding features (like checkboxes) should NOT make existing elements larger or push content off screen
- **Test fit** - Consider that class screens may have 10+ classes visible at once

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

### Semantic Versioning Rules

Version format: `MAJOR.MINOR.PATCH` (e.g., 0.3.0)

**When to increment:**
- **MAJOR.MINOR.0** → User requests new feature or significant change
  - Example: User asks for new module or major UX change → 0.3.0 → 0.4.0
- **MAJOR.MINOR.PATCH** → Claude commits/pushes code changes
  - Example: Bug fix or incremental update → 0.3.0 → 0.3.1

**Process:**
1. User requests change → Claude increments MINOR version
2. Claude commits/pushes → Claude increments PATCH version
3. Update `version.json` with each version bump
4. Version displayed in bottom-right corner of app
5. Forces cache refresh for users

**Current version:** 3.9.2 (Next user request: 3.10.0, Next commit: 3.9.3)

### Git Workflow Delegation

**CRITICAL: Always delegate git operations to the specialized git agent.**

When you need to perform ANY git operation (commit, push, version bump), use the Task tool with `subagent_type="Bash"` and `description="Git operations"`. The git agent will:
- Check git status and diff
- **MANDATORY: Bump version in version.json according to semantic versioning rules (see below)**
- Create properly formatted commit messages with Co-Authored-By attribution
- Push changes to remote repository
- Follow all git safety protocols (no force push, no destructive operations, etc.)

**DO NOT perform git operations directly.** Always delegate to the git agent.

**CRITICAL VERSION BUMPING REQUIREMENT:**

The git agent MUST bump the version in `version.json` following these rules:

1. **User requests new feature/change** → Bump MINOR version (e.g., 3.6.1 → 3.7.0)
   - Example: User asks to add note selection feature
   - This happens BEFORE committing

2. **Git commit/push** → Bump PATCH version (e.g., 3.7.0 → 3.7.1)
   - Example: Committing the code changes
   - This happens DURING the commit process

**Two-step process example:**
- Current version: 3.6.1
- User requests: "Add custom note selection" → Bump to 3.7.0
- Git commit: Changes committed → Bump to 3.7.1
- Final result: Version 3.7.1 committed and pushed

Example:
```
When code changes are complete and ready to commit:
→ Use Task tool to invoke git agent
→ Agent handles:
   1. Bump MINOR version (user-requested feature)
   2. Bump PATCH version (commit)
   3. Update version.json
   4. git add (including version.json)
   5. git commit with proper message
   6. git push
→ Report results back to user
```

**Exceptions:** You may run `git status` or `git log` directly for informational purposes only. All write operations (add, commit, push, version bumping, etc.) MUST go through the git agent.

## Module Validation Agent

**CRITICAL: Always validate new modules before first push.**

When creating a new custom module in `modules/`, you MUST run the module validation agent before committing and pushing to ensure the module is properly integrated and accessible.

### Purpose

The module validation agent performs comprehensive pre-push validation to catch integration issues that would prevent teachers from using the new module in production. This includes verifying accessibility via the task dropdown, validating the TaskModule interface, and checking for common integration errors.

### When to Use

**REQUIRED for:**
- ✅ All newly created modules in `modules/` directory
- ✅ Modules being created for the first time (never pushed before)
- ✅ Significant rewrites that change module structure or communication

**NOT required for:**
- ❌ Bug fixes to existing modules (minor edits)
- ❌ CSS/styling changes only
- ❌ Updates to existing modules already in production

### Validation Checks

The agent performs the following checks:

#### 1. **Dropdown Accessibility Check** (CRITICAL)
- Verifies module is referenced in `tasks.csv` OR in fallback task list
- Without this, module will not appear in task dropdown and is unusable
- Checks for proper CSV format: `task_id,question,question_type,input_type,grade,question_module,response_module`
- Validates module path is correct relative to project root

#### 2. **TaskModule Interface Validation**
Ensures module implements required interface:
```javascript
window.TaskModule = {
  init(context) { },        // Required: Receives context from app
  getResponse() { },        // Required: Returns current response value
  isComplete() { },         // Required: Returns boolean completion status
  reset() { }               // Optional: Cleanup on module close
}
```

#### 3. **Message Communication Check**
Verifies module can send/receive messages:
- Checks for `window.parent.postMessage()` calls
- Validates `window.addEventListener('message')` listener
- Ensures proper message type formatting (e.g., `taskmodule:response`)

#### 4. **Syntax Validation**
- Validates HTML structure
- Checks for JavaScript syntax errors (via Node.js if available)
- Identifies unclosed tags, missing quotes, broken event handlers

#### 5. **Dependency Check**
- For modules using shared libraries: validates imports from `modules/shared/`
- Checks CDN links are accessible (jsPDF, html2canvas, etc.)
- Warns about external dependencies that may break offline functionality

#### 6. **File Organization**
- Confirms module is in correct directory (`modules/`)
- Checks naming conventions (kebab-case recommended)
- Validates no conflicting module names

### How to Invoke

When you create a new module, invoke the validation agent BEFORE the git commit:

```
Step 1: Create module file (modules/new-module.html)
Step 2: Add entry to tasks.csv
Step 3: Invoke validation agent → Use Task tool with subagent_type="general-purpose"
Step 4: Fix any issues reported by agent
Step 5: Re-run validation until all checks pass
Step 6: Invoke git agent to commit and push
```

**Example invocation:**
```
Use Task tool with:
- subagent_type: "general-purpose"
- description: "Validate new module"
- prompt: "Run module validation checks on modules/instrument-assigner-v2.html.
          Verify it's accessible via dropdown (check tasks.csv), implements
          TaskModule interface, has proper message handling, and passes syntax
          validation. Report any issues found."
```

### Validation Output

The agent will report:
- ✅ **PASS**: All checks passed, safe to push
- ⚠️ **WARNING**: Non-critical issues found (e.g., missing optional methods)
- ❌ **FAIL**: Critical issues that MUST be fixed before push

### Critical Failures (Must Fix)

These issues block pushing:
1. Module not referenced in tasks.csv (won't appear in dropdown)
2. Missing required TaskModule interface methods (init, getResponse, isComplete)
3. JavaScript syntax errors (will break app loading)
4. Incorrect module path in tasks.csv (404 error when loading)

### Example tasks.csv Entry

For a new module to be accessible, it needs an entry like:

```csv
task_id,question,question_type,input_type,grade,question_module,response_module
instrument_v2,Assign instruments for performance,string,custom,,,modules/instrument-assigner-v2.html
rhythm_dictation,Rhythm Dictation Practice,string,custom,,,modules/rhythm-dictation-trainer.html
```

**Column requirements:**
- `task_id`: Unique identifier (no spaces)
- `question`: Display text in dropdown
- `question_type`: Usually "string" for custom modules
- `input_type`: Must be "custom" for HTML modules
- `response_module`: Path to module file (required for custom input_type)

### Integration with Git Workflow

The validation agent should be invoked BETWEEN module creation and git push:

```
1. Claude creates new module
2. Claude adds tasks.csv entry
3. 🔍 VALIDATION AGENT RUNS (this step)
4. Claude fixes any issues found
5. Git agent commits and pushes
```

**DO NOT skip validation** - catching integration errors before push prevents broken production deployments.

### Future Enhancements

Additional checks to be added:
- Asset library integration (verify module uses existing assets)
- Responsive design validation (test on different resolutions)
- Auto-save behavior check (ensure modules trigger auto-save)
- Cross-browser compatibility tests
- Performance profiling (module load time)

## Fullscreen Mode

The app supports fullscreen mode for immersive student task display:
- Triggered when displaying task modules
- Maximizes vertical space for module iframe
- Header becomes more compact in fullscreen
- Press ESC to exit fullscreen

## Asset Library

**IMPORTANT:** The project includes a comprehensive asset library that serves as the baseline for all future projects and modules.

**Location:** `assets/`

**Organization:** Assets are organized into 18 categories:
- `body_percussion/` - Body percussion icons (12 files)
- `boomwhackers/` - Boomwhacker graphics (24 files)
- `cards/` - Music notation cards for activities (43 files)
- `clefs/` - Treble and bass clefs (2 files)
- `dynamics/` - Dynamic markings (2 files)
- `fermatas/` - Fermata symbols (various colors)
- `hands/` - Hand signs and solfege gestures (14 files)
- `key_signatures/` - Key signature graphics (3 files)
- `misc/` - Uncategorized assets (6 files)
- `notes/` - Individual note graphics (15 files)
- `recorder/` - Recorder fingering charts (34 files)
- `rests/` - Rest symbols (3 files)
- `staff_lines/` - Musical staff lines (7 files)
- `symbols/` - Musical symbols (16 files)
- `text/` - Text-based musical notation (7 files)
- `time_signatures/` - Time signature graphics (6 files)
- `trombone/` - Trombone slide positions (4 files)
- `trumpet/` - Trumpet fingering charts (4 files)

**Total:** 202 organized assets

**Resource Index:** `assets_resources.json` (at project root)
- Machine-readable JSON catalog of all assets
- Includes file paths, categories, and metadata
- Use this file to programmatically discover and reference assets
- AI assistants should consult this file when creating new modules or features

**Usage Guidelines:**
- **Always use existing assets** from this library when creating new modules
- Assets use descriptive naming conventions (e.g., `card_white_quarter_note_ta.png`)
- Reference assets using relative paths from module location
- Add new assets to appropriate category folders and update `assets_resources.json`

## Notes for Future Changes

- README.md is outdated (describes old single-file system). THREE_FILE_SYSTEM.md is current.
- Student roster uses two-column layout with duplicate name detection (shows last initial if needed)
- Response input is dynamically rendered - new input types need updates to response-handler.js
- Grade filtering assumes students in same class have same grade (uses first student's grade)
- Custom modules are self-contained (no external dependencies except modules/shared/) to ensure offline functionality
- Module responses stored as strings in results.csv - for media files, consider data URLs or separate storage
- Recent commits focus on vertical space optimization for module display
