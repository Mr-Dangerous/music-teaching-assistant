# Greig Boomwhacker Assignment Module

## Overview
This module assigns boomwhackers to students for two melodies based on your specified requirements.

## Files Created
1. **`boomwhacker_inventory.csv`** - Complete inventory of all your boomwhackers with quantities
2. **`modules/greig_boomwhacker_assignment.html`** - The assignment module

## Features Implemented

### 1. Boomwhacker Assignment
- **Melody 1**: A, low C, E, D#, D, G
- **Melody 2**: E, G, G#, B, high C
- Respects inventory quantities (4 of most notes, 2 of accidentals)
- Only assigns to present students (skips absent students)
- Assigns 1 boomwhacker per melody to each student when possible

### 2. Drag and Drop
- Drag any boomwhacker from one student to another
- Students can have 0-3+ boomwhackers as you reassign them
- Visual feedback during dragging

### 3. Color Coding
Based on your solfege trainer color system:
- **C (Do)**: Red (#e74c3c)
- **D (Re)**: Orange (#e67e22)
- **E (Mi)**: Yellow (#f1c40f)
- **F**: Blue (#3498db)
- **G (So)**: Green (#27ae60)
- **A (La)**: Purple (#9b59b6)
- **B**: Pink (#e91e63)
- **Accidentals**: Darker shades of their base notes

### 4. Clean Display
- No scrolling required - everything fits on one screen
- Student cards with name and assigned boomwhackers
- Color-coded chips show note name and melody number (M1/M2)
- Absent students are grayed out
- Legend shows melody colors

## How to Use

### Adding to tasks.csv
Add this line to your `tasks.csv` file:
```csv
greig_boomwhacker,Greig Boomwhacker Assignment,K,modules/greig_boomwhacker_assignment.html
```

### Using the Module
1. Load students.csv, tasks.csv, and results.csv in the main app
2. Select a class
3. Mark any absent students (long-press on student button)
4. Select "greig_boomwhacker" from the task dropdown
5. Click "Practice" or select any student to open the module
6. Click "Ready to Assign!" to automatically distribute boomwhackers
7. Drag and drop to manually adjust assignments

### Saving
- Assignments are automatically saved to results.csv
- This is NOT written to results.csv by default (as per your requirement)
- If you want to save assignments, the module responds to the TaskModule interface

## Technical Details

### Integration with Main App
- Requests student list from parent app via postMessage
- Receives student data including absent status
- Stores assignments as JSON in the response field
- Supports the full TaskModule interface (init, getResponse, isComplete, reset)

### Assignment Algorithm
- Filters out absent students
- Shuffles present students for randomness
- Distributes notes evenly based on inventory
- Tries to assign one note per melody to each student
- If there aren't enough boomwhackers for everyone, some students won't get one for that melody

## App.js Updates
Added support for modules to request the current class's student list:
- New message type: `taskmodule:request-students`
- Returns students with absent status
- Handler: `handleStudentListRequest()`

## Version
Updated version.json to 0.4.0 per semantic versioning (new feature = minor version bump)
