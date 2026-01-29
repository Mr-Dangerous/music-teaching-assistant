/**
 * AudioPlayer.js
 * Tone.js-based audio playback with real instrument samples
 * Backward compatible with existing modules
 */

export class AudioPlayer {
    constructor(instrumentName = 'piano') {
        this.audioContext = null;
        this.instrument = null;
        this.instrumentName = instrumentName;
        this.Tone = null;
        this.isLoading = false;
        this.isReady = false;
        this.useFallback = false;

        // Initialize Tone.js
        this.initTone();
    }

    /**
     * Initialize Tone.js and load instrument
     */
    async initTone() {
        this.isLoading = true;

        try {
            // Dynamically import Tone.js from CDN
            const ToneModule = await import('https://cdn.jsdelivr.net/npm/tone@14.8.49/+esm');
            this.Tone = ToneModule.default || ToneModule;

            // Load the instrument
            await this.loadInstrument(this.instrumentName);

            this.isReady = true;
            this.isLoading = false;
            console.log(`AudioPlayer ready with ${this.instrumentName}`);
        } catch (error) {
            console.warn('Failed to load Tone.js, falling back to oscillators:', error);
            this.useFallback = true;
            this.isLoading = false;
            this.initFallbackContext();
        }
    }

    /**
     * Initialize fallback Web Audio API context
     */
    initFallbackContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    /**
     * Load an instrument using Tone.js Sampler
     * @param {string} instrumentName - Name of instrument (piano, violin, flute, etc.)
     */
    async loadInstrument(instrumentName) {
        if (!this.Tone) {
            throw new Error('Tone.js not loaded');
        }

        // Start audio context (required for user interaction)
        await this.Tone.start();

        // Dispose of previous instrument
        if (this.instrument) {
            this.instrument.dispose();
        }

        // Instrument sample URLs from tonejs-instruments
        const baseUrl = 'https://nbrosowsky.github.io/tonejs-instruments/samples';

        // Available instruments with their sample configurations
        const instruments = {
            piano: {
                urls: {
                    A0: "A0.mp3", C1: "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
                    A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
                    A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
                    A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
                    A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
                    A5: "A5.mp3", C6: "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
                    A6: "A6.mp3", C7: "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3",
                    A7: "A7.mp3", C8: "C8.mp3"
                },
                baseUrl: `${baseUrl}/piano/`
            },
            violin: {
                urls: {
                    A3: "A3.mp3", A4: "A4.mp3", A5: "A5.mp3", A6: "A6.mp3",
                    C4: "C4.mp3", C5: "C5.mp3", C6: "C6.mp3", C7: "C7.mp3",
                    E4: "E4.mp3", E5: "E5.mp3", E6: "E6.mp3",
                    G4: "G4.mp3", G5: "G5.mp3", G6: "G6.mp3"
                },
                baseUrl: `${baseUrl}/violin/`
            },
            flute: {
                urls: {
                    A5: "A5.mp3", C4: "C4.mp3", C5: "C5.mp3", C6: "C6.mp3",
                    E4: "E4.mp3", E5: "E5.mp3", A4: "A4.mp3"
                },
                baseUrl: `${baseUrl}/flute/`
            },
            cello: {
                urls: {
                    E2: "E2.mp3", E3: "E3.mp3", E4: "E4.mp3",
                    A2: "A2.mp3", A3: "A3.mp3", A4: "A4.mp3",
                    D2: "D2.mp3", D3: "D3.mp3", D4: "D4.mp3",
                    G2: "G2.mp3", G3: "G3.mp3", G4: "G4.mp3"
                },
                baseUrl: `${baseUrl}/cello/`
            },
            saxophone: {
                urls: {
                    "D#4": "Ds4.mp3", E3: "E3.mp3", E4: "E4.mp3", E5: "E5.mp3",
                    F3: "F3.mp3", F4: "F4.mp3", F5: "F5.mp3",
                    "F#3": "Fs3.mp3", "F#4": "Fs4.mp3", "F#5": "Fs5.mp3",
                    G3: "G3.mp3", G4: "G4.mp3", G5: "G5.mp3",
                    "G#3": "Gs3.mp3", "G#4": "Gs4.mp3", "G#5": "Gs5.mp3",
                    A4: "A4.mp3", A5: "A5.mp3",
                    "A#3": "As3.mp3", "A#4": "As4.mp3",
                    B3: "B3.mp3", B4: "B4.mp3",
                    C4: "C4.mp3", C5: "C5.mp3",
                    "C#3": "Cs3.mp3", "C#4": "Cs4.mp3", "C#5": "Cs5.mp3",
                    D3: "D3.mp3", D4: "D4.mp3", D5: "D5.mp3",
                    "D#3": "Ds3.mp3", "D#5": "Ds5.mp3"
                },
                baseUrl: `${baseUrl}/saxophone/`
            },
            trumpet: {
                urls: {
                    C5: "C5.mp3", D4: "D4.mp3", "D#4": "Ds4.mp3", F4: "F4.mp3",
                    G4: "G4.mp3", A4: "A4.mp3", "A#4": "As4.mp3", C4: "C4.mp3"
                },
                baseUrl: `${baseUrl}/trumpet/`
            },
            trombone: {
                urls: {
                    "A#2": "As2.mp3", C3: "C3.mp3", D3: "D3.mp3", "D#3": "Ds3.mp3",
                    F3: "F3.mp3", "G#2": "Gs2.mp3", "A#1": "As1.mp3"
                },
                baseUrl: `${baseUrl}/trombone/`
            },
            guitar: {
                urls: {
                    A2: "A2.mp3", A3: "A3.mp3", A4: "A4.mp3",
                    "A#2": "As2.mp3", "A#3": "As3.mp3", "A#4": "As4.mp3",
                    B2: "B2.mp3", B3: "B3.mp3", B4: "B4.mp3",
                    C3: "C3.mp3", C4: "C4.mp3", C5: "C5.mp3",
                    "C#3": "Cs3.mp3", "C#4": "Cs4.mp3", "C#5": "Cs5.mp3",
                    D2: "D2.mp3", D3: "D3.mp3", D4: "D4.mp3", D5: "D5.mp3",
                    "D#2": "Ds2.mp3", "D#3": "Ds3.mp3", "D#4": "Ds4.mp3",
                    E2: "E2.mp3", E3: "E3.mp3", E4: "E4.mp3", E5: "E5.mp3",
                    F2: "F2.mp3", F3: "F3.mp3", F4: "F4.mp3",
                    "F#2": "Fs2.mp3", "F#3": "Fs3.mp3", "F#4": "Fs4.mp3",
                    G2: "G2.mp3", G3: "G3.mp3", G4: "G4.mp3",
                    "G#2": "Gs2.mp3", "G#3": "Gs3.mp3", "G#4": "Gs4.mp3"
                },
                baseUrl: `${baseUrl}/guitar-acoustic/`
            },
            xylophone: {
                urls: {
                    G4: "G4.mp3", G5: "G5.mp3", G6: "G6.mp3",
                    C5: "C5.mp3", C6: "C6.mp3", C7: "C7.mp3"
                },
                baseUrl: `${baseUrl}/xylophone/`
            },
            harp: {
                urls: {
                    C5: "C5.mp3", D2: "D2.mp3", D4: "D4.mp3", D6: "D6.mp3", D7: "D7.mp3",
                    E1: "E1.mp3", E3: "E3.mp3", E5: "E5.mp3",
                    F2: "F2.mp3", F4: "F4.mp3", F6: "F6.mp3", F7: "F7.mp3",
                    G1: "G1.mp3", G3: "G3.mp3", G5: "G5.mp3",
                    A2: "A2.mp3", A4: "A4.mp3", A6: "A6.mp3",
                    B1: "B1.mp3", B3: "B3.mp3", B5: "B5.mp3", B6: "B6.mp3",
                    C3: "C3.mp3"
                },
                baseUrl: `${baseUrl}/harp/`
            }
        };

        const config = instruments[instrumentName] || instruments.piano;

        // Create Tone.js Sampler and wait for samples to load
        return new Promise((resolve, reject) => {
            this.instrument = new this.Tone.Sampler({
                urls: config.urls,
                baseUrl: config.baseUrl,
                onload: () => {
                    console.log(`${instrumentName} loaded successfully`);
                    this.instrumentName = instrumentName;
                    resolve();
                },
                onerror: (error) => {
                    console.error(`Failed to load ${instrumentName}:`, error);
                    reject(error);
                }
            }).toDestination();
        });
    }

