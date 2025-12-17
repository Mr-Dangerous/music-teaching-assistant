# Smartboard Teaching Assistant - TODO List

## High Priority Issues

### Text Task Display Sizing
**Status:** Not Working
**Problem:** Short text strings (e.g., "2+2=?") appear tiny in the task display area despite CSS clamp() attempts.

**What's Been Tried:**
- CSS `clamp(32px, 8vw, 120px)` - text still tiny
- CSS `clamp(48px, 20vw, 240px)` - still not working

**Next Steps to Try:**
1. Use container-based sizing with CSS Container Queries (`cqw` units)
2. Implement JavaScript-based dynamic font calculation:
   - Measure container width
   - Measure text length
   - Calculate optimal font size to fill available space
3. Use `vmin` or `vmax` units instead of `vw`
4. Apply `font-size` directly to the container with different units

**File Location:** `styles.css` line 457-472 (`.task-text-display`)
**Related File:** `js/app.js` - `displayTaskText()` method

---

## Feature Requests

### Melodic Dictation Trainer Improvements
**Status:** In Progress
**File:** `modules/melodic_dictation.html`

**Required Changes:**
1. ✅ **Show starting note** - Must display the first note to make it fair
2. ✅ **Remove treble clef** - Use solfege-based staff like other trainers (so/la/mi lines)
3. ✅ **Simplify interaction** - Drag colored circles to align on staff lines
4. ✅ **Cursor feedback** - Show pitch name/position as user drags
5. ✅ **Starting note selector** - Allow choosing starting note in solfege (default: "so")
6. ✅ **Key selector** - Add ability to change key signature
7. ✅ **Pitch set options** - Toggle between pentatonic and diatonic scale
8. ✅ **Match trainer styling** - Use same visual style as so_la_mi_trainer.html

**Design Goals:**
- Simple colored circle dragging (like existing trainers)
- Staff shows only necessary solfege lines (no treble clef)
- First note is always shown/played first
- Clear visual feedback during interaction
- Consistent with existing module aesthetics

---

## Known Bugs

### Context Menu - Mouse Long-Click Not Working
**Status:** Partial - Works on smartboard/touch, not working with mouse long-click
**Problem:** Student roster context menu (long-press feature) works perfectly on smartboard/touchscreen but does not trigger with a long mouse click.

**What Works:**
- ✅ Long-press on touchscreen/smartboard (800ms hold)
- ✅ Context menu display and interaction
- ✅ All three menu options (Absent, Forgot Instrument, Earned Stool)
- ✅ Visual indicators (❌ ⭐) appear correctly
- ✅ Data saves to results.csv

**What Doesn't Work:**
- ❌ Long-click with regular mouse (holding mouse button down for 800ms)

**File Location:** `js/app.js` lines 649-698 (student button event handlers)
**Related:** Context menu implementation starting at line 788

---

## Completed Items

- ✅ Implement grade-based folder structure for tasks
- ✅ Add fullscreen mode for 16:9 displays
- ✅ Create side-by-side layout (task left, response right)
- ✅ Support for `artifact_1_question_type` (picture vs string)
- ✅ Support for `artifact_1_input_type` (multiple_choice, free_type)
- ✅ Multiple choice button spawning with variable options
- ✅ Free-type keyboard capture
- ✅ Auto-save functionality with File System Access API
