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

    // Track forgot instrument and earned stool for current session
    this.sessionForgotInstrument = new Set();
    this.sessionEarnedStool = new Set();

    // Combined classes mode
    this.combineClassesMode = false; // Whether we're in "combine classes" mode
    this.selectedClasses = new Set(); // Which classes are selected for combining

    // Presentation links storage
    this.presentationLinks = [];  // Array of {timestamp, url, title}
    this.perClassPresentations = {};  // {className: url} for session persistence

    // Seat palette - in-memory only, not persisted
    this.seatAssignments = new Map(); // studentId -> color
    this.seatColors = ['red', 'orange', 'green', 'blue', 'purple'];
    this.slotsPerColor = 6;

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
      } else if (event.data.type === 'module:requestFullscreen') {
        // Module is requesting fullscreen overlay with presentation
        this.showPresentationFullscreen(event.data.url);
      } else if (event.data.type === 'taskmodule:request-students') {
        // Module is requesting the current class's student list
        this.handleStudentListRequest(event);
      } else if (event.data.type === 'saveBoomwhackerSong') {
        // Save boomwhacker song configuration
        this.saveBoomwhackerSong(event.data.songName, event.data.configJson);
      } else if (event.data.type === 'loadBoomwhackerSong') {
        // Load boomwhacker song configuration
        this.loadBoomwhackerSong(event.data.songName);
      } else if (event.data.type === 'getBoomwhackerSongs') {
        // Get list of saved songs
        this.getBoomwhackerSongs();
      } else if (event.data.type === 'requestSongName') {
        // Module wants to get a song name (can't use prompt in iframe)
        console.log('[PARENT] Received requestSongName from module');
        const songName = prompt('Enter a name for this song configuration:');
        console.log('[PARENT] User entered song name:', songName);
        if (songName) {
          const iframe = document.getElementById('task-module-frame');
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'songName',
              songName: songName
            }, '*');
            console.log('[PARENT] Sent songName back to module');
          }
        }
      } else if (event.data.type === 'saveBoomwhackerSong') {
        // Save boomwhacker song configuration
        console.log('[PARENT] Received saveBoomwhackerSong:', event.data.songName);
        this.saveBoomwhackerSong(event.data.songName, event.data.configJson);
      } else if (event.data.type === 'loadBoomwhackerSong') {
        // Load boomwhacker song configuration
        console.log('[PARENT] Received loadBoomwhackerSong:', event.data.songName);
        this.loadBoomwhackerSong(event.data.songName);
      } else if (event.data.type === 'getBoomwhackerSongs') {
        // Get list of saved songs
        console.log('[PARENT] Received getBoomwhackerSongs');
        this.getBoomwhackerSongs();
      }
    });

    // Random student picker button
    const pickRandomBtn = document.getElementById('pick-random-btn');
    if (pickRandomBtn) {
      pickRandomBtn.addEventListener('click', () => this.pickRandomStudent());
    }

    // Seat palette buttons
    const assignSeatsBtn = document.getElementById('assign-seats-btn');
    if (assignSeatsBtn) {
      assignSeatsBtn.addEventListener('click', () => this.assignSeats());
    }

    const clearSeatsBtn = document.getElementById('clear-seats-btn');
    if (clearSeatsBtn) {
      clearSeatsBtn.addEventListener('click', () => this.clearSeatAssignments());
    }

    // Initialize seat palette drag handlers
    this.initializeSeatPalette();

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

    // Mic gain slider
    const micGainSlider = document.getElementById('mic-gain-slider');
    const micGainValue = document.getElementById('mic-gain-value');
    if (micGainSlider && micGainValue) {
      micGainSlider.addEventListener('input', (e) => {
        const gainPercent = parseInt(e.target.value);
        micGainValue.textContent = `${gainPercent}%`;
        // Update gain in real-time if audio context exists
        this.audioManager.setGain(gainPercent);
      });
    }

    // Video recording button toggle
    const videoRecordingBtn = document.getElementById('video-recording-lq-btn');
    if (videoRecordingBtn) {
      videoRecordingBtn.addEventListener('click', async () => {
        await this.toggleVideoRecording('low');
      });
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
      // this.showNotification('Loading files... Please select the three CSV files when prompted.', 'info');

      // Load two CSV files (tasks loaded from modules/)
      const { studentsContent, resultsContent } = await this.fileManager.loadFiles();

      // Parse students.csv (student_id, name, grade, class)
      // this.showNotification('Parsing student roster...', 'info');
      this.students = this.parseStudentsCSV(studentsContent);

      // Load tasks from modules/ folder (no more tasks.csv)
      // this.showNotification('Loading available modules...', 'info');
      await this.loadTasksFromModules();

      // Parse results.csv (student_id, task_id, response, completed_date)
      // this.showNotification('Parsing student responses...', 'info');
      this.results = this.parseResultsCSV(resultsContent);

      console.log(`Loaded ${this.students.length} students`);
      console.log(`Loaded ${this.tasks.length} tasks from modules/`);
      console.log(`Loaded ${this.results.length} responses`);

      // Load presentation links (optional file)
      await this.loadPresentationLinks();

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
      document.getElementById('mic-gain-control').style.display = 'flex';
      document.getElementById('video-recording-lq-btn').style.display = 'block';

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
  /**
   * Load tasks by scanning modules/ folder for .html files
   * No more tasks.csv - all modules in the folder become available tasks
   */
  async loadTasksFromModules() {
    this.tasks = [];

    try {
      // Fetch the list of files in the modules/ directory
      // This requires the server to provide directory listing or we scan known modules
      const response = await fetch('modules/');

      // Check if fetch was successful (directory listing might not be available)
      if (!response.ok) {
        throw new Error(`Failed to fetch modules/ directory: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();

      // Parse HTML to find .html files (basic approach)
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const links = doc.querySelectorAll('a');

      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.endsWith('.html') && !href.startsWith('_')) {
          // Extract module name from filename (e.g., "rhythm_game.html" -> "rhythm_game")
          const moduleName = href.replace('.html', '');

          // Create task object
          this.tasks.push({
            task_id: moduleName,
            question: this.formatModuleName(moduleName), // Convert to readable name
            module_path: `modules/${href}`
          });
        }
      });

      console.log(`Discovered ${this.tasks.length} modules:`, this.tasks.map(t => t.task_id));
    } catch (error) {
      console.error('Failed to load tasks from modules folder:', error);
      console.log('Using fallback: loading hardcoded module list');

      // Fallback: Manually list known modules if directory listing fails
      this.tasks = await this.loadKnownModules();
    }
  }

  /**
   * Fallback method: Load a hardcoded list of known modules
   * Just loads all modules directly without checking - they're part of the app
   */
  async loadKnownModules() {
    // List of all known module files (update this when adding new modules)
    const knownModules = [
      'audio-player.html',
      'boomwhacker_assigner.html',
      'chord_progression_composer.html',
      'dance_viewer.html',
      'greig_boomwhacker_assignment.html',
      'interval_trainer.html',
      'martins-dream-of-1963.html',
      'pentatonic_composer.html',
      'piano_octave_1.html',
      'picture.html',
      'presentation_viewer.html',
      'results-viewer.html',
      'rhythm_dictation_trainer.html',
      'rhythm-trainer.html',
      'simple-button-test.html',
      's_l_m_composer.html',
      's_l_m_composer_modular.html',
      'smlrd_composer.html',
      'smlrd_composer_working.html',
      'so_la_mi_re_do_trainer.html',
      'so_la_mi_trainer.html',
      'string.html',
      'student_notes.html',
      'tuner.html',
      'video-player.html',
      'word-ending.html'
    ];

    // Just load all modules - they're part of the application, not user data
    const tasks = knownModules.map(moduleFile => {
      const moduleName = moduleFile.replace('.html', '');
      return {
        task_id: moduleName,
        question: this.formatModuleName(moduleName),
        module_path: `modules/${moduleFile}`
      };
    });

    console.log(`Loaded ${tasks.length} modules from fallback list`);
    return tasks;
  }

  /**
   * Convert module filename to readable display name
   * E.g., "rhythm_practice" -> "Rhythm Practice"
   * E.g., "audio-player" -> "Audio Player"
   */
  formatModuleName(moduleName) {
    return moduleName
      .split(/[-_]/) // Split on both hyphens and underscores
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
   * No grade filtering - all tasks shown for all classes
   */
  populateTaskSelector() {
    const taskSelector = document.getElementById('task-selector');
    if (!taskSelector) return;

    // Clear existing options except first
    taskSelector.innerHTML = '<option value="">Select Task...</option>';

    // Add all tasks (no filtering)
    this.tasks.forEach(task => {
      const option = document.createElement('option');
      option.value = task.task_id;
      option.textContent = task.question; // Display formatted name

      if (task.task_id === this.selectedTask) {
        option.selected = true;
      }

      taskSelector.appendChild(option);
    });
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
    this.selectedClasses.clear(); // Clear any combined class selections
    this.showScreen('class-select');

    // Hide back button on class select screen
    const backBtn = document.getElementById('back-to-classes-btn');
    if (backBtn) {
      backBtn.style.display = 'none';
    }

    // Hide seat palette on class select screen
    this.hideSeatPalette();
    
    // Clear seat assignments when leaving class view
    this.seatAssignments.clear();

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

    // Add "Combine Classes" controls at the top
    const combineControls = document.createElement('div');
    combineControls.className = 'combine-controls';

    if (!this.combineClassesMode) {
      // Show "Combine Classes" button
      const combineBtn = document.createElement('button');
      combineBtn.className = 'btn btn-secondary combine-toggle-btn';
      combineBtn.innerHTML = '🔗 Combine Classes';
      combineBtn.addEventListener('click', () => {
        this.combineClassesMode = true;
        this.selectedClasses.clear();
        this.showClassScreen();
      });
      combineControls.appendChild(combineBtn);
    } else {
      // Show "Cancel" and "Select All" buttons
      const buttonGroup = document.createElement('div');
      buttonGroup.className = 'combine-button-group';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.innerHTML = '← Cancel';
      cancelBtn.addEventListener('click', () => {
        this.combineClassesMode = false;
        this.selectedClasses.clear();
        this.showClassScreen();
      });

      const selectAllBtn = document.createElement('button');
      selectAllBtn.className = 'btn btn-secondary';
      selectAllBtn.innerHTML = '✓ Select All';
      selectAllBtn.addEventListener('click', () => {
        if (this.selectedClasses.size === classes.length) {
          // All are selected, deselect all
          this.selectedClasses.clear();
        } else {
          // Select all
          this.selectedClasses = new Set(classes);
        }
        this.showClassScreen();
      });

      buttonGroup.appendChild(cancelBtn);
      buttonGroup.appendChild(selectAllBtn);
      combineControls.appendChild(buttonGroup);

      // Show "View Combined" button if at least one class is selected
      if (this.selectedClasses.size > 0) {
        const totalStudents = Array.from(this.selectedClasses).reduce((sum, className) => {
          return sum + (classMap.get(className) || 0);
        }, 0);

        const viewCombinedBtn = document.createElement('button');
        viewCombinedBtn.className = 'btn btn-primary btn-large view-combined-btn';
        viewCombinedBtn.innerHTML = `View Combined (${totalStudents} total students)`;
        viewCombinedBtn.addEventListener('click', () => {
          this.viewCombinedClasses();
        });
        combineControls.appendChild(viewCombinedBtn);
      }
    }

    classGrid.appendChild(combineControls);

    // Render class buttons
    classes.forEach(className => {
      const button = document.createElement('button');
      button.className = 'class-button';

      // Add checkbox if in combine mode
      if (this.combineClassesMode) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'class-checkbox';
        checkbox.checked = this.selectedClasses.has(className);
        // Don't add change listener - button click handler manages toggling
        button.appendChild(checkbox);
      }

      // Add class name text
      const textNode = document.createTextNode(className);
      button.appendChild(textNode);

      // Count students in class
      const studentCount = classMap.get(className);
      const count = document.createElement('span');
      count.className = 'student-count';
      count.textContent = `${studentCount} students`;
      button.appendChild(document.createElement('br'));
      button.appendChild(count);

      // In combine mode, clicking toggles checkbox
      // In normal mode, clicking selects the class
      button.addEventListener('click', () => {
        if (this.combineClassesMode) {
          // Toggle checkbox
          const checkbox = button.querySelector('.class-checkbox');

          if (checkbox) {
            checkbox.checked = !checkbox.checked;

            if (checkbox.checked) {
              this.selectedClasses.add(className);
            } else {
              this.selectedClasses.delete(className);
            }

            // DON'T re-render entire screen - just update the combine controls
            this.updateCombineControls(classMap);
          }
        } else {
          // Normal mode - select class
          this.selectedClass = className;
          this.showStudentScreen();
        }
      });

      classGrid.appendChild(button);
    });
  }

  /**
   * Update combine controls without re-rendering entire screen
   */
  updateCombineControls(classMap) {
    const combineControls = document.querySelector('.combine-controls');
    if (!combineControls) return;

    // Clear existing controls
    combineControls.innerHTML = '';

    // Show "Cancel" and "Select All" buttons
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'combine-button-group';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.innerHTML = '← Cancel';
    cancelBtn.addEventListener('click', () => {
      this.combineClassesMode = false;
      this.selectedClasses.clear();
      this.showClassScreen();
    });

    const selectAllBtn = document.createElement('button');
    selectAllBtn.className = 'btn btn-secondary';
    const allClasses = Array.from(classMap.keys());
    selectAllBtn.innerHTML = '✓ Select All';
    selectAllBtn.addEventListener('click', () => {
      if (this.selectedClasses.size === allClasses.length) {
        // All are selected, deselect all
        this.selectedClasses.clear();
      } else {
        // Select all
        this.selectedClasses = new Set(allClasses);
      }
      this.showClassScreen();
    });

    buttonGroup.appendChild(cancelBtn);
    buttonGroup.appendChild(selectAllBtn);
    combineControls.appendChild(buttonGroup);

    // Show "View Combined" button if at least one class is selected
    if (this.selectedClasses.size > 0) {
      const totalStudents = Array.from(this.selectedClasses).reduce((sum, className) => {
        return sum + (classMap.get(className) || 0);
      }, 0);

      const viewCombinedBtn = document.createElement('button');
      viewCombinedBtn.className = 'btn btn-primary btn-large view-combined-btn';
      viewCombinedBtn.innerHTML = `View Combined (${totalStudents} total students)`;
      viewCombinedBtn.addEventListener('click', () => {
        this.viewCombinedClasses();
      });
      combineControls.appendChild(viewCombinedBtn);
    }
  }

  /**
   * View combined classes roster
   */
  viewCombinedClasses() {
    if (this.selectedClasses.size === 0) {
      this.showNotification('Please select at least one class', 'warning');
      return;
    }

    // Create combined class name
    if (this.selectedClasses.size === this.students.length) {
      // If all students are selected, use "Everyone"
      const uniqueClasses = new Set(this.students.map(s => s.class));
      if (this.selectedClasses.size === uniqueClasses.size) {
        this.selectedClass = 'Everyone';
      } else {
        this.selectedClass = Array.from(this.selectedClasses).join(' + ');
      }
    } else {
      this.selectedClass = Array.from(this.selectedClasses).join(' + ');
    }

    // Exit combine mode
    this.combineClassesMode = false;

    // Show student screen (it will filter by selectedClasses)
    this.showStudentScreen();
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

    // Show seat palette
    this.showSeatPalette();

    // Update header
    document.getElementById('selected-class-name').textContent = this.selectedClass;

    // Clear student name display in sidebar
    document.getElementById('selected-student-display').textContent = '';

    // Filter students by class(es)
    let classStudents;
    if (this.selectedClasses.size > 0) {
      // Combined classes mode - get students from all selected classes
      classStudents = this.students.filter(s => this.selectedClasses.has(s.class));
      // Don't clear selectedClasses - keep it so combined class persists when changing tasks
    } else {
      // Single class mode
      classStudents = this.students.filter(s => s.class === this.selectedClass);
    }

    // Show all tasks
    this.populateTaskSelector();

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

      button.dataset.studentId = student.student_id;
      
      // Add seat dot if assigned
      const assignedColor = this.seatAssignments.get(student.student_id);
      if (assignedColor) {
        const dot = document.createElement('span');
        dot.className = 'student-seat-dot';
        dot.dataset.color = assignedColor;
        button.appendChild(dot);
      }
      
      // Add name in a span
      const nameSpan = document.createElement('span');
      nameSpan.className = 'student-name-text';
      nameSpan.textContent = displayName;
      button.appendChild(nameSpan);

      // Add status indicators
      const statusIndicator = document.createElement('span');
      statusIndicator.className = 'student-status-indicator';

      if (this.sessionForgotInstrument.has(student.student_id)) {
        const forgot = document.createElement('span');
        forgot.className = 'status-forgot';
        forgot.textContent = '❌';
        forgot.title = 'Forgot instrument';
        statusIndicator.appendChild(forgot);
      }

      if (this.sessionEarnedStool.has(student.student_id)) {
        const stool = document.createElement('span');
        stool.className = 'status-stool';
        stool.textContent = '⭐';
        stool.title = 'Earned stool';
        statusIndicator.appendChild(stool);
      }

      if (statusIndicator.children.length > 0) {
        button.appendChild(statusIndicator);
      }

      // Check if student is marked absent (check for ATTENDANCE record)
      const isAbsent = this.isStudentAbsent(student.student_id);
      if (isAbsent) {
        button.classList.add('absent');
      }

      // Highlight students who have completed the currently selected task
      if (this.hasCompletedTask(student.student_id, this.selectedTask)) {
        button.classList.add('completed');
      }

      // Long-press detection for context menu
      let pressTimer = null;
      let touchMoved = false;
      let longPressTriggered = false;

      const startPress = (e) => {
        touchMoved = false;
        longPressTriggered = false;
        pressTimer = setTimeout(() => {
          // Long press detected - show context menu
          longPressTriggered = true;
          this.showStudentContextMenu(student, e);

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
      button.addEventListener('click', (e) => {
        // If long press was triggered, don't handle the click
        if (longPressTriggered) {
          longPressTriggered = false;
          e.preventDefault();
          e.stopPropagation();
          return;
        }

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

      // Setup drag/drop handlers for seat assignment
      this.setupStudentDragDropHandlers(button, student);

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
   * Show context menu for student actions
   */
  showStudentContextMenu(student, event) {
    const menu = document.getElementById('student-context-menu');
    if (!menu) return;

    // Position the menu
    const x = event.clientX || (event.touches && event.touches[0].clientX) || 0;
    const y = event.clientY || (event.touches && event.touches[0].clientY) || 0;

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.display = 'block';

    // Store current student for menu actions
    menu.dataset.studentId = student.student_id;

    // Close menu when clicking outside
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.style.display = 'none';
        document.removeEventListener('click', closeMenu);
        document.removeEventListener('touchstart', closeMenu);
      }
    };

    // Delay adding the close listeners to avoid immediate close
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
      document.addEventListener('touchstart', closeMenu);
    }, 300);

    // Handle menu item clicks
    const menuItems = menu.querySelectorAll('.context-menu-item');
    menuItems.forEach(item => {
      item.onclick = (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        menu.style.display = 'none';

        switch (action) {
          case 'absent':
            this.toggleAbsentStatus(student);
            break;
          case 'forgot':
            this.toggleForgotInstrument(student);
            break;
          case 'stool':
            this.toggleEarnedStool(student);
            break;
        }
      };
    });
  }

  /**
   * Toggle forgot instrument status
   */
  toggleForgotInstrument(student) {
    const hasForgot = this.sessionForgotInstrument.has(student.student_id);

    if (hasForgot) {
      // Remove from session tracker
      this.sessionForgotInstrument.delete(student.student_id);

      // Remove from results
      this.results = this.results.filter(r =>
        !(r.student_id === student.student_id && r.task_id === 'FORGOT_INSTRUMENT')
      );
      this.showNotification(`${student.name} - forgot instrument removed`, 'success');
    } else {
      // Add to session tracker
      this.sessionForgotInstrument.add(student.student_id);

      // Create record for CSV
      const record = {
        student_id: student.student_id,
        task_id: 'FORGOT_INSTRUMENT',
        response: 'true',
        completed_date: new Date().toISOString()
      };
      this.results.push(record);
      this.showNotification(`${student.name} - marked forgot instrument`, 'warning');
    }

    // Update and refresh
    this.updateLocalStorage();
    this.markUnsaved();
    this.showStudentScreen();
  }

  /**
   * Toggle earned stool status
   */
  toggleEarnedStool(student) {
    const hasStool = this.sessionEarnedStool.has(student.student_id);

    if (hasStool) {
      // Remove from session tracker
      this.sessionEarnedStool.delete(student.student_id);

      // Remove from results
      this.results = this.results.filter(r =>
        !(r.student_id === student.student_id && r.task_id === 'EARNED_STOOL')
      );
      this.showNotification(`${student.name} - stool removed`, 'success');
    } else {
      // Add to session tracker
      this.sessionEarnedStool.add(student.student_id);

      // Create record for CSV
      const record = {
        student_id: student.student_id,
        task_id: 'EARNED_STOOL',
        response: 'true',
        completed_date: new Date().toISOString()
      };
      this.results.push(record);
      this.showNotification(`${student.name} - earned stool! ⭐`, 'success');
    }

    // Update and refresh
    this.updateLocalStorage();
    this.markUnsaved();
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

    // Update student name display in sidebar
    document.getElementById('selected-student-display').textContent = student.name;

    // Update student name display (keeping for backward compatibility, but hidden)
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
   * Show presentation in fullscreen overlay
   */
  showPresentationFullscreen(url) {
    const overlay = document.getElementById('presentation-fullscreen-overlay');
    const iframe = document.getElementById('fullscreen-presentation-iframe');
    const closeBtn = document.getElementById('fullscreen-close-btn');
    const prevBtn = document.getElementById('fullscreen-prev-btn');
    const nextBtn = document.getElementById('fullscreen-next-btn');
    const clickLeft = document.getElementById('fullscreen-click-left');
    const clickRight = document.getElementById('fullscreen-click-right');
    const helper = document.getElementById('fullscreen-helper');

    if (!overlay || !iframe) {
      console.error('Fullscreen overlay elements not found');
      return;
    }

    // Detect starting slide from URL or reset to 0
    const slideMatch = url.match(/slide=(\d+)/);
    this.currentSlideIndex = slideMatch ? parseInt(slideMatch[1]) : 0;

    // Load presentation in overlay iframe
    iframe.src = url;
    overlay.classList.add('active');

    // Focus the overlay container to capture keyboard events
    setTimeout(() => {
      overlay.focus();
      console.log('Overlay focused for keyboard events');
    }, 100);

    // Show helper text
    if (helper) {
      helper.classList.remove('hidden');
      // Hide helper after 4 seconds
      setTimeout(() => {
        helper.classList.add('hidden');
      }, 4000);
    }

    // Keep overlay focused even after iframe loads
    iframe.onload = () => {
      setTimeout(() => {
        overlay.focus(); // Focus overlay instead of iframe
        console.log('Iframe loaded, overlay refocused');
      }, 200);
    };

    // Setup close button
    const closeHandler = () => this.closePresentationFullscreen();
    closeBtn.onclick = closeHandler;

    // Setup navigation buttons
    prevBtn.onclick = () => {
      this.navigateFullscreenPresentation('prev');
      if (helper) helper.classList.add('hidden');
    };
    nextBtn.onclick = () => {
      this.navigateFullscreenPresentation('next');
      if (helper) helper.classList.add('hidden');
    };

    // Setup click zones
    if (clickLeft) {
      clickLeft.onclick = () => {
        this.navigateFullscreenPresentation('prev');
        if (helper) helper.classList.add('hidden');
      };
    }
    if (clickRight) {
      clickRight.onclick = () => {
        this.navigateFullscreenPresentation('next');
        if (helper) helper.classList.add('hidden');
      };
    }

    // Setup keyboard shortcuts with capture phase to intercept before iframe
    const keyHandler = (e) => {
      console.log('Key pressed:', e.key); // Debug log

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.closePresentationFullscreen();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        e.stopPropagation();
        this.navigateFullscreenPresentation('prev');
        if (helper) helper.classList.add('hidden');
      } else if (e.key === 'ArrowRight' || e.key === 'b' || e.key === 'B' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        e.stopPropagation();
        this.navigateFullscreenPresentation('next');
        if (helper) helper.classList.add('hidden');
      }
    };

    // Store handler for cleanup
    this.fullscreenKeyHandler = keyHandler;

    // Use capture phase (true) to intercept keys before iframe gets them
    document.addEventListener('keydown', keyHandler, true);

    // Prevent iframe from stealing focus
    iframe.addEventListener('focus', () => {
      console.log('Iframe tried to get focus, refocusing overlay');
      overlay.focus();
    });

    // Allow clicking on iframe and hide helper
    iframe.addEventListener('click', () => {
      if (helper) helper.classList.add('hidden');
    });
  }

  /**
   * Close presentation fullscreen overlay
   */
  closePresentationFullscreen() {
    const overlay = document.getElementById('presentation-fullscreen-overlay');
    const iframe = document.getElementById('fullscreen-presentation-iframe');

    if (overlay) {
      overlay.classList.remove('active');
    }

    if (iframe) {
      iframe.src = '';
    }

    // Remove keyboard handler (must match capture phase)
    if (this.fullscreenKeyHandler) {
      document.removeEventListener('keydown', this.fullscreenKeyHandler, true);
      this.fullscreenKeyHandler = null;
    }
  }

  /**
   * Navigate presentation in fullscreen overlay
   */
  navigateFullscreenPresentation(direction) {
    const iframe = document.getElementById('fullscreen-presentation-iframe');
    if (!iframe || !iframe.contentWindow) return;

    const currentUrl = iframe.src;

    // Check if it's a Google Slides URL
    if (currentUrl.includes('docs.google.com/presentation')) {
      this.navigateGoogleSlides(iframe, direction);
      return;
    }

    // For non-Google Slides, try generic navigation
    iframe.focus();

    try {
      const key = direction === 'prev' ? 'ArrowLeft' : 'ArrowRight';

      // Try to focus and send keyboard event
      try {
        iframe.contentWindow.focus();
        const keyEvent = new KeyboardEvent('keydown', {
          key: key,
          code: key,
          keyCode: key === 'ArrowLeft' ? 37 : 39,
          which: key === 'ArrowLeft' ? 37 : 39,
          bubbles: true,
          cancelable: true
        });
        iframe.contentWindow.document.dispatchEvent(keyEvent);
      } catch (e) {
        console.log('Keyboard event blocked (cross-origin)');
      }

      // Send postMessage
      iframe.contentWindow.postMessage({
        type: 'navigate',
        direction: direction,
        key: key
      }, '*');

    } catch (error) {
      console.log('Navigation error:', error);
    }
  }

  /**
   * Navigate Google Slides by manipulating URL
   */
  navigateGoogleSlides(iframe, direction) {
    if (!this.currentSlideIndex) {
      this.currentSlideIndex = 0;
    }

    // Adjust slide index
    if (direction === 'prev') {
      this.currentSlideIndex = Math.max(0, this.currentSlideIndex - 1);
    } else {
      this.currentSlideIndex++;
    }

    const currentUrl = iframe.src;
    let newUrl;

    // Check if URL already has slide parameter
    if (currentUrl.includes('slide=')) {
      // Replace existing slide parameter
      newUrl = currentUrl.replace(/slide=\d+/, `slide=${this.currentSlideIndex}`);
    } else {
      // Add slide parameter
      const separator = currentUrl.includes('?') ? '&' : '?';
      newUrl = `${currentUrl}${separator}slide=${this.currentSlideIndex}`;
    }

    // Update iframe URL
    iframe.src = newUrl;
    console.log(`Navigate Google Slides: ${direction}, slide ${this.currentSlideIndex}`);
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
   * Show results viewer as a module
   */
  showResultsViewer() {
    // Make sure we're on the student screen to show the module
    if (this.currentScreen !== 'student-select') {
      // If no class is selected, just go to class screen first
      if (!this.selectedClass) {
        this.showNotification('Please select a class first', 'info');
        return;
      }
      this.showStudentScreen();
    }

    // Reset any loaded modules
    this.moduleLoader.reset();

    // Update student name display
    document.getElementById('current-student-name').textContent = 'Results Viewer';

    // Update task name
    document.getElementById('current-task-name').textContent = 'View all student results';

    // Load the results viewer module
    const container = document.getElementById('task-image-container');
    const context = {
      studentId: this.selectedStudent,
      studentName: this.selectedStudent ? this.students.find(s => s.student_id === this.selectedStudent)?.name : null,
      class: this.selectedClass,
      grade: null
    };

    this.moduleLoader.loadModule(
      'modules/results-viewer.html',
      container,
      context
    ).then(iframe => {
      this.moduleLoader.currentResponseModule = iframe;
      this.cancelCountdown();

      const responseArea = document.getElementById('response-area');
      if (responseArea) {
        responseArea.style.display = 'none';
      }
    }).catch(err => {
      this.showNoTask(`Failed to load results viewer: ${err.message}`);
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
  async toggleVideoRecording(quality = 'low') {
    const lqBtn = document.getElementById('video-recording-lq-btn');

    try {
      if (this.videoManager.getIsRecording()) {
        // Stop recording
        await this.videoManager.stopRecording();
        if (lqBtn) {
          lqBtn.classList.remove('recording');
          lqBtn.disabled = false;
        }
      } else {
        // Update context before starting
        this.videoManager.setContext(
          this.selectedStudent,
          this.selectedClass
        );

        // Start recording with specified quality
        await this.videoManager.startRecording(quality);
        if (lqBtn) {
          lqBtn.classList.add('recording');
        }
      }
    } catch (error) {
      console.error('Video recording error:', error);
      this.showNotification(`Video recording error: ${error.message}`, 'error');
      if (lqBtn) {
        lqBtn.classList.remove('recording');
        lqBtn.disabled = false;
      }
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

      // If this is presentation_viewer and we have a class selected, track per-class
      if (data.modulePath === 'presentation_viewer.html' && this.selectedClass && data.settings.url) {
        this.perClassPresentations[this.selectedClass] = data.settings.url;
        console.log('Saved presentation for class:', this.selectedClass, data.settings.url);
      }
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

    // Special handling for presentation_viewer: return per-class URL if available
    if (modulePath === 'presentation_viewer.html' && this.selectedClass) {
      const classUrl = this.perClassPresentations[this.selectedClass];
      if (classUrl) {
        console.log('Returning per-class presentation for:', this.selectedClass, classUrl);
        return { url: classUrl };
      }
    }

    console.log('Retrieved settings:', this.moduleSettings[modulePath]);
    return this.moduleSettings[modulePath] || null;
  }

  /**
   * Handle request from module for student list
   * @param {MessageEvent} event - Message event from module
   */
  handleStudentListRequest(event) {
    if (!this.selectedClass) {
      console.warn('No class selected, cannot send student list');
      return;
    }

    // Get students from current class(es)
    let classStudents;
    if (this.selectedClasses.size > 0) {
      // Combined classes mode - get students from all selected classes
      classStudents = this.students
        .filter(s => this.selectedClasses.has(s.class))
        .map(student => ({
          student_id: student.student_id,
          name: student.name,
          grade: student.grade,
          class: student.class,
          isAbsent: this.isStudentAbsent(student.student_id)
        }));
    } else {
      // Single class mode
      classStudents = this.students
        .filter(s => s.class === this.selectedClass)
        .map(student => ({
          student_id: student.student_id,
          name: student.name,
          grade: student.grade,
          class: student.class,
          isAbsent: this.isStudentAbsent(student.student_id)
        }));
    }

    // Send student list back to the requesting module
    const moduleIframe = document.querySelector('#task-image-container iframe');
    if (moduleIframe && moduleIframe.contentWindow) {
      moduleIframe.contentWindow.postMessage({
        type: 'taskmodule:students-data',
        students: classStudents
      }, '*');
      console.log('Sent student list to module:', classStudents.length, 'students');
    } else {
      console.warn('Could not find module iframe to send student data');
    }
  }

  /**
   * Load presentation links from CSV
   */
  async loadPresentationLinks() {
    try {
      if (!this.fileManager.folderHandle) {
        console.log('No folder selected yet - presentations will load after folder is selected');
        this.presentationLinks = [];
        return;
      }

      const handle = await this.fileManager.folderHandle.getFileHandle('presentation_links.csv');
      const file = await handle.getFile();
      const text = await file.text();

      // Parse CSV using csvHandler
      const parsedLines = this.csvHandler.parseCSVLines(text);

      if (parsedLines.length <= 1) {
        this.presentationLinks = [];
        console.log('Presentation links file is empty');
        return;
      }

      // Skip header row and convert to presentation objects
      this.presentationLinks = parsedLines.slice(1).map(fields => {
        const [timestamp, url, title] = fields;
        return { timestamp, url, title };
      });

      console.log(`Loaded ${this.presentationLinks.length} presentation links:`, this.presentationLinks);
      if (this.presentationLinks.length > 0) {
        this.showNotification(`Loaded ${this.presentationLinks.length} saved presentations`, 'success');
      }
    } catch (error) {
      console.log('No presentation links file found or error:', error);
      this.presentationLinks = [];
      // Don't show error notification - file might not exist yet (first run)
    }
  }

  /**
   * Save presentation links to CSV
   */
  async savePresentationLinks() {
    try {
      if (!this.fileManager.folderHandle) {
        throw new Error('No folder selected. Please load your data folder first.');
      }

      // Create CSV content
      const header = 'timestamp,url,title\n';
      const rows = this.presentationLinks.map(pres =>
        `${pres.timestamp},"${pres.url}","${pres.title}"`
      ).join('\n');
      const csvContent = header + rows;

      // Save to file in data folder
      const handle = await this.fileManager.folderHandle.getFileHandle('presentation_links.csv', { create: true });
      const writable = await handle.createWritable();
      await writable.write(csvContent);
      await writable.close();

      console.log('✓ Saved presentation_links.csv to data folder');
    } catch (error) {
      console.error('Error saving presentation links:', error);
      throw error;
    }
  }

  /**
   * Save a presentation link (updates if URL already exists)
   */
  async savePresentationLink(url, title) {
    // Check if this URL already exists
    const existingIndex = this.presentationLinks.findIndex(p => p.url === url);

    if (existingIndex !== -1) {
      // Update existing entry
      this.presentationLinks[existingIndex].title = title;
      this.presentationLinks[existingIndex].timestamp = new Date().toISOString();
      console.log('Updated existing presentation:', title);
    } else {
      // Add new entry
      const presentation = {
        timestamp: new Date().toISOString(),
        url: url,
        title: title
      };
      this.presentationLinks.push(presentation);
      console.log('Added new presentation:', title);
    }

    await this.savePresentationLinks();
  }

  /**
   * Delete a presentation link
   */
  async deletePresentationLink(url) {
    const deletedPresentation = this.presentationLinks.find(p => p.url === url);
    this.presentationLinks = this.presentationLinks.filter(p => p.url !== url);
    await this.savePresentationLinks();

    if (deletedPresentation) {
      console.log(`✓ Deleted presentation: ${deletedPresentation.title}`);
      this.showNotification(`Deleted: ${deletedPresentation.title}`, 'success');
    }
  }

  /**
   * Get all presentation links
   */
  getPresentationLinks() {
    return this.presentationLinks;
  }

  /**
   * Save a boomwhacker song configuration
   */
  async saveBoomwhackerSong(songName, configJson) {
    console.log(`[saveBoomwhackerSong] Starting save for: ${songName}`);
    try {
      const csvPath = 'data/boomwhacker_songs.csv';
      let csvText;
      let lines;

      try {
        const response = await fetch(csvPath);
        csvText = await response.text();
        lines = csvText.trim().split('\n');
        console.log(`[saveBoomwhackerSong] Loaded existing CSV with ${lines.length} lines`);
      } catch (e) {
        // File doesn't exist yet, create header
        console.log('[saveBoomwhackerSong] CSV not found, creating new');
        lines = ['song_name,config_json'];
      }

      // Check if song already exists
      const existingIndex = lines.findIndex((line, i) => {
        if (i === 0) return false; // Skip header
        const parts = line.split(',');
        return parts[0] === songName;
      });

      const escapedJson = configJson.replace(/"/g, '""'); // Escape quotes for CSV
      const newLine = `${songName},"${escapedJson}"`;

      if (existingIndex > 0) {
        // Update existing
        console.log(`[saveBoomwhackerSong] Updating existing song at line ${existingIndex}`);
        lines[existingIndex] = newLine;
      } else {
        // Add new
        console.log('[saveBoomwhackerSong] Adding new song');
        lines.push(newLine);
      }

      const newCsv = lines.join('\n');

      // Save using fileManager if available
      if (window.fileManager && window.fileManager.saveFileToFolder) {
        console.log('[saveBoomwhackerSong] Saving with fileManager.saveFileToFolder');
        const blob = new Blob([newCsv], { type: 'text/csv' });
        await window.fileManager.saveFileToFolder('boomwhacker_songs.csv', blob);
        this.showNotification(`Song "${songName}" saved successfully!`, 'success');
        console.log('[saveBoomwhackerSong] Save successful');
      } else {
        // Fallback: download file
        console.log('[saveBoomwhackerSong] Falling back to download');
        const blob = new Blob([newCsv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'boomwhacker_songs.csv';
        a.click();
        URL.revokeObjectURL(url);
        this.showNotification(`Song "${songName}" saved! Replace the CSV file in data/ folder.`, 'warning');
      }
    } catch (error) {
      console.error('[saveBoomwhackerSong] Error:', error);
      this.showNotification(`Error saving song: ${error.message}`, 'error');
    }
  }

  /**
    * Load a boomwhacker song configuration
    */
  async loadBoomwhackerSong(songName) {
    try {
      const csvPath = 'data/boomwhacker_songs.csv';
      const response = await fetch(csvPath);
      const csvText = await response.text();
      const lines = csvText.trim().split('\n');

      for (let i = 1; i < lines.length; i++) {
        const match = lines[i].match(/^([^,]+),"(.+)"$/);
        if (match && match[1] === songName) {
          const configJson = match[2].replace(/""/g, '"'); // Unescape quotes

          // Send to module
          const iframe = document.getElementById('task-module-frame');
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'boomwhackerSongConfig',
              configJson: configJson
            }, '*');
          }
          return;
        }
      }

      console.warn(`Song not found: ${songName}`);
    } catch (error) {
      console.error('Error loading boomwhacker song:', error);
    }
  }

  /**
   * Get list of all saved boomwhacker songs
   */
  async getBoomwhackerSongs() {
    try {
      const csvPath = 'data/boomwhacker_songs.csv';
      const response = await fetch(csvPath);
      const csvText = await response.text();
      const lines = csvText.trim().split('\n');

      const songs = [];
      for (let i = 1; i < lines.length; i++) {
        const match = lines[i].match(/^([^,]+),/);
        if (match) {
          songs.push(match[1]);
        }
      }

      // Send to module
      const iframe = document.getElementById('task-module-frame');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'boomwhackerSongList',
          songs: songs
        }, '*');
      }
    } catch (error) {
      console.error('Error getting boomwhacker songs:', error);
    }
  }

  /**
   * Load a dance configuration by ID from dances.csv
   */
  async loadDance(danceId) {
    try {
      if (!this.fileManager.folderHandle) {
        throw new Error('No data folder loaded. Please load your data folder first.');
      }

      // Load from File System Access API (not fetch)
      const handle = await this.fileManager.folderHandle.getFileHandle('dances.csv');
      const file = await handle.getFile();
      const csvText = await file.text();
      const lines = csvText.trim().split('\n');

      // Find the dance by ID
      for (let i = 1; i < lines.length; i++) {
        const parsed = this.csvHandler.parseCSVLines(lines[i]);
        if (parsed[0] && parsed[0][0] === danceId) {
          // Return the JSON string (already unescaped by CSV parser)
          return parsed[0][1];
        }
      }

      throw new Error(`Dance "${danceId}" not found in dances.csv`);
    } catch (error) {
      console.error('[loadDance] Error:', error);
      throw error;
    }
  }

  /**
   * Save a dance configuration (optional, for future dance builder tool)
   */
  async saveDance(danceId, danceJson) {
    try {
      if (!this.fileManager.folderHandle) {
        throw new Error('No folder selected. Please load your data folder first.');
      }

      let csvText;
      let lines;

      try {
        // Load from File System Access API
        const handle = await this.fileManager.folderHandle.getFileHandle('dances.csv');
        const file = await handle.getFile();
        csvText = await file.text();
        lines = csvText.trim().split('\n');
      } catch (e) {
        // File doesn't exist yet, create header
        lines = ['dance_id,dance_json'];
      }

      // Check if dance already exists
      const existingIndex = lines.findIndex((line, i) => {
        if (i === 0) return false; // Skip header
        const parts = line.split(',');
        return parts[0] === danceId;
      });

      const escapedJson = danceJson.replace(/"/g, '""'); // Escape quotes for CSV
      const newLine = `${danceId},"${escapedJson}"`;

      if (existingIndex > 0) {
        lines[existingIndex] = newLine; // Update existing
      } else {
        lines.push(newLine); // Add new
      }

      const newCsv = lines.join('\n');

      // Save using File System Access API
      const handle = await this.fileManager.folderHandle.getFileHandle('dances.csv', { create: true });
      const writable = await handle.createWritable();
      await writable.write(newCsv);
      await writable.close();

      this.showNotification(`Dance "${danceId}" saved successfully!`, 'success');
      console.log('✓ Saved dances.csv to data folder');
    } catch (error) {
      console.error('[saveDance] Error:', error);
      this.showNotification(`Error saving dance: ${error.message}`, 'error');
    }
  }

  /**
   * Get list of all available dances
   */
  async getDances() {
    try {
      if (!this.fileManager.folderHandle) {
        const errorMsg = 'No folder selected yet - please load your data folder first';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      // Load from File System Access API (not fetch)
      const handle = await this.fileManager.folderHandle.getFileHandle('dances.csv');
      const file = await handle.getFile();
      const csvText = await file.text();
      const lines = csvText.trim().split('\n');

      const dances = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i] || lines[i].trim() === '') continue;

        try {
          const parsed = this.csvHandler.parseCSVLines(lines[i]);
          if (!parsed || !parsed[0] || !parsed[0][0] || !parsed[0][1]) {
            console.warn(`Skipping invalid dance row ${i}:`, lines[i]);
            continue;
          }

          const danceId = parsed[0][0];
          const danceJson = parsed[0][1];

          const danceData = JSON.parse(danceJson);
          dances.push({
            id: danceId,
            title: danceData.title || danceId
          });
        } catch (e) {
          console.warn(`Could not parse dance at line ${i}:`, e.message);
        }
      }

      console.log(`Loaded ${dances.length} dances:`, dances);

      if (dances.length === 0) {
        throw new Error('dances.csv file is empty or has no valid entries');
      }

      // Return dances directly - module will populate its own dropdown
      return dances;
    } catch (error) {
      console.error('Error getting dances:', error);
      throw error; // Re-throw instead of returning empty array
    }
  }

  /**
   * Initialize seat palette drag and drop handlers
   */
  initializeSeatPalette() {
    const seatColors = document.querySelectorAll('.seat-color');
    
    seatColors.forEach(colorEl => {
      // Drag start
      colorEl.addEventListener('dragstart', (e) => {
        const color = colorEl.dataset.color;
        const remainingSlots = this.getRemainingSlots(color);
        
        if (remainingSlots <= 0) {
          e.preventDefault();
          return;
        }
        
        e.dataTransfer.setData('text/plain', color);
        e.dataTransfer.effectAllowed = 'copy';
        colorEl.style.opacity = '0.5';
      });
      
      // Drag end
      colorEl.addEventListener('dragend', () => {
        colorEl.style.opacity = '1';
      });
    });
  }

  /**
   * Setup drag/drop handlers for student buttons
   */
  setupStudentDragDropHandlers(button, student) {
    // Drag over
    button.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      button.classList.add('drag-over');
    });
    
    // Drag leave
    button.addEventListener('dragleave', () => {
      button.classList.remove('drag-over');
    });
    
    // Drop
    button.addEventListener('drop', (e) => {
      e.preventDefault();
      button.classList.remove('drag-over');
      
      const color = e.dataTransfer.getData('text/plain');
      if (color && this.seatColors.includes(color)) {
        // Check if there are remaining slots for this color
        const remainingSlots = this.getRemainingSlots(color);
        if (remainingSlots > 0 || this.seatAssignments.get(student.student_id) === color) {
          this.assignSeatToStudent(student.student_id, color, button);
        } else {
          this.showNotification(`No more ${color} seats available!`, 'warning');
        }
      }
    });
  }

  /**
   * Show the seat palette in the header
   */
  showSeatPalette() {
    const palette = document.getElementById('seat-palette');
    if (palette) {
      palette.style.display = 'flex';
      this.updateSeatPaletteCounts();
      
      // Check if class has more than 30 students
      let classStudents;
      if (this.selectedClasses.size > 0) {
        classStudents = this.students.filter(s => this.selectedClasses.has(s.class));
      } else {
        classStudents = this.students.filter(s => s.class === this.selectedClass);
      }
      
      const assignBtn = document.getElementById('assign-seats-btn');
      if (assignBtn) {
        if (classStudents.length > 30) {
          assignBtn.disabled = true;
          assignBtn.title = 'Class has more than 30 students';
        } else {
          assignBtn.disabled = false;
          assignBtn.title = '';
        }
      }
    }
  }

  /**
   * Hide the seat palette
   */
  hideSeatPalette() {
    const palette = document.getElementById('seat-palette');
    if (palette) {
      palette.style.display = 'none';
    }
  }

  /**
   * Get remaining slots for a color
   */
  getRemainingSlots(color) {
    let usedSlots = 0;
    this.seatAssignments.forEach((assignedColor) => {
      if (assignedColor === color) usedSlots++;
    });
    return this.slotsPerColor - usedSlots;
  }

  /**
   * Update the counts displayed on seat palette colors
   */
  updateSeatPaletteCounts() {
    this.seatColors.forEach(color => {
      const colorEl = document.querySelector(`.seat-color[data-color="${color}"]`);
      if (colorEl) {
        const remaining = this.getRemainingSlots(color);
        const countEl = colorEl.querySelector('.seat-count');
        if (countEl) {
          countEl.textContent = remaining;
        }
        
        // Mark as empty if no slots remaining
        if (remaining <= 0) {
          colorEl.classList.add('empty');
        } else {
          colorEl.classList.remove('empty');
        }
      }
    });
  }

  /**
   * Assign a seat color to a student
   */
  assignSeatToStudent(studentId, color, buttonElement, animate = false) {
    // If student already has a different color, free up that slot
    const previousColor = this.seatAssignments.get(studentId);
    
    // Assign the new color
    this.seatAssignments.set(studentId, color);
    
    // Update the button display
    this.updateStudentButtonSeatDot(buttonElement, color, animate);
    
    // Update palette counts
    this.updateSeatPaletteCounts();
  }

  /**
   * Update a student button to show their seat dot
   */
  updateStudentButtonSeatDot(button, color, animate = false) {
    // Remove existing dot if any
    const existingDot = button.querySelector('.student-seat-dot');
    if (existingDot) {
      existingDot.remove();
    }
    
    if (color) {
      // Create new dot
      const dot = document.createElement('span');
      dot.className = 'student-seat-dot';
      dot.dataset.color = color;
      
      // Insert at the beginning of the button
      button.insertBefore(dot, button.firstChild);
      
      // Animation effect
      if (animate) {
        dot.style.transform = 'scale(0)';
        dot.style.transition = 'transform 0.3s ease-out';
        requestAnimationFrame(() => {
          dot.style.transform = 'scale(1)';
        });
      }
    }
  }

  /**
   * Get seating requirement for a student from their notes
   */
  getSeatRequirement(studentId) {
    // Look for student_notes responses for this student
    const notesResults = this.results.filter(r => 
      r.student_id === studentId && r.task_id === 'student_notes'
    );
    
    if (notesResults.length === 0) return null;
    
    // Get the most recent notes
    const latestNotes = notesResults[notesResults.length - 1];
    const response = latestNotes.response || '';
    
    // Look for MUST_BE_COLOR pattern
    for (const color of this.seatColors) {
      const pattern = `MUST_BE_${color.toUpperCase()}`;
      if (response.toUpperCase().includes(pattern)) {
        return color;
      }
    }
    
    return null;
  }

  /**
   * Auto-assign seats to students
   */
  async assignSeats() {
    // Get students in current class
    let classStudents;
    if (this.selectedClasses.size > 0) {
      classStudents = this.students.filter(s => this.selectedClasses.has(s.class));
    } else {
      classStudents = this.students.filter(s => s.class === this.selectedClass);
    }
    
    // Filter out absent students
    const availableStudents = classStudents.filter(s => !this.isStudentAbsent(s.student_id));
    
    // Check if too many students
    if (availableStudents.length > 30) {
      this.showNotification('Too many students (>30) for seating assignment', 'warning');
      return;
    }
    
    // First pass: Assign students with seating requirements
    const studentsWithRequirements = [];
    const studentsWithoutRequirements = [];
    
    availableStudents.forEach(student => {
      const requirement = this.getSeatRequirement(student.student_id);
      if (requirement) {
        studentsWithRequirements.push({ student, requiredColor: requirement });
      } else {
        studentsWithoutRequirements.push(student);
      }
    });
    
    // Track available slots per color
    const availableSlots = {};
    this.seatColors.forEach(color => {
      availableSlots[color] = this.slotsPerColor;
    });
    
    // Subtract already assigned seats (keeping existing assignments)
    this.seatAssignments.forEach((color, studentId) => {
      // Only count if student is in current class and not absent
      const isCurrentClassStudent = availableStudents.some(s => s.student_id === studentId);
      if (isCurrentClassStudent) {
        availableSlots[color]--;
      }
    });
    
    // Assign required students first (only if not already assigned)
    const assignmentQueue = [];
    
    for (const { student, requiredColor } of studentsWithRequirements) {
      // Skip if already assigned to correct color
      if (this.seatAssignments.get(student.student_id) === requiredColor) {
        continue;
      }
      
      if (availableSlots[requiredColor] > 0) {
        assignmentQueue.push({ student, color: requiredColor });
        availableSlots[requiredColor]--;
      } else {
        this.showNotification(`Cannot assign ${student.name} to ${requiredColor} - no slots available`, 'warning');
      }
    }
    
    // Sort remaining students by last name (or first name if no last name)
    studentsWithoutRequirements.sort((a, b) => {
      const aNameParts = a.name.split(' ');
      const bNameParts = b.name.split(' ');
      const aLastName = aNameParts.length > 1 ? aNameParts[aNameParts.length - 1] : aNameParts[0];
      const bLastName = bNameParts.length > 1 ? bNameParts[bNameParts.length - 1] : bNameParts[0];
      return aLastName.localeCompare(bLastName);
    });
    
    // Assign remaining students
    let colorIndex = 0;
    for (const student of studentsWithoutRequirements) {
      // Skip if already assigned
      if (this.seatAssignments.has(student.student_id)) {
        continue;
      }
      
      // Find next color with available slots
      let assigned = false;
      for (let i = 0; i < this.seatColors.length; i++) {
        const color = this.seatColors[(colorIndex + i) % this.seatColors.length];
        if (availableSlots[color] > 0) {
          assignmentQueue.push({ student, color });
          availableSlots[color]--;
          colorIndex = (colorIndex + i + 1) % this.seatColors.length;
          assigned = true;
          break;
        }
      }
      
      if (!assigned) {
        this.showNotification(`Not enough seats for all students`, 'warning');
        break;
      }
    }
    
    // Animate the assignments sequentially
    await this.animateSeatAssignments(assignmentQueue);
    
    this.showNotification(`Assigned ${assignmentQueue.length} seats`, 'success');
  }

  /**
   * Animate seat assignments with flying dots
   */
  async animateSeatAssignments(assignmentQueue) {
    for (const { student, color } of assignmentQueue) {
      const button = document.querySelector(`.student-roster-button[data-student-id="${student.student_id}"]`);
      const paletteColor = document.querySelector(`.seat-color[data-color="${color}"]`);
      
      if (button && paletteColor) {
        await this.animateFlyingDot(paletteColor, button, color);
        this.assignSeatToStudent(student.student_id, color, button, false);
      }
      
      // Small delay between animations
      await new Promise(resolve => setTimeout(resolve, 80));
    }
  }

  /**
   * Animate a dot flying from palette to student button
   */
  animateFlyingDot(fromElement, toElement, color) {
    return new Promise(resolve => {
      const fromRect = fromElement.getBoundingClientRect();
      const toRect = toElement.getBoundingClientRect();
      
      // Create flying dot
      const flyingDot = document.createElement('div');
      flyingDot.className = 'flying-seat-dot';
      flyingDot.dataset.color = color;
      flyingDot.style.left = `${fromRect.left + fromRect.width / 2 - 6}px`;
      flyingDot.style.top = `${fromRect.top + fromRect.height / 2 - 6}px`;
      
      document.body.appendChild(flyingDot);
      
      // Force reflow to ensure initial position is applied
      flyingDot.offsetHeight;
      
      // Animate to destination
      const destX = toRect.left + 12 - 6;
      const destY = toRect.top + toRect.height / 2 - 6;
      
      flyingDot.style.transition = 'left 0.3s ease-out, top 0.3s ease-out';
      flyingDot.style.left = `${destX}px`;
      flyingDot.style.top = `${destY}px`;
      
      // Remove flying dot after animation
      setTimeout(() => {
        flyingDot.remove();
        resolve();
      }, 320);
    });
  }

  /**
   * Clear all seat assignments
   */
  clearSeatAssignments() {
    this.seatAssignments.clear();
    
    // Remove all dots from student buttons
    const dots = document.querySelectorAll('.student-seat-dot');
    dots.forEach(dot => dot.remove());
    
    // Update palette counts
    this.updateSeatPaletteCounts();
    
    this.showNotification('Seat assignments cleared', 'success');
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

// Global functions for presentation viewer module
window.getPresentationLinks = function () {
  return window.app ? window.app.getPresentationLinks() : [];
};

window.savePresentationLink = async function (url, title) {
  if (window.app) {
    await window.app.savePresentationLink(url, title);
  }
};

window.deletePresentationLink = async function (url) {
  if (window.app) {
    await window.app.deletePresentationLink(url);
  }
};
