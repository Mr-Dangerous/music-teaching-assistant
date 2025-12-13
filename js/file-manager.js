// File Manager Module
// Handles file loading and saving using File System Access API with fallback
// Supports two files: students.csv (roster) and results.csv (task responses)

class FileManager {
  constructor() {
    // File handles for three files
    this.studentsFileHandle = null;
    this.tasksFileHandle = null;
    this.resultsFileHandle = null;

    // Folder handle for directory-based loading
    this.folderHandle = null;

    // File names
    this.studentsFileName = '';
    this.tasksFileName = '';
    this.resultsFileName = '';

    this.hasUnsavedChanges = false;
    this.supportsFileSystemAccess = 'showOpenFilePicker' in window;
    this.supportsFolderPicker = 'showDirectoryPicker' in window;

    // Try to load remembered file handles from localStorage
    this.loadRememberedHandles();
  }

  /**
   * Check if browser supports File System Access API
   * @returns {boolean}
   */
  isSupported() {
    return this.supportsFileSystemAccess;
  }

  /**
   * Load all three CSV files: students.csv, tasks.csv, and results.csv
   * Try folder loading first, then fall back to individual file selection
   * @returns {Promise<Object>} - Object with studentsContent, tasksContent, and resultsContent
   */
  async loadFiles() {
    // Try folder-based loading first
    if (this.supportsFolderPicker) {
      try {
        const folderData = await this.loadFilesFromFolder();
        if (folderData) {
          return folderData;
        }
      } catch (error) {
        console.log('Folder loading failed or cancelled, falling back to file selection:', error.message);
      }
    }

    // Fall back to original approach: try remembered handles, then batch selection, then individual
    let studentsContent = null;
    let tasksContent = null;
    let resultsContent = null;

    if (this.supportsFileSystemAccess) {
      // Try to load students.csv from remembered handle
      if (this.studentsFileHandle) {
        try {
          studentsContent = await this.readFileFromHandle(this.studentsFileHandle);
          this.studentsFileName = this.studentsFileHandle.name;
        } catch (error) {
          console.log('Could not load students.csv from remembered location:', error.message);
          this.studentsFileHandle = null;
        }
      }

      // Try to load tasks.csv from remembered handle
      if (this.tasksFileHandle) {
        try {
          tasksContent = await this.readFileFromHandle(this.tasksFileHandle);
          this.tasksFileName = this.tasksFileHandle.name;
        } catch (error) {
          console.log('Could not load tasks.csv from remembered location:', error.message);
          this.tasksFileHandle = null;
        }
      }

      // Try to load results.csv from remembered handle
      if (this.resultsFileHandle) {
        try {
          resultsContent = await this.readFileFromHandle(this.resultsFileHandle);
          this.resultsFileName = this.resultsFileHandle.name;
        } catch (error) {
          console.log('Could not load results.csv from remembered location:', error.message);
          this.resultsFileHandle = null;
        }
      }
    }

    // If any file wasn't loaded, try to load all at once
    if (!studentsContent || !tasksContent || !resultsContent) {
      try {
        const allFiles = await this.loadAllFilesAtOnce();
        if (allFiles) {
          studentsContent = allFiles.studentsContent || studentsContent;
          tasksContent = allFiles.tasksContent || tasksContent;
          resultsContent = allFiles.resultsContent || resultsContent;
        }
      } catch (error) {
        console.log('Batch file loading failed, falling back to individual selection:', error.message);
      }
    }

    // If any file still wasn't loaded, prompt user to select them individually
    if (!studentsContent) {
      studentsContent = await this.openFile('students', 'Step 1 of 3: Select STUDENTS.CSV (student roster with names, grades, classes)');
    }

    if (!tasksContent) {
      tasksContent = await this.openFile('tasks', 'Step 2 of 3: Select TASKS.CSV (task definitions with grade levels)');
    }

    if (!resultsContent) {
      resultsContent = await this.openFile('results', 'Step 3 of 3: Select RESULTS.CSV (student responses to tasks)');
    }

    // Remember the file handles
    this.rememberHandles();

    return {
      studentsContent,
      tasksContent,
      resultsContent
    };
  }

