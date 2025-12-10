// Results Parser
// Handles parsing of module-specific response data

class ResultsParser {
    constructor() {
        // Module-specific parsers
        this.parsers = {
            'so_la_mi_trainer': this.parseSoLaMi.bind(this),
            'piano_octave_1': this.parsePianoOctave1.bind(this),
            // Add more module parsers here as needed
        };
    }

    /**
     * Parse a result based on its module type
     * @param {Object} result - Result object with task_id, response, etc.
     * @param {Object} task - Task object with module_path
     * @returns {Object} Parsed result with question, answer, and score
     */
    parseResult(result, task) {
        if (!result || !result.response) {
            return null;
        }

        // Extract module name from module_path
        const moduleName = this.extractModuleName(task.module_path);

        // Get appropriate parser
        const parser = this.parsers[moduleName];

        if (parser) {
            return parser(result, task);
        } else {
            // Default parser for unknown modules
            return this.parseDefault(result, task);
        }
    }

    /**
     * Extract module name from path
     * @param {string} modulePath - e.g., "modules/so_la_mi_trainer.html"
     * @returns {string} Module name without extension
     */
    extractModuleName(modulePath) {
        if (!modulePath) return 'unknown';

        // Extract filename from path
        const filename = modulePath.split('/').pop();

        // Remove extension
        const moduleName = filename.replace(/\.(html|htm)$/i, '');

        return moduleName;
    }

    /**
     * Parse So La Mi Trainer results
     * Response format: {"pattern":["so","la","mi"],"placements":{"0":"so","1":"la","2":"mi"},"correct":3,"total":3}
     */
    parseSoLaMi(result, task) {
        try {
            const data = JSON.parse(result.response);

            // Build question display (the pattern they needed to match)
            const pattern = data.pattern || [];
            const questionText = pattern.join(' - ');

            // Build answer display (their placements)
            const placements = data.placements || {};
            const answerParts = [];

            for (let i = 0; i < pattern.length; i++) {
                const studentAnswer = placements[i] || '?';
                const correct = pattern[i];
                const isCorrect = studentAnswer === correct;

                // Mark incorrect answers
                if (isCorrect) {
                    answerParts.push(studentAnswer);
                } else {
                    answerParts.push(`${studentAnswer}✗`);
                }
            }

            const answerText = answerParts.join(' - ');

            // Score
            const correct = data.correct || 0;
            const total = data.total || pattern.length;
            const scoreText = `${correct}/${total}`;

            return {
                question: questionText,
                answer: answerText,
                score: scoreText,
                correct: correct,
                total: total,
                timestamp: result.completed_date || ''
            };
        } catch (error) {
            console.error('Error parsing So-La-Mi result:', error);
            return {
                question: 'Parse error',
                answer: result.response.substring(0, 50),
                score: '?',
                timestamp: result.completed_date || ''
            };
        }
    }

    /**
     * Parse Piano Octave 1 results
     * Response format: {"targetNote":"C","pressedNote":"D","timestamp":"2025-12-10T15:35:30.123Z"}
     */
    parsePianoOctave1(result, task) {
        try {
            const data = JSON.parse(result.response);

            // Question: which note they were asked to press
            const questionText = `Press ${data.targetNote}`;

            // Answer: which note they actually pressed
            const answerText = data.pressedNote;

            // Score: 1/1 if correct, 0/1 if incorrect
            const isCorrect = data.targetNote === data.pressedNote;
            const correct = isCorrect ? 1 : 0;
            const total = 1;
            const scoreText = `${correct}/${total}`;

            return {
                question: questionText,
                answer: answerText,
                score: scoreText,
                correct: correct,
                total: total,
                timestamp: result.completed_date || data.timestamp || ''
            };
        } catch (error) {
            console.error('Error parsing Piano Octave 1 result:', error);
            return {
                question: 'Parse error',
                answer: result.response.substring(0, 50),
                score: '?',
                timestamp: result.completed_date || ''
            };
        }
    }

    /**
     * Default parser for unknown modules
     */
    parseDefault(result, task) {
        return {
            question: task.question || 'No question data',
            answer: result.response.substring(0, 100),
            score: '—',
            timestamp: result.completed_date || ''
        };
    }

    /**
     * Get display name for module
     */
    getModuleDisplayName(modulePath) {
        const moduleName = this.extractModuleName(modulePath);

        const displayNames = {
            'so_la_mi_trainer': 'So La Mi Trainer',
            'piano_octave_1': 'Piano Octave 1',
            // Add more display names here
        };

        return displayNames[moduleName] || moduleName.replace(/_/g, ' ');
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ResultsParser = ResultsParser;
}
