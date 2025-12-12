/**
 * DragDropHandler.js
 * Handles drag and drop interactions for composer modules
 */

import { MusicNotation } from './MusicNotation.js';

export class DragDropHandler {
    constructor(canvas, state, renderer, callbacks = {}) {
        this.canvas = canvas;
        this.state = state;
        this.renderer = renderer;
        this.callbacks = callbacks; // {onCompositionChange, onLongPress}
    }

    /**
     * Setup all event listeners
     */
    setup() {
        // Palette dragging
        const rhythmItems = document.querySelectorAll('.rhythm-item');
        rhythmItems.forEach(item => {
            item.addEventListener('mousedown', (e) => this.startDrag(item, e));
            item.addEventListener('touchstart', (e) => {
                this.startDrag(item, e.touches[0]);
                e.preventDefault();
            }, { passive: false });
        });

        // Global drag/drop
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('touchmove', (e) => {
            this.drag(e.touches[0]);
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('mouseup', (e) => this.endDrag(e));
        document.addEventListener('touchend', (e) => this.endDrag(e.changedTouches[0]));

        // Canvas long press
        this.canvas.addEventListener('mousedown', (e) => this.startLongPress(e));
        this.canvas.addEventListener('touchstart', (e) => this.startLongPress(e.touches[0]), { passive: true });
        this.canvas.addEventListener('mouseup', () => this.clearLongPress());
        this.canvas.addEventListener('mousemove', () => this.clearLongPress());
        this.canvas.addEventListener('touchend', () => this.clearLongPress());
        this.canvas.addEventListener('touchmove', () => this.clearLongPress());
    }

    /**
     * Start dragging from palette
     */
    startDrag(item, event) {
        const clone = item.cloneNode(true);
        clone.classList.add('dragging');
        document.body.appendChild(clone);

        this.state.draggedItem = {
            element: clone,
            rhythm: item.dataset.rhythm,
            beats: item.dataset.rhythm === 'ti-ti' ? 1 : 1
        };

        const rect = item.getBoundingClientRect();
        this.state.dragOffset.x = event.clientX - rect.left;
        this.state.dragOffset.y = event.clientY - rect.top;

        clone.style.left = (event.clientX - this.state.dragOffset.x) + 'px';
        clone.style.top = (event.clientY - this.state.dragOffset.y) + 'px';
    }

    /**
     * Handle drag movement
     */
    drag(event) {
        if (this.state.draggedItem) {
            this.state.draggedItem.element.style.left = (event.clientX - this.state.dragOffset.x) + 'px';
            this.state.draggedItem.element.style.top = (event.clientY - this.state.dragOffset.y) + 'px';
        } else if (this.state.draggedExistingNote && this.state.draggedExistingNote.element) {
            this.state.draggedExistingNote.element.style.left = (event.clientX - 20) + 'px';
            this.state.draggedExistingNote.element.style.top = (event.clientY - 20) + 'px';
        }
    }

    /**
     * End drag
     */
    endDrag(event) {
        if (this.state.draggedItem) {
            const canvasRect = this.canvas.getBoundingClientRect();
            const dropX = event.clientX;
            const dropY = event.clientY;

            if (dropX >= canvasRect.left && dropX <= canvasRect.right &&
                dropY >= canvasRect.top && dropY <= canvasRect.bottom) {

                if (this.state.canAddBeats(this.state.draggedItem.beats)) {
                    this.addToComposition(this.state.draggedItem.rhythm, event, canvasRect);
                } else {
                    alert('Cannot add more notes! Maximum 16 beats reached.');
                }
            }

            this.state.draggedItem.element.remove();
            this.state.draggedItem = null;
        } else if (this.state.draggedExistingNote) {
            const canvasRect = this.canvas.getBoundingClientRect();
            const dropX = event.clientX;
            const dropY = event.clientY;
            const index = this.state.draggedExistingNote.index;

            if (dropX >= canvasRect.left && dropX <= canvasRect.right &&
                dropY >= canvasRect.top && dropY <= canvasRect.bottom) {
                this.updateRepositionedNote(index, event, canvasRect);
            } else {
                this.state.removeNote(index);
            }

            if (this.state.draggedExistingNote.element) {
                this.state.draggedExistingNote.element.remove();
            }
            this.state.draggedExistingNote = null;

            this.state.composition.forEach(item => delete item.hidden);
            this.trigger('onCompositionChange');
        }
    }

    /**
     * Add new note to composition
     */
    addToComposition(rhythm, event, canvasRect) {
        const canvasX = event.clientX - canvasRect.left;
        const canvasY = event.clientY - canvasRect.top;
        const positions = this.renderer.getStaffPositions();

        let pitch = null;
        if (rhythm !== 'shh') {
            pitch = MusicNotation.snapToPitch(canvasY, positions);
        }

        const item = {
            rhythm: rhythm,
            pitch: pitch,
            pitch2: null, // For split eighth notes
            beats: rhythm === 'ti-ti' ? 1 : 1,
            x: canvasX,
            y: canvasY
        };

        this.state.addNote(item);
        this.adjustNoteSpacing(this.state.composition.length - 1);
        this.trigger('onCompositionChange');
    }

    /**
     * Update repositioned note
     */
    updateRepositionedNote(index, event, canvasRect) {
        const canvasX = event.clientX - canvasRect.left;
        const canvasY = event.clientY - canvasRect.top;
        const item = this.state.composition[index];
        const positions = this.renderer.getStaffPositions();

        item.x = canvasX;
        item.y = canvasY;

        if (item.rhythm !== 'shh') {
            item.pitch = MusicNotation.snapToPitch(canvasY, positions);
        }

        delete item.hidden;
        this.adjustNoteSpacing(index);
    }

    /**
     * Adjust spacing to prevent overlaps
     */
    adjustNoteSpacing(newNoteIndex) {
        const getNoteWidth = (note) => {
            if (note.rhythm === 'ti-ti') return 70;
            if (note.rhythm === 'shh') return 30;
            return 40;
        };

        const maxIterations = 10;
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            let anyAdjustment = false;

            for (let i = 0; i < this.state.composition.length; i++) {
                for (let j = i + 1; j < this.state.composition.length; j++) {
                    const note1 = this.state.composition[i];
                    const note2 = this.state.composition[j];
                    const minSpacing = (getNoteWidth(note1) + getNoteWidth(note2)) / 2 + 5;
                    const distance = Math.abs(note1.x - note2.x);

                    if (distance < minSpacing) {
                        const overlap = minSpacing - distance;
                        const pushAmount = (overlap / 2) + 1;

                        if (note1.x < note2.x) {
                            note1.x -= pushAmount;
                            note2.x += pushAmount;
                        } else {
                            note1.x += pushAmount;
                            note2.x -= pushAmount;
                        }
                        anyAdjustment = true;
                    }
                }
            }
            if (!anyAdjustment) break;
        }
    }

    /**
     * Start long press detection
     */
    startLongPress(event) {
        const canvasRect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - canvasRect.left;
        const clickY = event.clientY - canvasRect.top;

        const result = this.findItemAtPosition(clickX, clickY);

        if (result.index !== -1) {
            this.state.longPressTarget = result.index;
            this.state.editSecondNote = result.editSecondNote; // Store which half
            this.state.longPressTimer = setTimeout(() => {
                this.startRepositioning(this.state.longPressTarget, event);
                if (navigator.vibrate) navigator.vibrate(50);
            }, 800);
        }
    }

    /**
     * Clear long press
     */
    clearLongPress() {
        if (this.state.longPressTimer) {
            clearTimeout(this.state.longPressTimer);
            this.state.longPressTimer = null;
        }
    }

    /**
     * Find item at position - returns {index, editSecondNote}
     */
    findItemAtPosition(x, y) {
        const scale = this.renderer.getScale();
        const noteSpacing = 18 * scale;

        for (let i = this.state.composition.length - 1; i >= 0; i--) {
            const item = this.state.composition[i];

            if (item.rhythm === 'ti-ti') {
                // For eighth notes, check which half based on X position
                const leftNoteX = item.x - noteSpacing;
                const rightNoteX = item.x + noteSpacing;

                // Determine which note to edit based on X position
                const editSecond = (x > item.x);
                const targetX = editSecond ? rightNoteX : leftNoteX;

                // Check distance from target note
                const distance = Math.sqrt(Math.pow(x - targetX, 2) + Math.pow(y - item.y, 2));
                if (distance < 40) return { index: i, editSecondNote: editSecond };
            } else {
                // Single note or rest
                const distance = Math.sqrt(Math.pow(x - item.x, 2) + Math.pow(y - item.y, 2));
                if (distance < 40) return { index: i, editSecondNote: false };
            }
        }
        return { index: -1, editSecondNote: false };
    }

    /**
     * Start repositioning existing note
     */
    startRepositioning(index, event) {
        const item = this.state.composition[index];
        item.hidden = true;

        const clone = document.createElement('div');
        clone.className = 'rhythm-item dragging';
        clone.textContent = item.rhythm.toUpperCase();
        document.body.appendChild(clone);

        this.state.draggedExistingNote = {
            element: clone,
            index: index
        };

        clone.style.left = (event.clientX - 20) + 'px';
        clone.style.top = (event.clientY - 20) + 'px';

        this.trigger('onCompositionChange');
    }

    /**
     * Trigger callback
     */
    trigger(name) {
        if (this.callbacks[name]) {
            this.callbacks[name]();
        }
    }
}
