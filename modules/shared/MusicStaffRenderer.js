/**
 * MusicStaffRenderer.js
 * Canvas rendering for music staff and notation
 */

export class MusicStaffRenderer {
    constructor(canvas, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.config = config; // {pitches: ['so', 'la', 'mi'], labels: {...}}

        // Load rest image
        this.restImage = new Image();
        this.restImage.src = 'data:image/png;base64,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';
        this.restImageLoaded = false;
        this.restImage.onload = () => { this.restImageLoaded = true; };
    }

    /**
     * Get scale factor for 4k resolution
     */
    getScale() {
        return document.body.classList.contains('resolution-4k') ? 2 : 1;
    }

    /**
     * Calculate staff positions based on config
     */
    getStaffPositions() {
        const scale = this.getScale();
        const canvasHeight = this.canvas.height;
        const pitches = this.config.pitches; // e.g., ['so', 'la', 'mi'] or ['so', 'la', 'mi', 're', 'do']

        // Dynamic spacing based on number of pitches
        const numLines = 2 + Math.floor((pitches.length - 3) / 2); // 2 lines for 3 pitches, 3 for 5 pitches
        const lineSpacing = numLines === 2 ? 70 * scale : 50 * scale;

        const positions = {};

        if (pitches.length === 3) {
            // So-La-Mi: 2 lines
            positions.so = canvasHeight / 2 - lineSpacing / 2;
            positions.mi = canvasHeight / 2 + lineSpacing / 2;
            positions.la = positions.so - 20 * scale;
        } else if (pitches.length === 5) {
            // SMLRD: 3 lines
            positions.so = canvasHeight / 2 - lineSpacing;
            positions.mi = canvasHeight / 2;
            positions.do = canvasHeight / 2 + lineSpacing;
            positions.la = positions.so - 20 * scale;
            positions.re = (positions.mi + positions.do) / 2;
        } else if (pitches.length === 8) {
            // Pentatonic: 5 lines (but only 4 used for notes)
            // Lines (bottom to top): La,, Do, Mi, So, (5th line empty for future Ti)
            // Spaces: So, (below), Re (space 2), La (space 4), Do' (above)
            const centerY = canvasHeight / 2;
            const spacing = lineSpacing;

            // Lines (only 4 lines have notes, 5th is empty)
            positions.la1 = centerY + (spacing * 2);     // Line 1 (bottom) - La,
            positions.do = centerY + spacing;            // Line 2 - Do
            positions.mi = centerY;                      // Line 3 (middle) - Mi
            positions.so = centerY - spacing;            // Line 4 - So
            // Line 5 is drawn but has no note position (reserved for future use)
            const line5Y = centerY - (spacing * 2);      // Calculate for drawing only

            // Spaces
            positions.so1 = centerY + (spacing * 2.5);         // Space below staff - So,
            positions.re = (positions.do + positions.mi) / 2;  // Space 2 (between Do and Mi) - Re
            positions.la = (positions.so + line5Y) / 2;        // Space 4 (between So and line 5) - La
            positions.do2 = line5Y - (spacing / 2);            // Space above line 5 - Do'

            // Store line5Y for drawing (but not as a note position)
            this.line5Y = line5Y;
        }

        return positions;
    }

    /**
     * Draw the complete staff with composition
     */
    drawStaff(composition, state) {
        const ctx = this.ctx;
        const scale = this.getScale();

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const staffLeft = 60 * scale;
        const staffRight = this.canvas.width - (60 * scale);
        const positions = this.getStaffPositions();

        // Draw staff lines
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3 * scale;

        // Determine which pitches have lines
        let linePitches;
        if (this.config.pitches.length === 3) {
            linePitches = ['so', 'mi'];
        } else if (this.config.pitches.length === 5) {
            linePitches = ['so', 'mi', 'do'];
        } else if (this.config.pitches.length === 8) {
            linePitches = ['la1', 'do', 'mi', 'so', 'ti']; // 5 lines
        }

        const lines = linePitches.filter(p => positions[p] && this.config.pitches.includes(p));
        lines.forEach(pitch => {
            const y = positions[pitch];
            ctx.beginPath();
            ctx.moveTo(staffLeft, y);
            ctx.lineTo(staffRight, y);
            ctx.stroke();
        });

        // For pentatonic: manually draw 5th line (it has no note position assigned)
        if (this.config.pitches.length === 8 && this.line5Y) {
            ctx.beginPath();
            ctx.moveTo(staffLeft, this.line5Y);
            ctx.lineTo(staffRight, this.line5Y);
            ctx.stroke();
        }

        // Draw labels
        ctx.font = `bold ${32 * scale}px Arial`;
        ctx.fillStyle = '#2c3e50';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        Object.entries(positions).forEach(([pitch, y]) => {
            // Use config.labels if available, otherwise capitalize pitch
            const label = this.config.labels && this.config.labels[pitch]
                ? this.config.labels[pitch]
                : pitch.charAt(0).toUpperCase() + pitch.slice(1);
            ctx.fillText(label, staffLeft - (15 * scale), y);
        });

        // Draw bar lines if sorted
        if (composition.length > 0 && state.isSorted) {
            this.drawBarLines(ctx, staffLeft, staffRight, positions, composition, state.currentMeter, scale);
        }

        // Draw notes
        composition.forEach((item, index) => {
            if (!item.hidden) {
                this.drawNote(ctx, item, positions, state, scale, index, composition.length);
            }
        });

        // Draw drag indicator if visible
        if (state.dragIndicator && state.dragIndicator.visible) {
            this.drawDragIndicator(ctx, state.dragIndicator, scale);
        }
    }

