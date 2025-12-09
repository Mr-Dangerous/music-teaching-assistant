# New Two-File System - Complete! ✅

## What Changed

Your app now uses **two CSV files** instead of one:

1. **students.csv** - Your complete student roster (354 students)
   - Columns: `student_id`, `name`, `grade`, `class`
   - This rarely changes (only when adding/removing students)

2. **results.csv** - All task assignments and responses (45 current tasks)
   - Columns: `student_id`, `task_id`, `question`, `question_type`, `input_type`, `response`, `completed_date`
   - This grows as you assign tasks and collect responses

## How To Use

### Step 1: Load Files
1. Open `index.html` in your browser
2. Click "Load Student Data (CSV)"
3. **First**, select `students.csv` when prompted
4. **Second**, select `results.csv` when prompted
5. Both files load automatically!

### Step 2: Select Task
- Look at the **header** - you'll see a new dropdown: "Select Task..."
- Choose which task you want to assess (e.g., "task_1_a (picture)" or "2+2=? (string)")
- The task selector shows all tasks found in results.csv

### Step 3: Select Class & Students
- Choose a class from the grid
- Students with **green highlighting** have already completed the selected task
- Students **without highlighting** haven't done it yet
- Click any student to assign them the task

### Step 4: Conduct Assessment
- Student sees the task (image or text)
- They respond (buttons or keyboard)
- 5-second countdown starts
- Results auto-save to `results.csv`
- Student button turns green ✅

### Step 5: Switch Tasks
- Use the **task dropdown** in the header to switch to a different task
- Green highlighting updates instantly to show who completed the NEW task
- You can now see progress across all tasks!

## Key Features

### ✅ Assign Tasks On The Fly
- Select any student
- They automatically get assigned the current selected task
- Their entry is added to results.csv
- No need to pre-assign tasks!

### ✅ Unlimited Tasks
- Add as many tasks as you want
- Just add rows to results.csv (or let the app create them)
- No more "artifact_1, artifact_2, artifact_N" columns

### ✅ Track Progress Per Task
- Switch between tasks using the dropdown
- Green highlighting shows completion for THAT task only
- Easy to see which students need which assessments

### ✅ File Memory (During Session)
- The app remembers your file locations while the browser tab is open
- If you refresh, it tries to reload from the same location
- Note: You'll need to grant permission again each session (browser security)

## Adding New Tasks

### Option 1: Let The App Do It
1. If a student doesn't have a task assigned yet
2. The app creates a new entry in results.csv automatically
3. Just respond and save!

### Option 2: Manually Add To results.csv
Open `results.csv` in Excel or text editor and add rows:

```csv
student_id,task_id,question,question_type,input_type,response,completed_date
1,rhythm_1,Can you clap?,string,multiple_choice(Yes|No),,
2,rhythm_1,Can you clap?,string,multiple_choice(Yes|No),,
```

Then reload the files in the app!

## File Backup

Your original file is saved as: **`students_old_backup.csv`**

If you need to go back to the old format, it's still there!

## Data Flow Diagram

```
1. Load students.csv (roster)
        ↓
2. Load results.csv (task assignments)
        ↓
3. Select a task from dropdown
        ↓
4. Select a class
        ↓
5. See students (green = completed this task)
        ↓
6. Select a student
        ↓
7. Student does task, responds
        ↓
8. 5-second countdown
        ↓
9. Saves to results.csv
        ↓
10. Student button turns green
        ↓
11. Ready for next student!
```

## Troubleshooting

**Q: I don't see the task selector dropdown**
- Make sure both files loaded successfully
- Check that results.csv has at least one task entry

**Q: All students show green even though they haven't done the task**
- Make sure you selected the correct task from the dropdown
- Green highlighting is per-task, not global

**Q: Student isn't in results.csv yet**
- That's fine! Just select them and assign the task
- The app will create their entry automatically

**Q: I want to add a new task for all students**
- Add one row per student in results.csv
- Or let students get assigned as you go through the class

**Q: Can I edit results.csv while the app is open?**
- No, close the app first, edit the CSV, then reload
- Otherwise your changes will be overwritten on save

## Example Workflow

**Monday**: Assess "task_1_a" for Hernandez 1
1. Load files
2. Select "task_1_a" from dropdown
3. Select "Hernandez 1" class
4. Go through students one by one
5. Results auto-save as you go

**Tuesday**: Assess "2+2=?" for Lindner 1
1. Open app (may ask for files again)
2. Select "2+2=?" from dropdown
3. Select "Lindner 1" class
4. See who's already done it (green)
5. Assess remaining students

**Wednesday**: Follow up on incomplete "task_1_a"
1. Select "task_1_a" from dropdown
2. Select any class
3. Green = done, white = needs assessment
4. Only assess white (incomplete) students

## Next Steps

Your system is now ready! The new structure gives you:
- Unlimited scalability
- Easy task switching
- Clear progress tracking
- No more messy spreadsheet columns

Enjoy your upgraded teaching assistant! 🎉
