/**
 * VersionDisplay.js
 * Simple version display in bottom-right corner
 */

export class VersionDisplay {
    constructor() {
        this.versionElement = null;
    }

    /**
     * Load and display version
     */
    async init() {
        try {
            // Fetch version.json
            const response = await fetch('../version.json');
            const data = await response.json();

            // Create version display element
            this.versionElement = document.createElement('div');
            this.versionElement.style.cssText = `
                position: fixed;
                bottom: 10px;
                right: 10px;
                font-size: 12px;
                color: rgba(0, 0, 0, 0.3);
                font-family: monospace;
                pointer-events: none;
                z-index: 1000;
            `;
            this.versionElement.textContent = `v${data.version}`;

            document.body.appendChild(this.versionElement);
        } catch (error) {
            console.log('Could not load version info');
        }
    }

    /**
     * Static helper to quickly add version display
     */
    static async show() {
        const display = new VersionDisplay();
        await display.init();
    }
}