    /**
     * Draw bar lines
     */
    drawBarLines(ctx, staffLeft, staffRight, positions, composition, meter, scale) {
        const usableWidth = staffRight - staffLeft;
        const itemWidth = usableWidth / composition.length;
        let currentBeat = 0;

        ctx.strokeStyle = '#34495e';
        ctx.lineWidth = 2 * scale;

        const sortedPositions = Object.values(positions).sort((a, b) => a - b);

        // For pentatonic with 5th line, extend to include it
        const topY = (this.config.pitches.length === 8 && this.line5Y)
            ? this.line5Y - 30 * scale
            : sortedPositions[0] - 30 * scale;
        const bottomY = sortedPositions[sortedPositions.length - 1] + 30 * scale;

        composition.forEach((item, index) => {
            currentBeat += item.beats;
            if (currentBeat % meter === 0 && index < composition.length - 1) {
                const barX = staffLeft + (itemWidth * (index + 1));
                ctx.beginPath();
                ctx.moveTo(barX, topY);
                ctx.lineTo(barX, bottomY);
                ctx.stroke();
            }
        });
    }

    /**
     * Draw a single note item
     */
    drawNote(ctx, item, positions, state, scale, index, totalItems) {
        const usableWidth = this.canvas.width - (120 * scale);
        const itemWidth = usableWidth / totalItems;
        const x = (60 * scale) + (itemWidth * index) + (itemWidth / 2);

        // Get y position
        const y = item.rhythm === 'shh' ?
            (positions.so + positions.mi) / 2 :
            positions[item.pitch];

        // Update stored position
        item.x = x;
        item.y = y;

        // Get pitch names if available
        const pitchName = state.showPitchNames && state.pitchNames ? state.pitchNames[item.pitch] : null;
        const pitch2Name = state.showPitchNames && state.pitchNames && item.pitch2 ? state.pitchNames[item.pitch2] : null;

        // Draw based on rhythm
        if (item.rhythm === 'ta') {
            this.drawQuarterNote(ctx, x, y, item.pitch, state.showNoteNames, scale, pitchName);
        } else if (item.rhythm === 'ti-ti') {
            const y2 = item.pitch2 ? positions[item.pitch2] : y;
            this.drawEighthNotes(ctx, x, y, y2, item.pitch, item.pitch2, state.showNoteNames, scale, pitchName, pitch2Name);
        } else if (item.rhythm === 'ti') {
            this.drawSingleEighthNote(ctx, x, y, item.pitch, state.showNoteNames, scale, pitchName);
        } else if (item.rhythm === 'shh') {
            this.drawRest(ctx, x, y, scale);
        }
    }

