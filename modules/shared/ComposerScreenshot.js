/**
 * ComposerScreenshot.js
 * Capture staff canvas as PNG with student name overlay
 */

export class ComposerScreenshot {
    constructor(canvas) {
        this.canvas = canvas;
    }

    /**
     * Generate timestamp for filename
     * @returns {string} Format: YYYYMMDD_HHMMSS
     */
    getTimestamp() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const sec = String(now.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}_${hour}${min}${sec}`;
    }

    /**
     * Capture canvas and create downloadable PNG
     * @param {string} studentName - Student name from context (or "." if none)
     * @returns {Promise<string>} Data URL of the image
     */
    async captureStaff(studentName = '.') {
        // Create a temporary canvas to add student name
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');

        // Get scale factor
        const scale = document.body.classList.contains('resolution-4k') ? 2 : 1;

        // Set canvas size (original staff size + space for name)
        const nameHeight = 60 * scale;
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height + nameHeight;

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw student name at top
        ctx.fillStyle = '#2c3e50';
        ctx.font = `bold ${40 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(studentName, tempCanvas.width / 2, nameHeight / 2);

        // Draw the staff canvas below
        ctx.drawImage(this.canvas, 0, nameHeight);

        // Convert to data URL
        return tempCanvas.toDataURL('image/png');
    }

    /**
     * Capture and download image
     * @param {string} studentName - Student name from context
     */
    async captureAndDownload(studentName = '.') {
        const dataUrl = await this.captureStaff(studentName);
        const timestamp = this.getTimestamp();

        // Clean student name for filename (replace spaces/special chars)
        const cleanName = studentName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const filename = `${cleanName}_melody_${timestamp}.png`;

        // Create download link
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();

        return dataUrl;
    }

    /**
     * Get student name from context object
     * @param {Object} context - TaskModule context
     * @returns {string} Student name or "."
     */
    static getStudentName(context) {
        if (!context) return '.';
        if (context.student && context.student.name) return context.student.name;
        if (context.studentName) return context.studentName;
        return '.';
    }
}
