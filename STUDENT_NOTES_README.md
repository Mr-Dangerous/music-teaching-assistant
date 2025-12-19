# Student Notes Module

## Overview
The **Student Notes** module provides a simple text editor for teachers to take notes on individual students. Notes are automatically saved to `results.csv` and loaded when a student is selected.

## Features
- **Simple Text Editor**: Clean, distraction-free interface for note-taking
- **Live Character Count**: See real-time character count as you type
- **Timestamp Insertion**: Quickly add timestamped entries with the "🕐 Add Timestamp" button
- **Clear All**: Safely clear all notes with confirmation prompt
- **Auto-Save**: Notes automatically save when switching students or completing the task
- **Persistent Storage**: Notes persist in `results.csv` and reload when returning to a student

## How to Use

### 1. Add to tasks.csv

Add this entry to your `data/tasks.csv` file:

```csv
student_notes,Student Notes,K,modules/student_notes.html
```

**Field Breakdown:**
- `task_id`: `student_notes` (unique identifier)
- `question`: `Student Notes` (displayed in task dropdown)
- `grade`: `K` (visible to all grades)
- `module_path`: `modules/student_notes.html` (location of the module)

### 2. Using the Module

1. **Load your CSV files** in the main application
2. **Select a class** from the class selector
3. **Choose "Student Notes"** from the task dropdown
4. **Click a student** to load their notes (or start new notes)
5. **Type your notes** in the text editor
6. **Notes auto-save** when you switch students or complete the task

### 3. Features Explained

**Add Timestamp Button:**
- Inserts the current date and time at the cursor position
- Format: `[12/18/2025 9:30:00 PM]`
- Useful for tracking dated observations

**Clear All Button:**
- Removes all notes with a confirmation dialog
- Cannot be undone, so use carefully

**Character Counter:**
- Shows total character count in real-time
- Helps track note length

## Data Storage

Notes are stored in `results.csv` as plain text in the `response` column:

```csv
student_id,task_id,response,completed_date
123,student_notes,"[12/18/2025 9:30:00 PM]\nGreat improvement in rhythm reading.\n\n[12/18/2025 9:35:00 PM]\nNeeds more practice with intervals.",2025-12-18T21:35:00
```

## Tips

- **Use timestamps** to create a chronological log of observations
- **Add new notes** at the top or bottom to maintain a running log
- **Clear old notes** when starting a new semester/year
- **Copy notes** from `results.csv` for report cards or parent communications

## Customization

The module is self-contained in `modules/student_notes.html`. You can customize:
- Colors and styling in the `<style>` section
- Toolbar buttons and functionality in the `<script>` section
- Placeholder text in the `<textarea>` element

## Technical Details

**Module Type:** Custom TaskModule  
**Communication:** Uses `postMessage` API to communicate with parent app  
**Storage:** Text stored directly in `results.csv` response field  
**Compatibility:** Works with the module loader system described in MODULE_GUIDE.md
