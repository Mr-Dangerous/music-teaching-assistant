// Video Manager Module
// Handles video recording, file management, and saving to folder

class VideoManager {
    constructor(fileManager, csvHandler) {
        this.fileManager = fileManager;
        this.csvHandler = csvHandler;

        this.mediaRecorder = null;
        this.videoChunks = [];
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
     * Start video recording
     * @param {string} quality - 'high' for max quality, 'low' for 720p/30fps
     * @returns {Promise<void>}
     */
    async startRecording(quality = 'high') {
        if (this.isRecording) {
            console.warn('Already recording');
            return;
        }

        try {
            // Configure settings based on quality
            let videoConstraints, videoBitrate;

            if (quality === 'low') {
                // Low quality: 720p at 30fps
                videoConstraints = {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user',
                    frameRate: { ideal: 30 }
                };
                videoBitrate = 2500000; // 2.5 Mbps
            } else {
                // High quality: Max resolution at 60fps
                videoConstraints = {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    facingMode: 'user',
                    frameRate: { ideal: 60 }
                };
                videoBitrate = 8000000; // 8 Mbps for higher quality
            }

            // Request camera and microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: videoConstraints,
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 48000  // Higher quality audio
                }
            });

            // Create MediaRecorder with WebM format (video + audio)
            const mimeType = this.getSupportedMimeType();
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: mimeType,
                videoBitsPerSecond: videoBitrate
            });

            this.videoChunks = [];

            // Collect video data
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.videoChunks.push(event.data);
                }
            };

            // Handle recording stop
            this.mediaRecorder.onstop = async () => {
                await this.saveRecording();
            };

            // Start recording
            this.mediaRecorder.start();
            this.isRecording = true;

            console.log('📹 Video recording started');
        } catch (error) {
            console.error('Failed to start video recording:', error);
            throw new Error(`Camera/microphone access denied or unavailable: ${error.message}`);
        }
    }

    /**
     * Stop video recording
     * @returns {Promise<void>}
     */
    async stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            console.warn('Not currently recording');
            return;
        }

        // Stop the media recorder (this will trigger onstop event)
        this.mediaRecorder.stop();

        // Stop all tracks to release the camera and microphone
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        this.isRecording = false;
        console.log('📹 Video recording stopped');
    }

    /**
     * Save the recorded video to folder
     * @returns {Promise<void>}
     */
    async saveRecording() {
        try {
            // Create video blob
            const mimeType = this.getSupportedMimeType();
            const videoBlob = new Blob(this.videoChunks, { type: mimeType });

            // Generate filename
            const timestamp = this.getTimestamp();
            const fileName = this.generateFileName(timestamp);

            // Ensure video_files subfolder exists and save
            await this.ensureVideoFolderExists();
            const videoFolderHandle = await this.fileManager.getSubfolderHandle('video_files');

            // Save video file to subfolder
            const fileHandle = await videoFolderHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(videoBlob);
            await writable.close();

            console.log(`✓ Saved video: ${fileName}`);

            // Save metadata to results.csv
            const relativePath = `video_files/${fileName}`;
            await this.saveToResultsCSV(timestamp, relativePath);

            return fileName;
        } catch (error) {
            console.error('Failed to save video recording:', error);
            throw error;
        }
    }

    /**
     * Generate standardized filename for video recording
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
     * Get supported MIME type for video recording
     * @returns {string}
     */
    getSupportedMimeType() {
        const types = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4'
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return 'video/webm'; // Default fallback
    }

    /**
     * Get file extension based on MIME type
     * @returns {string}
     */
    getFileExtension() {
        const mimeType = this.getSupportedMimeType();
        if (mimeType.includes('webm')) return 'webm';
        if (mimeType.includes('mp4')) return 'mp4';
        return 'webm';
    }

    /**
     * Ensure video_files subfolder exists
     * @returns {Promise<void>}
     */
    async ensureVideoFolderExists() {
        try {
            await this.fileManager.createSubfolder('video_files');
        } catch (error) {
            // Folder might already exist, that's okay
            console.log('video_files folder check:', error.message);
        }
    }

    /**
   * Save recording metadata to results.csv
   * @param {string} timestamp
   * @param {string} filePath - Relative path to video file
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
            task_id: 'VIDEO_RECORDING',
            response: filePath
        };

        // Add to results array in app
        if (window.app && window.app.results) {
            window.app.results.push(result);
            console.log('Added video recording to results:', result);

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
        this.videoChunks = [];
        this.isRecording = false;
    }
}

// Export for use in other modules
window.VideoManager = VideoManager;
