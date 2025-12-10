// Results Viewer Application
// Displays and filters student results

class ResultsViewerApp {
    constructor() {
        this.csvHandler = new CSVHandler();
        this.fileManager = new FileManager();
        this.resultsParser = new ResultsParser();

        this.students = [];
        this.tasks = [];
        this.results = [];

        this.selectedClass = null;
        this.selectedStudent = null;
        this.selectedModule = null;

        this.initializeApp();
    }

    initializeApp() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupUI());
        } else {
            this.setupUI();
        }
    }

    setupUI() {
        // Try to load data from localStorage first
        this.tryLoadFromLocalStorage();

        // Load CSV button
        const loadButton = document.getElementById('load-csv-btn');
        if (loadButton) {
            loadButton.addEventListener('click', () => this.loadCSVFiles());
        }

        // Class selector
        const classSelect = document.getElementById('class-select');
        if (classSelect) {
            classSelect.addEventListener('change', (e) => {
                this.selectedClass = e.target.value;
                this.populateStudentSelect();
                this.displayResults();
            });
        }

        // Student selector
        const studentSelect = document.getElementById('student-select');
        if (studentSelect) {
            studentSelect.addEventListener('change', (e) => {
                this.selectedStudent = e.target.value;
                this.displayResults();
            });
        }

        // Module filter
        const moduleSelect = document.getElementById('module-select');
        if (moduleSelect) {
            moduleSelect.addEventListener('change', (e) => {
                this.selectedModule = e.target.value;
                this.displayResults();
            });
        }

        // Filter checkboxes
        document.getElementById('show-all-attempts')?.addEventListener('change', () => {
            this.displayResults();
        });

        document.getElementById('show-correct-only')?.addEventListener('change', () => {
            this.displayResults();
        });
    }

    tryLoadFromLocalStorage() {
        try {
            const studentsData = localStorage.getItem('teachingAssistant_students');
            const tasksData = localStorage.getItem('teachingAssistant_tasks');
            const resultsData = localStorage.getItem('teachingAssistant_results');

            if (studentsData && tasksData && resultsData) {
                // Data available in localStorage - load it
                this.students = JSON.parse(studentsData);
                this.tasks = JSON.parse(tasksData);
                this.results = JSON.parse(resultsData);

                console.log(`Loaded from localStorage: ${this.students.length} students, ${this.tasks.length} tasks, ${this.results.length} results`);

                // Hide upload prompt
                document.getElementById('upload-prompt').style.display = 'none';

                // Show controls
                document.getElementById('selection-controls').style.display = 'block';
                document.getElementById('no-results').style.display = 'block';

                // Populate selectors
                this.populateClassSelect();
                this.populateModuleSelect();

                // Update filename display
                document.getElementById('file-name').textContent = 'Data loaded from session';
            } else {
                // No data in localStorage - show upload prompt
                console.log('No data in localStorage - showing upload prompt');
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            // Show upload prompt on error
        }
    }

    async loadCSVFiles() {
        try {
            document.getElementById('loading-state').style.display = 'block';
            document.getElementById('upload-prompt').style.display = 'none';

            // Load CSV files
            const { studentsContent, tasksContent, resultsContent } = await this.fileManager.loadFiles();

            // Parse CSVs
            this.students = this.parseStudentsCSV(studentsContent);
            this.tasks = this.parseTasksCSV(tasksContent);
            this.results = this.parseResultsCSV(resultsContent);

            console.log(`Loaded ${this.students.length} students, ${this.tasks.length} tasks, ${this.results.length} results`);

            // Update filename display
            const fileNames = this.fileManager.getFileNames();
            document.getElementById('file-name').textContent =
                `${fileNames.students}, ${fileNames.tasks}, ${fileNames.results}`;

            // Populate selectors
            this.populateClassSelect();
            this.populateModuleSelect();

            // Show controls
            document.getElementById('selection-controls').style.display = 'block';
            document.getElementById('no-results').style.display = 'block';

        } catch (error) {
            console.error('Error loading files:', error);
            alert(`Error loading files: ${error.message}`);
            document.getElementById('upload-prompt').style.display = 'block';
        } finally {
            document.getElementById('loading-state').style.display = 'none';
        }
    }

    parseStudentsCSV(csvText) {
        const lines = this.csvHandler.parseCSVLines(csvText);
        if (lines.length === 0) return [];

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

    parseTasksCSV(csvText) {
        const lines = this.csvHandler.parseCSVLines(csvText);
        if (lines.length === 0) return [];

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

    parseResultsCSV(csvText) {
        const lines = this.csvHandler.parseCSVLines(csvText);
        if (lines.length === 0) return [];

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

    populateClassSelect() {
        const classSelect = document.getElementById('class-select');
        classSelect.innerHTML = '<option value="">Select a class...</option>';

        // Get unique classes
        const classes = [...new Set(this.students.map(s => s.class))].filter(Boolean).sort();

        classes.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            classSelect.appendChild(option);
        });
    }

    populateStudentSelect() {
        const studentSelect = document.getElementById('student-select');
        studentSelect.innerHTML = '<option value="">All Students</option>';

        if (!this.selectedClass) return;

        // Filter students by class
        const classStudents = this.students
            .filter(s => s.class === this.selectedClass)
            .sort((a, b) => a.name.localeCompare(b.name));

        classStudents.forEach(student => {
            const option = document.createElement('option');
            option.value = student.student_id;
            option.textContent = student.name;
            studentSelect.appendChild(option);
        });
    }

    populateModuleSelect() {
        const moduleSelect = document.getElementById('module-select');
        moduleSelect.innerHTML = '<option value="">All Modules</option>';

        // Get unique modules from tasks
        const modules = [...new Set(this.tasks.map(t => t.module_path))].filter(Boolean);

        modules.forEach(modulePath => {
            const option = document.createElement('option');
            option.value = modulePath;
            option.textContent = this.resultsParser.getModuleDisplayName(modulePath);
            moduleSelect.appendChild(option);
        });
    }

    displayResults() {
        const tbody = document.getElementById('results-tbody');
        const resultsDisplay = document.getElementById('results-display');
        const noResults = document.getElementById('no-results');

        // Clear existing results
        tbody.innerHTML = '';

        // Filter results
        let filteredResults = this.results;

        // Filter by class (via student)
        if (this.selectedClass) {
            const classStudentIds = this.students
                .filter(s => s.class === this.selectedClass)
                .map(s => s.student_id);
            filteredResults = filteredResults.filter(r => classStudentIds.includes(r.student_id));
        }

        // Filter by student
        if (this.selectedStudent) {
            filteredResults = filteredResults.filter(r => r.student_id === this.selectedStudent);
        }

        // Filter by module
        if (this.selectedModule) {
            const moduleTasks = this.tasks
                .filter(t => t.module_path === this.selectedModule)
                .map(t => t.task_id);
            filteredResults = filteredResults.filter(r => moduleTasks.includes(r.task_id));
        }

        // Apply checkbox filters
        const showAllAttempts = document.getElementById('show-all-attempts')?.checked;
        const showCorrectOnly = document.getElementById('show-correct-only')?.checked;

        // Parse and display results
        const parsedResults = filteredResults
            .map(result => {
                const task = this.tasks.find(t => t.task_id === result.task_id);
                if (!task) return null;

                const parsed = this.resultsParser.parseResult(result, task);
                if (!parsed) return null;

                return {
                    ...parsed,
                    modulePath: task.module_path,
                    studentId: result.student_id
                };
            })
            .filter(Boolean);

        // Filter by correctness if needed
        let displayResults = parsedResults;
        if (showCorrectOnly) {
            displayResults = displayResults.filter(r => r.correct === r.total);
        }

        // Sort by timestamp (most recent first)
        displayResults.sort((a, b) => {
            if (!a.timestamp) return 1;
            if (!b.timestamp) return -1;
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        // Display results
        if (displayResults.length === 0) {
            resultsDisplay.style.display = 'none';
            noResults.style.display = 'block';
            return;
        }

        resultsDisplay.style.display = 'block';
        noResults.style.display = 'none';

        displayResults.forEach(result => {
            const row = document.createElement('tr');

            // Timestamp
            const timestampCell = document.createElement('td');
            timestampCell.className = 'timestamp';
            timestampCell.textContent = this.formatTimestamp(result.timestamp);
            row.appendChild(timestampCell);

            // Student Name
            const studentCell = document.createElement('td');
            const student = this.students.find(s => s.student_id === result.studentId);
            studentCell.textContent = student ? student.name : result.studentId;
            row.appendChild(studentCell);

            // Module
            const moduleCell = document.createElement('td');
            moduleCell.textContent = this.resultsParser.getModuleDisplayName(result.modulePath);
            row.appendChild(moduleCell);

            // Question
            const questionCell = document.createElement('td');
            questionCell.innerHTML = `<span class="pattern-display">${result.question}</span>`;
            row.appendChild(questionCell);

            // Answer
            const answerCell = document.createElement('td');
            answerCell.innerHTML = `<span class="answer-display">${result.answer}</span>`;
            row.appendChild(answerCell);

            // Score
            const scoreCell = document.createElement('td');
            scoreCell.className = 'score-cell';
            scoreCell.textContent = result.score;
            row.appendChild(scoreCell);

            tbody.appendChild(row);
        });
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return '—';

        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return timestamp;

            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            return timestamp;
        }
    }
}

// Initialize app
const app = new ResultsViewerApp();
