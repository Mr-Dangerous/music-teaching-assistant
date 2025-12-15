// Audio Manager Module
// Handles audio recording, file management, and saving to folder

class AudioManager {
    constructor(fileManager, csvHandler) {
        this.fileManager = fileManager;
        this.csvHandler = csvHandler;

        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.stream = null;

        // Current context for recording
        this.currentStudent = null;
        this.currentClass = null;
    }

    /**
     * Set the current recording context
     * @param {Object} student - Student object with id, name
     * @param {string} className - Class name
     */
    setContext(student, className) {
        this.currentStudent = student;
        this.currentClass = className;
    }

    /**
     * Check if currently recording
     * @returns {boolean}
     */
    getIsRecording() {
        return this.isRecording;
    }

    /**
     * Start audio recording
     * @returns {Promise<void>}
     */
    async startRecording() {
        if (this.isRecording) {
            console.warn('Already recording');
            return;
        }

        try {
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });

            // Create MediaRecorder with WebM format
            const mimeType = this.getSupportedMimeType();
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: mimeType
            });

            this.audioChunks = [];

            // Collect audio data
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            // Handle recording stop
            this.mediaRecorder.onstop = async () => {
                await this.saveRecording();
            };

            // Start recording
            this.mediaRecorder.start();
            this.isRecording = true;

            console.log('🎤 Recording started');
        } catch (error) {
            console.error('Failed to start recording:', error);
            throw new Error(`Microphone access denied or unavailable: ${error.message}`);
        }
    }

    /**
     * Stop audio recording
     * @returns {Promise<void>}
     */
    async stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            console.warn('Not currently recording');
            return;
        }

        // Stop the media recorder (this will trigger onstop event)
        this.mediaRecorder.stop();

        // Stop all tracks to release the microphone
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        this.isRecording = false;
        console.log('🎤 Recording stopped');
    }

    /**
     * Save the recorded audio to folder
     * @returns {Promise<void>}
     */
    async saveRecording() {
        try {
            // Create audio blob
            const mimeType = this.getSupportedMimeType();
            const audioBlob = new Blob(this.audioChunks, { type: mimeType });

            // Generate filename
            const timestamp = this.getTimestamp();
            const fileName = this.generateFileName(timestamp);

            // Ensure audio_files subfolder exists and save
            await this.ensureAudioFolderExists();
            const audioFolderHandle = await this.fileManager.getSubfolderHandle('audio_files');

            // Save audio file to subfolder
            const fileHandle = await audioFolderHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(audioBlob);
            await writable.close();

            console.log(`✓ Saved audio: ${fileName}`);

            // Save metadata to results.csv
            const relativePath = `audio_files/${fileName}`;
            await this.saveToResultsCSV(timestamp, relativePath);

            return fileName;
        } catch (error) {
            console.error('Failed to save recording:', error);
            throw error;
        }
    }

    /**
     * Generate standardized filename for audio recording
     * @param {string} timestamp - ISO timestamp
     * @returns {string}
     */
    generateFileName(timestamp) {
        // Format: studentname_class_timestamp.webm or allstudents_class_timestamp.webm
        const dateStr = timestamp.replace(/[-:]/g, '').replace('T', '_').split('.')[0];

        let studentPart;
        if (this.currentStudent && this.currentStudent.name) {
            // Use student name, sanitize for filename
            studentPart = this.sanitizeForFilename(this.currentStudent.name.toLowerCase());
        } else {
            studentPart = 'allstudents';
        }

        const classPart = this.currentClass
            ? this.sanitizeForFilename(this.currentClass.toLowerCase())
            : 'noclass';

        const extension = this.getFileExtension();

        return `${studentPart}_${classPart}_${dateStr}.${extension}`;
    }

    /**
     * Sanitize string for use in filename
     * @param {string} str
     * @returns {string}
     */
    sanitizeForFilename(str) {
        return str
            .replace(/\s+/g, '')  // Remove spaces
            .replace(/[^a-z0-9_-]/g, '');  // Remove special characters
    }

    /**
     * Get current timestamp in ISO format
     * @returns {string}
     */
    getTimestamp() {
        return new Date().toISOString();
    }

    /**
     * Get supported MIME type for recording
     * @returns {string}
     */
    getSupportedMimeType() {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4'
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return 'audio/webm'; // Default fallback
    }

    /**
     * Get file extension based on MIME type
     * @returns {string}
     */
    getFileExtension() {
        const mimeType = this.getSupportedMimeType();
        if (mimeType.includes('webm')) return 'webm';
        if (mimeType.includes('ogg')) return 'ogg';
        if (mimeType.includes('mp4')) return 'm4a';
        return 'webm';
    }

    /**
     * Ensure audio_files subfolder exists
     * @returns {Promise<void>}
     */
    async ensureAudioFolderExists() {
        try {
            await this.fileManager.createSubfolder('audio_files');
        } catch (error) {
            // Folder might already exist, that's okay
            console.log('audio_files folder check:', error.message);
        }
    }

    /**
   * Save recording metadata to results.csv
   * @param {string} timestamp
   * @param {string} filePath - Relative path to audio file
   * @returns {Promise<void>}
   */
    async saveToResultsCSV(timestamp, filePath) {
        const studentId = this.currentStudent?.student_id || '';
        const studentName = this.currentStudent?.name || '';
        const className = this.currentClass || '';

        // Create result entry
        const result = {
            timestamp: timestamp,
            student_id: studentId,
            student_name: studentName,
            class: className,
            task_id: 'AUDIO_RECORDING',
            response: filePath
        };

        // Add to results array in app
        if (window.app && window.app.results) {
            window.app.results.push(result);
            console.log('Added audio recording to results:', result);

            // Trigger save to CSV file
            try {
                await window.app.saveFile(true);  // Silent save
                console.log('Results CSV saved successfully');
            } catch (error) {
                console.error('Failed to save results CSV:', error);
            }
        } else {
            console.error('Cannot save to results: app.results not available');
        }
    }
    /**
     * Clean up resources
     */
    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
    }
}

// Export for use in other modules
window.AudioManager = AudioManager;
