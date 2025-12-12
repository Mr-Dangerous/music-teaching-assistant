/**
 * ComposerJSON.js
 * Standardized JSON format for all composer modules
 */

export class ComposerJSON {
    /**
     * Convert composition to standardized JSON format
     * @param {Array} composition - Composition array
     * @param {Object} state - ComposerState instance
     * @param {Object} metadata - Composer metadata {type, version}
     * @returns {string} JSON string
     */
    static toJSON(composition, state, metadata) {
        const data = {
            version: metadata.version || "1.0",
            composerType: metadata.type,
            tempo: state.tempo,
            meter: state.currentMeter,
            composition: composition.map(note => ({
                rhythm: note.rhythm,
                pitch: note.pitch,
                pitch2: note.pitch2 || null, // For split eighth notes
                beats: note.beats
            }))
        };

        return JSON.stringify(data);
    }

    /**
     * Parse and restore composition from JSON
     * @param {string} jsonString - JSON string
     * @returns {Object} Parsed data {composition, tempo, meter, composerType}
     */
    static fromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);

            // Validate structure
            if (!this.validate(data)) {
                throw new Error('Invalid composition format');
            }

            return {
                composition: data.composition || [],
                tempo: data.tempo || 100,
                meter: data.meter || 4,
                composerType: data.composerType,
                version: data.version
            };
        } catch (error) {
            console.error('Error parsing composition JSON:', error);
            return null;
        }
    }

    /**
     * Validate JSON structure
     * @param {Object} data - Parsed JSON data
     * @returns {boolean} True if valid
     */
    static validate(data) {
        if (!data || typeof data !== 'object') return false;
        if (!data.composerType) return false;
        if (!Array.isArray(data.composition)) return false;

        // Validate each note
        for (const note of data.composition) {
            if (!note.rhythm || !note.hasOwnProperty('pitch') || !note.beats) {
                return false;
            }
        }

        return true;
    }

    /**
     * Create empty composition data
     * @param {string} composerType - Type of composer
     * @returns {Object} Empty composition structure
     */
    static createEmpty(composerType) {
        return {
            version: "1.0",
            composerType: composerType,
            tempo: 100,
            meter: 4,
            composition: []
        };
    }
}
