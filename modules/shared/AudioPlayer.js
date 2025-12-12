/**
 * AudioPlayer.js
 * Web Audio API playback for music compositions
 */

export class AudioPlayer {
    constructor() {
        this.audioContext = null;
    }

    /**
     * Play a composition using Web Audio API
     * @param {Array} composition - Array of note objects
     * @param {number} tempo - BPM
     * @param {Object} noteFrequencies - Map of pitch to frequency
     */
    playComposition(composition, tempo, noteFrequencies) {
        // Create audio context if needed
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const beatDuration = 60 / tempo; // Duration of one beat in seconds
        let currentTime = this.audioContext.currentTime;

        composition.forEach(item => {
            if (item.rhythm === 'shh') {
                // Rest - just advance time
                currentTime += beatDuration * item.beats;
            } else if (item.rhythm === 'ta') {
                // Quarter note
                const frequency = noteFrequencies[item.pitch];
                if (frequency) {
                    this.playNote(frequency, currentTime, beatDuration);
                }
                currentTime += beatDuration;
            } else if (item.rhythm === 'ti-ti') {
                // Eighth notes (potentially split)
                const halfBeat = beatDuration / 2;

                // First note
                const freq1 = noteFrequencies[item.pitch];
                if (freq1) {
                    this.playNote(freq1, currentTime, halfBeat);
                }

                // Second note (use pitch2 if available, otherwise same as first)
                const pitch2 = item.pitch2 || item.pitch;
                const freq2 = noteFrequencies[pitch2];
                if (freq2) {
                    this.playNote(freq2, currentTime + halfBeat, halfBeat);
                }

                currentTime += beatDuration;
            }
        });
    }

    /**
     * Play a single note
     * @param {number} frequency - Note frequency in Hz
     * @param {number} startTime - Start time in audio context time
     * @param {number} duration - Duration in seconds
     */
    playNote(frequency, startTime, duration) {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        // Envelope for smoother sound
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }

    /**
     * Stop all audio
     */
    stop() {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}
