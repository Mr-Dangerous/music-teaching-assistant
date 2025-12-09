# Three-File System with Grade-Based Task Filtering

## What's New

Your music teaching assistant now uses **three CSV files** with grade-based task filtering:

### 1. **students.csv** - Student Roster
- Columns: `student_id`, `name`, `grade`, `class`
- Contains all 354 students
- Rarely changes

### 2. **tasks.csv** - Task Definitions with Grade Levels ✨ NEW!
- Columns: `task_id`, `question`, `question_type`, `input_type`, `grade`
- Contains task definitions with assigned grade levels
- **Grade filtering**: Only shows tasks relevant to the selected class

### 3. **results.csv** - Task Responses (Simplified)
- Columns: `student_id`, `task_id`, `response`, `completed_date`
- Just the responses - task metadata is in tasks.csv
- Grows as students complete tasks

## Grade-Based Filtering - How It Works

### The Problem It Solves
- Grade 1 students shouldn't see Grade 3 tasks
- Teachers need to see only relevant tasks for their class
- Reduces clutter and confusion

### How It Works
1. **Load files** - App loads all three CSVs
2. **Select class** - Choose "Hernandez 1" (Grade 1 class)
3. **Tasks auto-filter** - Task dropdown shows ONLY Grade 1 tasks
4. **Select task** - Pick from the filtered list
5. **Assess students** - Green highlighting shows completion for that task

### Example Flow
```
1. Load students.csv, tasks.csv, results.csv
2. Select "Hernandez 1" (Grade 1)
3. Task selector shows:
   - task_1_a (Grade 1) ✓
   - task_1_b (Grade 1) ✓
   - 2+2=? (Grade 1) ✓
   (Grade 2, 3, 4 tasks are hidden)
4. Select "task_1_a"
5. See which Grade 1 students completed it
6. Assess remaining students
```

## File Structure

### students.csv
```csv
student_id,name,grade,class
1,Abigail M,1,Hernandez 1
2,Adriel G,1,Hernandez 1
```

### tasks.csv (with grade field)
```csv
task_id,question,question_type,input_type,grade
task_1_a,task_1_a,picture,free_type,1
task_1_b,task_1_b,picture,multiple_choice(3|6|7|8),1
"2+2=?","2+2=?",string,free_type,1
```

### results.csv (simplified - just responses)
```csv
student_id,task_id,response,completed_date
1,task_1_a,4,
2,task_1_a,,
```

## Adding New Tasks

### Option 1: Edit tasks.csv
Open `tasks.csv` and add a new row with the task definition:

```csv
rhythm_1,Can you clap this rhythm?,picture,multiple_choice(Yes|No),2
```

Make sure to set the correct grade level (K, 1, 2, 3, 4)!

### Option 2: Let the app create entries
Just select a student and the app will create a results entry automatically.

## Benefits

✅ **Grade-appropriate content** - Students only see tasks for their grade
✅ **Cleaner interface** - No more scrolling through irrelevant tasks
✅ **Unlimited scalability** - Add as many tasks as you want per grade
✅ **Easy task management** - All task definitions in one place
✅ **Simple results tracking** - results.csv is just student-task-response

## Technical Implementation

### Code Changes Made

1. **file-manager.js**
   - Added third file handle: `tasksFileHandle`
   - Updated `loadFiles()` to load all 3 files
   - Updated `openFileWithAPI()` to handle 'tasks' file type

2. **app.js**
   - Added `parseTasksCSV()` to parse tasks with grade field
   - Updated `parseResultsCSV()` to handle 4-column format
   - Removed `extractUniqueTasks()` method (no longer needed)
   - Updated `resultsToCSV()` to write 4 columns instead of 7
   - Updated `getOrCreateResult()` to not store task metadata
   - **Added grade filtering to `populateTaskSelector(filterGrade)`**
   - Updated `showStudentScreen()` to filter tasks by class grade

### Key Function: `populateTaskSelector(filterGrade)`

```javascript
populateTaskSelector(filterGrade = null) {
  // Filter tasks by grade if specified
  const tasksToShow = filterGrade
    ? this.tasks.filter(task => task.grade === filterGrade)
    : this.tasks;

  // Populate dropdown with filtered tasks
  // Auto-select first task if current selection is filtered out
}
```

When a class is selected:
```javascript
// Get the grade for this class and filter tasks
const classGrade = classStudents[0].grade; // e.g., "1"
this.populateTaskSelector(classGrade);     // Shows only Grade 1 tasks
```

## Troubleshooting

**Q: Task dropdown is empty after selecting a class**
- Check that tasks.csv has tasks with matching grade levels
- Verify the grade field in tasks.csv matches student grades (K, 1, 2, 3, 4)

**Q: I see all tasks instead of filtered tasks**
- Make sure you selected a class first
- Check that students in the class have a grade field set

**Q: Wrong tasks showing for my class**
- Verify the class's grade level in students.csv
- Check that tasks.csv has the correct grade assigned to each task

**Q: How do I add a task for multiple grades?**
- Add one row per grade in tasks.csv with the same question but different task_ids:
  ```csv
  task_2a_g1,Question 2a,picture,free_type,1
  task_2a_g2,Question 2a,picture,free_type,2
  ```

## Migration Summary

### What Changed
- ❌ OLD: Single-file, task metadata duplicated in results
- ✅ NEW: Three files, task metadata centralized with grade filtering

### Data Integrity
- All existing student data preserved in students.csv
- All existing responses preserved in results.csv
- Task definitions extracted to tasks.csv with grade levels
- Original file backed up as `students_old_backup.csv`

## Next Steps

Your system is ready with grade-based task filtering! Workflow:

1. Load all three files
2. Select a class (e.g., "Hernandez 1")
3. **Tasks auto-filter to show only Grade 1 tasks**
4. Select a task
5. See completion status (green = done)
6. Assess students
7. Results auto-save

Enjoy your upgraded teaching assistant with smart grade filtering! 🎓🎵
