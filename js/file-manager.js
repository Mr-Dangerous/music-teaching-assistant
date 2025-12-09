// File Manager Module
// Handles file loading and saving using File System Access API with fallback
// Supports two files: students.csv (roster) and results.csv (task responses)

class FileManager {
  constructor() {
    // File handles for three files
    this.studentsFileHandle = null;
    this.tasksFileHandle = null;
    this.resultsFileHandle = null;

    // File names
    this.studentsFileName = '';
    this.tasksFileName = '';
    this.resultsFileName = '';

    this.hasUnsavedChanges = false;
    this.supportsFileSystemAccess = 'showOpenFilePicker' in window;

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
   * @returns {Promise<Object>} - Object with studentsContent, tasksContent, and resultsContent
   */
  async loadFiles() {
    // Try to load from remembered handles first
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

    // If any file wasn't loaded, prompt user to select them
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