    /**
     * Set/change the instrument
     * @param {string} instrumentName - piano, violin, flute, cello, saxophone, trumpet, trombone, guitar, xylophone, harp
     */
    async setInstrument(instrumentName) {
        if (this.useFallback) {
            console.warn('Cannot change instrument in fallback mode');
            return;
        }

        this.isLoading = true;
        this.isReady = false;

        try {
            await this.loadInstrument(instrumentName);
            this.isReady = true;
        } catch (error) {
            console.error('Failed to load instrument:', error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Convert frequency to note name (e.g., 440 Hz -> A4)
     * @param {number} frequency - Frequency in Hz
     * @returns {string} Note name (e.g., "C4", "D#5")
     */
    frequencyToNote(frequency) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const A4 = 440;
        const halfStepsFromA4 = Math.round(12 * Math.log2(frequency / A4));
        const octave = Math.floor((halfStepsFromA4 + 9) / 12) + 4;
        const noteIndex = (halfStepsFromA4 + 9 + 1200) % 12; // +1200 to handle negative numbers
        return noteNames[noteIndex] + octave;
    }

    /**
     * Play a composition using Tone.js
     * @param {Array} composition - Array of note objects
     * @param {number} tempo - BPM
     * @param {Object} noteFrequencies - Map of pitch to frequency
     */
    async playComposition(composition, tempo, noteFrequencies) {
        // Wait for instrument to load if still loading
        if (this.isLoading) {
            await new Promise(resolve => {
                const checkReady = setInterval(() => {
                    if (!this.isLoading) {
                        clearInterval(checkReady);
                        resolve();
                    }
                }, 100);
            });
        }

        // Use fallback if Tone.js failed to load
        if (this.useFallback) {
            return this.playCompositionFallback(composition, tempo, noteFrequencies);
        }

        if (!this.instrument || !this.Tone) return;

        const beatDuration = 60 / tempo; // Duration of one beat in seconds
        let currentTime = this.Tone.now();

        composition.forEach(item => {
            if (item.rhythm === 'shh') {
                // Rest - just advance time
                currentTime += beatDuration * (item.beats || 1);
            } else if (item.rhythm === 'ta') {
                // Quarter note
                const frequency = noteFrequencies[item.pitch];
                if (frequency) {
                    const note = this.frequencyToNote(frequency);
                    this.instrument.triggerAttackRelease(note, beatDuration * 0.9, currentTime);
                }
                currentTime += beatDuration;
            } else if (item.rhythm === 'ti-ti') {
                // Eighth notes (potentially split)
                const halfBeat = beatDuration / 2;

                // First note
                const freq1 = noteFrequencies[item.pitch];
                if (freq1) {
                    const note1 = this.frequencyToNote(freq1);
                    this.instrument.triggerAttackRelease(note1, halfBeat * 0.9, currentTime);
                }

                // Second note (use pitch2 if available, otherwise same as first)
                const pitch2 = item.pitch2 || item.pitch;
                const freq2 = noteFrequencies[pitch2];
                if (freq2) {
                    const note2 = this.frequencyToNote(freq2);
                    this.instrument.triggerAttackRelease(note2, halfBeat * 0.9, currentTime + halfBeat);
                }

                currentTime += beatDuration;
            }
        });
    }

    /**
     * Play a single note using Tone.js
     * @param {number} frequency - Note frequency in Hz
     * @param {number} startTime - Start time (unused in Tone.js version, plays immediately)
     * @param {number} duration - Duration in seconds
     */
    async playNote(frequency, startTime = 0, duration = 1) {
        // Wait for instrument to load if still loading
        if (this.isLoading) {
            await new Promise(resolve => {
                const checkReady = setInterval(() => {
                    if (!this.isLoading) {
                        clearInterval(checkReady);
                        resolve();
                    }
                }, 100);
            });
        }

        if (this.useFallback) {
            return this.playNoteFallback(frequency, startTime, duration);
        }

        if (!this.instrument || !this.Tone) return;

        const note = this.frequencyToNote(frequency);
        const when = startTime > 0 ? this.Tone.now() + startTime : this.Tone.now();
        this.instrument.triggerAttackRelease(note, duration * 0.9, when);
    }

    /**
     * Fallback: Play composition using Web Audio API oscillators
     */
    playCompositionFallback(composition, tempo, noteFrequencies) {
        this.initFallbackContext();

        const beatDuration = 60 / tempo;
        let currentTime = this.audioContext.currentTime;

        composition.forEach(item => {
            if (item.rhythm === 'shh') {
                currentTime += beatDuration * (item.beats || 1);
            } else if (item.rhythm === 'ta') {
                const frequency = noteFrequencies[item.pitch];
                if (frequency) {
                    this.playNoteFallback(frequency, currentTime, beatDuration);
                }
                currentTime += beatDuration;
            } else if (item.rhythm === 'ti-ti') {
                const halfBeat = beatDuration / 2;
                const freq1 = noteFrequencies[item.pitch];
                if (freq1) {
                    this.playNoteFallback(freq1, currentTime, halfBeat);
                }
                const pitch2 = item.pitch2 || item.pitch;
                const freq2 = noteFrequencies[pitch2];
                if (freq2) {
                    this.playNoteFallback(freq2, currentTime + halfBeat, halfBeat);
                }
                currentTime += beatDuration;
            }
        });
    }

    /**
     * Fallback: Play a single note using Web Audio API oscillator
     */
    playNoteFallback(frequency, startTime, duration) {
        if (!this.audioContext) {
            this.initFallbackContext();
        }

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
        if (this.Tone) {
            // Stop all scheduled events
            this.Tone.Transport.stop();
            this.Tone.Transport.cancel();
        }

        if (this.instrument) {
            this.instrument.releaseAll();
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    /**
     * Get list of available instruments
     * @returns {Array} Array of instrument names
     */
    static getAvailableInstruments() {
        return ['piano', 'violin', 'flute', 'cello', 'saxophone', 'trumpet', 'trombone', 'guitar', 'xylophone', 'harp'];
    }
}
