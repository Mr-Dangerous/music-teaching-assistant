# Tasks Folder

Place your task images in this folder, organized by grade level.

## Folder Structure

Tasks are organized by grade in subfolders:

```
tasks/
  Grade K/
    task_1_a.png
    task_1_b.png
  Grade 1/
    task_1_a.png
    task_1_b.png
    task_2_a.png
  Grade 2/
    task_1_a.png
    ...
  Grade 3/
    ...
  Grade 4/
    ...
```

## File Naming Convention

- Create a subfolder for each grade: `Grade K`, `Grade 1`, `Grade 2`, `Grade 3`, `Grade 4`
- Task images should be named to match the `artifact_1_question` value in your CSV
- For example: if a Grade 1 student has `task_1_a` in their `artifact_1_question` column:
  - Path: `tasks/Grade 1/task_1_a.png` OR
  - Path: `tasks/Grade 1/task_1_a.jpg`

## Current Tasks in CSV (Hernandez 1 class)

Based on your students.csv for Grade 1, you need:
- `Grade 1/task_1.png` or `.jpg` (for students with task_1 assigned)
- `Grade 1/task_2.png` or `.jpg` (for students with task_2 assigned)
- `Grade 1/task_3.png` or `.jpg` (for students with task_3 assigned)

## Example

If you have a music assessment task showing rhythm notation for Grade 1:
1. Create the task in your favorite image editor
2. Export as PNG or JPG
3. Name it according to the task ID (e.g., `task_1_a.png`)
4. Place it in `tasks/Grade 1/` folder

The app will automatically:
1. Detect the student's grade from the CSV
2. Look in the correct grade folder
3. Load and display the matching task image!
