// Main Application Logic
// Manages UI state, navigation, and assessment workflow

class TeachingAssistantApp {
  constructor() {
    this.csvHandler = new CSVHandler();
    this.fileManager = new FileManager();
    // this.responseHandler = new ResponseHandler(); // Legacy - all tasks now use custom modules
    this.moduleLoader = new ModuleLoader();
    this.audioManager = new AudioManager(this.fileManager, this.csvHandler);
    this.videoManager = new VideoManager(this.fileManager, this.csvHandler);

    // New data structure: separate students and results
    this.students = [];        // From students.csv
    this.results = [];         // From results.csv
    this.tasks = [];           // Unique tasks extracted from results

    this.currentScreen = 'file-load';
    this.selectedClass = null;
    this.selectedStudent = null;
    this.selectedTask = null;  // Currently selected task ID
    this.currentResponse = '';
    this.practiceMode = false; // When true, operates without student context

    // Module settings storage (per module path, session only)
    this.moduleSettings = {};

    this.countdownTimer = null;
    this.countdownInterval = null;
    this.countdownPaused = false;
    this.countdownTimeLeft = 5;

    // Track absent students for current session only (not from CSV)
    this.sessionAbsentStudents = new Set();

    this.initializeApp();
  }

  /**
   * Initialize the application
   */
  initializeApp() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupUI());
    } else {
      this.setupUI();
    }
  }

  /**
   * Setup UI event listeners and initial state
   */
  setupUI() {
    // File load screen
    const loadButton = document.getElementById('load-file-btn');
    if (loadButton) {
      loadButton.addEventListener('click', () => this.loadFile());
    }

    // Manual save button
    const saveButton = document.getElementById('save-btn');
    if (saveButton) {
      saveButton.addEventListener('click', () => this.saveFile());
    }

    // Fullscreen button
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    }

    // Task selector
    const taskSelector = document.getElementById('task-selector');
    if (taskSelector) {
      taskSelector.addEventListener('change', (e) => {
        this.selectedTask = e.target.value;
        // Refresh student screen if we're on it
        if (this.currentScreen === 'student-select' && this.selectedClass) {
          this.showStudentScreen();
        }
      });
    }

    // View Results button
    const viewResultsBtn = document.getElementById('view-results-btn');
    if (viewResultsBtn) {
      viewResultsBtn.addEventListener('click', () => {
        window.location.href = 'results-viewer.html';
      });
    }

    // Resolution toggle button
    const resolutionToggleBtn = document.getElementById('resolution-toggle-btn');
    if (resolutionToggleBtn) {
      resolutionToggleBtn.addEventListener('click', () => this.toggleResolution());
    }

    //Initialize resolution based on screen or saved preference
    this.initializeResolution();

    // Listen for fullscreen changes to update button
    document.addEventListener('fullscreenchange', () => this.updateFullscreenButton());
    document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenButton());
    document.addEventListener('mozfullscreenchange', () => this.updateFullscreenButton());
    document.addEventListener('MSFullscreenChange', () => this.updateFullscreenButton());

    // Listen for messages from modules
    window.addEventListener('message', (event) => {
      if (event.data.type === 'taskmodule:response') {
        // Module has sent a response - save it
        this.handleModuleResponse(event.data);
      } else if (event.data.type === 'taskmodule:settings') {
        // Module has updated its settings - save them
        this.handleModuleSettings(event.data);
      } else if (event.data.type === 'taskmodule:ready') {
        // Module is ready to receive additional commands
        console.log('Module ready:', event.data);
      } else if (event.data.type === 'taskmodule:log') {
        // Module is sending a log message
        console.log('Module log:', event.data.message);
      } else if (event.data.type === 'taskmodule:error') {
        // Module encountered an error
        console.error('Module error:', event.data.message);
        this.showNotification(`Module error: ${event.data.message}`, 'error');
      }
    });

    // Random student picker button
    const pickRandomBtn = document.getElementById('pick-random-btn');
    if (pickRandomBtn) {
      pickRandomBtn.addEventListener('click', () => this.pickRandomStudent());
    }

    // Practice mode button
    const practiceModeBtn = document.getElementById('practice-mode-btn');
    if (practiceModeBtn) {
      practiceModeBtn.addEventListener('click', () => this.enterPracticeMode());
    }

    // Back buttons
    const backToClassesBtn = document.getElementById('back-to-classes-btn');
    if (backToClassesBtn) {
      backToClassesBtn.addEventListener('click', () => this.showClassScreen());
    }

    // Recording button toggle
    document.getElementById('recording-btn').addEventListener('click', async () => {
      await this.toggleRecording();
    });

    // Video recording buttons toggle
    document.getElementById('video-recording-hq-btn').addEventListener('click', async () => {
      await this.toggleVideoRecording('high');
    });

    document.getElementById('video-recording-lq-btn').addEventListener('click', async () => {
      await this.toggleVideoRecording('low');
    });

    const backToStudentsBtn = document.getElementById('back-to-students-btn');
    if (backToStudentsBtn) {
      backToStudentsBtn.addEventListener('click', () => this.showStudentScreen());
    }

    // Artifact selector
    const artifactSelect = document.getElementById('artifact-select');
    if (artifactSelect) {
      artifactSelect.addEventListener('change', (e) => {
        this.selectedArtifact = parseInt(e.target.value);
        this.renderAssessmentForm();
      });
    }

    // Question input
    const questionInput = document.getElementById('question-input');
    if (questionInput) {
      questionInput.addEventListener('input', (e) => {
        this.updateQuestion(e.target.value);
      });
    }

    // Submit button
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submitAndNext());
    }

    // Setup auto-save
    this.fileManager.setupAutoSave(() => {
      return this.resultsToCSV();
    });

    // Show appropriate screen
    this.showScreen(this.currentScreen);

    // Display browser compatibility info
    if (!this.fileManager.isSupported()) {
      this.showNotification('Your browser requires manual downloads for saving. Use Chrome or Edge for auto-save.', 'warning');
    }
  }

  /**
   * Load all three CSV files (students.csv, tasks.csv, and results.csv)
   */
  async loadFile() {
    try {
      this.showLoading(true);
      // this.showNotification('Loading files... Please select the three CSV files when prompted.', 'info');

      // Load all three files
      const { studentsContent, tasksContent, resultsContent } = await this.fileManager.loadFiles();

      // Parse students.csv (student_id, name, grade, class)
      // this.showNotification('Parsing student roster...', 'info');
      this.students = this.parseStudentsCSV(studentsContent);

      // Parse tasks.csv (task_id, question, question_type, input_type, grade)
      // this.showNotification('Parsing task definitions...', 'info');
      this.tasks = this.parseTasksCSV(tasksContent);

      // Parse results.csv (student_id, task_id, response, completed_date)
      // this.showNotification('Parsing student responses...', 'info');
      this.results = this.parseResultsCSV(resultsContent);

      console.log(`Loaded ${this.students.length} students`);
      console.log(`Loaded ${this.tasks.length} tasks`);
      console.log(`Loaded ${this.results.length} responses`);

      // Default to first task if any exist
      if (this.tasks.length > 0 && !this.selectedTask) {
        this.selectedTask = this.tasks[0].task_id;
      }

      // Update UI
      // File name display removed from UI


      // Populate task selector (will be filtered by grade when class is selected)
      this.populateTaskSelector();

      // Store data in localStorage for results viewer
      localStorage.setItem('teachingAssistant_students', JSON.stringify(this.students));
      localStorage.setItem('teachingAssistant_tasks', JSON.stringify(this.tasks));
      localStorage.setItem('teachingAssistant_results', JSON.stringify(this.results));

      // Show save button, task selector, and view results button
      const saveBtn = document.getElementById('save-btn');
      if (saveBtn) {
        saveBtn.style.display = 'inline-flex';
      }

      const taskSelector = document.getElementById('task-selector');
      if (taskSelector && this.tasks.length > 0) {
        taskSelector.style.display = 'inline-block';
      }
      // Show header elements after file load
      document.getElementById('recording-btn').style.display = 'block';
      document.getElementById('video-recording-hq-btn').style.display = 'block';
      document.getElementById('video-recording-lq-btn').style.display = 'block';
      document.getElementById('view-results-btn').style.display = 'block';
      const viewResultsBtn = document.getElementById('view-results-btn');
      if (viewResultsBtn) {
        viewResultsBtn.style.display = 'inline-flex';
      }

      // Hide back button initially
      const backBtn = document.getElementById('back-to-classes-btn');
      if (backBtn) {
        backBtn.style.display = 'none';
      }

      // Show class selection screen
      this.showClassScreen();

      // this.showNotification(`Loaded ${this.students.length} students, ${this.tasks.length} tasks, ${this.results.length} responses!`, 'success');
    } catch (error) {
      console.error('Error loading files:', error);

      if (error.message !== 'File selection cancelled') {
        this.showNotification(`Error loading files: ${error.message}`, 'error');
      }
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Update localStorage with current data
   */
  updateLocalStorage() {
    try {
      localStorage.setItem('teachingAssistant_students', JSON.stringify(this.students));
      localStorage.setItem('teachingAssistant_tasks', JSON.stringify(this.tasks));
      localStorage.setItem('teachingAssistant_results', JSON.stringify(this.results));
    } catch (error) {
      console.error('Error updating localStorage:', error);
    }
  }

  /**
   * Parse students.csv content
   */
  parseStudentsCSV(csvText) {
    const lines = this.csvHandler.parseCSVLines(csvText);
    if (lines.length === 0) return [];

    const headers = lines[0];
    const students = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.length === 0 || (line.length === 1 && line[0] === '')) continue;

      students.push({
        student_id: line[0],
        name: line[1],
        grade: line[2],
        class: line[3]
      });
    }

    return students;
  }

  /**
   * Parse tasks.csv content
   */
  parseTasksCSV(csvText) {
    const lines = this.csvHandler.parseCSVLines(csvText);
    if (lines.length === 0) return [];

    const headers = lines[0];
    const tasks = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.length === 0 || (line.length === 1 && line[0] === '')) continue;

      tasks.push({
        task_id: line[0],
        question: line[1],
        grade: line[2],
        module_path: line[3]
      });
    }

    return tasks;
  }

  /**
   * Parse results.csv content (simplified - just responses)
   */
  parseResultsCSV(csvText) {
    const lines = this.csvHandler.parseCSVLines(csvText);
    if (lines.length === 0) return [];

    const headers = lines[0];
    const results = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.length === 0 || (line.length === 1 && line[0] === '')) continue;

      results.push({
        student_id: line[0],
        task_id: line[1],
        response: line[2],
        completed_date: line[3]
      });
    }

    return results;
  }

  /**
   * Populate task selector dropdown
   * @param {string} filterGrade - Optional grade to filter tasks by
   */
  populateTaskSelector(filterGrade = null) {
    const taskSelector = document.getElementById('task-selector');
    if (!taskSelector) return;

    // Clear existing options except first
    taskSelector.innerHTML = '<option value="">Select Task...</option>';

    // Filter tasks by grade if specified
    const tasksToShow = filterGrade
      ? this.tasks.filter(task => task.grade === filterGrade)
      : this.tasks;

    // Add task options
    tasksToShow.forEach(task => {
      const option = document.createElement('option');
      option.value = task.task_id;

      // Format grade display (K stays as K, numbers get "Grade" prefix)
      const gradeDisplay = task.grade === 'K' ? 'Grade K' : `Grade ${task.grade}`;
      option.textContent = `${task.task_id} (${gradeDisplay})`;

      if (task.task_id === this.selectedTask) {
        option.selected = true;
      }

      taskSelector.appendChild(option);
    });

    // If current selected task is not in filtered list, clear selection
    if (filterGrade && this.selectedTask) {
      const taskExists = tasksToShow.find(t => t.task_id === this.selectedTask);
      if (!taskExists && tasksToShow.length > 0) {
        // Auto-select first task in filtered list
        this.selectedTask = tasksToShow[0].task_id;
        taskSelector.value = this.selectedTask;
      }
    }
  }

  /**
   * Save results.csv file
   * @param {boolean} silent - If true, don't show success notification
   */
  async saveFile(silent = false) {
    try {
      this.showLoading(true);

      // Convert results to CSV
      const csvContent = this.resultsToCSV();

      // Save results file
      await this.fileManager.saveResults(csvContent);

      if (!silent) {
        this.showNotification('Results saved successfully!', 'success');
      }

      // Update save indicator
      this.updateSaveIndicator();
    } catch (error) {
      console.error('Error saving file:', error);
      this.showNotification(`Error saving file: ${error.message}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Convert results array to CSV format
   */
  resultsToCSV() {
    const headers = ['student_id', 'task_id', 'response', 'completed_date'];
    const lines = [headers.join(',')];

    this.results.forEach(result => {
      const row = [
        result.student_id,
        result.task_id,
        this.escapeCSVField(result.response),
        result.completed_date || ''
      ];
      lines.push(row.join(','));
    });

    return lines.join('\n');
  }

  /**
   * Escape CSV field if it contains special characters
   */
  escapeCSVField(field) {
    if (!field) return '';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  /**
   * Show class selection screen
   */
  showClassScreen() {
    // Cancel any active countdown
    this.cancelCountdown();

    this.currentScreen = 'class-select';
    this.selectedClass = null;
    this.showScreen('class-select');

    // Hide back button on class select screen
    const backBtn = document.getElementById('back-to-classes-btn');
    if (backBtn) {
      backBtn.style.display = 'none';
    }

    // Get unique classes from students
    const classMap = new Map();
    this.students.forEach(student => {
      if (student.class) {
        classMap.set(student.class, (classMap.get(student.class) || 0) + 1);
      }
    });

    // Sort classes by grade then teacher name
    const classes = Array.from(classMap.keys()).sort((a, b) => {
      const gradeA = this.extractGrade(a);
      const gradeB = this.extractGrade(b);

      if (gradeA !== gradeB) {
        if (gradeA === 'K') return -1;
        if (gradeB === 'K') return 1;
        return parseInt(gradeA) - parseInt(gradeB);
      }

      return a.localeCompare(b);
    });

    // Render class buttons
    const classGrid = document.getElementById('class-grid');
    classGrid.innerHTML = '';

    classes.forEach(className => {
      const button = document.createElement('button');
      button.className = 'class-button';
      button.textContent = className;

      // Count students in class
      const studentCount = classMap.get(className);
      const count = document.createElement('span');
      count.className = 'student-count';
      count.textContent = `${studentCount} students`;
      button.appendChild(document.createElement('br'));
      button.appendChild(count);

      button.addEventListener('click', () => {
        this.selectedClass = className;
        this.showStudentScreen();
      });

      classGrid.appendChild(button);
    });
  }

  /**
   * Extract grade from class name
   */
  extractGrade(className) {
    const match = className.match(/\s+([K1-4])$/);
    return match ? match[1] : '';
  }

  /**
   * Show student selection screen with roster and task display
   */
  showStudentScreen() {
    // Cancel any active countdown
    this.cancelCountdown();

    this.currentScreen = 'student-select';
    this.selectedStudent = null;
    this.showScreen('student-select');

    // Show back button on student screen
    const backBtn = document.getElementById('back-to-classes-btn');
    if (backBtn) {
      backBtn.style.display = 'inline-flex';
    }

    // Update header
    document.getElementById('selected-class-name').textContent = this.selectedClass;

    // Filter students by class
    const classStudents = this.students.filter(s => s.class === this.selectedClass);

    // Show all tasks (no grade filtering)
    this.populateTaskSelector(null);

    // Sort students by name
    classStudents.sort((a, b) => a.name.localeCompare(b.name));

    // Detect duplicate first names
    const firstNameCounts = {};
    classStudents.forEach(student => {
      const firstName = student.name.split(' ')[0];
      firstNameCounts[firstName] = (firstNameCounts[firstName] || 0) + 1;
    });

    // Render student roster buttons
    const studentList = document.getElementById('student-list');
    studentList.innerHTML = '';

    classStudents.forEach(student => {
      const button = document.createElement('button');
      button.className = 'student-roster-button';

      // Format name: show last initial only if first name is duplicated
      const nameParts = student.name.split(' ');
      const firstName = nameParts[0];
      let displayName = firstName;

      if (firstNameCounts[firstName] > 1 && nameParts.length > 1) {
        // Duplicate first name - add last initial
        const lastInitial = nameParts[nameParts.length - 1].charAt(0);
        displayName = `${firstName} ${lastInitial}`;
      }

      button.textContent = displayName;
      button.dataset.studentId = student.student_id;

      // Check if student is marked absent (check for ATTENDANCE record)
      const isAbsent = this.isStudentAbsent(student.student_id);
      if (isAbsent) {
        button.classList.add('absent');
      }

      // Highlight students who have completed the currently selected task
      if (this.hasCompletedTask(student.student_id, this.selectedTask)) {
        button.classList.add('completed');
      }

      // Long-press detection for marking absent
      let pressTimer = null;
      let touchMoved = false;

      const startPress = (e) => {
        touchMoved = false;
        pressTimer = setTimeout(() => {
          // Long press detected - toggle absent status
          this.toggleAbsentStatus(student);

          // Provide haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        }, 800); // 800ms for long press
      };

      const cancelPress = () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      };

      const endPress = () => {
        if (pressTimer && !touchMoved) {
          // This was a regular click (not long press)
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      };

      // Mouse events
      button.addEventListener('mousedown', startPress);
      button.addEventListener('mouseup', endPress);
      button.addEventListener('mouseleave', cancelPress);

      // Touch events
      button.addEventListener('touchstart', (e) => {
        startPress(e);
      });
      button.addEventListener('touchmove', () => {
        touchMoved = true;
        cancelPress();
      });
      button.addEventListener('touchend', endPress);

      // Regular click handler
      button.addEventListener('click', () => {
        // Don't select absent students for tasks
        if (button.classList.contains('absent')) {
          this.showNotification(`${student.name} is marked absent`, 'warning');
          return;
        }

        // Remove active class from all buttons
        studentList.querySelectorAll('.student-roster-button').forEach(btn => {
          btn.classList.remove('active');
        });

        // Add active class to clicked button
        button.classList.add('active');

        // Select student and display task
        this.selectedStudent = student;
        this.displayStudentTask(student);
      });

      studentList.appendChild(button);
    });

    // Reset task display
    this.resetTaskDisplay();
  }

  /**
   * Check if student has completed a specific task
   */
  hasCompletedTask(student_id, task_id) {
    // Check if ANY result exists for this student-task combination
    // (supports multiple completions per student)
    return this.results.some(r =>
      r.student_id === student_id &&
      r.task_id === task_id &&
      r.response &&
      r.response.trim() !== ''
    );
  }

  /**
   * Check if student is marked absent (for this session)
   */
  isStudentAbsent(student_id) {
    // Check session tracker only (not CSV records)
    return this.sessionAbsentStudents.has(student_id);
  }

  /**
   * Toggle student absent status
   */
  toggleAbsentStatus(student) {
    const isCurrentlyAbsent = this.isStudentAbsent(student.student_id);

    if (isCurrentlyAbsent) {
      // Remove from session tracker
      this.sessionAbsentStudents.delete(student.student_id);

      // Also remove any ATTENDANCE records for this student from this session
      this.results = this.results.filter(r =>
        !(r.student_id === student.student_id && r.task_id === 'ATTENDANCE')
      );
      this.showNotification(`${student.name} marked as present`, 'success');
    } else {
      // Add to session tracker
      this.sessionAbsentStudents.add(student.student_id);

      // Create ATTENDANCE record for CSV persistence
      const attendanceRecord = {
        student_id: student.student_id,
        task_id: 'ATTENDANCE',
        response: 'absent',
        completed_date: new Date().toISOString()
      };
      this.results.push(attendanceRecord);
      this.showNotification(`${student.name} marked as ABSENT`, 'warning');
    }

    // Update localStorage
    this.updateLocalStorage();
    this.markUnsaved();

    // Refresh the student list to update UI
    this.showStudentScreen();
  }


  /**
   * Display the task for a selected student
   */
  displayStudentTask(student) {
    // Cancel any active countdown from previous student
    this.cancelCountdown();

    // Exit practice mode when selecting a student
    this.practiceMode = false;

    // Reset any loaded modules
    this.moduleLoader.reset();

    // Update student name display
    document.getElementById('current-student-name').textContent = student.name;

    // Check if this student has this task assigned
    if (!this.selectedTask) {
      this.showNoTask('No task selected');
      return;
    }

    // Get the task data
    const taskData = this.getTask(this.selectedTask);
    if (!taskData) {
      this.showNoTask('Task not found');
      return;
    }

    // Update task name
    document.getElementById('current-task-name').textContent = `Task: ${taskData.question}`;

    // Check if module path is specified
    if (!taskData.module_path) {
      this.showNoTask('No module specified for this task');
      return;
    }

    // Load the task module (handles both question display and response input)
    this.loadTaskModule(taskData, student);
  }

  /**
   * Get task data by task_id
   */
  getTask(task_id) {
    return this.tasks.find(t => t.task_id === task_id);
  }

  /**
   * Get most recent result for a student-task combination (read-only)
   * Returns null if no result exists
   */
  getMostRecentResult(student_id, task_id) {
    // Find all results for this student-task combination
    const studentResults = this.results.filter(r =>
      r.student_id === student_id && r.task_id === task_id
    );

    if (studentResults.length === 0) {
      return null;
    }

    // Return the most recent one (last in array, which has latest date)
    return studentResults[studentResults.length - 1];
  }

  /**
   * Display task as text instead of image
   */
  displayTaskText(taskText) {
    const taskImage = document.getElementById('task-image');
    const noTaskMessage = document.getElementById('no-task-message');

    // Hide image
    taskImage.style.display = 'none';

    // Show text in the no-task-message area (repurpose it)
    noTaskMessage.style.display = 'flex';
    noTaskMessage.innerHTML = `<p class="task-text-display">${taskText}</p>`;
  }

  /**
   * Show response area with appropriate input type
   */
  /**
   * Load task module (handles both question and response)
   */
  loadTaskModule(taskData, student) {
    const container = document.getElementById('task-image-container');

    // Get most recent result to restore previous response (if any)
    const existingResult = this.getMostRecentResult(student.student_id, taskData.task_id);

    const context = {
      studentId: student.student_id,
      taskId: taskData.task_id,
      grade: student.grade,
      studentName: student.name,
      class: student.class,
      question: taskData.question,
      existingResponse: existingResult ? existingResult.response : ''
    };

    this.moduleLoader.loadModule(
      taskData.module_path,
      container,
      context
    ).then(iframe => {
      this.moduleLoader.currentResponseModule = iframe;

      // Modules handle their own saving - disable main app countdown/auto-save
      this.cancelCountdown();

      // Hide the separate response area since module handles everything
      const responseArea = document.getElementById('response-area');
      if (responseArea) {
        responseArea.style.display = 'none';
      }
    }).catch(err => {
      this.showNoTask(`Failed to load module: ${err.message}`);
    });
  }

  /**
   * Load and display task image from grade-organized folders
   */
  loadTaskImage(taskId, grade) {
    const taskImage = document.getElementById('task-image');
    const noTaskMessage = document.getElementById('no-task-message');

    // Construct path with grade folder: tasks/Grade 1/task_1_a.png
    const gradeFolderName = grade === 'K' ? 'Grade K' : `Grade ${grade}`;
    const imagePath = `tasks/${gradeFolderName}/${taskId}.png`;
    const imagePathAlt = `tasks/${gradeFolderName}/${taskId}.jpg`;

    taskImage.onload = () => {
      taskImage.style.display = 'block';
      noTaskMessage.style.display = 'none';
    };

    taskImage.onerror = () => {
      // Try JPG if PNG fails
      taskImage.src = imagePathAlt;
      taskImage.onerror = () => {
        this.showNoTask(`Task image not found: ${gradeFolderName}/${taskId}.png or .jpg`);
      };
    };

    taskImage.src = imagePath;
  }

  /**
   * Show "no task" message
   */
  showNoTask(message) {
    const taskImage = document.getElementById('task-image');
    const noTaskMessage = document.getElementById('no-task-message');

    taskImage.style.display = 'none';
    noTaskMessage.style.display = 'block';
    noTaskMessage.querySelector('p').textContent = message;
  }

  /**
   * Reset task display to initial state
   */
  resetTaskDisplay() {
    document.getElementById('current-student-name').textContent = 'Select a student';
    document.getElementById('current-task-name').textContent = '';

    const taskImage = document.getElementById('task-image');
    const noTaskMessage = document.getElementById('no-task-message');

    if (taskImage) {
      taskImage.style.display = 'none';
    }

    if (noTaskMessage) {
      noTaskMessage.style.display = 'block';
      const messageP = noTaskMessage.querySelector('p');
      if (messageP) {
        messageP.textContent = 'Select a student to view their assigned task';
      }
    }
  }

  /**
   * Show assessment screen
   */
  showAssessmentScreen() {
    this.currentScreen = 'assessment';
    this.showScreen('assessment');

    // Update header
    document.getElementById('current-class').textContent = this.selectedClass;
    document.getElementById('current-student').textContent = this.selectedStudent.name;

    // Populate artifact selector
    this.renderArtifactSelector();

    // Select first artifact by default if none selected
    if (!this.selectedArtifact && this.artifactColumns.length > 0) {
      this.selectedArtifact = this.artifactColumns[0].number;
      document.getElementById('artifact-select').value = this.selectedArtifact;
    }

    // Render assessment form
    this.renderAssessmentForm();
  }

  /**
   * Render artifact selector dropdown
   */
  renderArtifactSelector() {
    const artifactSelect = document.getElementById('artifact-select');
    artifactSelect.innerHTML = '';

    this.artifactColumns.forEach(artifact => {
      const option = document.createElement('option');
      option.value = artifact.number;
      option.textContent = `Artifact ${artifact.number}`;
      artifactSelect.appendChild(option);
    });
  }

  /**
   * Render assessment form based on selected artifact
   */
  renderAssessmentForm() {
    if (!this.selectedArtifact) return;

    const artifact = this.artifactColumns.find(a => a.number === this.selectedArtifact);
    if (!artifact) return;

    // Get current question and response
    const currentQuestion = this.selectedStudent[artifact.questionCol] || '';
    const currentResponse = this.selectedStudent[artifact.responseCol] || '';

    // Update question input
    const questionInput = document.getElementById('question-input');
    questionInput.value = currentQuestion;

    // Display current question
    const questionDisplay = document.getElementById('current-question');
    questionDisplay.textContent = currentQuestion || 'No question set';

    // Render response input based on question type
    this.renderResponseInput(currentQuestion, currentResponse);
  }

  /**
   * Render response input based on question type
   */
  renderResponseInput(question, currentResponse) {
    const responseContainer = document.getElementById('response-input-container');
    responseContainer.innerHTML = '';

    // Get question configuration
    const config = AppConfig.questionTypes[question] || AppConfig.defaultInputType;

    // Add label
    const label = document.createElement('label');
    label.className = 'input-label';
    label.textContent = config.label || 'Response';
    responseContainer.appendChild(label);

    // Render input based on type
    const renderer = AppConfig.inputRenderers[config.type];
    if (renderer) {
      const inputElement = renderer(config, currentResponse, (value) => {
        this.currentResponse = value;
        this.markUnsaved();
      });

      responseContainer.appendChild(inputElement);
    } else {
      // Fallback to text input
      const inputElement = AppConfig.inputRenderers.text(AppConfig.defaultInputType, currentResponse, (value) => {
        this.currentResponse = value;
        this.markUnsaved();
      });

      responseContainer.appendChild(inputElement);
    }

    // Initialize current response
    this.currentResponse = currentResponse;
  }

  /**
   * Update question for current artifact
   */
  updateQuestion(question) {
    if (!this.selectedArtifact) return;

    const artifact = this.artifactColumns.find(a => a.number === this.selectedArtifact);
    if (!artifact) return;

    // Update question in student record
    this.selectedStudent[artifact.questionCol] = question;

    // Update display
    const questionDisplay = document.getElementById('current-question');
    questionDisplay.textContent = question || 'No question set';

    // Re-render response input to match new question type
    const currentResponse = this.selectedStudent[artifact.responseCol] || '';
    this.renderResponseInput(question, currentResponse);

    this.markUnsaved();
  }

  /**
   * Submit response and move to next student
   */
  async submitAndNext() {
    // Save current response
    if (this.selectedArtifact) {
      const artifact = this.artifactColumns.find(a => a.number === this.selectedArtifact);
      if (artifact) {
        this.selectedStudent[artifact.responseCol] = this.currentResponse;
      }
    }

    // Auto-save
    await this.saveFile();

    // Find next student in class
    const classStudents = this.csvHandler.filterByClass(this.students, this.selectedClass);
    classStudents.sort((a, b) => a.name.localeCompare(b.name));

    const currentIndex = classStudents.findIndex(s =>
      s.name === this.selectedStudent.name
    );

    if (currentIndex < classStudents.length - 1) {
      // Move to next student
      this.selectedStudent = classStudents[currentIndex + 1];
      this.showAssessmentScreen();
    } else {
      // Last student, go back to student list
      this.showNotification('Assessment complete for this class!', 'success');
      this.showStudentScreen();
    }
  }

  /**
   * Mark that there are unsaved changes
   */
  markUnsaved() {
    this.fileManager.markUnsaved();
    this.updateSaveIndicator();
  }

  /**
   * Update save indicator UI
   */
  updateSaveIndicator() {
    const indicator = document.getElementById('save-indicator');
    if (indicator) {
      if (this.fileManager.hasUnsaved()) {
        indicator.textContent = 'Unsaved changes';
        indicator.className = 'save-indicator unsaved';
      } else {
        indicator.textContent = 'All changes saved';
        indicator.className = 'save-indicator saved';
      }
    }
  }

  /**
   * Show/hide specific screen
   */
  showScreen(screenName) {
    const screens = ['file-load', 'class-select', 'student-select', 'assessment'];

    screens.forEach(screen => {
      const element = document.getElementById(`${screen}-screen`);
      if (element) {
        element.style.display = screen === screenName ? 'block' : 'none';
      }
    });

    this.currentScreen = screenName;
  }

  /**
   * Show/hide loading indicator
   */
  showLoading(show) {
    const loader = document.getElementById('loading');
    if (loader) {
      loader.style.display = show ? 'flex' : 'none';
    }
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen() {
    const elem = document.documentElement;

    if (!document.fullscreenElement && !document.webkitFullscreenElement &&
      !document.mozFullScreenElement && !document.msFullscreenElement) {
      // Enter fullscreen
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }

  /**
   * Update fullscreen button icon/text based on current state
   */
  updateFullscreenButton() {
    const fullscreenIcon = document.getElementById('fullscreen-icon');
    const fullscreenBtn = document.getElementById('fullscreen-btn');

    if (!fullscreenIcon || !fullscreenBtn) return;

    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement ||
      document.mozFullScreenElement || document.msFullscreenElement;

    if (isFullscreen) {
      fullscreenIcon.textContent = '⛶';
      fullscreenBtn.title = 'Exit Fullscreen';
    } else {
      fullscreenIcon.textContent = '⛶';
      fullscreenBtn.title = 'Enter Fullscreen';
    }
  }

  /**
   * Initialize resolution based on screen size or saved preference
   */
  initializeResolution() {
    // Check if there's a saved preference
    const savedResolution = localStorage.getItem('teachingAssistant_resolution');

    if (savedResolution) {
      // Use saved preference
      this.setResolution(savedResolution);
    } else {
      // Auto-detect based on screen resolution
      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;

      // If screen is 4K or higher (3840x2160 or larger), use 4K mode
      if (screenWidth >= 3840 || screenHeight >= 2160) {
        this.setResolution('4k');
      } else {
        this.setResolution('1080p');
      }
    }
  }

  /**
   * Toggle between 1080p and 4K resolution
   */
  toggleResolution() {
    const currentResolution = document.body.classList.contains('resolution-4k') ? '4k' : '1080p';
    const newResolution = currentResolution === '1080p' ? '4k' : '1080p';

    this.setResolution(newResolution);

    // Save preference
    localStorage.setItem('teachingAssistant_resolution', newResolution);
  }

  /**
   * Set resolution mode
   */
  setResolution(resolution) {
    if (resolution === '4k') {
      document.body.classList.add('resolution-4k');
    } else {
      document.body.classList.remove('resolution-4k');
    }

    this.updateResolutionButton();
  }

  /**
   * Update resolution button text
   */
  updateResolutionButton() {
    const resolutionIcon = document.getElementById('resolution-icon');
    if (!resolutionIcon) return;

    const is4k = document.body.classList.contains('resolution-4k');
    resolutionIcon.textContent = is4k ? '4K' : '1080p';
  }

  /**
   * Show notification message
   */
  showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';

    // Auto-hide after 4 seconds
    setTimeout(() => {
      notification.style.display = 'none';
    }, 4000);
  }

  /**
   * Start countdown timer after response submission
   */
  startCountdown() {
    // Cancel any existing countdown
    this.cancelCountdown();

    const timerElement = document.getElementById('countdown-timer');
    const numberElement = document.getElementById('countdown-number');
    const circleElement = document.querySelector('.countdown-circle');

    if (!timerElement || !numberElement || !circleElement) return;

    // Show timer
    timerElement.style.display = 'block';

    this.countdownTimeLeft = 5;
    this.countdownPaused = false;
    const totalTime = 5;
    const circumference = 283; // 2 * PI * radius (45)

    // Update display
    numberElement.textContent = Math.ceil(this.countdownTimeLeft);
    circleElement.style.strokeDashoffset = 0;
    timerElement.classList.remove('paused');

    // Add click listener for pause/resume
    timerElement.onclick = () => this.toggleCountdownPause();

    // Start countdown
    this.countdownInterval = setInterval(() => {
      if (!this.countdownPaused) {
        this.countdownTimeLeft -= 0.1;

        if (this.countdownTimeLeft <= 0) {
          // Countdown complete
          this.handleCountdownComplete();
        } else {
          // Update display
          numberElement.textContent = Math.ceil(this.countdownTimeLeft);
          const progress = this.countdownTimeLeft / totalTime;
          circleElement.style.strokeDashoffset = circumference * (1 - progress);
        }
      }
    }, 100); // Update every 100ms for smooth animation
  }

  /**
   * Toggle countdown pause state
   */
  toggleCountdownPause() {
    this.countdownPaused = !this.countdownPaused;

    const timerElement = document.getElementById('countdown-timer');
    const numberElement = document.getElementById('countdown-number');

    if (this.countdownPaused) {
      timerElement.classList.add('paused');
      numberElement.textContent = 'PAUSED';
    } else {
      timerElement.classList.remove('paused');
      numberElement.textContent = Math.ceil(this.countdownTimeLeft);
    }
  }

  /**
   * Cancel countdown timer
   */
  cancelCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    const timerElement = document.getElementById('countdown-timer');
    if (timerElement) {
      timerElement.style.display = 'none';
    }
  }

  /**
   * Handle countdown completion
   */
  async handleCountdownComplete() {
    // Stop countdown
    this.cancelCountdown();

    // Update the student button state before clearing
    if (this.selectedStudent) {
      this.updateStudentButtonState(this.selectedStudent);
    }

    // Save the results file (only if triggered by user action, not automated)
    try {
      this.showLoading(true);
      const csvContent = this.resultsToCSV();

      // Try to save, but don't throw error if it fails due to permissions
      try {
        await this.fileManager.saveResults(csvContent);
        this.updateSaveIndicator();
        this.showNotification('Response saved!', 'success');
      } catch (saveError) {
        if (saveError.message.includes('User activation')) {
          // Permission error - just mark as unsaved, don't show error
          this.markUnsaved();
          console.log('Auto-save skipped (requires user interaction)');
        } else {
          throw saveError;
        }
      }
    } catch (error) {
      console.error('Error saving file:', error);
      this.showNotification(`Error saving: ${error.message}`, 'error');
    } finally {
      this.showLoading(false);
    }

    // Keep student selected for multiple attempts
    // Only way to unselect is by clicking Practice button or selecting another student
  }

  /**
   * Update student button state to show completion
   */
  updateStudentButtonState(student) {
    const studentList = document.getElementById('student-list');
    if (!studentList) return;

    // Find the button for this student
    const button = Array.from(studentList.querySelectorAll('.student-roster-button'))
      .find(btn => btn.dataset.studentId === student.student_id);

    if (button) {
      // Check if student has completed the current task
      if (this.hasCompletedTask(student.student_id, this.selectedTask)) {
        button.classList.add('completed');
      } else {
        button.classList.remove('completed');
      }
    }
  }

  /**
   * Clear current task display (allow selecting next student)
   */
  clearCurrentTask() {
    // Remove active state from student button
    const studentList = document.getElementById('student-list');
    if (studentList) {
      studentList.querySelectorAll('.student-roster-button').forEach(btn => {
        btn.classList.remove('active');
      });
    }

    // Reset task display
    this.resetTaskDisplay();

    // Hide response area
    this.hideResponseArea();

    // Clear selected student
    this.selectedStudent = null;
  }

  /**
   * Pick a random student who hasn't completed the current task
   */
  pickRandomStudent() {
    if (!this.selectedClass || !this.selectedTask) {
      this.showNotification('Please select a class and task first!', 'warning');
      return;
    }

    // Get students in current class
    const classStudents = this.students.filter(s => s.class === this.selectedClass);

    // Filter to students who haven't completed the current task
    const availableStudents = classStudents.filter(student =>
      !this.hasCompletedTask(student.student_id, this.selectedTask)
    );

    if (availableStudents.length === 0) {
      this.showNotification('All students have completed this task!', 'success');
      return;
    }

    // Pick random student from available students
    const randomIndex = Math.floor(Math.random() * availableStudents.length);
    const randomStudent = availableStudents[randomIndex];

    // Show popup with student's first name only
    const firstName = randomStudent.name.split(' ')[0];
    this.showRandomStudentPopup(firstName);
  }

  /**
   * Show popup animation with student name
   */
  showRandomStudentPopup(studentName) {
    const popup = document.getElementById('random-student-popup');
    const nameElement = document.getElementById('random-student-name');

    if (!popup || !nameElement) return;

    // Set student name
    nameElement.textContent = studentName;

    // Show popup
    popup.style.display = 'flex';

    // Hide popup after 3 seconds
    setTimeout(() => {
      popup.style.display = 'none';
    }, 3000);

    // Make popup clickable to close early
    popup.onclick = () => {
      popup.style.display = 'none';
    };
  }

  /**
   * Enter practice mode - use module without student context
   */
  enterPracticeMode() {
    if (!this.selectedTask) {
      this.showNotification('Please select a task first!', 'warning');
      return;
    }

    // Get the task data
    const taskData = this.getTask(this.selectedTask);
    if (!taskData || !taskData.module_path) {
      this.showNotification('No module available for this task', 'warning');
      return;
    }

    // Enable practice mode
    this.practiceMode = true;

    // Clear student selection
    this.selectedStudent = null;

    // Remove active state from student buttons
    const studentList = document.getElementById('student-list');
    if (studentList) {
      studentList.querySelectorAll('.student-roster-button').forEach(btn => {
        btn.classList.remove('active');
      });
    }

    // Reset any loaded modules
    this.moduleLoader.reset();

    // Update student name display
    document.getElementById('current-student-name').textContent = 'Practice Mode';

    // Update task name
    document.getElementById('current-task-name').textContent = `Task: ${taskData.question}`;

    // Load the module in practice mode (no student context)
    const container = document.getElementById('task-image-container');
    const context = {
      studentId: 'practice',
      taskId: taskData.task_id,
      grade: 'practice',
      studentName: 'Practice Mode',
      question: taskData.question,
      existingResponse: null
    };

    this.moduleLoader.loadModule(
      taskData.module_path,
      container,
      context
    ).then(iframe => {
      this.moduleLoader.currentResponseModule = iframe;
      this.cancelCountdown();

      const responseArea = document.getElementById('response-area');
      if (responseArea) {
        responseArea.style.display = 'none';
      }

      this.showNotification('Practice Mode - responses will not be saved', 'info');
    }).catch(err => {
      this.showNoTask(`Failed to load module: ${err.message}`);
    });
  }

  /**
   * Toggle audio recording on/off
   */
  async toggleRecording() {
    const recordingBtn = document.getElementById('recording-btn');

    try {
      if (this.audioManager.getIsRecording()) {
        // Stop recording
        await this.audioManager.stopRecording();
        recordingBtn.classList.remove('recording');
      } else {
        // Update context before starting
        this.audioManager.setContext(
          this.selectedStudent,
          this.selectedClass
        );

        // Start recording
        await this.audioManager.startRecording();
        recordingBtn.classList.add('recording');
      }
    } catch (error) {
      console.error('Recording error:', error);
      this.showNotification(`Recording error: ${error.message}`, 'error');
      recordingBtn.classList.remove('recording');
    }
  }

  /**
   * Toggle video recording on/off
   * @param {string} quality - 'high' or 'low' quality mode
   */
  async toggleVideoRecording(quality = 'high') {
    const hqBtn = document.getElementById('video-recording-hq-btn');
    const lqBtn = document.getElementById('video-recording-lq-btn');
    const activeBtn = quality === 'high' ? hqBtn : lqBtn;
    const otherBtn = quality === 'high' ? lqBtn : hqBtn;

    try {
      if (this.videoManager.getIsRecording()) {
        // Stop recording
        await this.videoManager.stopRecording();
        hqBtn.classList.remove('recording');
        lqBtn.classList.remove('recording');
        hqBtn.disabled = false;
        lqBtn.disabled = false;
      } else {
        // Update context before starting
        this.videoManager.setContext(
          this.selectedStudent,
          this.selectedClass
        );

        // Start recording with specified quality
        await this.videoManager.startRecording(quality);
        activeBtn.classList.add('recording');
        otherBtn.disabled = true; // Disable other quality button while recording
      }
    } catch (error) {
      console.error('Video recording error:', error);
      this.showNotification(`Video recording error: ${error.message}`, 'error');
      hqBtn.classList.remove('recording');
      lqBtn.classList.remove('recording');
      hqBtn.disabled = false;
      lqBtn.disabled = false;
    }
  }

  /**
   * Handle module response message
   * @param {Object} data - Response data from module
   */
  handleModuleResponse(data) {
    // Module reported a response change
    this.currentResponse = data.value;

    // Only save if not in practice mode
    if (!this.practiceMode && this.selectedStudent && this.selectedTask && data.isComplete) {
      // Create a NEW result entry for each completion
      // This allows multiple attempts per session
      const newResult = {
        student_id: this.selectedStudent.student_id,
        task_id: this.selectedTask,
        response: data.value,
        completed_date: new Date().toISOString()
      };

      // Add to results array
      this.results.push(newResult);

      this.markUnsaved();

      // Update localStorage with new results data
      this.updateLocalStorage();

      // Start countdown
      this.startCountdown();
    }
  }

  /**
   * Handle module settings update
   * @param {Object} data - Settings data from module
   */
  handleModuleSettings(data) {
    if (data.modulePath && data.settings) {
      // Store settings for this module
      this.moduleSettings[data.modulePath] = data.settings;
      console.log('Saved settings for module:', data.modulePath, data.settings);
    }
  }

  /**
   * Get saved settings for a module
   * @param {string} modulePath - Path to the module
   * @returns {Object|null} - Saved settings or null
   */
  getModuleSettings(modulePath) {
    console.log('Getting settings for:', modulePath);
    console.log('All stored settings:', this.moduleSettings);
    console.log('Retrieved settings:', this.moduleSettings[modulePath]);
    return this.moduleSettings[modulePath] || null;
  }
}

// Initialize app when page loads
let app;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app = new TeachingAssistantApp();
    window.app = app; // Expose globally for modules
  });
} else {
  app = new TeachingAssistantApp();
  window.app = app; // Expose globally for modules
}
