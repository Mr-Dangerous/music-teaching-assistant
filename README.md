# Smartboard Teaching Assistant

A local HTML webapp designed for conducting student assessments on smartboards. This application allows teachers to efficiently collect and save assessment data for multiple students across different classes.

## Features

- **Class-based Navigation**: Filter students by class for easier navigation
- **Multiple Artifact Support**: Supports any number of assessment artifacts (artifact_1, artifact_2, etc.)
- **Flexible Input Types**:
  - Multiple choice buttons
  - Rating scales (1-5)
  - Checkboxes for skill assessments
  - Text input for detailed responses
- **Auto-Save**: Automatically saves changes when closing the browser (Chrome/Edge)
- **Manual Save**: Manual save button as backup
- **Smartboard Optimized**: Large touch targets, high contrast colors, and readable fonts
- **Local Data**: All data stays on your device - no internet connection required

## File Structure

```
music_teaching_assistant/
├── index.html              # Main application page
├── styles.css              # Smartboard-optimized styling
├── students.csv            # Your student data (required)
├── js/
│   ├── app.js             # Main application logic
│   ├── csv-handler.js     # CSV parsing and generation
│   ├── file-manager.js    # File loading and saving
│   └── config.js          # Question type configurations
└── README.md              # This file
```

## CSV Format

Your `students.csv` file should have the following columns:

```csv
grade,name,class,artifact_1_question,artifact_1_response.,artifact_2_question,artifact_2_response.
```

- **grade**: Student grade level (1, 2, 3, 4, K)
- **name**: Student name
- **class**: Teacher name + grade (e.g., "Hernandez 1")
- **artifact_N_question**: Question identifier (e.g., "task_1", "task_2")
- **artifact_N_response.**: Student's response (filled in by the app)

You can have any number of artifact columns (artifact_1, artifact_2, artifact_3, etc.)

## How to Use

### 1. Start the Application

**Option A: Double-click index.html**
- Simply double-click the `index.html` file to open it in your browser

**Option B: Use a local server (recommended)**
```bash
# Navigate to the project directory
cd /path/to/music_teaching_assistant

# Start a simple HTTP server (Python 3)
python3 -m http.server 8080

# Or with Python 2
python -m SimpleHTTPServer 8080

# Open in browser: http://localhost:8080
```

### 2. Load Your Student Data

1. Click the "Load Student Data (CSV)" button
2. Select your `students.csv` file
3. The app will parse the file and display your classes

### 3. Conduct Assessments

1. **Select a Class**: Click on a class to view its students
2. **Select a Student**: Click on a student name to begin assessment
3. **Choose Artifact**: Select which artifact to assess from the dropdown
4. **Enter Question**: Type the question/task identifier (e.g., "task_1")
5. **Record Response**: Use the appropriate input method (buttons, scale, checkboxes, or text)
6. **Submit & Next**: Click "Submit & Next Student" to save and move to the next student

### 4. Save Your Work

- **Auto-save**: Changes are automatically saved when you close the browser (Chrome/Edge only)
- **Manual save**: Click the "Save" button in the header at any time
- **Save indicator**: Green = saved, Orange = unsaved changes

## Browser Compatibility

**Recommended Browsers:**
- Google Chrome 86+ (auto-save supported)
- Microsoft Edge 86+ (auto-save supported)

**Supported Browsers:**
- Firefox (manual download required for saving)
- Safari (manual download required for saving)

## Customizing Question Types

You can customize input types for different questions by editing `js/config.js`.

Example:
```javascript
questionTypes: {
  'task_1': {
    type: 'buttons',
    label: 'Task 1: Steady Beat',
    options: ['Mastered', 'Developing', 'Beginning', 'Not Assessed']
  },
  'task_2': {
    type: 'scale',
    label: 'Task 2: Performance Rating',
    min: 1,
    max: 5,
    labels: ['Needs Work', 'Fair', 'Good', 'Very Good', 'Excellent']
  }
}
```

### Available Input Types:

1. **buttons**: Multiple choice buttons
2. **checkboxes**: Multiple selection checkboxes
3. **scale**: Numeric rating scale
4. **text**: Free-form text input

## Tips for Smartboard Use

- Touch targets are optimized for finger touch (minimum 44x44px)
- Use high contrast mode on your smartboard for best visibility
- The app works offline - no internet connection needed
- All data stays on your local device
- Regular backups of your CSV file are recommended

## Troubleshooting

**File won't load:**
- Make sure your CSV has the correct format
- Check that the first row contains column headers
- Verify the file encoding is UTF-8

**Can't save changes:**
- If using Firefox/Safari, you'll need to download the file manually
- For Chrome/Edge, grant file permissions when prompted

**Changes not persisting:**
- Make sure to click "Save" before closing the browser
- Check the save indicator (green = saved, orange = unsaved)

**Input not responding:**
- Make sure you've entered a question identifier first
- Try refreshing the page and loading the file again

## Future Enhancements

Planned features for future versions:
- Audio recording for responses
- Image/video capture
- Export to PDF or Excel
- Analytics dashboard
- Progress tracking across sessions

## Support

For issues or questions, please contact your IT administrator or refer to the project documentation.

## Version

Current Version: 1.0
Last Updated: December 2025
