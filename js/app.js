// Main Application Logic
// Manages UI state, navigation, and assessment workflow

class TeachingAssistantApp {
  constructor() {
    this.csvHandler = new CSVHandler();
    this.fileManager = new FileManager();
    this.responseHandler = new ResponseHandler();

    // New data structure: separate students and results
    this.students = [];        // From students.csv
    this.results = [];         // From results.csv
    this.tasks = [];           // Unique tasks extracted from results

    this.currentScreen = 'file-load';
    this.selectedClass = null;
    this.selectedStudent = null;
    this.selectedTask = null;  // Currently selected task ID
    this.currentResponse = '';

    this.countdownTimer = null;
    this.countdownInterval = null;
    this.countdownPaused = false;
    this.countdownTimeLeft = 5;

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

    // Listen for fullscreen changes to update button
    document.addEventListener('fullscreenchange', () => this.updateFullscreenButton());
    document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenButton());
    document.addEventListener('mozfullscreenchange', () => this.updateFullscreenButton());
    document.addEventListener('MSFullscreenChange', () => this.updateFullscreenButton());

    // Back buttons
    const backToClassesBtn = document.getElementById('back-to-classes-btn');
    if (backToClassesBtn) {
      backToClassesBtn.addEventListener('click', () => this.showClassScreen());
    }

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
      this.showNotification('Loading files... Please select the three CSV files when prompted.', 'info');

      // Load all three files
      const { studentsContent, tasksContent, resultsContent } = await this.fileManager.loadFiles();

      // Parse students.csv (student_id, name, grade, class)
      this.showNotification('Parsing student roster...', 'info');
      this.students = this.parseStudentsCSV(studentsContent);

      // Parse tasks.csv (task_id, question, question_type, input_type, grade)
      this.showNotification('Parsing task definitions...', 'info');
      this.tasks = this.parseTasksCSV(tasksContent);

      // Parse results.csv (student_id, task_id, response, completed_date)
      this.showNotification('Parsing student responses...', 'info');
      this.results = this.parseResultsCSV(resultsContent);

      console.log(`Loaded ${this.students.length} students`);
      console.log(`Loaded ${this.tasks.length} tasks`);
      console.log(`Loaded ${this.results.length} responses`);

      // Default to first task if any exist
      if (this.tasks.length > 0 && !this.selectedTask) {
        this.selectedTask = this.tasks[0].task_id;
      }

      // Update UI
      const fileNames = this.fileManager.getFileNames();
      document.getElementById('file-name').textContent = `${fileNames.students}, ${fileNames.tasks}, ${fileNames.results}`;

      // Populate task selector (will be filtered by grade when class is selected)
      this.populateTaskSelector();

      // Show save button and task selector
      const saveBtn = document.getElementById('save-btn');
      if (saveBtn) {
        saveBtn.style.display = 'inline-flex';
      }

      const taskSelector = document.getElementById('task-selector');
      if (taskSelector && this.tasks.length > 0) {
        taskSelector.style.display = 'inline-block';
      }

      // Hide back button initially
      const backBtn = document.getElementById('back-to-classes-btn');
      if (backBtn) {
        backBtn.style.display = 'none';
      }

      // Show class selection screen
      this.showClassScreen();

