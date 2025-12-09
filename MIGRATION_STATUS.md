# Migration to Two-File Structure - Status

## Completed ✅

### 1. Data Files Created
- `students.csv` - 354 students with student_id, name, grade, class
- `results.csv` - 45 current task assignments/responses
- `students_old_backup.csv` - Original file backed up

### 2. File Manager Updated (`js/file-manager.js`)
- Now handles two files (students.csv and results.csv)
- Prompts user to load both files
- Remembers file locations during session (using File System Access API)
- localStorage marker for file session detection
- `loadFiles()` - loads both files
- `saveResults()` - saves only results.csv

## In Progress 🔄

### 3. App.js Updates Needed
The following changes are required in `js/app.js`:

#### Data Structure
```javascript
// OLD:
this.students = [];  // Array of student objects with artifact columns

// NEW:
this.students = [];  // Array from students.csv (student_id, name, grade, class)
this.results = [];   // Array from results.csv (student_id, task_id, question, etc.)
this.selectedTask = null;  // Currently selected task
```

#### Loading
```javascript
// OLD:
loadFile() → Load one CSV → Parse into students array

// NEW:
loadFiles() → Load both CSVs → Parse students.csv → Parse results.csv → Store separately
```

#### Joining Data
Need to create method to join student with their results for current task:
```javascript
getStudentTaskData(student_id, task_id) {
  // Find result row for this student+task combination
  // Return {student: {...}, result: {...}}
}
```

#### Task Selection
- Add dropdown/selector for choosing which task to assess
- Update UI to show selected task
- Filter students by who has/hasn't completed selected task

#### Saving
```javascript
// OLD:
saveFile() → Convert students to CSV → Save to students.csv

// NEW:
saveResults() → Convert results to CSV → Save to results.csv
// Students.csv never changes during assessment
```

#### Response Handling
When student submits response:
1. Find existing row in results array (student_id + task_id)
2. If exists, update response field
3. If doesn't exist, create new row
4. Save results.csv

## Remaining Tasks 📝

1. **Update app.js constructor** - Add results array, selectedTask
2. **Update loadFile() method** - Call fileManager.loadFiles(), parse both
3. **Add task selector UI** - Dropdown in header or student screen
4. **Update displayStudentTask()** - Look up task from results array
5. **Update showResponseArea()** - Use current selected task
6. **Update save logic** - Save to results.csv only
7. **Update green highlighting** - Check results array for current task
8. **Test complete workflow** - Load → Select task → Select student → Respond → Save

## Data Flow

```
User opens app
  ↓
Loads students.csv (roster)
  ↓
Loads results.csv (responses)
  ↓
Selects a class
  ↓
Selects a task (from dropdown or current default)
  ↓
Sees student roster (green = completed this task)
  ↓
Selects student
  ↓
Displays task for that student
  ↓
Student responds
  ↓
Countdown → Save to results.csv
  ↓
Student button turns green
```

## Breaking Changes

- Users must now load TWO files instead of one
- Old single-file CSV format no longer supported (backup saved)
- Task selection required (though could default to a task if only one exists)

## Benefits

✅ Unlimited tasks without adding columns
✅ Easy to see which students completed which tasks
✅ Can assign tasks on the fly
✅ No empty cells/columns
✅ Scalable architecture
