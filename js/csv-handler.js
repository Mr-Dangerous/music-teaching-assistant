// CSV Handler Module
// Handles parsing CSV to objects and converting objects back to CSV

class CSVHandler {
  constructor() {
    this.headers = [];
    this.students = [];
    this.artifactColumns = [];
  }

  /**
   * Parse CSV text into array of student objects
   * @param {string} csvText - Raw CSV text
   * @returns {Object} - Parsed data with headers and students
   */
  parseCSV(csvText) {
    const lines = this.parseCSVLines(csvText);

    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // First line is headers
    this.headers = lines[0];

    // Detect artifact columns
    this.artifactColumns = this.detectArtifactColumns(this.headers);

    // Parse remaining lines as student data
    this.students = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Skip empty lines
      if (line.length === 0 || (line.length === 1 && line[0] === '')) {
        continue;
      }

      // Create student object
      const student = {};
      for (let j = 0; j < this.headers.length; j++) {
        student[this.headers[j]] = line[j] || '';
      }

      this.students.push(student);
    }

    return {
      headers: this.headers,
      students: this.students,
      artifactColumns: this.artifactColumns
    };
  }

  /**
   * Parse CSV text into array of arrays, handling quoted fields
   * @param {string} csvText - Raw CSV text
   * @returns {Array<Array<string>>} - 2D array of values
   */
  parseCSVLines(csvText) {
    const lines = [];
    let currentLine = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        currentLine.push(currentField);
        currentField = '';
      } else if (char === '\n' && !inQuotes) {
        // Line separator
        currentLine.push(currentField);
        lines.push(currentLine);
        currentLine = [];
        currentField = '';
      } else if (char === '\r' && nextChar === '\n' && !inQuotes) {
        // Windows line ending
        currentLine.push(currentField);
        lines.push(currentLine);
        currentLine = [];
        currentField = '';
        i++; // Skip \n
      } else if (char === '\r' && !inQuotes) {
        // Mac line ending
        currentLine.push(currentField);
        lines.push(currentLine);
        currentLine = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }

    // Add last field and line if not empty
    if (currentField || currentLine.length > 0) {
      currentLine.push(currentField);
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Detect artifact columns in headers
   * @param {Array<string>} headers - CSV headers
   * @returns {Array<Object>} - Array of artifact info objects
   */
  detectArtifactColumns(headers) {
    const artifacts = new Set();
    const artifactPattern = /^artifact_(\d+)_(question|response|input_type|question_type)$/;

    headers.forEach(header => {
      const match = header.match(artifactPattern);
      if (match) {
        artifacts.add(parseInt(match[1]));
      }
    });

    // Convert to sorted array of objects
    return Array.from(artifacts).sort((a, b) => a - b).map(num => ({
      number: num,
      questionCol: `artifact_${num}_question`,
      responseCol: `artifact_${num}_response`,
      inputTypeCol: `artifact_${num}_input_type`,
      questionTypeCol: `artifact_${num}_question_type`
    }));
  }

  /**
   * Convert students array back to CSV text
   * @param {Array<Object>} students - Array of student objects
   * @param {Array<string>} headers - CSV headers
   * @returns {string} - CSV text
   */
  toCSV(students, headers) {
    const lines = [];

    // Add header line
    lines.push(this.escapeCSVLine(headers));

    // Add student lines
    students.forEach(student => {
      const line = headers.map(header => student[header] || '');
      lines.push(this.escapeCSVLine(line));
    });

    return lines.join('\n');
  }

  /**
   * Escape a CSV line (array of fields) into a CSV string
   * @param {Array<string>} fields - Array of field values
   * @returns {string} - Escaped CSV line
   */
  escapeCSVLine(fields) {
    return fields.map(field => {
      const str = String(field);

      // Need to quote if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        // Escape quotes by doubling them
        return '"' + str.replace(/"/g, '""') + '"';
      }

      return str;
    }).join(',');
  }

  /**
   * Get unique classes from students
   * @param {Array<Object>} students - Array of student objects
   * @returns {Array<string>} - Sorted unique class names
   */
  getUniqueClasses(students) {
    const classes = new Set();
    students.forEach(student => {
      if (student.class) {
        classes.add(student.class);
      }
    });

    // Sort by grade (extracted from class name) then by teacher name
    return Array.from(classes).sort((a, b) => {
      const gradeA = this.extractGrade(a);
      const gradeB = this.extractGrade(b);

      if (gradeA !== gradeB) {
        // Sort grades: K, then 1, 2, 3, 4
        if (gradeA === 'K') return -1;
        if (gradeB === 'K') return 1;
        return parseInt(gradeA) - parseInt(gradeB);
      }

      // Same grade, sort by teacher name
      return a.localeCompare(b);
    });
  }

  /**
   * Extract grade from class name (e.g., "Hernandez 1" -> "1")
   * @param {string} className - Class name
   * @returns {string} - Grade
   */
  extractGrade(className) {
    const match = className.match(/\s+([K1-4])$/);
    return match ? match[1] : '';
  }

  /**
   * Filter students by class
   * @param {Array<Object>} students - Array of student objects
   * @param {string} className - Class name to filter by
   * @returns {Array<Object>} - Filtered students
   */
  filterByClass(students, className) {
    return students.filter(student => student.class === className);
  }

  /**
   * Find student by name and class
   * @param {Array<Object>} students - Array of student objects
   * @param {string} name - Student name
   * @param {string} className - Class name
   * @returns {Object|null} - Student object or null
   */
  findStudent(students, name, className) {
    return students.find(student =>
      student.name === name && student.class === className
    ) || null;
  }
}

// Export for use in other modules
window.CSVHandler = CSVHandler;