      this.showNotification(`Loaded ${this.students.length} students, ${this.tasks.length} tasks, ${this.results.length} responses!`, 'success');
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
        question_type: line[2],
        input_type: line[3],
        grade: line[4]
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
   */
  async saveFile() {
    try {
      this.showLoading(true);

      // Convert results to CSV
      const csvContent = this.resultsToCSV();

      // Save results file
      await this.fileManager.saveResults(csvContent);

      this.showNotification('Results saved successfully!', 'success');

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

    // Get the grade for this class and filter tasks
    const classGrade = classStudents.length > 0 ? classStudents[0].grade : null;
    if (classGrade) {
      this.populateTaskSelector(classGrade);
    }

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

      // Highlight students who have completed the currently selected task
      if (this.hasCompletedTask(student.student_id, this.selectedTask)) {
        button.classList.add('completed');
      }

      button.addEventListener('click', () => {
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
    const result = this.results.find(r =>
      r.student_id === student_id && r.task_id === task_id
    );
    return result && result.response && result.response.trim() !== '';
  }

  /**
   * Display the task for a selected student
   */
  displayStudentTask(student) {
    // Cancel any active countdown from previous student
    this.cancelCountdown();

    // Update student name display
    document.getElementById('current-student-name').textContent = student.name;

    // Check if this student has this task assigned
    if (!this.selectedTask) {
      this.showNoTask('No task selected');
      this.hideResponseArea();
      return;
    }

    // Get the task data
    const taskData = this.getTask(this.selectedTask);
    if (!taskData) {
      this.showNoTask('Task not found');
      this.hideResponseArea();
      return;
    }

    // Update task name
    document.getElementById('current-task-name').textContent = `Task: ${taskData.question}`;

    // Check question_type to determine if we show image or text
    const questionType = taskData.question_type || 'picture';

    if (questionType === 'string') {
      // Display task as text
      this.displayTaskText(taskData.question);
    } else {
      // Default to picture - load task image with student's grade
      this.loadTaskImage(taskData.task_id, student.grade);
    }

    // Show response area with appropriate input type
    this.showResponseArea(student, taskData);
  }

  /**
   * Get task data by task_id
   */
  getTask(task_id) {
    return this.tasks.find(t => t.task_id === task_id);
  }

  /**
   * Get or create result for a student-task combination
   */
  getOrCreateResult(student_id, task_id) {
    let result = this.results.find(r =>
      r.student_id === student_id && r.task_id === task_id
    );

    if (!result) {
      // Create new result entry (task metadata comes from tasks.csv)
      result = {
        student_id: student_id,
        task_id: task_id,
        response: '',
        completed_date: ''
      };
      this.results.push(result);
    }

    return result;
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
  showResponseArea(student, taskData) {
    const responseArea = document.getElementById('response-area');
    if (!responseArea) return;

    // Get or create result for this student-task combination
    const result = this.getOrCreateResult(student.student_id, this.selectedTask);

    // Get response type from task data
    const inputType = taskData.input_type || '';
    const currentResponse = result.response || '';

    // Show response area
    responseArea.style.display = 'block';

    // Clear existing response container
    const responseContainer = document.getElementById('response-container');
    responseContainer.innerHTML = '';

    // Render response input using ResponseHandler
    const responseInput = this.responseHandler.renderResponseInput(
      inputType,
      currentResponse,
      (newResponse) => {
        // Handle response change
        this.currentResponse = newResponse;
        result.response = newResponse;
        this.markUnsaved();

        // Start countdown timer after response is submitted
        this.startCountdown();
      }
    );

    responseContainer.appendChild(responseInput);
  }

  /**
   * Hide response area
   */
  hideResponseArea() {
    const responseArea = document.getElementById('response-area');
    if (responseArea) {
      responseArea.style.display = 'none';
    }
    this.responseHandler.reset();
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
    document.getElementById('task-image').style.display = 'none';
    document.getElementById('no-task-message').style.display = 'block';
    document.getElementById('no-task-message').querySelector('p').textContent = 'Select a student to view their assigned task';
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

    // Save the results file
    try {
      this.showLoading(true);
      const csvContent = this.resultsToCSV();
      await this.fileManager.saveResults(csvContent);
      this.updateSaveIndicator();
    } catch (error) {
      console.error('Error saving file:', error);
      this.showNotification(`Error saving: ${error.message}`, 'error');
    } finally {
      this.showLoading(false);
    }

    // Clear task display
    this.clearCurrentTask();

    // Show brief success message
    this.showNotification('Response saved!', 'success');
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
}

// Initialize app when page loads
let app;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app = new TeachingAssistantApp();
  });
} else {
  app = new TeachingAssistantApp();
}
