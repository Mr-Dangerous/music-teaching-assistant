/**
 * MusicNotation.js
 * Music theory utilities and pitch handling for composer modules
 */

export class MusicNotation {
    /**
     * Get ordered array of pitches from low to high
     * @param {Array<string>} pitchSet - Array of pitch names
     * @returns {Array<string>} Ordered pitches (low to high)
     */
    static getPitchOrder(pitchSet) {
        const order = { 'do': 0, 're': 1, 'mi': 2, 'fa': 3, 'so': 4, 'la': 5, 'ti': 6 };
        return [...pitchSet].sort((a, b) => order[a] - order[b]);
    }

    /**
     * Calculate the number of steps between two pitches
     * @param {string} pitch1 - First pitch
     * @param {string} pitch2 - Second pitch
     * @param {Array<string>} pitchSet - Available pitches
     * @returns {number} Number of steps (0 = same note)
     */
    static getPitchDistance(pitch1, pitch2, pitchSet) {
        const ordered = this.getPitchOrder(pitchSet);
        const idx1 = ordered.indexOf(pitch1);
        const idx2 = ordered.indexOf(pitch2);
        return Math.abs(idx1 - idx2);
    }

    /**
     * Validate if two pitches are within allowed step distance
     * @param {string} pitch1 - First pitch
     * @param {string} pitch2 - Second pitch  
     * @param {Array<string>} pitchSet - Available pitches
     * @param {number} maxSteps - Maximum allowed steps
     * @returns {boolean} True if valid
     */
    static validateNotePair(pitch1, pitch2, pitchSet, maxSteps = 1) {
        const distance = this.getPitchDistance(pitch1, pitch2, pitchSet);
        return distance <= maxSteps;
    }

    /**
     * Snap y-coordinate to closest pitch position
     * @param {number} y - Y coordinate on canvas
     * @param {Object} pitchPositions - Map of {pitch: yPosition}
     * @returns {string} Closest pitch name
     */
    static snapToPitch(y, pitchPositions) {
        let closestPitch = null;
        let minDistance = Infinity;

        for (const [pitch, yPos] of Object.entries(pitchPositions)) {
            const distance = Math.abs(y - yPos);
            if (distance < minDistance) {
                minDistance = distance;
                closestPitch = pitch;
            }
        }

        return closestPitch;
    }

    /**
     * Find closest valid pitch to target, within maxSteps of reference pitch
     * @param {string} targetPitch - Desired pitch
     * @param {string} referencePitch - Reference pitch for constraint
     * @param {number} maxSteps - Maximum allowed steps from reference
     * @param {Array<string>} pitchSet - Available pitches
     * @returns {string} Closest valid pitch to target
     */
    static getClosestValidPitch(targetPitch, referencePitch, maxSteps, pitchSet) {
        // If target is already valid, return it
        if (this.validateNotePair(targetPitch, referencePitch, pitchSet, maxSteps)) {
            return targetPitch;
        }

        // Find all valid pitches within step constraint
        const ordered = this.getPitchOrder(pitchSet);
        const refIdx = ordered.indexOf(referencePitch);
        const validPitches = [];

        for (let i = Math.max(0, refIdx - maxSteps); i <= Math.min(ordered.length - 1, refIdx + maxSteps); i++) {
            validPitches.push(ordered[i]);
        }

        // Return the valid pitch closest to target position
        const targetIdx = ordered.indexOf(targetPitch);
        let closestPitch = validPitches[0];
        let minDistance = Math.abs(ordered.indexOf(closestPitch) - targetIdx);

        for (const pitch of validPitches) {
            const distance = Math.abs(ordered.indexOf(pitch) - targetIdx);
            if (distance < minDistance) {
                minDistance = distance;
                closestPitch = pitch;
            }
        }

        return closestPitch;
    }
}
