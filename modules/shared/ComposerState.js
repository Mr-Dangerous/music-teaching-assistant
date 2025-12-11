/**
 * ComposerState.js
 * Centralized state management for music composer modules
 */

export class ComposerState {
    constructor(maxBeats = 16) {
        // Composition data
        this.composition = []; // Array of {rhythm, pitch, pitch2, x, y, beats}
        this.maxBeats = maxBeats;

        // Settings
        this.currentMeter = 4;
        this.tempo = 100;
        this.isSorted = false;
        this.showNoteNames = false;

        // Drag and drop state
        this.draggedItem = null;
        this.draggedExistingNote = null;
        this.dragOffset = { x: 0, y: 0 };

        // Long press state
        this.longPressTimer = null;
        this.longPressTarget = null;
    }

    /**
     * Add a note to the composition
     * @param {Object} noteData - Note data {rhythm, pitch, pitch2, x, y, beats}
     * @returns {boolean} True if added successfully
     */
    addNote(noteData) {
        if (!this.canAddBeats(noteData.beats)) {
            return false;
        }
        this.composition.push(noteData);
        return true;
    }

    /**
     * Remove a note from the composition
     * @param {number} index - Index of note to remove
     */
    removeNote(index) {
        if (index >= 0 && index < this.composition.length) {
            this.composition.splice(index, 1);
        }
    }

    /**
     * Update a note in the composition
     * @param {number} index - Index of note to update
     * @param {Object} updates - Properties to update
     */
    updateNote(index, updates) {
        if (index >= 0 && index < this.composition.length) {
            Object.assign(this.composition[index], updates);
        }
    }

    /**
     * Get total beats in composition
     * @returns {number} Total beats
     */
    getTotalBeats() {
        return this.composition.reduce((sum, item) => sum + item.beats, 0);
    }

    /**
     * Check if beats can be added without exceeding max
     * @param {number} beats - Number of beats to add
     * @returns {boolean} True if can add
     */
    canAddBeats(beats) {
        return this.getTotalBeats() + beats <= this.maxBeats;
    }

    /**
     * Clear all composition data
     */
    clear() {
        this.composition = [];
        this.isSorted = false;
    }

    /**
     * Sort composition by x position
     */
    sort() {
        this.composition.sort((a, b) => a.x - b.x);
        this.isSorted = true;
    }

    /**
     * Unsort composition (manual positioning)
     */
    unsort() {
        this.isSorted = false;
    }
}