    /**
     * Draw quarter note (filled note head with stem)
     */
    drawQuarterNote(ctx, x, y, pitch, showNames, scale, pitchName) {
        const noteRadius = 16 * scale;

        // Draw note head
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.ellipse(x, y, noteRadius * 1.2, noteRadius, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw stem
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2.5 * scale;
        ctx.beginPath();
        ctx.moveTo(x + noteRadius, y);
        ctx.lineTo(x + noteRadius, y - (65 * scale));
        ctx.stroke();

        // Draw label (solfege or pitch name)
        if (showNames && pitch) {
            ctx.fillStyle = 'white';
            ctx.font = `bold ${12 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pitch.toUpperCase(), x, y);
        } else if (pitchName) {
            ctx.fillStyle = 'white';
            ctx.font = `bold ${10 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pitchName, x, y);
        }
    }

    /**
     * Draw eighth notes (potentially split pitches)
     */
    drawEighthNotes(ctx, x, y1, y2, pitch1, pitch2, showNames, scale, pitchName1, pitchName2) {
        const noteRadius = 16 * scale;
        const noteSpacing = 18 * scale;

        ctx.fillStyle = '#2c3e50';

        // First note
        ctx.beginPath();
        ctx.ellipse(x - noteSpacing, y1, noteRadius * 1.2, noteRadius, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        // Second note
        ctx.beginPath();
        ctx.ellipse(x + noteSpacing, y2, noteRadius * 1.2, noteRadius, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        // Stems
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2.5 * scale;

        const stem1Top = y1 - (65 * scale);
        const stem2Top = y2 - (65 * scale);

        ctx.beginPath();
        ctx.moveTo(x - noteSpacing + noteRadius, y1);
        ctx.lineTo(x - noteSpacing + noteRadius, stem1Top);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + noteSpacing + noteRadius, y2);
        ctx.lineTo(x + noteSpacing + noteRadius, stem2Top);
        ctx.stroke();

        // Beam (potentially angled if split)
        ctx.beginPath();
        ctx.moveTo(x - noteSpacing + noteRadius, stem1Top);
        ctx.lineTo(x + noteSpacing + noteRadius, stem2Top);
        ctx.lineWidth = 5 * scale;
        ctx.stroke();

        if (showNames) {
            ctx.fillStyle = 'white';
            ctx.font = `bold ${10 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (pitch1) ctx.fillText(pitch1.substring(0, 2).toUpperCase(), x - noteSpacing, y1);
            if (pitch2) ctx.fillText(pitch2.substring(0, 2).toUpperCase(), x + noteSpacing, y2);
        } else if (pitchName1 || pitchName2) {
            ctx.fillStyle = 'white';
            ctx.font = `bold ${9 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (pitchName1) ctx.fillText(pitchName1, x - noteSpacing, y1);
            if (pitchName2) ctx.fillText(pitchName2, x + noteSpacing, y2);
        }
    }

    /**
     * Draw single eighth note (with flag)
     */
    drawSingleEighthNote(ctx, x, y, pitch, showNames, scale, pitchName) {
        const noteRadius = 16 * scale;

        // Draw note head
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.ellipse(x, y, noteRadius * 1.2, noteRadius, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw stem
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2.5 * scale;
        const stemTop = y - (65 * scale);
        ctx.beginPath();
        ctx.moveTo(x + noteRadius, y);
        ctx.lineTo(x + noteRadius, stemTop);
        ctx.stroke();

        // Draw flag (curved)
        ctx.beginPath();
        ctx.moveTo(x + noteRadius, stemTop);
        ctx.bezierCurveTo(
            x + noteRadius + (20 * scale), stemTop,
            x + noteRadius + (25 * scale), stemTop + (15 * scale),
            x + noteRadius, stemTop + (20 * scale)
        );
        ctx.lineWidth = 3 * scale;
        ctx.stroke();

        if (showNames && pitch) {
            ctx.fillStyle = 'white';
            ctx.font = `bold ${12 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pitch.toUpperCase(), x, y);
        } else if (pitchName) {
            ctx.fillStyle = 'white';
            ctx.font = `bold ${10 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pitchName, x, y);
        }
    }

    /**
     * Draw rest
     */
    drawRest(ctx, x, y, scale) {
        if (this.restImageLoaded) {
            const imgHeight = 60 * scale;
            const imgWidth = imgHeight * 0.5;
            ctx.drawImage(this.restImage, x - imgWidth / 2, y - imgHeight / 2, imgWidth, imgHeight);
        } else {
            ctx.fillStyle = '#95a5a6';
            ctx.font = `bold ${24 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('REST', x, y);
        }
    }

    /**
     * Draw drag indicator (tooltip showing pitch name during drag)
     */
    drawDragIndicator(ctx, indicator, scale) {
        const padding = 8 * scale;
        const fontSize = 14 * scale;

        // Get label text (prefer pitch name if available)
        const label = indicator.pitchName || (indicator.pitch ? indicator.pitch.toUpperCase() : '');
        if (!label) return;

        // Measure text
        ctx.font = `bold ${fontSize}px Arial`;
        const metrics = ctx.measureText(label);
        const width = metrics.width + (padding * 2);
        const height = fontSize + (padding * 2);

        // Position (offset from cursor to avoid covering it)
        const x = indicator.x + 20 * scale;
        const y = indicator.y - 20 * scale;

        // Draw background
        ctx.fillStyle = 'rgba(52, 73, 94, 0.9)';
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 5 * scale);
        ctx.fill();

        // Draw border
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2 * scale;
        ctx.stroke();

        // Draw text
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(label, x + padding, y + padding);
    }
}