  /**
   * Load all three CSV files from a selected folder
   * @returns {Promise<Object|null>} - Object with studentsContent, tasksContent, and resultsContent, or null if failed
   */
  async loadFilesFromFolder() {
    try {
      // Prompt user to select folder
      const folderHandle = await window.showDirectoryPicker({
        mode: 'readwrite', // Request write permission for future video saves
        startIn: 'documents'
      });

      this.folderHandle = folderHandle;

      // Look for the three CSV files in the folder
      const requiredFiles = {
        students: null,
        tasks: null,
        results: null
      };

      // Iterate through folder contents
      for await (const entry of folderHandle.values()) {
        if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.csv')) {
          const fileName = entry.name.toLowerCase();

          if (fileName.includes('student')) {
            requiredFiles.students = entry;
          } else if (fileName.includes('task')) {
            requiredFiles.tasks = entry;
          } else if (fileName.includes('result')) {
            requiredFiles.results = entry;
          }
        }
      }

      // Check if all required files were found
      if (!requiredFiles.students || !requiredFiles.tasks || !requiredFiles.results) {
        const missing = [];
        if (!requiredFiles.students) missing.push('students.csv');
        if (!requiredFiles.tasks) missing.push('tasks.csv');
        if (!requiredFiles.results) missing.push('results.csv');

        throw new Error(`Missing files in folder: ${missing.join(', ')}`);
      }

      // Read all three files
      const studentsFile = await requiredFiles.students.getFile();
      const tasksFile = await requiredFiles.tasks.getFile();
      const resultsFile = await requiredFiles.results.getFile();

      const studentsContent = await studentsFile.text();
      const tasksContent = await tasksFile.text();
      const resultsContent = await resultsFile.text();

      // Store file handles for future saves
      this.studentsFileHandle = requiredFiles.students;
      this.tasksFileHandle = requiredFiles.tasks;
      this.resultsFileHandle = requiredFiles.results;

      this.studentsFileName = requiredFiles.students.name;
      this.tasksFileName = requiredFiles.tasks.name;
      this.resultsFileName = requiredFiles.results.name;

      console.log(`✓ Loaded files from folder: ${folderHandle.name}`);

      // Remember handles
      this.rememberHandles();

      return {
        studentsContent,
        tasksContent,
        resultsContent
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Folder selection cancelled');
      }
      throw error;
    }
  }

  /**
   * Load all three CSV files at once with auto-detection
   * @returns {Promise<Object|null>} - Object with studentsContent, tasksContent, and resultsContent, or null if failed
   */
  async loadAllFilesAtOnce() {
    if (this.supportsFileSystemAccess) {
      return await this.loadAllFilesWithAPI();
    } else {
      return await this.loadAllFilesWithFallback();
    }
  }

  /**
   * Load all files at once using File System Access API
   */
  async loadAllFilesWithAPI() {
    try {
      const fileHandles = await window.showOpenFilePicker({
        types: [{
          description: 'Select all 3 CSV files (students.csv, tasks.csv, results.csv)',
          accept: {
            'text/csv': ['.csv']
          }
        }],
        multiple: true
      });

      if (fileHandles.length !== 3) {
        throw new Error('Please select exactly 3 CSV files');
      }

      const results = {
        studentsContent: null,
        tasksContent: null,
        resultsContent: null
      };

      // Read all files and auto-detect based on filename
      for (const fileHandle of fileHandles) {
        const file = await fileHandle.getFile();
        const content = await file.text();
        const fileName = fileHandle.name.toLowerCase();

        if (fileName.includes('student')) {
          results.studentsContent = content;
          this.studentsFileHandle = fileHandle;
          this.studentsFileName = fileHandle.name;
        } else if (fileName.includes('task')) {
          results.tasksContent = content;
          this.tasksFileHandle = fileHandle;
          this.tasksFileName = fileHandle.name;
        } else if (fileName.includes('result')) {
          results.resultsContent = content;
          this.resultsFileHandle = fileHandle;
          this.resultsFileName = fileHandle.name;
        }
      }

      // Verify all files were detected
      if (!results.studentsContent || !results.tasksContent || !results.resultsContent) {
        throw new Error('Could not auto-detect all file types. Make sure filenames contain "student", "task", or "result"');
      }

      return results;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('File selection cancelled');
      }
      throw error;
    }
  }

  /**
   * Load all files at once using traditional file input (fallback)
   */
  async loadAllFilesWithFallback() {
    return new Promise((resolve, reject) => {
      alert('Select all 3 CSV files at once (students.csv, tasks.csv, results.csv)');

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      input.multiple = true;

      input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length !== 3) {
          reject(new Error('Please select exactly 3 CSV files'));
          return;
        }

        const results = {
          studentsContent: null,
          tasksContent: null,
          resultsContent: null
        };

        try {
          // Read all files and auto-detect based on filename
          for (const file of files) {
            const content = await file.text();
            const fileName = file.name.toLowerCase();

            if (fileName.includes('student')) {
              results.studentsContent = content;
              this.studentsFileName = file.name;
            } else if (fileName.includes('task')) {
              results.tasksContent = content;
              this.tasksFileName = file.name;
            } else if (fileName.includes('result')) {
              results.resultsContent = content;
              this.resultsFileName = file.name;
            }
          }

          // Verify all files were detected
          if (!results.studentsContent || !results.tasksContent || !results.resultsContent) {
            reject(new Error('Could not auto-detect all file types. Make sure filenames contain "student", "task", or "result"'));
            return;
          }

          resolve(results);
        } catch (error) {
          reject(new Error(`Failed to read files: ${error.message}`));
        }
      };

      input.oncancel = () => {
        reject(new Error('File selection cancelled'));
      };

      input.click();
    });
  }

  /**
   * Read file content from a file handle
   */
  async readFileFromHandle(fileHandle) {
    const permission = await fileHandle.queryPermission({ mode: 'read' });

    if (permission !== 'granted') {
      const newPermission = await fileHandle.requestPermission({ mode: 'read' });
      if (newPermission !== 'granted') {
        throw new Error('Permission denied');
      }
    }

    const file = await fileHandle.getFile();
    return await file.text();
  }

  /**
   * Open file picker for a specific file
   * @param {string} fileType - 'students' or 'results'
   * @param {string} description - Description for file picker
   * @returns {Promise<string>} - CSV file content
   */
  async openFile(fileType, description) {
    if (this.supportsFileSystemAccess) {
      return await this.openFileWithAPI(fileType, description);
    } else {
      return await this.openFileWithFallback(fileType, description);
    }
  }

  /**
   * Open file using File System Access API
   */
  async openFileWithAPI(fileType, description) {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: description,
          accept: {
            'text/csv': ['.csv']
          }
        }],
        multiple: false
      });

      if (fileType === 'students') {
        this.studentsFileHandle = fileHandle;
        this.studentsFileName = fileHandle.name;
      } else if (fileType === 'tasks') {
        this.tasksFileHandle = fileHandle;
        this.tasksFileName = fileHandle.name;
      } else {
        this.resultsFileHandle = fileHandle;
        this.resultsFileName = fileHandle.name;
      }

      const file = await fileHandle.getFile();
      const content = await file.text();

      return content;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('File selection cancelled');
      }
      throw new Error(`Failed to open file: ${error.message}`);
    }
  }

  /**
   * Open file using traditional file input (fallback)
   */
  async openFileWithFallback(fileType, description) {
    return new Promise((resolve, reject) => {
      // Show alert with description for better guidance
      alert(description);

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }

        if (fileType === 'students') {
          this.studentsFileName = file.name;
        } else if (fileType === 'tasks') {
          this.tasksFileName = file.name;
        } else {
          this.resultsFileName = file.name;
        }

        try {
          const content = await file.text();
          resolve(content);
        } catch (error) {
          reject(new Error(`Failed to read file: ${error.message}`));
        }
      };

      input.oncancel = () => {
        reject(new Error('File selection cancelled'));
      };

      input.click();
    });
  }

  /**
   * Save results.csv file
   * @param {string} csvContent - CSV text to save
   * @returns {Promise<void>}
   */
  async saveResults(csvContent) {
    if (this.supportsFileSystemAccess && this.resultsFileHandle) {
      return await this.saveFileWithAPI(this.resultsFileHandle, csvContent);
    } else {
      return await this.saveFileWithFallback(this.resultsFileName || 'results.csv', csvContent);
    }
  }

  /**
   * Save file using File System Access API
   */
  async saveFileWithAPI(fileHandle, csvContent) {
    try {
      const permission = await fileHandle.queryPermission({ mode: 'readwrite' });

      if (permission !== 'granted') {
        const newPermission = await fileHandle.requestPermission({ mode: 'readwrite' });
        if (newPermission !== 'granted') {
          throw new Error('Permission to write file denied');
        }
      }

      const writable = await fileHandle.createWritable();
      await writable.write(csvContent);
      await writable.close();

      this.hasUnsavedChanges = false;
      console.log('File saved successfully');
    } catch (error) {
      throw new Error(`Failed to save file: ${error.message}`);
    }
  }

  /**
   * Save file using download link (fallback)
   */
  async saveFileWithFallback(fileName, csvContent) {
    return new Promise((resolve) => {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      this.hasUnsavedChanges = false;
      console.log('File download triggered');
      resolve();
    });
  }

  /**
   * Remember file handles in localStorage (if supported)
   */
  async rememberHandles() {
    if (!this.supportsFileSystemAccess) return;

    try {
      // Store file handle info in indexedDB (File System Access API handles can't be serialized directly)
      // For now, we just keep them in memory during session
      // Note: In future, could use IndexedDB to store file handles across sessions
      localStorage.setItem('hasRememberedFiles', 'true');
    } catch (error) {
      console.log('Could not remember file handles:', error);
    }
  }

  /**
   * Try to load remembered file handles
   */
  async loadRememberedHandles() {
    // File handles can't be persisted across sessions easily
    // This is a limitation of the File System Access API
    // We just check if files were loaded before
    const hasRemembered = localStorage.getItem('hasRememberedFiles');
    if (hasRemembered) {
      console.log('Previous file session detected');
    }
  }

  /**
   * Mark that there are unsaved changes
   */
  markUnsaved() {
    this.hasUnsavedChanges = true;
  }

  /**
   * Check if there are unsaved changes
   */
  hasUnsaved() {
    return this.hasUnsavedChanges;
  }

  /**
   * Get current file names
   */
  getFileNames() {
    return {
      students: this.studentsFileName,
      tasks: this.tasksFileName,
      results: this.resultsFileName
    };
  }

  /**
   * Get the folder handle for saving additional files (e.g., video recordings)
   * @returns {FileSystemDirectoryHandle|null}
   */
  getFolderHandle() {
    return this.folderHandle;
  }

  /**
   * Save a video or other file to the selected folder
   * @param {string} fileName - Name of the file to save
   * @param {Blob} blob - File data as a Blob
   * @returns {Promise<void>}
   */
  async saveFileToFolder(fileName, blob) {
    if (!this.folderHandle) {
      throw new Error('No folder selected. Please load files from a folder first.');
    }

    try {
      // Request write permission if needed
      const permission = await this.folderHandle.queryPermission({ mode: 'readwrite' });

      if (permission !== 'granted') {
        const newPermission = await this.folderHandle.requestPermission({ mode: 'readwrite' });
        if (newPermission !== 'granted') {
          throw new Error('Permission to write to folder denied');
        }
      }

      // Create file in folder
      const fileHandle = await this.folderHandle.getFileHandle(fileName, { create: true });

      // Write data
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      console.log(`✓ Saved ${fileName} to folder`);
    } catch (error) {
      throw new Error(`Failed to save ${fileName}: ${error.message}`);
    }
  }

  /**
   * Create a subfolder in the data folder
   * @param {string} folderName - Name of subfolder to create
   * @returns {Promise<FileSystemDirectoryHandle>}
   */
  async createSubfolder(folderName) {
    if (!this.folderHandle) {
      throw new Error('No folder selected. Please load files from a folder first.');
    }

    try {
      const permission = await this.folderHandle.queryPermission({ mode: 'readwrite' });

      if (permission !== 'granted') {
        const newPermission = await this.folderHandle.requestPermission({ mode: 'readwrite' });
        if (newPermission !== 'granted') {
          throw new Error('Permission to write to folder denied');
        }
      }

      // Create or get existing subfolder
      const subfolderHandle = await this.folderHandle.getDirectoryHandle(folderName, { create: true });
      console.log(`✓ Subfolder ready: ${folderName}`);

      return subfolderHandle;
    } catch (error) {
      throw new Error(`Failed to create subfolder ${folderName}: ${error.message}`);
    }
  }

  /**
   * Get handle to an existing subfolder
   * @param {string} folderName - Name of subfolder
   * @returns {Promise<FileSystemDirectoryHandle>}
   */
  async getSubfolderHandle(folderName) {
    if (!this.folderHandle) {
      throw new Error('No folder selected. Please load files from a folder first.');
    }

    try {
      const subfolderHandle = await this.folderHandle.getDirectoryHandle(folderName, { create: false });
      return subfolderHandle;
    } catch (error) {
      throw new Error(`Subfolder ${folderName} not found: ${error.message}`);
    }
  }

  /**
   * Save a file to a subfolder
   * @param {string} subfolderName - Subfolder name
   * @param {string} fileName - File name
   * @param {Blob} blob - File data
   * @returns {Promise<void>}
   */
  async saveFileToSubfolder(subfolderName, fileName, blob) {
    // Ensure subfolder exists
    const subfolderHandle = await this.createSubfolder(subfolderName);

    try {
      // Create file in subfolder
      const fileHandle = await subfolderHandle.getFileHandle(fileName, { create: true });

      // Write data
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      console.log(`✓ Saved ${fileName} to ${subfolderName}/`);
    } catch (error) {
      throw new Error(`Failed to save ${fileName} to subfolder: ${error.message}`);
    }
  }

  /**
   * Setup auto-save on window close
   * @param {Function} getSaveData - Function that returns results CSV data
   */
  setupAutoSave(getSaveData) {
    window.addEventListener('beforeunload', async (e) => {
      if (this.hasUnsavedChanges) {
        try {
          const csvContent = getSaveData();
          if (csvContent) {
            if (this.supportsFileSystemAccess && this.resultsFileHandle) {
              e.preventDefault();
              e.returnValue = '';
              return 'You have unsaved changes. Leave anyway?';
            } else {
              e.preventDefault();
              e.returnValue = '';
              return 'You have unsaved changes. Click Save to download your changes before closing.';
            }
          }
        } catch (error) {
          console.error('Auto-save failed:', error);
          e.preventDefault();
          e.returnValue = '';
          return 'Failed to save changes. Leave anyway?';
        }
      }
    });

    // Auto-save on visibility change
    if (this.supportsFileSystemAccess) {
      document.addEventListener('visibilitychange', async () => {
        if (document.hidden && this.hasUnsavedChanges) {
          try {
            const csvContent = getSaveData();
            if (csvContent && this.resultsFileHandle) {
              await this.saveFileWithAPI(this.resultsFileHandle, csvContent);
            }
          } catch (error) {
            console.error('Background save failed:', error);
          }
        }
      });
    }
  }
}

// Export for use in other modules
window.FileManager = FileManager;
